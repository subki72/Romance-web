'use strict';

const MAX_TRACKED_KEYS = 1000;

/**
 * Create a sliding-window in-memory rate limiter middleware for sensitive endpoints.
 * @param {{ windowMs?: number, maxRequests?: number, keyFn?: Function, logger?: object }} [options]
 * @returns {import('express').RequestHandler & { reset: Function }} Rate-limit middleware.
 */
function createRateLimiter({
  windowMs = 60000,
  maxRequests = 30,
  keyFn = (req) => req.ip || req.socket?.remoteAddress || 'unknown',
  logger = null,
} = {}) {
  const hitsByKey = new Map();

  function pruneStaleKeys(now) {
    if (hitsByKey.size <= MAX_TRACKED_KEYS) {
      return;
    }
    const cutoff = now - windowMs;
    for (const [key, timestamps] of hitsByKey.entries()) {
      const active = timestamps.filter((ts) => ts > cutoff);
      if (active.length === 0) {
        hitsByKey.delete(key);
      } else {
        hitsByKey.set(key, active);
      }
    }
  }

  function rateLimiterMiddleware(req, res, next) {
    const now = Date.now();
    const cutoff = now - windowMs;
    const key = keyFn(req);

    pruneStaleKeys(now);
    const recentHits = (hitsByKey.get(key) || []).filter((ts) => ts > cutoff);

    res.setHeader('X-RateLimit-Limit', String(maxRequests));

    if (recentHits.length >= maxRequests) {
      const oldestActive = recentHits[0];
      const retryAfterSec = Math.max(1, Math.ceil((oldestActive + windowMs - now) / 1000));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('Retry-After', String(retryAfterSec));
      if (logger) {
        logger.warn('Rate limit exceeded', { path: req.originalUrl, method: req.method });
      }
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
      });
    }

    recentHits.push(now);
    hitsByKey.set(key, recentHits);
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - recentHits.length)));
    return next();
  }

  rateLimiterMiddleware.reset = () => hitsByKey.clear();
  return rateLimiterMiddleware;
}

module.exports = { createRateLimiter };
