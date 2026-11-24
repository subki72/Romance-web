'use strict';

const SENSITIVE_KEY_PATTERN = /(password|token|secret|authorization|service_key|api_key|apikey|cookie|credential)/i;
const MAX_REDACT_DEPTH = 4;

/**
 * Recursively redact sensitive fields from structured log metadata.
 * @param {unknown} value - Metadata value to sanitize.
 * @param {number} [depth=0] - Current recursion depth guard.
 * @returns {unknown} Sanitized metadata safe for log emission.
 */
function redactSensitiveFields(value, depth = 0) {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }
  if (depth >= MAX_REDACT_DEPTH) {
    return '[TRUNCATED]';
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveFields(item, depth + 1));
  }

  const sanitized = {};
  for (const [key, entry] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = redactSensitiveFields(entry, depth + 1);
    }
  }
  return sanitized;
}

/**
 * Format and write a structured JSON log record to stdout/stderr.
 * @param {'debug' | 'info' | 'warn' | 'error'} level - Severity level.
 * @param {string} message - Human-readable log event summary.
 * @param {Record<string, unknown>} [meta] - Optional structured attributes.
 * @param {string} [service='romance-web'] - Service identifier.
 * @returns {void}
 */
function emitLog(level, message, meta, service = 'romance-web') {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    service,
    message,
  };

  if (meta && typeof meta === 'object' && Object.keys(meta).length > 0) {
    payload.meta = redactSensitiveFields(meta);
  }

  const line = `${JSON.stringify(payload)}\n`;
  if (level === 'error' || level === 'warn') {
    process.stderr.write(line);
  } else {
    process.stdout.write(line);
  }
}

/**
 * Create a scoped structured logger instance.
 * @param {string} [component] - Optional logical component name.
 * @returns {{debug: Function, info: Function, warn: Function, error: Function}} Logger interface.
 */
function createLogger(component) {
  const withComponent = (meta) => (component ? { component, ...meta } : meta);

  return {
    debug: (message, meta) => emitLog('debug', message, withComponent(meta)),
    info: (message, meta) => emitLog('info', message, withComponent(meta)),
    warn: (message, meta) => emitLog('warn', message, withComponent(meta)),
    error: (message, meta) => emitLog('error', message, withComponent(meta)),
  };
}

const logger = createLogger();

module.exports = {
  logger,
  createLogger,
  redactSensitiveFields,
  emitLog,
};
