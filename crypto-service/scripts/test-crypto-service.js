const config = require('../src/config/env');
const db = require('../src/config/database');
const { issueTicket, verifyTicketSignature, hashBuyerIdentity } = require('../src/services/ticketService');
const { getCurrentTotpCode, verifyTotpCode } = require('../src/services/totpService');
const { verifyHashChain } = require('../src/services/hashChainService');

const BASE_URL = `http://localhost:${config.PORT}`;

async function runCryptoServiceTests() {
  console.log(`\n================================================================`);
  console.log(`🧪 FairPass / MarkSeat Crypto & Verification Service Test Suite`);
  console.log(`================================================================\n`);

  // ----------------------------------------------------------------
  // TEST 1: Ticket Issuance & JWT Signature Verification
  // ----------------------------------------------------------------
  console.log(`----------------------------------------------------------------`);
  console.log(`🎟️ TEST 1: Ticket Issuance & JWT Signature Verification`);
  console.log(`----------------------------------------------------------------`);

  const ticket = issueTicket({
    email: 'test.fan@example.com',
    event_id: 'evt_test_101',
    event_name: 'IND vs PAK T20 — Demo Event',
    section: 'Sec 101',
    row: 'Row B',
    seat_number: 'Seat 05'
  });

  console.log(`   Issued Ticket ID: ${ticket.ticket_id}`);
  console.log(`   JWT Token:        ${ticket.jwt_token.substring(0, 30)}...`);

  const decoded = verifyTicketSignature(ticket.jwt_token);
  if (decoded && decoded.ticket_id === ticket.ticket_id) {
    console.log(`   ✅ JWT Signature Verification: PASSED`);
  } else {
    console.error(`   ❌ JWT Signature Verification: FAILED`);
  }

  // ----------------------------------------------------------------
  // TEST 2: Signature Tamper Detection
  // ----------------------------------------------------------------
  console.log(`\n----------------------------------------------------------------`);
  console.log(`🛡️ TEST 2: Signature Tamper Detection`);
  console.log(`----------------------------------------------------------------`);

  const tamperedToken = ticket.jwt_token.substring(0, ticket.jwt_token.length - 6) + 'abcdef';
  const tamperedDecoded = verifyTicketSignature(tamperedToken);

  if (tamperedDecoded === null) {
    console.log(`   ✅ Tampered JWT Signature: REJECTED (Tampering correctly detected)`);
  } else {
    console.error(`   ❌ Tampered JWT Signature: FAILED TO DETECT TAMPERING`);
  }

  // ----------------------------------------------------------------
  // TEST 3: TOTP Rotating Code Verification & Expiry
  // ----------------------------------------------------------------
  console.log(`\n----------------------------------------------------------------`);
  console.log(`🔄 TEST 3: TOTP Rotating Code Verification & Expiry`);
  console.log(`----------------------------------------------------------------`);

  const totpCode = getCurrentTotpCode(ticket.totp_secret);
  console.log(`   Current TOTP Code: ${totpCode}`);

  const isValidTotp = verifyTotpCode(ticket.totp_secret, totpCode);
  console.log(`   Fresh Code Verification: ${isValidTotp ? '✅ PASSED' : '❌ FAILED'}`);

  const isInvalidTotp = verifyTotpCode(ticket.totp_secret, '999999');
  console.log(`   Fake/Expired Code Verification: ${!isInvalidTotp ? '✅ REJECTED (Correct)' : '❌ FAILED'}`);

  // ----------------------------------------------------------------
  // TEST 4: Tamper-Evident Audit Hash Chain Integrity & Tamper Detection
  // ----------------------------------------------------------------
  console.log(`\n----------------------------------------------------------------`);
  console.log(`⛓️ TEST 4: Tamper-Evident Audit Hash Chain Integrity`);
  console.log(`----------------------------------------------------------------`);

  const chainAudit = verifyHashChain();
  console.log(`   Initial Hash Chain State: ${chainAudit.isValid ? '✅ INTACT' : '❌ BROKEN'}`);
  console.log(`   Total Blocks Logged:      ${chainAudit.totalBlocks}`);
  console.log(`   Audit Status:             ${chainAudit.reason}`);

  // ----------------------------------------------------------------
  // TEST 5: Gate Verification Endpoint (ACCEPTED & REJECTED Cases)
  // ----------------------------------------------------------------
  console.log(`\n----------------------------------------------------------------`);
  console.log(`🚪 TEST 5: Gate Scan Verification Endpoint (HTTP POST /verify-gate-scan)`);
  console.log(`----------------------------------------------------------------\n`);

  try {
    // Case A: Valid Scan -> ACCEPTED
    const acceptedRes = await fetch(`${BASE_URL}/verify-gate-scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticket_token: ticket.jwt_token,
        totp_code: totpCode,
        scanned_email: 'test.fan@example.com'
      })
    });
    const acceptedData = await acceptedRes.json();
    console.log(`   Valid Gate Scan:    Status [${acceptedData.status}] - ${acceptedData.reason}`);

    // Case B: Mismatched Owner Email -> REJECTED
    const rejectedEmailRes = await fetch(`${BASE_URL}/verify-gate-scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticket_token: ticket.jwt_token,
        totp_code: totpCode,
        scanned_email: 'imposter@example.com'
      })
    });
    const rejectedEmailData = await rejectedEmailRes.json();
    console.log(`   Wrong Email Scan:   Status [${rejectedEmailData.status}] - ${rejectedEmailData.reason}`);

    // Case C: Invalid TOTP Code -> REJECTED
    const rejectedTotpRes = await fetch(`${BASE_URL}/verify-gate-scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticket_token: ticket.jwt_token,
        totp_code: '000000',
        scanned_email: 'test.fan@example.com'
      })
    });
    const rejectedTotpData = await rejectedTotpRes.json();
    console.log(`   Wrong TOTP Scan:    Status [${rejectedTotpData.status}] - ${rejectedTotpData.reason}`);

  } catch (err) {
    console.error(`   ❌ Gate Scan Request Failed: ${err.message}`);
    console.error(`      Make sure crypto-service server is running on port ${config.PORT}`);
  }

  console.log(`\n================================================================`);
  console.log(`📊 Crypto Service Test Suite Complete.`);
  console.log(`================================================================\n`);
}

runCryptoServiceTests();
