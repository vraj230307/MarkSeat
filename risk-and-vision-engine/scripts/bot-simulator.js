const puppeteer = require('puppeteer');
const config = require('../src/config/env');

const TARGET_URL = process.env.TARGET_BOOKING_URL || config.TARGET_BOOKING_URL || `http://localhost:${config.PORT}/demo-booking`;

async function runBotSimulator() {
  console.log(`\n================================================================`);
  console.log(`🤖 FairPass / MarkSeat Bot Attack Simulator (Puppeteer Script)`);
  console.log(`   Target Booking URL: ${TARGET_URL}`);
  console.log(`================================================================\n`);

  let browser;
  try {
    console.log(`[Bot Simulator] Launching browser instance...`);
    browser = await puppeteer.launch({
      headless: true, // Run headless mode for automated execution
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    console.log(`[Bot Simulator] Navigating to target booking page...`);
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });

    console.log(`[Bot Simulator] Executing rapid automated seat selection script (Instant <20ms clicks)...`);

    // Rapidly click 12 seats programmatically in rapid succession without human delays
    const seatIds = ['seat-1', 'seat-2', 'seat-3', 'seat-4', 'seat-5', 'seat-6', 'seat-7', 'seat-8', 'seat-9', 'seat-10', 'seat-11', 'seat-12'];

    for (const seatId of seatIds) {
      await page.evaluate((id) => {
        const el = document.getElementById(id);
        if (el) el.click();
      }, seatId);
      // Zero delay between clicks to simulate high-frequency automated script
    }

    console.log(`[Bot Simulator] Simulating rapid payment attempt loops...`);
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => {
        const btn = document.getElementById('btnFailAttempt');
        if (btn) btn.click();
      });
    }

    console.log(`[Bot Simulator] Triggering checkout & submitting session telemetry to Risk Engine...`);
    await page.evaluate(() => {
      const submitBtn = document.getElementById('btnSubmitBooking');
      if (submitBtn) submitBtn.click();
    });

    // Wait for the risk verdict log to render on screen
    await new Promise(resolve => setTimeout(resolve, 1500));

    const logText = await page.evaluate(() => {
      const logEl = document.getElementById('log');
      return logEl ? logEl.innerText : '';
    });

    console.log(`\n[Bot Simulator Output Page Log]:`);
    console.log(logText);

    // Also send an explicit raw high-frequency telemetry payload directly to API to demonstrate bot detection
    console.log(`\n[Bot Simulator Direct API Test] Sending high-frequency bot telemetry to /risk/analyze-session...`);
    const directPayload = {
      session_id: `bot_attack_${Date.now()}`,
      requests_per_minute: 140,
      time_between_clicks_ms: [12, 15, 10, 8, 14, 11, 9],
      seats_selected_count: 15,
      rapid_seat_changes: 12,
      failed_booking_attempts: 7,
      session_duration_ms: 1100,
      repeated_action_count: 8
    };

    const apiResponse = await fetch(`http://localhost:${config.PORT}/risk/analyze-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(directPayload)
    });

    const result = await apiResponse.json();
    console.log(`\n================================================================`);
    console.log(`🚨 RISK ENGINE VERDICT FOR BOT ATTACK:`);
    console.log(`   Session ID:   ${result.session_id}`);
    console.log(`   Verdict:      [${result.verdict}]`);
    console.log(`   Reason:       ${result.reason}`);
    console.log(`   Violations:   ${result.details.threshold_violations.length} threshold rules triggered`);
    console.log(`================================================================\n`);

  } catch (error) {
    console.error(`[Bot Simulator Error]:`, error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

runBotSimulator();
