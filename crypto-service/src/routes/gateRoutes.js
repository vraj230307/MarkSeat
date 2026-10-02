const express = require('express');
const router = express.Router();
const { verifyTicketSignature, getTicketById, hashBuyerIdentity } = require('../services/ticketService');
const { verifyTotpCode } = require('../services/totpService');

/**
 * POST /verify-gate-scan
 * Venue gate scan endpoint running 3 ordered security checks:
 * 1. Signature Validity & Revocation Status
 * 2. Rotating QR Code Freshness
 * 3. Scanned Identity Match
 */
router.post('/verify-gate-scan', (req, res) => {
  try {
    const { ticket_token, totp_code, scanned_email } = req.body || {};

    if (!ticket_token || !totp_code || !scanned_email) {
      return res.status(400).json({
        status: 'REJECTED',
        reason: 'Missing required gate scan parameters: ticket_token, totp_code, scanned_email.'
      });
    }

    console.log(`\n[Gate Verification] Scanning ticket for email: ${scanned_email}...`);

    // CHECK 1: Signature Validity & Revocation Status
    const decodedPayload = verifyTicketSignature(ticket_token);
    if (!decodedPayload || !decodedPayload.ticket_id) {
      console.warn('[Gate Scan REJECTED] Signature invalid or token tampered.');
      return res.json({
        status: 'REJECTED',
        reason: 'Invalid or tampered ticket signature.',
        check_failed: 'signature_validity'
      });
    }

    const ticket = getTicketById(decodedPayload.ticket_id);
    if (!ticket) {
      console.warn(`[Gate Scan REJECTED] Ticket ID ${decodedPayload.ticket_id} not found in database.`);
      return res.json({
        status: 'REJECTED',
        reason: 'Ticket record not found in system database.',
        check_failed: 'database_lookup'
      });
    }

    if (ticket.is_revoked) {
      console.warn(`[Gate Scan REJECTED] Ticket ID ${ticket.ticket_id} is marked as REVOKED.`);
      return res.json({
        status: 'REJECTED',
        reason: 'Ticket has been revoked due to security violation.',
        check_failed: 'ticket_revocation'
      });
    }

    // CHECK 2: Rotating QR Code Freshness
    const isTotpValid = verifyTotpCode(ticket.totp_secret, totp_code);
    if (!isTotpValid) {
      console.warn(`[Gate Scan REJECTED] TOTP code "${totp_code}" is invalid or expired.`);
      return res.json({
        status: 'REJECTED',
        reason: 'Invalid or expired rotating QR code.',
        check_failed: 'code_freshness'
      });
    }

    // CHECK 3: Scanned Identity Match against ticket's bound identity hash
    const scannedHash = hashBuyerIdentity(scanned_email);
    if (scannedHash !== ticket.buyer_identity_hash) {
      console.warn(`[Gate Scan REJECTED] Scanned email hash (${scannedHash.substring(0, 8)}...) does not match owner hash (${ticket.buyer_identity_hash.substring(0, 8)}...).`);
      return res.json({
        status: 'REJECTED',
        reason: 'Scanned identity does not match ticket owner.',
        check_failed: 'identity_match'
      });
    }

    console.log(`✅ [Gate Scan ACCEPTED] Venue entry granted for ${scanned_email} (Ticket: ${ticket.ticket_id})`);

    return res.json({
      status: 'ACCEPTED',
      reason: 'Gate verification passed all 3 security checks.',
      details: {
        ticket_id: ticket.ticket_id,
        event_name: ticket.event_name,
        section: ticket.section,
        row: ticket.row,
        seat_number: ticket.seat_number,
        owner_email: scanned_email
      }
    });

  } catch (error) {
    console.error('[POST /verify-gate-scan Error]:', error);
    return res.status(500).json({
      status: 'REJECTED',
      reason: `Internal error during gate verification: ${error.message}`
    });
  }
});

module.exports = router;
