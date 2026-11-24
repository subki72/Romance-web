'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { redactSensitiveFields, createLogger } = require('../backend/utils/logger');

describe('backend/utils/logger', () => {
  it('should recursively redact sensitive credentials in metadata', () => {
    // Arrange
    const payload = {
      path: '/api/verify',
      password: 'dummy-secret-password-value',
      headers: {
        authorization: 'dummy-auth-header-value',
        service_key: 'dummy-service-key-value',
        userAgent: 'node-test',
      },
    };

    // Act
    const redacted = redactSensitiveFields(payload);

    // Assert
    assert.strictEqual(redacted.path, '/api/verify');
    assert.strictEqual(redacted.password, '[REDACTED]');
    assert.strictEqual(redacted.headers.authorization, '[REDACTED]');
    assert.strictEqual(redacted.headers.service_key, '[REDACTED]');
    assert.strictEqual(redacted.headers.userAgent, 'node-test');
  });

  it('should emit structured JSON records without exposing raw secrets', () => {
    // Arrange
    const captured = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk) => {
      captured.push(String(chunk));
      return true;
    };

    try {
      const log = createLogger('auth-test');
      // Act
      log.info('Login processed', { password: 'dummy-raw-value', status: 200 });
    } finally {
      process.stdout.write = originalWrite;
    }

    // Assert
    assert.strictEqual(captured.length, 1);
    const parsed = JSON.parse(captured[0]);
    assert.strictEqual(parsed.level, 'info');
    assert.strictEqual(parsed.service, 'romance-web');
    assert.strictEqual(parsed.meta.component, 'auth-test');
    assert.strictEqual(parsed.meta.password, '[REDACTED]');
    assert.strictEqual(parsed.meta.status, 200);
  });
});
