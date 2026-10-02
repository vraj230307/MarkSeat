const config = require('../src/config/env');

const BASE_URL = `http://localhost:${config.PORT}`;

async function runRateLimiterTests() {
  console.log(`\n================================================================`);
  console.log(`⏱️ FairPass / MarkSeat Tiered Rate Limiter Test Suite`);
  console.log(`   Base Target URL: ${BASE_URL}`);
  console.log(`================================================================\n`);

  // ----------------------------------------------------------------
  // TEST 1: Stricter Auth Routes with Exponential Backoff
  // ----------------------------------------------------------------
  console.log(`----------------------------------------------------------------`);
  console.log(`🔒 TEST 1: Authentication Endpoint Rate Limiting (/auth/login)`);
  console.log(`   Configured Max Requests before Backoff: ${config.AUTH_MAX_REQUESTS_PER_WINDOW}`);
  console.log(`   Base Backoff: ${config.AUTH_BASE_BACKOFF_MS}ms | Factor: ${config.AUTH_BACKOFF_FACTOR}x`);
  console.log(`----------------------------------------------------------------\n`);

  const authPayload = { email: 'test.user@fairpass.com', password: 'securePassword123' };

  for (let i = 1; i <= 8; i++) {
    try {
      const startTime = Date.now();
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authPayload)
      });

      const elapsedMs = Date.now() - startTime;
      const status = response.status;
      const retryAfter = response.headers.get('retry-after') || 'N/A';
      const limitHeader = response.headers.get('x-ratelimit-limit') || 'N/A';

      if (status === 200) {
        console.log(`   Req #${i}: Status HTTP 200 OK | Response Time: ${elapsedMs}ms | Limit: ${limitHeader}`);
      } else if (status === 429) {
        const body = await response.json();
        console.log(`   🚨 Req #${i}: HTTP 429 TOO MANY REQUESTS!`);
        console.log(`      - Limited By:        ${body.limited_by}`);
        console.log(`      - Retry-After:       ${body.retry_after_seconds} seconds (${retryAfter}s header)`);
        console.log(`      - Backoff Delay:     ${body.backoff_delay_ms} ms (Exponential factor: ${config.AUTH_BACKOFF_FACTOR}x)`);
        console.log(`      - Current Attempts:  ${body.current_attempts}`);
        console.log(`      - Message:           ${body.message}`);
      } else {
        console.log(`   Req #${i}: HTTP ${status}`);
      }
    } catch (err) {
      console.error(`   ❌ Req #${i} Failed: ${err.message}`);
    }
  }

  // ----------------------------------------------------------------
  // TEST 2: Moderate Limit on Public Endpoints
  // ----------------------------------------------------------------
  console.log(`\n----------------------------------------------------------------`);
  console.log(`🌐 TEST 2: Public Endpoint Rate Limiting (/risk/analyze-session)`);
  console.log(`   Configured Limit: ${config.PUBLIC_MAX_REQUESTS_PER_WINDOW} req / ${config.PUBLIC_RATE_LIMIT_WINDOW_MS / 1000}s`);
  console.log(`----------------------------------------------------------------\n`);

  try {
    const response = await fetch(`${BASE_URL}/risk/analyze-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: 'test_rate_limit_session',
        requests_per_minute: 10,
        time_between_clicks_ms: [400, 500],
        seats_selected_count: 1,
        rapid_seat_changes: 0,
        failed_booking_attempts: 0,
        session_duration_ms: 10000,
        repeated_action_count: 0
      })
    });

    console.log(`   HTTP Status: ${response.status}`);
    console.log(`   Header X-RateLimit-Limit:     ${response.headers.get('x-ratelimit-limit')}`);
    console.log(`   Header X-RateLimit-Remaining: ${response.headers.get('x-ratelimit-remaining')}`);
  } catch (err) {
    console.error(`   ❌ Public Endpoint Test Failed: ${err.message}`);
  }

  // ----------------------------------------------------------------
  // TEST 3: Looser Limit on Authenticated User Endpoints
  // ----------------------------------------------------------------
  console.log(`\n----------------------------------------------------------------`);
  console.log(`🔓 TEST 3: Authenticated User Endpoint Rate Limiting (/inspector/revocation-log)`);
  console.log(`   Configured Limit: ${config.AUTHED_MAX_REQUESTS_PER_WINDOW} req / ${config.AUTHED_RATE_LIMIT_WINDOW_MS / 1000}s`);
  console.log(`----------------------------------------------------------------\n`);

  try {
    const response = await fetch(`${BASE_URL}/inspector/revocation-log`, {
      headers: { 'Authorization': 'Bearer mock-jwt-token' }
    });

    console.log(`   HTTP Status: ${response.status}`);
    console.log(`   Header X-RateLimit-Limit:     ${response.headers.get('x-ratelimit-limit')}`);
    console.log(`   Header X-RateLimit-Remaining: ${response.headers.get('x-ratelimit-remaining')}`);
  } catch (err) {
    console.error(`   ❌ Authed Endpoint Test Failed: ${err.message}`);
  }

  console.log(`\n================================================================`);
  console.log(`📊 Tiered Rate Limiter Test Suite Complete.`);
  console.log(`================================================================\n`);
}

runRateLimiterTests();
