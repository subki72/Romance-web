'use strict';

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "connect-src 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

/**
 * Attach defense-in-depth HTTP security headers to all responses.
 * @param {import('express').Request} _req - Express request.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Next middleware callback.
 * @returns {void}
 */
function securityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  next();
}

/**
 * Respond with a uniform 404 payload for unmatched routes.
 * @param {import('express').Request} _req - Express request.
 * @param {import('express').Response} res - Express response.
 * @returns {void}
 */
function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Resource not found' });
}

/**
 * Build centralized Express error-handling middleware that logs internals
 * safely and never exposes stack traces to HTTP clients.
 * @param {{ logger: object }} options - Middleware dependencies.
 * @returns {import('express').ErrorRequestHandler} Express error middleware.
 */
function createErrorHandler({ logger }) {
  return function ErrorHandler(err, req, res, _next) {
    if (res.headersSent) {
      return;
    }

    if (err && err.code === 'LIMIT_FILE_SIZE') {
      logger.warn('Uploaded file exceeded configured size limit', { path: req.originalUrl });
      res.status(413).json({ error: 'Uploaded file exceeds maximum allowed size' });
      return;
    }

    if (err && (err.name === 'MulterError' || err.type === 'entity.parse.failed')) {
      logger.warn('Rejected malformed client payload', { path: req.originalUrl, reason: err.message });
      res.status(400).json({ error: 'Malformed request payload' });
      return;
    }

    const statusCode = err && Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode < 500
      ? err.statusCode
      : 500;

    logger.error('Unhandled request error', {
      path: req.originalUrl,
      method: req.method,
      statusCode,
      errorMessage: err ? err.message : 'Unknown error',
    });

    const clientMessage = statusCode < 500 && err?.message ? err.message : 'Internal server error';
    res.status(statusCode).json({ error: clientMessage });
  };
}

module.exports = {
  CONTENT_SECURITY_POLICY,
  securityHeaders,
  notFoundHandler,
  createErrorHandler,
};
