'use strict';

const crypto = require('crypto');
const { validateLoginPayload } = require('../utils/validator');

/**
 * Perform constant-time string comparison using fixed-width SHA-256 digests
 * so differing password lengths never leak timing information.
 * @param {unknown} candidate - Client-supplied secret string.
 * @param {unknown} expected - Server-configured secret string.
 * @returns {boolean} True when both strings are non-empty and identical.
 */
function timingSafeEqualStrings(candidate, expected) {
  if (typeof candidate !== 'string' || typeof expected !== 'string') {
    return false;
  }
  if (candidate.length === 0 || expected.length === 0) {
    return false;
  }

  const candidateDigest = crypto.createHash('sha256').update(candidate, 'utf8').digest();
  const expectedDigest = crypto.createHash('sha256').update(expected, 'utf8').digest();
  return crypto.timingSafeEqual(candidateDigest, expectedDigest);
}

/**
 * Build Express middleware enforcing password authentication on protected routes.
 * Rejects ALL requests if APP_PASSWORD is unconfigured to prevent undefined-equality bypass.
 * @param {{ appPassword: string, logger: object }} options - Middleware dependencies.
 * @returns {import('express').RequestHandler} Express auth middleware.
 */
function createAuthMiddleware({ appPassword, logger }) {
  return function authenticateRequest(req, res, next) {
    if (typeof appPassword !== 'string' || appPassword.trim().length === 0) {
      logger.error('Authentication rejected: APP_PASSWORD is not configured');
      return res.status(503).json({ error: 'Authentication service is not configured' });
    }

    const clientPassword = req.headers.authorization;
    if (!timingSafeEqualStrings(clientPassword, appPassword)) {
      logger.warn('Unauthorized API access attempt blocked', {
        path: req.originalUrl,
        method: req.method,
      });
      return res.status(401).json({ error: 'Unauthorized: Invalid password or session expired' });
    }

    return next();
  };
}

/**
 * Build Express handler for POST /api/verify login verification.
 * @param {{ appPassword: string, logger: object }} options - Handler dependencies.
 * @returns {import('express').RequestHandler} Express route handler.
 */
function createVerifyHandler({ appPassword, logger }) {
  return function verifyLogin(req, res) {
    if (typeof appPassword !== 'string' || appPassword.trim().length === 0) {
      logger.error('Login verification rejected: APP_PASSWORD is not configured');
      return res.status(503).json({ success: false, error: 'Authentication service is not configured' });
    }

    const validation = validateLoginPayload(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    if (timingSafeEqualStrings(validation.password, appPassword)) {
      logger.info('User login verified');
      return res.json({ success: true });
    }

    logger.warn('Failed login attempt rejected', { ip: req.ip });
    return res.status(401).json({ success: false });
  };
}

module.exports = {
  timingSafeEqualStrings,
  createAuthMiddleware,
  createVerifyHandler,
};
