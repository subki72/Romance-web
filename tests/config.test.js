'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { loadConfig, validateRuntimeConfig, parseBoundedInt } = require('../backend/config');

describe('backend/config', () => {
  it('should load safe defaults when optional env vars are omitted', () => {
    // Arrange
    const env = {};

    // Act
    const cfg = loadConfig(env);

    // Assert
    assert.strictEqual(cfg.port, 3000);
    assert.strictEqual(cfg.nodeEnv, 'development');
    assert.strictEqual(cfg.appPassword, '');
    assert.deepStrictEqual(cfg.allowedOrigins, []);
    assert.strictEqual(cfg.maxUploadMb, 50);
    assert.strictEqual(cfg.timeoutMs, 10000);
    assert.strictEqual(cfg.storageBucket, 'memories');
  });

  it('should parse custom numeric bounds and comma-separated CORS origins', () => {
    // Arrange
    const env = {
      PORT: '8080',
      NODE_ENV: 'production',
      APP_PASSWORD: 'dummy-example-passphrase',
      ALLOWED_ORIGINS: 'https://a.example.com, https://b.example.com ',
      MAX_UPLOAD_MB: '25',
      RATE_LIMIT_MAX: '10',
      RATE_LIMIT_WINDOW_MS: '30000',
      REQUEST_TIMEOUT_MS: '5000',
      DATA_CACHE_TTL_MS: '0',
    };

    // Act
    const cfg = loadConfig(env);

    // Assert
    assert.strictEqual(cfg.port, 8080);
    assert.strictEqual(cfg.nodeEnv, 'production');
    assert.deepStrictEqual(cfg.allowedOrigins, ['https://a.example.com', 'https://b.example.com']);
    assert.strictEqual(cfg.maxUploadMb, 25);
    assert.strictEqual(cfg.rateLimitMax, 10);
    assert.strictEqual(cfg.timeoutMs, 5000);
    assert.strictEqual(cfg.dataCacheTtlMs, 0);
  });

  it('should throw RangeError when bounded integer env var exceeds valid range', () => {
    assert.throws(() => parseBoundedInt('70000', 3000, 1, 65535, 'PORT'), RangeError);
    assert.throws(() => parseBoundedInt('abc', 3000, 1, 65535, 'PORT'), RangeError);
  });

  it('should fail runtime validation when required secrets or Supabase URL are invalid', () => {
    assert.throws(
      () =>
        validateRuntimeConfig({
          appPassword: '',
          supabaseUrl: 'https://example.supabase.co',
          supabaseServiceKey: 'dummy-example-key',
        }),
      /APP_PASSWORD/
    );

    assert.throws(
      () =>
        validateRuntimeConfig({
          appPassword: 'dummy-example-passphrase',
          supabaseUrl: 'not-a-url',
          supabaseServiceKey: 'dummy-example-key',
        }),
      /SUPABASE_URL/
    );
  });
});
