const express = require('express');
const router = express.Router();
const { issueTicket, revokeTicket, getRevokedTicketsFeed, getTicketById } = require('../services/ticketService');
const { getCurrentTotpCode, getSecondsUntilNextRotation, generateQrCodeDataUrl } = require('../services/totpService');

/**
 * POST /issue-ticket
 * Issues a signed, identity-locked ticket.
 */
router.post('/issue-ticket', (req, res) => {
  try {
    const { email, event_id, event_name, section, row, seat_number } = req.body || {};

    if (!email || !event_id || !event_name || !section || !row || !seat_number) {
      return res.status(400).json({
        error: 'Invalid Request Body',
        message: 'Required fields: email, event_id, event_name, section, row, seat_number.'
      });
    }

    const ticket = issueTicket({ email, event_id, event_name, section, row, seat_number });
    return res.status(201).json({
      message: 'Ticket issued successfully.',
      ticket
    });
  } catch (error) {
    console.error('[POST /issue-ticket Error]:', error);
    return res.status(500).json({
      error: 'Failed to issue ticket.',
      message: error.message
    });
  }
});

/**
 * GET /ticket-qr/:ticketId
 * Returns fresh rotating QR code image (base64) and current valid TOTP code.
 */
router.get('/ticket-qr/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = getTicketById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        error: 'Not Found',
        message: `No ticket found with ID: ${ticketId}`
      });
    }

    if (ticket.is_revoked) {
      return res.status(410).json({
        error: 'Revoked Ticket',
        message: 'This ticket has been revoked and cannot generate valid QR codes.'
      });
    }

    const currentCode = getCurrentTotpCode(ticket.totp_secret);
    const expiresSeconds = getSecondsUntilNextRotation();
    const qrDataUrl = await generateQrCodeDataUrl(ticket.ticket_id, currentCode);

    return res.json({
      ticket_id: ticket.ticket_id,
      totp_code: currentCode,
      qr_code_image_base64: qrDataUrl,
      rotates_in_seconds: expiresSeconds
    });
  } catch (error) {
    console.error('[GET /ticket-qr Error]:', error);
    return res.status(500).json({
      error: 'Failed to generate ticket QR code.',
      message: error.message
    });
  }
});

/**
 * POST /tickets/revoke
 * Accepts ticket identifying details and revokes matching ticket.
 * THIS IS THE EXACT ENDPOINT risk-and-vision-engine's Vision Inspector calls!
 */
router.post('/tickets/revoke', (req, res) => {
  try {
    const { event_name, section, row, seat_number, ticket_id } = req.body || {};

    console.log(`\n[CRYPTO SERVICE POST /tickets/revoke] Revocation request received for ${event_name || ''} Sec ${section || ''} Row ${row || ''} Seat ${seat_number || ''}`);

    const result = revokeTicket({ event_name, section, row, seat_number, ticket_id });

    // Respond with HTTP 200 and confirmation status JSON body
    return res.status(200).json(result);
  } catch (error) {
    console.error('[POST /tickets/revoke Error]:', error);
    return res.status(500).json({
      error: 'Failed to revoke ticket.',
      message: error.message
    });
  }
});

/**
 * GET /tickets/revoked/feed
 * Returns list of recently revoked tickets.
 */
router.get('/tickets/revoked/feed', (req, res) => {
  try {
    const feed = getRevokedTicketsFeed();
    return res.json({
      total_revoked: feed.length,
      revoked_tickets: feed
    });
  } catch (error) {
    console.error('[GET /tickets/revoked/feed Error]:', error);
    return res.status(500).json({
      error: 'Failed to fetch revoked tickets feed.',
      message: error.message
    });
  }
});

module.exports = router;
