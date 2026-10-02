const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const config = require('../config/env');

/**
 * Generates a unique Base32 TOTP secret for a ticket.
 */
function generateTotpSecret() {
  const secretObj = speakeasy.generateSecret({ length: 20, name: 'FairPass/MarkSeat Ticket' });
  return secretObj.base32;
}

/**
 * Computes the current valid rotating TOTP code.
 */
function getCurrentTotpCode(base32Secret) {
  return speakeasy.totp({
    secret: base32Secret,
    encoding: 'base32',
    step: config.TOTP_STEP_SECONDS
  });
}

/**
 * Calculates remaining seconds until the current TOTP code rotates.
 */
function getSecondsUntilNextRotation() {
  const nowSec = Math.floor(Date.now() / 1000);
  const step = config.TOTP_STEP_SECONDS;
  return step - (nowSec % step);
}

/**
 * Verifies a submitted TOTP code allowing for minor clock drift window.
 */
function verifyTotpCode(base32Secret, submittedCode) {
  if (!base32Secret || !submittedCode) return false;

  return speakeasy.totp.verify({
    secret: base32Secret,
    encoding: 'base32',
    token: String(submittedCode).trim(),
    step: config.TOTP_STEP_SECONDS,
    window: config.TOTP_WINDOW
  });
}

/**
 * Generates a Base64 QR code Data URL representing the rotating payload.
 */
async function generateQrCodeDataUrl(ticketId, totpCode) {
  const payload = JSON.stringify({
    ticket_id: ticketId,
    totp_code: totpCode,
    timestamp: Date.now()
  });

  return await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' }
  });
}

module.exports = {
  generateTotpSecret,
  getCurrentTotpCode,
  getSecondsUntilNextRotation,
  verifyTotpCode,
  generateQrCodeDataUrl
};
