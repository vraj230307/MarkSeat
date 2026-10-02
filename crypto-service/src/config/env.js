const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret_key_8f4b29a1e03c7d6e5a4b3c2d1e0f9a8b',
  TOTP_STEP_SECONDS: parseInt(process.env.TOTP_STEP_SECONDS || '30', 10),
  TOTP_WINDOW: parseInt(process.env.TOTP_WINDOW || '1', 10),
  DB_PATH: process.env.DB_PATH || path.resolve(__dirname, '../../fairpass.sqlite'),
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3001', 'http://localhost:5173']
};

module.exports = config;
