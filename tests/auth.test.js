'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { createApp } = require('../backend/app');
const { loadConfig } = require('../backend/config');
const { timingSafeEqualStrings } = require('../backend/middleware/auth');

const silentLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };

function createMockSupabase() {
  return {
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: { data: {} }, error: null }) }) }),
    }),
    storage: { from: () => ({}) },
  };
}

async function withServer(app, run) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
}

describe('Authentication & Timing-Safe Password Guards', () => {
  it('should compare strings in constant time and reject empty or mismatched values', () => {
    assert.strictEqual(timingSafeEqualStrings('dummy-example-alpha', 'dummy-example-alpha'), true);
    assert.strictEqual(timingSafeEqualStrings('dummy-example-alpha', 'dummy-example-beta'), false);
    assert.strictEqual(timingSafeEqualStrings('short', 'much-longer-value'), false);
    assert.strictEqual(timingSafeEqualStrings('', ''), false);
    assert.strictEqual(timingSafeEqualStrings(undefined, undefined), false);
  });

  it('should accept valid login and reject wrong or missing password payloads', async () => {
    // Arrange
    const config = loadConfig({ APP_PASSWORD: 'dummy-example-passphrase' });
    const app = createApp({ supabaseClient: createMockSupabase(), config, logger: silentLogger });

    await withServer(app, async (baseUrl) => {
      // Act: valid password
      const okRes = await fetch(`${baseUrl}/api/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'dummy-example-passphrase' }),
      });
      const okBody = await okRes.json();

      // Act: wrong password
      const badRes = await fetch(`${baseUrl}/api/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'wrong-dummy-passphrase' }),
      });

      // Act: missing password field
      const invalidRes = await fetch(`${baseUrl}/api/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      // Assert
      assert.strictEqual(okRes.status, 200);
      assert.strictEqual(okBody.success, true);
      assert.strictEqual(badRes.status, 401);
      assert.strictEqual(invalidRes.status, 400);
    });
  });

  it('should NEVER bypass auth when APP_PASSWORD is empty or unconfigured', async () => {
    // Arrange
    const config = loadConfig({ APP_PASSWORD: '' });
    const app = createApp({ supabaseClient: createMockSupabase(), config, logger: silentLogger });

    await withServer(app, async (baseUrl) => {
      // Act: attempt login and protected endpoint without configured password
      const verifyRes = await fetch(`${baseUrl}/api/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: '' }),
      });
      const dataRes = await fetch(`${baseUrl}/api/data`);

      // Assert: 503 Service Unavailable, never 200
      assert.strictEqual(verifyRes.status, 503);
      assert.strictEqual(dataRes.status, 503);
    });
  });
});
