'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { createApp } = require('../backend/app');
const { loadConfig } = require('../backend/config');

const TEST_PASS = 'dummy-example-passphrase';
const silentLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };

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

describe('Integration: Rate Limiter, Security Headers, CORS & ErrorHandler', () => {
  it('should enforce sliding-window rate limits on POST /api/verify', async () => {
    // Arrange
    const supabaseClient = { from: () => ({}), storage: { from: () => ({}) } };
    const config = loadConfig({
      APP_PASSWORD: TEST_PASS,
      RATE_LIMIT_MAX: '2',
      RATE_LIMIT_WINDOW_MS: '60000',
    });
    const app = createApp({ supabaseClient, config, logger: silentLogger });

    await withServer(app, async (baseUrl) => {
      const attempt = () =>
        fetch(`${baseUrl}/api/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: 'wrong-dummy-value' }),
        });

      const first = await attempt();
      const second = await attempt();
      const third = await attempt();

      assert.strictEqual(first.status, 401);
      assert.strictEqual(second.status, 401);
      assert.strictEqual(third.status, 429);
      assert.strictEqual(third.headers.get('x-ratelimit-remaining'), '0');
      assert.ok(Number.parseInt(third.headers.get('retry-after'), 10) >= 1);
    });
  });

  it('should attach defense-in-depth security headers and enforce CORS allowlist', async () => {
    const supabaseClient = { from: () => ({}), storage: { from: () => ({}) } };
    const config = loadConfig({
      APP_PASSWORD: TEST_PASS,
      ALLOWED_ORIGINS: 'https://trusted.example.com',
    });
    const app = createApp({ supabaseClient, config, logger: silentLogger });

    await withServer(app, async (baseUrl) => {
      const okRes = await fetch(`${baseUrl}/health`, {
        headers: { Origin: 'https://trusted.example.com' },
      });
      assert.strictEqual(okRes.status, 200);
      assert.strictEqual(okRes.headers.get('x-content-type-options'), 'nosniff');
      assert.strictEqual(okRes.headers.get('x-frame-options'), 'DENY');
      assert.strictEqual(okRes.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
      assert.match(okRes.headers.get('content-security-policy'), /default-src 'self'/);
      assert.strictEqual(okRes.headers.get('access-control-allow-origin'), 'https://trusted.example.com');

      const blockedCors = await fetch(`${baseUrl}/health`, {
        headers: { Origin: 'https://evil.example.org' },
      });
      assert.strictEqual(blockedCors.status, 403);
    });
  });

  it('should handle malformed JSON bodies safely via centralized ErrorHandler', async () => {
    const supabaseClient = { from: () => ({}), storage: { from: () => ({}) } };
    const config = loadConfig({ APP_PASSWORD: TEST_PASS });
    const app = createApp({ supabaseClient, config, logger: silentLogger });

    await withServer(app, async (baseUrl) => {
      const badJsonRes = await fetch(`${baseUrl}/api/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{broken-json',
      });
      const body = await badJsonRes.json();

      assert.strictEqual(badJsonRes.status, 400);
      assert.strictEqual(body.error, 'Malformed request payload');
      assert.strictEqual(body.stack, undefined);
    });
  });
});
