const config = require('../config/env');

// In-memory stores for tracking rate limits
const ipStore = new Map();
const accountStore = new Map();

/**
 * Periodically cleans up expired keys from memory stores.
 */
function cleanupStores() {
  const now = Date.now();
  for (const [key, record] of ipStore.entries()) {
    if (now > record.resetTime && (!record.nextAllowedTime || now > record.nextAllowedTime)) {
      ipStore.delete(key);
    }
  }
  for (const [key, record] of accountStore.entries()) {
    if (now > record.resetTime && (!record.nextAllowedTime || now > record.nextAllowedTime)) {
      accountStore.delete(key);
    }
  }
}
setInterval(cleanupStores, 60000); // Cleanup every minute

/**
 * Extracts client IP address handling proxies.
 */
function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    '127.0.0.1'
  );
}

/**
 * Extracts account identifier from request body or query.
 */
function getAccountIdentifier(req) {
  return (
    req.body?.email ||
    req.body?.username ||
    req.body?.account_id ||
    req.body?.session_id ||
    req.query?.username ||
    'unknown_account'
  );
}

/**
 * Helper to update record and check exponential backoff status for Auth routes.
 */
function processAuthTracker(store, key, windowMs, maxRequests, baseBackoffMs, backoffFactor, maxBackoffMs) {
  const now = Date.now();
  let record = store.get(key);

  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      firstRequest: now,
      resetTime: now + windowMs,
      nextAllowedTime: 0,
      consecutiveViolations: 0
    };
    store.set(key, record);
    return { limited: false, remaining: maxRequests - 1, record };
  }

  record.count += 1;

  // Check if currently under exponential backoff delay
  if (record.nextAllowedTime && now < record.nextAllowedTime) {
    const remainingMs = record.nextAllowedTime - now;
    return {
      limited: true,
      retryAfterSec: Math.ceil(remainingMs / 1000),
      delayMs: remainingMs,
      record
    };
  }

  // Check if request count exceeds window threshold
  if (record.count > maxRequests) {
    record.consecutiveViolations += 1;
    const exponent = Math.max(0, record.consecutiveViolations - 1);
    const delayMs = Math.min(
      Math.round(baseBackoffMs * Math.pow(backoffFactor, exponent)),
      maxBackoffMs
    );

    record.nextAllowedTime = now + delayMs;
    const retryAfterSec = Math.ceil(delayMs / 1000);

    return {
      limited: true,
      retryAfterSec,
      delayMs,
      record
    };
  }

  return { limited: false, remaining: maxRequests - record.count, record };
}

/**
 * Stricter Rate Limiter for Authentication Routes
 * Implements combined Per-IP & Per-Account rate limiting with Exponential Backoff.
 */
function authRateLimiter(req, res, next) {
  const ip = getClientIp(req);
  const account = getAccountIdentifier(req);

  const ipKey = `auth_ip:${ip}`;
  const accountKey = `auth_account:${account}`;

  const windowMs = config.AUTH_RATE_LIMIT_WINDOW_MS;
  const maxReq = config.AUTH_MAX_REQUESTS_PER_WINDOW;
  const baseBackoff = config.AUTH_BASE_BACKOFF_MS;
  const factor = config.AUTH_BACKOFF_FACTOR;
  const maxBackoff = config.AUTH_MAX_BACKOFF_MS;

  const ipOutcome = processAuthTracker(ipStore, ipKey, windowMs, maxReq, baseBackoff, factor, maxBackoff);
  const accountOutcome = account !== 'unknown_account'
    ? processAuthTracker(accountStore, accountKey, windowMs, maxReq, baseBackoff, factor, maxBackoff)
    : { limited: false };

  if (ipOutcome.limited || accountOutcome.limited) {
    const limitedBy = (ipOutcome.limited && accountOutcome.limited)
      ? 'per_ip_and_per_account'
      : ipOutcome.limited ? 'per_ip' : 'per_account';

    const retryAfterSec = Math.max(ipOutcome.retryAfterSec || 0, accountOutcome.retryAfterSec || 0);
    const delayMs = Math.max(ipOutcome.delayMs || 0, accountOutcome.delayMs || 0);
    const currentAttempts = Math.max(ipOutcome.record?.count || 0, accountOutcome.record?.count || 0);

    res.set('Retry-After', String(retryAfterSec));
    res.set('X-RateLimit-Limit', String(maxReq));
    res.set('X-RateLimit-Remaining', '0');

    return res.status(429).json({
      error: 'Too Many Requests',
      message: `Authentication rate limit exceeded. Exponential backoff delay enforced (${retryAfterSec}s).`,
      tier: 'stricter_authentication',
      limited_by: limitedBy,
      retry_after_seconds: retryAfterSec,
      backoff_delay_ms: delayMs,
      current_attempts: currentAttempts,
      threshold_limit: maxReq
    });
  }

  const remaining = Math.min(ipOutcome.remaining, accountOutcome.remaining !== undefined ? accountOutcome.remaining : maxReq);
  res.set('X-RateLimit-Limit', String(maxReq));
  res.set('X-RateLimit-Remaining', String(Math.max(0, remaining)));

  next();
}

/**
 * Moderate Rate Limiter for Public Endpoints
 */
function publicRateLimiter(req, res, next) {
  const ip = getClientIp(req);
  const key = `public_ip:${ip}`;
  const now = Date.now();

  const windowMs = config.PUBLIC_RATE_LIMIT_WINDOW_MS;
  const maxReq = config.PUBLIC_MAX_REQUESTS_PER_WINDOW;

  let record = ipStore.get(key);
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs };
    ipStore.set(key, record);
  } else {
    record.count += 1;
  }

  res.set('X-RateLimit-Limit', String(maxReq));

  if (record.count > maxReq) {
    const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
    res.set('Retry-After', String(retryAfterSec));
    res.set('X-RateLimit-Remaining', '0');

    return res.status(429).json({
      error: 'Too Many Requests',
      message: `Public endpoint rate limit exceeded (${maxReq} req / ${windowMs / 1000}s).`,
      tier: 'moderate_public',
      retry_after_seconds: retryAfterSec,
      threshold_limit: maxReq
    });
  }

  res.set('X-RateLimit-Remaining', String(maxReq - record.count));
  next();
}

/**
 * Looser Rate Limiter for Authenticated User Actions
 */
function authedRateLimiter(req, res, next) {
  const userId = req.user?.id || req.headers['authorization'] || getClientIp(req);
  const key = `authed_user:${userId}`;
  const now = Date.now();

  const windowMs = config.AUTHED_RATE_LIMIT_WINDOW_MS;
  const maxReq = config.AUTHED_MAX_REQUESTS_PER_WINDOW;

  let record = accountStore.get(key);
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs };
    accountStore.set(key, record);
  } else {
    record.count += 1;
  }

  res.set('X-RateLimit-Limit', String(maxReq));

  if (record.count > maxReq) {
    const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
    res.set('Retry-After', String(retryAfterSec));
    res.set('X-RateLimit-Remaining', '0');

    return res.status(429).json({
      error: 'Too Many Requests',
      message: `Authenticated user rate limit exceeded (${maxReq} req / ${windowMs / 1000}s).`,
      tier: 'looser_authenticated',
      retry_after_seconds: retryAfterSec,
      threshold_limit: maxReq
    });
  }

  res.set('X-RateLimit-Remaining', String(maxReq - record.count));
  next();
}

module.exports = {
  authRateLimiter,
  publicRateLimiter,
  authedRateLimiter,
  getClientIp,
  getAccountIdentifier,
  ipStore,
  accountStore
};
