const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  MAX_ACTIONS_PER_MIN: parseInt(process.env.MAX_ACTIONS_PER_MIN || '60', 10),
  MIN_CLICK_INTERVAL_MS: parseInt(process.env.MIN_CLICK_INTERVAL_MS || '100', 10),
  MAX_SEATS_SELECTED_BURST: parseInt(process.env.MAX_SEATS_SELECTED_BURST || '10', 10),
  MAX_SEAT_CHANGES_WINDOW: parseInt(process.env.MAX_SEAT_CHANGES_WINDOW || '5', 10),
  MAX_FAILED_ATTEMPTS: parseInt(process.env.MAX_FAILED_ATTEMPTS || '5', 10),
  MIN_SESSION_DURATION_MS: parseInt(process.env.MIN_SESSION_DURATION_MS || '2000', 10),
  REPEATED_ACTION_THRESHOLD: parseInt(process.env.REPEATED_ACTION_THRESHOLD || '3', 10),
  CHALLENGE_EXPIRY_SECONDS: parseInt(process.env.CHALLENGE_EXPIRY_SECONDS || '60', 10),
  TICKET_SERVICE_REVOKE_URL: process.env.TICKET_SERVICE_REVOKE_URL || 'http://localhost:3000/tickets/revoke',
  PORT: parseInt(process.env.PORT || '3001', 10),
  TARGET_BOOKING_URL: process.env.TARGET_BOOKING_URL || 'http://localhost:3001/demo-booking',

  // Rate Limiting Configurations (Configurable via ENV)
  // 1. Authentication Routes (Stricter + Exponential Backoff)
  AUTH_RATE_LIMIT_WINDOW_MS: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10),
  AUTH_MAX_REQUESTS_PER_WINDOW: parseInt(process.env.AUTH_MAX_REQUESTS_PER_WINDOW || '5', 10),
  AUTH_BASE_BACKOFF_MS: parseInt(process.env.AUTH_BASE_BACKOFF_MS || '2000', 10),
  AUTH_BACKOFF_FACTOR: parseFloat(process.env.AUTH_BACKOFF_FACTOR || '2'),
  AUTH_MAX_BACKOFF_MS: parseInt(process.env.AUTH_MAX_BACKOFF_MS || '300000', 10),

  // 2. Public Endpoints (Moderate Limits)
  PUBLIC_RATE_LIMIT_WINDOW_MS: parseInt(process.env.PUBLIC_RATE_LIMIT_WINDOW_MS || '60000', 10),
  PUBLIC_MAX_REQUESTS_PER_WINDOW: parseInt(process.env.PUBLIC_MAX_REQUESTS_PER_WINDOW || '60', 10),

  // 3. Authenticated Endpoints (Looser Limits)
  AUTHED_RATE_LIMIT_WINDOW_MS: parseInt(process.env.AUTHED_RATE_LIMIT_WINDOW_MS || '60000', 10),
  AUTHED_MAX_REQUESTS_PER_WINDOW: parseInt(process.env.AUTHED_MAX_REQUESTS_PER_WINDOW || '200', 10)
};

module.exports = config;
