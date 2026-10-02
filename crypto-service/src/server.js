const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const ticketRoutes = require('./routes/ticketRoutes');
const gateRoutes = require('./routes/gateRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

// Configure CORS for allowed origins
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || config.ALLOWED_ORIGINS.includes(origin) || config.ALLOWED_ORIGINS.includes('*')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow for local API testing
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'FairPass/MarkSeat Crypto & Verification Service',
    status: 'HEALTHY',
    version: '1.0.0',
    port: config.PORT,
    totp_step_seconds: config.TOTP_STEP_SECONDS
  });
});

// Mount Routes
app.use('/', ticketRoutes);
app.use('/', gateRoutes);
app.use('/dashboard', dashboardRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Crypto Service Error]:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🔐 FairPass / MarkSeat Crypto Service running on port ${PORT}`);
  console.log(`   - Revocation Target: http://localhost:${PORT}/tickets/revoke`);
  console.log(`   - Gate Verification: http://localhost:${PORT}/verify-gate-scan`);
  console.log(`   - Issue Ticket:      http://localhost:${PORT}/issue-ticket`);
  console.log(`   - Admin Dashboard:   http://localhost:${PORT}/dashboard/stats`);
  console.log(`======================================================\n`);
});
