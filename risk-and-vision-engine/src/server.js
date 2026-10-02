const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const riskRoutes = require('./routes/riskRoutes');
const inspectorRoutes = require('./routes/inspectorRoutes');

const app = express();

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health Check / Metadata Endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'FairPass/MarkSeat AI Risk & Verification Engine',
    status: 'HEALTHY',
    version: '1.0.0',
    gemini_key_configured: Boolean(config.GEMINI_API_KEY),
    port: config.PORT
  });
});

// Mount Core API Routes
app.use('/auth', authRoutes);
app.use('/risk', riskRoutes);
app.use('/inspector', inspectorRoutes);

/**
 * Optional Local Mock Endpoint for Offline Testing Stub
 * NOTE: The application targets the REAL external crypto-service at http://localhost:3000/tickets/revoke.
 * This route is named /mock-tickets/revoke so it can NEVER be confused with or intercept requests to the real service.
 */
app.post('/mock-tickets/revoke', (req, res) => {
  const { section, row, seat_number, event_name } = req.body || {};
  console.log(`\n[STANDALONE MOCK STUB] Received mock revocation: Event="${event_name}", Sec=${section}, Row=${row}, Seat=${seat_number}`);
  return res.json({
    status: 'MOCK_REVOKED',
    message: `Mock stub received ticket invalidation request.`,
    revocation_timestamp: new Date().toISOString(),
    ticket_details: { event_name, section, row, seat_number }
  });
});

/**
 * Interactive Demo Booking Page for Puppeteer Bot Simulator
 * Serves a lightweight HTML ticket booking interface.
 */
app.get('/demo-booking', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>FairPass / MarkSeat Demo Booking Page</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; text-align: center; }
    h1 { color: #38bdf8; }
    .grid { display: grid; grid-template-columns: repeat(10, 40px); gap: 8px; justify-content: center; margin: 2rem auto; }
    .seat { width: 40px; height: 40px; background: #334155; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px; transition: all 0.1s; }
    .seat.selected { background: #22c55e; color: #fff; font-weight: bold; }
    .controls { margin-top: 1rem; }
    button { background: #0284c7; color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 6px; font-size: 1rem; cursor: pointer; margin: 0.5rem; }
    button:hover { background: #0369a1; }
    #log { margin-top: 1.5rem; padding: 1rem; background: #1e293b; border-radius: 8px; font-family: monospace; text-align: left; max-width: 600px; margin: 1.5rem auto; min-height: 100px; }
  </style>
</head>
<body>
  <h1>FairPass / MarkSeat Booking Sandbox</h1>
  <p>Select seats and attempt booking. Telemetry will be sent to the AI Risk Engine.</p>

  <div class="grid" id="seatGrid"></div>

  <div class="controls">
    <button id="btnFailAttempt">Simulate Failed Payment</button>
    <button id="btnSubmitBooking">Checkout & Submit Telemetry</button>
  </div>

  <div id="log">Logs & Risk Verdict will appear here...</div>

  <script>
    const startTime = Date.now();
    let clicks = [];
    let selectedSeats = new Set();
    let seatChanges = 0;
    let failedAttempts = 0;
    let repeatedActions = 0;
    let lastAction = '';

    const grid = document.getElementById('seatGrid');
    const logDiv = document.getElementById('log');

    function addLog(msg) {
      logDiv.innerHTML += '<div>' + new Date().toLocaleTimeString() + ' - ' + msg + '</div>';
    }

    // Build 30 seats
    for (let i = 1; i <= 30; i++) {
      const seat = document.createElement('div');
      seat.className = 'seat';
      seat.innerText = 'S' + i;
      seat.id = 'seat-' + i;
      seat.addEventListener('click', (e) => {
        clicks.push(Date.now());
        if (selectedSeats.has(i)) {
          selectedSeats.delete(i);
          seat.classList.remove('selected');
        } else {
          selectedSeats.add(i);
          seat.classList.add('selected');
        }
        seatChanges++;
        trackAction('click_seat_' + i);
        addLog('Selected seat S' + i);
      });
      grid.appendChild(seat);
    }

    function trackAction(act) {
      if (lastAction === act) repeatedActions++;
      lastAction = act;
    }

    document.getElementById('btnFailAttempt').addEventListener('click', () => {
      failedAttempts++;
      addLog('Failed payment attempt #' + failedAttempts);
    });

    document.getElementById('btnSubmitBooking').addEventListener('click', async () => {
      const duration = Date.now() - startTime;
      const intervals = [];
      for (let i = 1; i < clicks.length; i++) {
        intervals.push(clicks[i] - clicks[i-1]);
      }
      const reqPerMin = Math.round((clicks.length / (duration / 1000)) * 60) || 5;

      const payload = {
        session_id: 'sim_session_' + Math.floor(Math.random() * 10000),
        requests_per_minute: reqPerMin,
        time_between_clicks_ms: intervals,
        seats_selected_count: selectedSeats.size,
        rapid_seat_changes: seatChanges,
        failed_booking_attempts: failedAttempts,
        session_duration_ms: duration,
        repeated_action_count: repeatedActions
      };

      addLog('Submitting session telemetry to /risk/analyze-session...');
      try {
        const res = await fetch('/risk/analyze-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        addLog('<strong style="color:' + (data.verdict === 'BLOCKED' ? '#ef4444' : '#22c55e') + '">VERDICT: ' + data.verdict + '</strong> (Reason: ' + data.reason + ')');
      } catch (err) {
        addLog('Error calling Risk API: ' + err.message);
      }
    });
  </script>
</body>
</html>
  `);
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Express Error]:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start Express Server
const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 FairPass / MarkSeat AI Risk Engine running on port ${PORT}`);
  console.log(`   - Risk API:         http://localhost:${PORT}/risk/analyze-session`);
  console.log(`   - Vision Inspector: http://localhost:${PORT}/inspector/analyze-listing`);
  console.log(`   - Revocation Log:   http://localhost:${PORT}/inspector/revocation-log`);
  console.log(`   - Demo Booking URL: http://localhost:${PORT}/demo-booking`);
  console.log(`======================================================\n`);
});
