'use strict';

/**
 * Parse a bounded integer environment variable with explicit validation.
 * @param {string | undefined} rawValue - Raw environment variable string.
 * @param {number} fallback - Default integer when rawValue is absent.
 * @param {number} min - Minimum allowed integer (inclusive).
 * @param {number} max - Maximum allowed integer (inclusive).
 * @param {string} label - Environment variable name for diagnostics.
 * @returns {number} Validated integer configuration value.
 */
function parseBoundedInt(rawValue, fallback, min, max, label) {
  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') {
    return fallback;
  }

  const parsed = Number.parseInt(String(rawValue).trim(), 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new RangeError(`${label} must be an integer between ${min} and ${max}`);
  }
  return parsed;
}

/**
 * Parse a comma-separated CORS allowlist string into normalized origins.
 * @param {string | undefined} rawOrigins - Comma-separated origin URLs.
 * @returns {string[]} List of trimmed non-empty origin strings.
 */
function parseAllowedOrigins(rawOrigins) {
  if (typeof rawOrigins !== 'string' || rawOrigins.trim() === '') {
    return [];
  }

  return rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * Load and validate runtime application configuration from environment variables.
 * @param {NodeJS.ProcessEnv} [env=process.env] - Environment dictionary.
 * @returns {object} Validated configuration object.
 */
function loadConfig(env = process.env) {
  const rawPassword = typeof env.APP_PASSWORD === 'string' ? env.APP_PASSWORD : '';
  const appPassword = rawPassword.trim().length > 0 ? rawPassword : '';

  return {
    port: parseBoundedInt(env.PORT, 3000, 1, 65535, 'PORT'),
    nodeEnv: (env.NODE_ENV || 'development').trim(),
    appPassword,
    supabaseUrl: (env.SUPABASE_URL || '').trim(),
    supabaseServiceKey: (env.SUPABASE_SERVICE_KEY || '').trim(),
    allowedOrigins: parseAllowedOrigins(env.ALLOWED_ORIGINS),
    maxUploadMb: parseBoundedInt(env.MAX_UPLOAD_MB, 50, 1, 200, 'MAX_UPLOAD_MB'),
    rateLimitMax: parseBoundedInt(env.RATE_LIMIT_MAX, 30, 1, 10000, 'RATE_LIMIT_MAX'),
    rateLimitWindowMs: parseBoundedInt(env.RATE_LIMIT_WINDOW_MS, 60000, 1000, 3600000, 'RATE_LIMIT_WINDOW_MS'),
    timeoutMs: parseBoundedInt(env.REQUEST_TIMEOUT_MS, 10000, 500, 120000, 'REQUEST_TIMEOUT_MS'),
    dataCacheTtlMs: parseBoundedInt(env.DATA_CACHE_TTL_MS, 5000, 0, 300000, 'DATA_CACHE_TTL_MS'),
    storageBucket: (env.STORAGE_BUCKET || 'memories').trim() || 'memories',
  };
}

/**
 * Verify that required Supabase and authentication settings are configured for live startup.
 * @param {object} config - Configuration object produced by loadConfig.
 * @returns {void}
 */
function validateRuntimeConfig(config) {
  if (!config.appPassword) {
    throw new Error('APP_PASSWORD environment variable is required and cannot be empty');
  }
  if (!config.supabaseUrl || !/^https?:\/\/.+/.test(config.supabaseUrl)) {
    throw new Error('SUPABASE_URL must be a valid http(s) URL');
  }
  if (!config.supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_KEY environment variable is required');
  }
}

module.exports = {
  loadConfig,
  validateRuntimeConfig,
  parseBoundedInt,
  parseAllowedOrigins,
};
