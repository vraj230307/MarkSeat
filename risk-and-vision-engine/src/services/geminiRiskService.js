const { getGoogleGenAIClient, getGoogleGenerativeAIClient } = require('../config/gemini');

// Model candidates to attempt in order of preference
const MODEL_CANDIDATES = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

/**
 * Analyzes borderline session telemetry using Gemini reasoning layer.
 * 
 * @param {Object} session - Session telemetry object
 * @param {Array} thresholdViolations - Violations detected by rule-based filter
 * @returns {Promise<Object>} Gemini verdict object { verdict: 'human'|'bot'|'uncertain', confidence: number, reasoning: string }
 */
async function analyzeBorderlineSession(session, thresholdViolations = []) {
  const startTime = Date.now();

  const prompt = `
You are an expert Cybersecurity AI Risk Engine evaluating user session behavior for a high-demand ticket booking platform (FairPass / MarkSeat).

Analyze the following session telemetry and determine whether the behavior pattern is plausibly HUMAN, an AUTOMATED BOT / script, or UNCERTAIN requiring visual verification.

--- SESSION TELEMETRY ---
Session ID: ${session.session_id || 'N/A'}
Requests Per Minute: ${session.requests_per_minute}
Click Intervals (ms): ${JSON.stringify(session.time_between_clicks_ms || [])}
Seats Selected Count: ${session.seats_selected_count}
Rapid Seat Changes: ${session.rapid_seat_changes}
Failed Booking Attempts: ${session.failed_booking_attempts}
Session Duration (ms): ${session.session_duration_ms}
Repeated Action Count: ${session.repeated_action_count}

Rule-based Borderline Flags: ${JSON.stringify(thresholdViolations)}

--- BEHAVIORAL EVALUATION GUIDELINES ---
1. Reaction Time & Motor Constraints: Biological human reaction time is 180ms - 800ms. Instantaneous actions (< 150ms) fall outside human limits.
2. Click Intervals & Variance: Humans have variable timing (stdDev > 50ms). Clockwork timing (e.g. exactly 200ms intervals with zero variance) signals automation.
3. Signal Combination: Distinguish between hesitant human seat shoppers (slow duration, repeated seat changes due to selection hesitation) vs seat-spinning scalper bots (high burst selections, near-zero session duration, rapid failed requests).
4. Reason step by step before reaching a verdict.

Respond ONLY with JSON matching this exact structure:
{
  "verdict": "human" | "bot" | "uncertain",
  "confidence": number between 0.0 and 1.0,
  "reasoning": "Step-by-step rationale explaining the verdict based on timing, signals, and human realism"
}
`;

  console.log(`\n[Gemini Risk Call] Starting Gemini Reasoning for Session: ${session.session_id}...`);
  console.log(`[Gemini Risk Prompt]\n${prompt.trim()}`);

  let lastError = null;
  let rawText = '';

  for (const modelName of MODEL_CANDIDATES) {
    try {
      console.log(`[Gemini Risk Call] Attempting model: ${modelName}...`);
      try {
        const genAiClient = getGoogleGenAIClient();
        const response = await genAiClient.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                verdict: { type: 'STRING', enum: ['human', 'bot', 'uncertain'] },
                confidence: { type: 'NUMBER' },
                reasoning: { type: 'STRING' }
              },
              required: ['verdict', 'confidence', 'reasoning']
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
        const result = await model.generateContent(prompt);
        rawText = result.response.text();
      }

      if (rawText) {
        console.log(`[Gemini Risk Call] Model ${modelName} succeeded!`);
        lastError = null;
        break;
      }
    } catch (err) {
      lastError = err;
      console.warn(`[Gemini Risk Call] Model ${modelName} failed:`, err.message);
    }
  }

  const latencyMs = Date.now() - startTime;

  if (lastError && !rawText) {
    console.error(`[Gemini Risk Error] All Gemini models failed after ${latencyMs}ms:`, lastError.message);
    return {
      verdict: 'uncertain',
      confidence: 0.5,
      reasoning: `Gemini API error (${lastError.message}). Marking session as uncertain for safety.`,
      latency_ms: latencyMs,
      error: true
    };
  }

  try {
    let parsedResult = null;
    try {
      parsedResult = JSON.parse(rawText);
    } catch (parseErr) {
      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleaned);
    }

    const validVerdicts = ['human', 'bot', 'uncertain'];
    const verdict = validVerdicts.includes(parsedResult.verdict) ? parsedResult.verdict : 'uncertain';
    const confidence = typeof parsedResult.confidence === 'number' ? parsedResult.confidence : 0.75;
    const reasoning = parsedResult.reasoning || 'Gemini completed session reasoning analysis.';

    const finalResult = {
      verdict,
      confidence,
      reasoning,
      latency_ms: latencyMs
    };

    console.log(`[Gemini Risk Verdict] ${JSON.stringify(finalResult)}`);
    return finalResult;
  } catch (error) {
    return {
      verdict: 'uncertain',
      confidence: 0.5,
      reasoning: `Failed to parse Gemini output. Marking session as uncertain for safety.`,
      latency_ms: latencyMs,
      error: true
    };
  }
}

module.exports = {
  analyzeBorderlineSession
};
