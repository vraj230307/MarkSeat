const config = require('../src/config/env');

const BASE_URL = `http://localhost:${config.PORT}`;

/**
 * Creates sample ticket resale post images as SVG Data URIs/Base64 strings for Gemini Vision testing
 */
function createSampleBlackMarketListingSvgBase64() {
  const svg = `
<svg width="500" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="500" height="400" fill="#111827"/>
  <rect x="20" y="20" width="460" height="360" rx="12" fill="#1f2937" stroke="#374151" stroke-width="2"/>
  
  <text x="40" y="60" fill="#38bdf8" font-size="22" font-family="sans-serif" font-weight="bold">VIP Ticket Marketplace</text>
  <text x="40" y="100" fill="#f8fafc" font-size="18" font-family="sans-serif" font-weight="bold">Taylor Swift - The Eras Tour</text>
  
  <text x="40" y="140" fill="#94a3b8" font-size="14" font-family="sans-serif">Venue: Levi's Stadium</text>
  <text x="40" y="170" fill="#f1f5f9" font-size="16" font-family="sans-serif">Section: Sec 112 | Row: Row J | Seat: Seat 14</text>
  
  <rect x="40" y="200" width="420" height="60" rx="8" fill="#ef4444" fill-opacity="0.2" stroke="#ef4444" stroke-width="1"/>
  <text x="60" y="238" fill="#f8fafc" font-size="20" font-family="sans-serif" font-weight="bold">Asked Price: $750.00 USD</text>
  <text x="280" y="238" fill="#94a3b8" font-size="14" font-family="sans-serif">(Face Value: $120.00)</text>
  
  <text x="40" y="300" fill="#cbd5e1" font-size="14" font-family="sans-serif">Description: Can't make the show anymore! Instant ticket transfer available.</text>
  <text x="40" y="325" fill="#cbd5e1" font-size="14" font-family="sans-serif">First come first serve! DM me for payment via crypto/Zelle.</text>
</svg>
`;
  return Buffer.from(svg).toString('base64');
}

function createSampleLegitimateResaleListingSvgBase64() {
  const svg = `
<svg width="500" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="500" height="400" fill="#0f172a"/>
  <rect x="20" y="20" width="460" height="360" rx="12" fill="#1e293b" stroke="#334155" stroke-width="2"/>
  
  <text x="40" y="60" fill="#4ade80" font-size="22" font-family="sans-serif" font-weight="bold">FairPass Fan Resale</text>
  <text x="40" y="100" fill="#f8fafc" font-size="18" font-family="sans-serif" font-weight="bold">Coldplay - Music of the Spheres</text>
  
  <text x="40" y="140" fill="#94a3b8" font-size="14" font-family="sans-serif">Venue: Rose Bowl Stadium</text>
  <text x="40" y="170" fill="#f1f5f9" font-size="16" font-family="sans-serif">Section: Sec 22 | Row: Row C | Seat: Seat 5</text>
  
  <rect x="40" y="200" width="420" height="60" rx="8" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e" stroke-width="1"/>
  <text x="60" y="238" fill="#f8fafc" font-size="20" font-family="sans-serif" font-weight="bold">Asked Price: $75.00 USD</text>
  <text x="280" y="238" fill="#94a3b8" font-size="14" font-family="sans-serif">(Face Value: $75.00)</text>
  
  <text x="40" y="300" fill="#cbd5e1" font-size="14" font-family="sans-serif">Description: Selling at original face value because a friend dropped out.</text>
</svg>
`;
  return Buffer.from(svg).toString('base64');
}

async function runInspectorTests() {
  console.log(`\n================================================================`);
  console.log(`👁️ FairPass / MarkSeat Gemini Vision Black-Market Inspector Test Suite`);
  console.log(`   Target Endpoint: ${BASE_URL}/inspector/analyze-listing`);
  console.log(`================================================================\n`);

  const testListings = [
    {
      name: '1. Flagged Black-Market Scalper Listing ($750 vs $120 face value)',
      base64Image: createSampleBlackMarketListingSvgBase64(),
      mimeType: 'image/svg+xml'
    },
    {
      name: '2. Legitimate Fan Resale Listing ($75 vs $75 face value)',
      base64Image: createSampleLegitimateResaleListingSvgBase64(),
      mimeType: 'image/svg+xml'
    }
  ];

  for (const testCase of testListings) {
    console.log(`----------------------------------------------------------------`);
    console.log(`📸 Running Inspection: ${testCase.name}`);

    try {
      const response = await fetch(`${BASE_URL}/inspector/analyze-listing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: testCase.base64Image,
          mime_type: testCase.mimeType
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`   ❌ HTTP Error ${response.status}: ${errorText}`);
        continue;
      }

      const result = await response.json();
      console.log(`   📌 Black-Market Listing: ${result.is_black_market_listing ? '🚨 YES (Flagged)' : '✅ NO (Legitimate)'}`);
      console.log(`   📌 Event Name:           ${result.event_name}`);
      console.log(`   📌 Ticket Location:      Section ${result.section}, Row ${result.row}, Seat ${result.seat_number}`);
      console.log(`   📌 Asked Price:          $${result.asked_price}`);
      console.log(`   📌 Face Value Estimate:  $${result.face_value_estimate}`);
      console.log(`   📌 Reasoning Rationale:  ${result.reasoning}`);

      if (result.revocation_attempt) {
        const attempt = result.revocation_attempt;
        console.log(`\n   ⚡ Cross-Service Ticket Revocation Attempt:`);
        console.log(`      - Target URL:     ${attempt.target_url}`);
        console.log(`      - Payload Sent:   ${JSON.stringify(attempt.ticket)}`);
        console.log(`      - Status Outcome: ${attempt.status}`);
        console.log(`      - HTTP Response:  ${JSON.stringify(attempt.response)}`);

        if (attempt.status === 'FAILED') {
          console.error(`      ❌ REVOCATION CALL FAILED! Target service at ${attempt.target_url} was unreachable or returned error.`);
        }
      } else {
        console.log(`   ℹ️ Revocation Outcome:   No revocation triggered (Legitimate resale listing).`);
      }

    } catch (err) {
      console.error(`   ❌ Request Failed: ${err.message}`);
      console.error(`      Make sure server is running via 'npm start' on port ${config.PORT}`);
    }
  }

  // Fetch Revocation Log
  console.log(`\n----------------------------------------------------------------`);
  console.log(`📜 Fetching Ticket Revocation Audit Log (GET /inspector/revocation-log)...`);
  try {
    const logRes = await fetch(`${BASE_URL}/inspector/revocation-log`);
    const logData = await logRes.json();
    console.log(`   Total Revocation Logs: ${logData.total_attempts}`);
    console.log(JSON.stringify(logData.logs, null, 2));
  } catch (err) {
    console.error(`   ❌ Failed to fetch revocation log: ${err.message}`);
  }

  console.log(`\n================================================================`);
  console.log(`📊 Inspector Test Suite Finished.`);
  console.log(`================================================================\n`);
}

runInspectorTests();
