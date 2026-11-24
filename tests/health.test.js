'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { createApp } = require('../backend/app');
const { loadConfig } = require('../backend/config');

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

describe('Health & Navigation Routes', () => {
  it('should return 200 status ok on GET /health', async () => {
    // Arrange
    const config = loadConfig({ APP_PASSWORD: 'dummy-example-passphrase' });
    const app = createApp({ supabaseClient: createMockSupabase(), config, logger: silentLogger });

    // Act & Assert
    await withServer(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/health`);
      const body = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.status, 'ok');
      assert.strictEqual(body.service, 'romance-web');
      assert.strictEqual(typeof body.uptimeSeconds, 'number');
    });
  });

  it('should redirect GET / to /src/index.html and return 404 JSON on unknown routes', async () => {
    const config = loadConfig({ APP_PASSWORD: 'dummy-example-passphrase' });
    const app = createApp({ supabaseClient: createMockSupabase(), config, logger: silentLogger });

    await withServer(app, async (baseUrl) => {
      const rootRes = await fetch(`${baseUrl}/`, { redirect: 'manual' });
      assert.strictEqual(rootRes.status, 302);
      assert.strictEqual(rootRes.headers.get('location'), '/src/index.html');

      const missingRes = await fetch(`${baseUrl}/api/non-existent-route`);
      const missingJson = await missingRes.json();
      assert.strictEqual(missingRes.status, 404);
      assert.strictEqual(missingJson.error, 'Resource not found');
    });
  });
});
