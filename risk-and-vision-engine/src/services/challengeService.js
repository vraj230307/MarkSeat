const crypto = require('crypto');
const { getGoogleGenAIClient, getGoogleGenerativeAIClient } = require('../config/gemini');
const config = require('../config/env');

// In-memory challenge store: challenge_id => { question, correct_answer, expires_at }
const challengesStore = new Map();

// Model candidates to attempt in order of preference
const MODEL_CANDIDATES = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

/**
 * Periodically cleans up expired challenges from memory.
 */
function cleanupExpiredChallenges() {
  const now = Date.now();
  for (const [id, challenge] of challengesStore.entries()) {
    if (now > challenge.expires_at) {
      challengesStore.delete(id);
    }
  }
}
setInterval(cleanupExpiredChallenges, 10000);

/**
 * Creates a default base64 seat map image if none is provided.
 */
function getDefaultSeatMapBase64() {
  return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
}

/**
 * Generates a dynamic visual challenge using Gemini Vision based on a seat map image.
 * 
 * @param {string} [seatMapBase64] - Base64 encoded seat map image
 * @param {string} [mimeType='image/png'] - Image MIME type
 * @returns {Promise<Object>} Object containing { challenge_id, question }
 */
async function generateChallenge(seatMapBase64, mimeType = 'image/png') {
  const challengeId = `ch_${crypto.randomUUID()}`;
  const base64Data = (seatMapBase64 || getDefaultSeatMapBase64()).replace(/^data:image\/\w+;base64,/, '');

  const prompt = `
Look at this venue seat map layout. 
Generate ONE simple, clear, verifiable visual question about the seats in this layout (e.g., 'How many red/occupied seats are shown?', 'What color is seat B3?', or 'How many total available seats are in Row A?').
Also provide the exact, unambiguous correct answer to your question.

Respond ONLY in JSON format matching this schema:
{
  "question": "Clear, objective visual verification question",
  "correct_answer": "Exact answer (e.g. '3', 'red', '5')"
}
`;

  console.log(`\n[Challenge Generator] Creating dynamic challenge for ID: ${challengeId}...`);

  let question = 'How many occupied (red) seats are shown in Row B?';
  let correctAnswer = '3';
  let rawText = '';

  for (const modelName of MODEL_CANDIDATES) {
    try {
      try {
        const genAiClient = getGoogleGenAIClient();
        const response = await genAiClient.models.generateContent({
          model: modelName,
          contents: [
            { inlineData: { mimeType, data: base64Data } },
            prompt
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                question: { type: 'STRING' },
                correct_answer: { type: 'STRING' }
              },
              required: ['question', 'correct_answer']
            }
          }
        });
        rawText = response.text;
      } catch (genAiError) {
        const googleGenAI = getGoogleGenerativeAIClient();
        const model = googleGenAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: 'application/json' }
        });
        const result = await model.generateContent([
          { inlineData: { mimeType, data: base64Data } },
          prompt
        ]);
        rawText = result.response.text();
      }

      if (rawText) break;
    } catch (err) {
      console.warn(`[Challenge Generator] Model ${modelName} failed:`, err.message);
    }
  }

  if (rawText) {
    try {
      let parsed = null;
      try {
        parsed = JSON.parse(rawText);
      } catch (err) {
        const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleaned);
      }

      if (parsed.question && parsed.correct_answer) {
        question = parsed.question;
        correctAnswer = String(parsed.correct_answer).trim();
      }
    } catch (e) {
      console.error('[Challenge Generator Error] Failed parsing response:', e.message);
    }
  }

  const expiryMs = (config.CHALLENGE_EXPIRY_SECONDS || 60) * 1000;
  const expiresAt = Date.now() + expiryMs;

  challengesStore.set(challengeId, {
    question,
    correct_answer: correctAnswer,
    expires_at: expiresAt
  });

  console.log(`[Challenge Created] ID: ${challengeId} | Question: "${question}" | Answer: "${correctAnswer}" (Expires in ${config.CHALLENGE_EXPIRY_SECONDS}s)`);

  return {
    challenge_id: challengeId,
    question
  };
}

/**
 * Verifies a user submitted answer against the server-stored answer.
 * 
 * @param {string} challengeId - Challenge identifier
 * @param {string|number} submittedAnswer - User's submitted answer
 * @returns {Object} Verification outcome { passed: boolean, message: string }
 */
function verifyChallenge(challengeId, submittedAnswer) {
  cleanupExpiredChallenges();

  if (!challengeId || !challengesStore.has(challengeId)) {
    return {
      passed: false,
      reason: 'Challenge ID invalid or expired (exceeded 60 seconds timeframe).'
    };
  }

  const challenge = challengesStore.get(challengeId);
  if (Date.now() > challenge.expires_at) {
    challengesStore.delete(challengeId);
    return {
      passed: false,
      reason: 'Challenge has expired. Please request a new challenge.'
    };
  }

  const expected = String(challenge.correct_answer).trim().toLowerCase();
  const actual = String(submittedAnswer || '').trim().toLowerCase();

  const passed = expected === actual || (actual !== '' && expected.includes(actual));

  challengesStore.delete(challengeId);

  console.log(`[Challenge Verification] ID: ${challengeId} | Submitted: "${actual}" | Expected: "${expected}" => Passed: ${passed}`);

  return {
    passed,
    reason: passed ? 'Verification successful.' : 'Incorrect answer provided.'
  };
}

module.exports = {
  generateChallenge,
  verifyChallenge,
  challengesStore
};
