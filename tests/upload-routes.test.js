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

describe('Upload Routes & Static Root Leak Prevention', () => {
  it('should upload valid media files and reject missing or disallowed MIME uploads', async () => {
    // Arrange
    const uploadedKeys = [];
    const supabaseClient = {
      from: () => ({}),
      storage: {
        from: () => ({
          upload: async (fileName) => {
            uploadedKeys.push(fileName);
            return { error: null };
          },
          getPublicUrl: (fileName) => ({
            data: { publicUrl: `https://cdn.example.com/memories/${fileName}` },
          }),
          remove: async () => ({ error: null }),
        }),
      },
    };
    const config = loadConfig({ APP_PASSWORD: TEST_PASS });
    const app = createApp({ supabaseClient, config, logger: silentLogger });

    await withServer(app, async (baseUrl) => {
      // Missing file -> 400
      const missingRes = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        headers: { Authorization: TEST_PASS },
      });
      assert.strictEqual(missingRes.status, 400);

      // Disallowed MIME (.html) -> 400
      const badForm = new FormData();
      badForm.append('file', new Blob(['<b>xss</b>'], { type: 'text/html' }), 'bad.html');
      const badRes = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        headers: { Authorization: TEST_PASS },
        body: badForm,
      });
      assert.strictEqual(badRes.status, 400);

      // Valid JPEG upload -> 200
      const okForm = new FormData();
      okForm.append('file', new Blob(['fake-jpeg-data'], { type: 'image/jpeg' }), 'couple.jpg');
      const okRes = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        headers: { Authorization: TEST_PASS },
        body: okForm,
      });
      const okBody = await okRes.json();
      assert.strictEqual(okRes.status, 200);
      assert.match(okBody.url, /^https:\/\/cdn\.example\.com\/memories\/.+\.jpg$/);
      assert.strictEqual(uploadedKeys.length, 1);
    });
  });

  it('should reject path traversal on DELETE /api/upload/:filename and allow safe filenames', async () => {
    const removed = [];
    const supabaseClient = {
      from: () => ({}),
      storage: {
        from: () => ({
          remove: async (names) => {
            removed.push(...names);
            return { error: null };
          },
        }),
      },
    };
    const config = loadConfig({ APP_PASSWORD: TEST_PASS });
    const app = createApp({ supabaseClient, config, logger: silentLogger });

    await withServer(app, async (baseUrl) => {
      // Encoded traversal rejected with 400
      const traversalRes = await fetch(`${baseUrl}/api/upload/..%2Fserver.js`, {
        method: 'DELETE',
        headers: { Authorization: TEST_PASS },
      });
      assert.strictEqual(traversalRes.status, 400);
      assert.strictEqual(removed.length, 0);

      // Safe filename succeeds
      const okDelete = await fetch(`${baseUrl}/api/upload/1700000000-photo.jpg`, {
        method: 'DELETE',
        headers: { Authorization: TEST_PASS },
      });
      const okBody = await okDelete.json();
      assert.strictEqual(okDelete.status, 200);
      assert.strictEqual(okBody.success, true);
      assert.deepStrictEqual(removed, ['1700000000-photo.jpg']);
    });
  });

  it('should serve ONLY /src static assets and return 404 for server.js or backend internals', async () => {
    const supabaseClient = { from: () => ({}), storage: { from: () => ({}) } };
    const config = loadConfig({ APP_PASSWORD: TEST_PASS });
    const app = createApp({ supabaseClient, config, logger: silentLogger });

    await withServer(app, async (baseUrl) => {
      const serverLeak = await fetch(`${baseUrl}/server.js`);
      const pkgLeak = await fetch(`${baseUrl}/package.json`);
      const backendLeak = await fetch(`${baseUrl}/backend/config.js`);
      const envLeak = await fetch(`${baseUrl}/.env`);
      const frontendOk = await fetch(`${baseUrl}/src/state.js`);

      assert.strictEqual(serverLeak.status, 404);
      assert.strictEqual(pkgLeak.status, 404);
      assert.strictEqual(backendLeak.status, 404);
      assert.strictEqual(envLeak.status, 404);
      assert.strictEqual(frontendOk.status, 200);
    });
  });
});
