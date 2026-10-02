const config = require('../config/env');

/**
 * Calculates standard deviation of an array of numbers
 */
function calculateStdDev(numbers) {
  if (!numbers || numbers.length < 2) return 999; // Assume high variance if too few samples
  const mean = numbers.reduce((sum, val) => sum + val, 0) / numbers.length;
  const squareDiffs = numbers.map(val => Math.pow(val - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / numbers.length;
  return Math.sqrt(avgSquareDiff);
}

/**
 * Evaluates session telemetry against rule-based thresholds loaded from environment.
 * 
 * @param {Object} session - Session telemetry object
 * @returns {Object} Evaluation results containing violations, count, and status
 */
function evaluateThresholds(session) {
  const violations = [];

  // Default values for missing properties
  const requestsPerMin = Number(session.requests_per_minute || 0);
  const clickIntervals = Array.isArray(session.time_between_clicks_ms) ? session.time_between_clicks_ms : [];
  const seatsSelected = Number(session.seats_selected_count || 0);
  const rapidSeatChanges = Number(session.rapid_seat_changes || 0);
  const failedAttempts = Number(session.failed_booking_attempts || 0);
  const sessionDuration = Number(session.session_duration_ms || 0);
  const repeatedActions = Number(session.repeated_action_count || 0);

  // 1. MAX_ACTIONS_PER_MIN
  if (requestsPerMin > config.MAX_ACTIONS_PER_MIN) {
    violations.push({
      rule: 'MAX_ACTIONS_PER_MIN',
      limit: config.MAX_ACTIONS_PER_MIN,
      actual: requestsPerMin,
      description: `Request rate of ${requestsPerMin}/min exceeds limit of ${config.MAX_ACTIONS_PER_MIN}`
    });
  }

  // 2. MIN_CLICK_INTERVAL_MS & Timing Variance
  if (clickIntervals.length > 0) {
    const minInterval = Math.min(...clickIntervals);
    if (minInterval < config.MIN_CLICK_INTERVAL_MS) {
      violations.push({
        rule: 'MIN_CLICK_INTERVAL_MS',
        limit: config.MIN_CLICK_INTERVAL_MS,
        actual: minInterval,
        description: `Minimum click interval of ${minInterval}ms is below human motor threshold of ${config.MIN_CLICK_INTERVAL_MS}ms`
      });
    }

    // Standard deviation check for clockwork / robotic click pacing
    const stdDev = calculateStdDev(clickIntervals);
    if (clickIntervals.length >= 3 && stdDev < 10) {
      violations.push({
        rule: 'SUSPICIOUS_TIMING_VARIANCE',
        limit: '> 10ms standard deviation',
        actual: `${stdDev.toFixed(2)}ms stdDev`,
        description: `Uniform click interval variance (${stdDev.toFixed(2)}ms) indicates automated clockwork execution`
      });
    }
  }

  // 3. MAX_SEATS_SELECTED_BURST
  if (seatsSelected > config.MAX_SEATS_SELECTED_BURST) {
    violations.push({
      rule: 'MAX_SEATS_SELECTED_BURST',
      limit: config.MAX_SEATS_SELECTED_BURST,
      actual: seatsSelected,
      description: `Seats selected burst of ${seatsSelected} exceeds max allowed threshold of ${config.MAX_SEATS_SELECTED_BURST}`
    });
  }

  // 4. MAX_SEAT_CHANGES_WINDOW
  if (rapidSeatChanges > config.MAX_SEAT_CHANGES_WINDOW) {
    violations.push({
      rule: 'MAX_SEAT_CHANGES_WINDOW',
      limit: config.MAX_SEAT_CHANGES_WINDOW,
      actual: rapidSeatChanges,
      description: `Rapid seat changes count of ${rapidSeatChanges} exceeds limit of ${config.MAX_SEAT_CHANGES_WINDOW}`
    });
  }

  // 5. MAX_FAILED_ATTEMPTS
  if (failedAttempts > config.MAX_FAILED_ATTEMPTS) {
    violations.push({
      rule: 'MAX_FAILED_ATTEMPTS',
      limit: config.MAX_FAILED_ATTEMPTS,
      actual: failedAttempts,
      description: `Failed booking attempts count of ${failedAttempts} exceeds max allowed threshold of ${config.MAX_FAILED_ATTEMPTS}`
    });
  }

  // 6. MIN_SESSION_DURATION_MS
  if (sessionDuration < config.MIN_SESSION_DURATION_MS) {
    violations.push({
      rule: 'MIN_SESSION_DURATION_MS',
      limit: config.MIN_SESSION_DURATION_MS,
      actual: sessionDuration,
      description: `Session duration of ${sessionDuration}ms is shorter than minimum threshold of ${config.MIN_SESSION_DURATION_MS}ms`
    });
  }

  // 7. REPEATED_ACTION_THRESHOLD
  if (repeatedActions > config.REPEATED_ACTION_THRESHOLD) {
    violations.push({
      rule: 'REPEATED_ACTION_THRESHOLD',
      limit: config.REPEATED_ACTION_THRESHOLD,
      actual: repeatedActions,
      description: `Repeated action count of ${repeatedActions} exceeds allowed threshold of ${config.REPEATED_ACTION_THRESHOLD}`
    });
  }

  const violationCount = violations.length;

  // Determine outcome classification
  let isBlocked = false;
  let isBorderline = false;

  if (violationCount >= 2) {
    isBlocked = true;
  } else if (violationCount === 1) {
    isBorderline = true;
  } else {
    // 0 violations, but check if telemetry is ambiguous (e.g. close to limit or odd patterns)
    if (
      requestsPerMin > config.MAX_ACTIONS_PER_MIN * 0.85 ||
      seatsSelected > config.MAX_SEATS_SELECTED_BURST * 0.8 ||
      rapidSeatChanges > config.MAX_SEAT_CHANGES_WINDOW * 0.8 ||
      failedAttempts >= 3
    ) {
      isBorderline = true;
    }
  }

  return {
    violationCount,
    violations,
    isBlocked,
    isBorderline
  };
}

module.exports = {
  evaluateThresholds,
  calculateStdDev
};
