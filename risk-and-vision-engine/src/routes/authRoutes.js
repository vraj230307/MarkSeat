const express = require('express');
const router = express.Router();
const { authRateLimiter } = require('../middleware/rateLimiter');

// Apply stricter auth rate limiter with exponential backoff to all auth endpoints
router.use(authRateLimiter);

/**
 * POST /auth/login
 * User login authentication endpoint.
 */
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      error: 'Invalid Request',
      message: 'Email and password are required.'
    });
  }

  // Simulate authentication response
  console.log(`[AUTH API] Login attempt for account: ${email}`);
  return res.json({
    status: 'SUCCESS',
    message: 'User authenticated successfully.',
    user: { email, role: 'user' },
    token: 'mock-jwt-auth-token-12345'
  });
});

/**
 * POST /auth/signup
 * New user registration endpoint.
 */
router.post('/signup', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      error: 'Invalid Request',
      message: 'Email and password are required for registration.'
    });
  }

  console.log(`[AUTH API] Signup attempt for account: ${email}`);
  return res.json({
    status: 'SUCCESS',
    message: 'User account created successfully.',
    user: { email, role: 'user' }
  });
});

/**
 * POST /auth/password-reset
 * Account password reset request endpoint.
 */
router.post('/password-reset', (req, res) => {
  const { email } = req.body || {};

  if (!email) {
    return res.status(400).json({
      error: 'Invalid Request',
      message: 'Account email is required for password reset.'
    });
  }

  console.log(`[AUTH API] Password reset requested for account: ${email}`);
  return res.json({
    status: 'SUCCESS',
    message: 'Password reset link sent to email address.'
  });
});

module.exports = router;
