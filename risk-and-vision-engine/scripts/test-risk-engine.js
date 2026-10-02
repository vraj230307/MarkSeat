const config = require('../src/config/env');

const BASE_URL = `http://localhost:${config.PORT}`;

const sampleSessions = [
  {
    name: '1. Clearly Human Session',
    payload: {
      session_id: 'session_human_001',
      requests_per_minute: 18,
      time_between_clicks_ms: [450, 620, 380, 510, 780, 420],
      seats_selected_count: 2,
      rapid_seat_changes: 1,
      failed_booking_attempts: 0,
      session_duration_ms: 14500,
      repeated_action_count: 0
    },
    expected: 'ALLOWED'
  },
  {
    name: '2. Clearly Bot Session (High Frequency Burst)',
    payload: {
      session_id: 'session_bot_burst_002',
      requests_per_minute: 120,
      time_between_clicks_ms: [15, 12, 18, 10, 14],
      seats_selected_count: 15,
      rapid_seat_changes: 12,
      failed_booking_attempts: 8,
      session_duration_ms: 800,
      repeated_action_count: 9
    },
    expected: 'BLOCKED (Threshold Filter)'
  },
  {
    name: '3. Scalper Seat Spinner Bot',
    payload: {
      session_id: 'session_bot_spinner_003',
      requests_per_minute: 85,
      time_between_clicks_ms: [45, 50, 40, 48],
      seats_selected_count: 14,
      rapid_seat_changes: 8,
      failed_booking_attempts: 2,
      session_duration_ms: 1200,
      repeated_action_count: 5
    },
    expected: 'BLOCKED (Threshold Filter)'
  },
  {
    name: '4. Borderline Session (Single Accidental Fast Click)',
    payload: {
      session_id: 'session_borderline_accidental_004',
      requests_per_minute: 42,
      time_between_clicks_ms: [85, 340, 420, 290, 510],
      seats_selected_count: 3,
      rapid_seat_changes: 2,
      failed_booking_attempts: 1,
      session_duration_ms: 8500,
      repeated_action_count: 1
    },
    expected: 'Gemini Reasoning Layer (ALLOWED / CHALLENGE_REQUIRED)'
  },
  {
    name: '5. Borderline Session (Robotic Clockwork Timing)',
    payload: {
      session_id: 'session_borderline_clockwork_005',
      requests_per_minute: 55,
      time_between_clicks_ms: [200, 200, 201, 200, 200],
      seats_selected_count: 4,
      rapid_seat_changes: 2,
      failed_booking_attempts: 0,
      session_duration_ms: 3500,
      repeated_action_count: 2
    },
    expected: 'Gemini Reasoning Layer (BLOCKED / CHALLENGE_REQUIRED)'
  },
  {
    name: '6. Hesitant Human (Failed Payment Attempt)',
    payload: {
      session_id: 'session_hesitant_human_006',
      requests_per_minute: 25,
      time_between_clicks_ms: [650, 890, 1100, 750, 420],
      seats_selected_count: 4,
      rapid_seat_changes: 3,
      failed_booking_attempts: 6,
      session_duration_ms: 45000,
      repeated_action_count: 2
    },
    expected: 'Gemini Reasoning Layer (ALLOWED - Human Rationale)'
  }
];

async function runRiskEngineTests() {
  console.log(`\n================================================================`);
  console.log(`🔍 FairPass / MarkSeat AI Risk Engine Test Suite`);
  console.log(`   Target Endpoint: ${BASE_URL}/risk/analyze-session`);
  console.log(`================================================================\n`);

  let passedCount = 0;

  for (const testCase of sampleSessions) {
    console.log(`----------------------------------------------------------------`);
    console.log(`🧪 Running Test: ${testCase.name}`);
    console.log(`   Session ID:   ${testCase.payload.session_id}`);
    console.log(`   Expected:     ${testCase.expected}`);

    try {
      const response = await fetch(`${BASE_URL}/risk/analyze-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase.payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`   ❌ HTTP Error ${response.status}: ${errorText}`);
        continue;
      }

      const result = await response.json();
      console.log(`   📌 Response Verdict: [${result.verdict}]`);
      console.log(`   📌 Reason:           ${result.reason}`);
      console.log(`   📌 Challenge ID:     ${result.challenge_id || 'None'}`);
      console.log(`   📌 Violations Count: ${result.details.threshold_violations ? result.details.threshold_violations.length : 0}`);
      
      if (result.details.gemini_verdict) {
        console.log(`   🤖 Gemini Verdict:   ${JSON.stringify(result.details.gemini_verdict)}`);
      } else {
        console.log(`   ⚡ Gemini Call:       Bypassed (Fast Rule Filter Decision)`);
      }

      passedCount++;
    } catch (err) {
      console.error(`   ❌ Request Failed: ${err.message}`);
      console.error(`      Make sure server is running via 'npm start' on port ${config.PORT}`);
    }
  }

  console.log(`\n================================================================`);
  console.log(`📊 Test Execution Completed: ${passedCount} / ${sampleSessions.length} scenarios tested.`);
  console.log(`================================================================\n`);
}

runRiskEngineTests();
