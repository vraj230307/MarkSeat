const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../services/dashboardService');

/**
 * GET /dashboard/stats
 * Admin dashboard metrics and live tamper-evident hash chain status.
 */
router.get('/stats', (req, res) => {
  try {
    const stats = getDashboardStats();
    return res.json(stats);
  } catch (error) {
    console.error('[GET /dashboard/stats Error]:', error);
    return res.status(500).json({
      error: 'Failed to fetch dashboard statistics.',
      message: error.message
    });
  }
});

module.exports = router;
