const express = require('express');
const router = express.Router();
const { evaluateThresholds } = require('../services/thresholdService');
const { analyzeBorderlineSession } = require('../services/geminiRiskService');
const { generateChallenge, verifyChallenge } = require('../services/challengeService');
const { publicRateLimiter, authedRateLimiter } = require('../middleware/rateLimiter');

/**
 * POST /risk/analyze-session
 * Unified endpoint analyzing real-time session telemetry against thresholds and Gemini reasoning.
 */
router.post('/analyze-session', publicRateLimiter, async (req, res) => {
  try {
    const session = req.body;

    if (!session || typeof session !== 'object' || !session.session_id) {
      return res.status(400).json({
        error: 'Invalid session data. Required field: session_id.'
      });
    }

    console.log(`\n======================================================`);
    console.log(`[POST /risk/analyze-session] Analyzing Session: ${session.session_id}`);
    console.log(`======================================================`);

    // Step 1: Rule-Based Threshold Evaluation
    const thresholdOutcome = evaluateThresholds(session);
    console.log(`[Threshold Filter] Violations Count: ${thresholdOutcome.violationCount}`);
    if (thresholdOutcome.violationCount > 0) {
      console.log(`[Threshold Violations]:`, JSON.stringify(thresholdOutcome.violations, null, 2));
    }

    // Step 2: Immediate BLOCKED if 2 or more violations detected
    if (thresholdOutcome.isBlocked) {
      console.log(`[Verdict] BLOCKED via Threshold Filter (No Gemini call made).`);
      return res.json({
        session_id: session.session_id,
        verdict: 'BLOCKED',
        reason: 'threshold_violation',
        challenge_id: null,
        details: {
          threshold_violations: thresholdOutcome.violations,
          gemini_verdict: null
        }
      });
    }

    // Step 3: Borderline sessions -> Pass to Gemini Reasoning Layer
    if (thresholdOutcome.isBorderline) {
      console.log(`[Threshold Filter] Session is BORDERLINE. Proceeding to Gemini reasoning...`);
      const geminiResult = await analyzeBorderlineSession(session, thresholdOutcome.violations);

      let finalVerdict = 'ALLOWED';
      let challengeId = null;

      if (geminiResult.verdict === 'bot') {
        finalVerdict = 'BLOCKED';
      } else if (geminiResult.verdict === 'uncertain') {
        finalVerdict = 'CHALLENGE_REQUIRED';
        // Generate challenge automatically for uncertain verdict
        const challengeObj = await generateChallenge(session.seat_map_image || null);
        challengeId = challengeObj.challenge_id;
      } else {
        finalVerdict = 'ALLOWED';
      }

      console.log(`[Final Verdict] ${finalVerdict} | Reason: ${geminiResult.reasoning}`);

      return res.json({
        session_id: session.session_id,
        verdict: finalVerdict,
        reason: geminiResult.reasoning,
        challenge_id: challengeId,
        details: {
          threshold_violations: thresholdOutcome.violations,
          gemini_verdict: geminiResult
        }
      });
    }

    // Step 4: 0 violations & clean pattern -> ALLOWED
    console.log(`[Verdict] ALLOWED (Passed all threshold checks cleanly).`);
    return res.json({
      session_id: session.session_id,
      verdict: 'ALLOWED',
      reason: 'session_passed_thresholds',
      challenge_id: null,
      details: {
        threshold_violations: [],
        gemini_verdict: null
      }
    });

  } catch (error) {
    console.error('[POST /risk/analyze-session Error]:', error);
    return res.status(500).json({
      error: 'Failed to analyze session telemetry.',
      message: error.message
    });
  }
});

/**
 * POST /risk/generate-challenge
 * Accepts seat map image (base64) and uses Gemini Vision to generate visual question.
 */
router.post('/generate-challenge', publicRateLimiter, async (req, res) => {
  try {
    const { seat_map_image, mime_type } = req.body || {};
    const challenge = await generateChallenge(seat_map_image || null, mime_type || 'image/png');
    
    return res.json({
      question: challenge.question,
      challenge_id: challenge.challenge_id
    });
  } catch (error) {
    console.error('[POST /risk/generate-challenge Error]:', error);
    return res.status(500).json({
      error: 'Failed to generate visual challenge.',
      message: error.message
    });
  }
});

/**
 * POST /risk/verify-challenge
 * Verifies user's submitted answer for a challenge ID.
 */
router.post('/verify-challenge', authedRateLimiter, (req, res) => {
  try {
    const { challenge_id, submitted_answer } = req.body || {};

    if (!challenge_id) {
      return res.status(400).json({
        passed: false,
        error: 'challenge_id is required.'
      });
    }

    const verification = verifyChallenge(challenge_id, submitted_answer);
    return res.json(verification);
  } catch (error) {
    console.error('[POST /risk/verify-challenge Error]:', error);
    return res.status(500).json({
      passed: false,
      error: 'Failed to verify challenge response.',
      message: error.message
    });
  }
});

module.exports = router;
