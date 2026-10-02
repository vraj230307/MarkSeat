const config = require('../src/config/env');

async function testCryptoServiceConnection() {
  const targetUrl = config.TICKET_SERVICE_REVOKE_URL;

  console.log(`\n================================================================`);
  console.log(`🔗 Cross-Service Connection Test (Crypto/Ticket Revocation Service)`);
  console.log(`   Target URL: ${targetUrl}`);
  console.log(`================================================================\n`);

  const dummyPayload = {
    section: 'SEC_TEST_101',
    row: 'ROW_TEST_A',
    seat_number: 'SEAT_TEST_12',
    event_name: 'CONNECTION_TEST_EVENT'
  };

  console.log(`[Request Payload Sent]:`);
  console.log(JSON.stringify(dummyPayload, null, 2));
  console.log(`\nSending HTTP POST to ${targetUrl}...`);

  const startTime = Date.now();

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dummyPayload)
    });

    const elapsedMs = Date.now() - startTime;
    const status = response.status;
    const statusText = response.statusText;

    let responseData = null;
    try {
      responseData = await response.json();
    } catch (e) {
      responseData = await response.text();
    }

    console.log(`\n----------------------------------------------------------------`);
    if (response.ok) {
      console.log(`✅ TARGET SERVICE RESPONDED SUCCESSFULLY!`);
      console.log(`   - HTTP Status Code: ${status} ${statusText}`);
      console.log(`   - Response Time:    ${elapsedMs} ms`);
      console.log(`   - Response Body:`);
      console.log(JSON.stringify(responseData, null, 2));
    } else {
      console.warn(`⚠️ TARGET SERVICE RESPONDED WITH HTTP ERROR!`);
      console.warn(`   - HTTP Status Code: ${status} ${statusText}`);
      console.warn(`   - Response Time:    ${elapsedMs} ms`);
      console.warn(`   - Response Body:`);
      console.warn(JSON.stringify(responseData, null, 2));
    }
    console.log(`----------------------------------------------------------------\n`);

  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    console.error(`\n----------------------------------------------------------------`);
    console.error(`❌ TARGET SERVICE IS UNREACHABLE!`);
    console.error(`   - Target URL:       ${targetUrl}`);
    console.error(`   - Error Message:    ${error.message}`);
    console.error(`   - Time Elapsed:     ${elapsedMs} ms`);
    console.error(`   - Cause:            Connection refused, network timeout, or service offline.`);
    console.error(`   - Action Required:  Ensure target service is running on the configured port.`);
    console.error(`----------------------------------------------------------------\n`);
    process.exit(1);
  }
}

testCryptoServiceConnection();
