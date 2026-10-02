const express = require('express');
const router = express.Router();
const multer = require('multer');
const { analyzeResaleListing, getRevocationLogs } = require('../services/visionInspectorService');
const { publicRateLimiter, authedRateLimiter } = require('../middleware/rateLimiter');

// Configure multer for file uploads in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * POST /inspector/analyze-listing
 * Accepts screenshot image (multipart/form-data or base64 JSON) and inspects for scalper / black market activity.
 */
router.post('/analyze-listing', publicRateLimiter, upload.single('image'), async (req, res) => {
  try {
    let imageInput = null;
    let mimeType = 'image/jpeg';

    if (req.file) {
      imageInput = req.file.buffer;
      mimeType = req.file.mimetype || 'image/jpeg';
    } else if (req.body && req.body.image) {
      imageInput = req.body.image;
      if (req.body.mime_type) {
        mimeType = req.body.mime_type;
      }
    } else {
      return res.status(400).json({
        error: 'No screenshot image provided. Send multipart file field "image" or JSON field "image" (base64).'
      });
    }

    console.log(`\n======================================================`);
    console.log(`[POST /inspector/analyze-listing] Inspecting Resale Post Screenshot...`);
    console.log(`======================================================`);

    const result = await analyzeResaleListing(imageInput, mimeType);
    return res.json(result);

  } catch (error) {
    console.error('[POST /inspector/analyze-listing Error]:', error);
    return res.status(500).json({
      error: 'Failed to inspect resale listing screenshot.',
      message: error.message
    });
  }
});

/**
 * GET /inspector/revocation-log
 * Returns past ticket revocation attempts and outcomes.
 */
router.get('/revocation-log', authedRateLimiter, (req, res) => {
  try {
    const logs = getRevocationLogs();
    return res.json({
      total_attempts: logs.length,
      logs
    });
  } catch (error) {
    console.error('[GET /inspector/revocation-log Error]:', error);
    return res.status(500).json({
      error: 'Failed to fetch revocation logs.',
      message: error.message
    });
  }
});

module.exports = router;
