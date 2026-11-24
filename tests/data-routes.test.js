'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { createApp, DEFAULT_APP_DATA } = require('../backend/app');
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

describe('Data Routes (/api/data)', () => {
  it('should require authentication and return stored data on GET /api/data', async () => {
    // Arrange
    let dbReads = 0;
    const stored = {
      poems: [{ id: 1, title: 'Starlight', text: 'Always yours', date: '2026-01-01' }],
      photos: [],
      playlist: [],
      anniversary: '2024-06-01',
      name1: 'A',
      name2: 'B',
    };
    const supabaseClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => {
              dbReads += 1;
              return { data: { data: stored }, error: null };
            },
          }),
        }),
      }),
      storage: { from: () => ({}) },
    };
    const config = loadConfig({ APP_PASSWORD: TEST_PASS, DATA_CACHE_TTL_MS: '5000' });
    const app = createApp({ supabaseClient, config, logger: silentLogger });

    await withServer(app, async (baseUrl) => {
      const unauth = await fetch(`${baseUrl}/api/data`);
      assert.strictEqual(unauth.status, 401);

      const first = await fetch(`${baseUrl}/api/data`, { headers: { Authorization: TEST_PASS } });
      const firstBody = await first.json();
      assert.strictEqual(first.status, 200);
      assert.strictEqual(firstBody.name1, 'A');

      // Second read hits TTL cache
      const second = await fetch(`${baseUrl}/api/data`, { headers: { Authorization: TEST_PASS } });
      assert.strictEqual(second.status, 200);
      assert.strictEqual(dbReads, 1);
    });
  });

  it('should return default empty data when Supabase returns PGRST116', async () => {
    const supabaseClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: { code: 'PGRST116', message: 'Not found' } }),
          }),
        }),
      }),
      storage: { from: () => ({}) },
    };
    const config = loadConfig({ APP_PASSWORD: TEST_PASS });
    const app = createApp({ supabaseClient, config, logger: silentLogger });

    await withServer(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/data`, { headers: { Authorization: TEST_PASS } });
      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(body, DEFAULT_APP_DATA);
    });
  });

  it('should validate and upsert app data on POST /api/data and invalidate cache', async () => {
    let dbReads = 0;
    let savedRow = { ...DEFAULT_APP_DATA };
    const supabaseClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => {
              dbReads += 1;
              return { data: { data: savedRow }, error: null };
            },
          }),
        }),
        upsert: (row) => ({
          select: async () => {
            savedRow = row.data;
            return { data: [row], error: null };
          },
        }),
      }),
      storage: { from: () => ({}) },
    };
    const config = loadConfig({ APP_PASSWORD: TEST_PASS, DATA_CACHE_TTL_MS: '5000' });
    const app = createApp({ supabaseClient, config, logger: silentLogger });

    await withServer(app, async (baseUrl) => {
      // Prime cache
      await fetch(`${baseUrl}/api/data`, { headers: { Authorization: TEST_PASS } });
      assert.strictEqual(dbReads, 1);

      // Invalid payload rejected 400
      const badSave = await fetch(`${baseUrl}/api/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: TEST_PASS },
        body: JSON.stringify({ poems: 'not-an-array' }),
      });
      assert.strictEqual(badSave.status, 400);

      // Valid save invalidates cache
      const okSave = await fetch(`${baseUrl}/api/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: TEST_PASS },
        body: JSON.stringify({
          poems: [{ id: 10, title: 'Morning', text: 'Sunlight', date: '2026-02-01' }],
          photos: [],
          playlist: [],
          anniversary: '2024-02-14',
          name1: 'Rina',
          name2: 'Budi',
        }),
      });
      assert.strictEqual(okSave.status, 200);

      const refreshed = await fetch(`${baseUrl}/api/data`, { headers: { Authorization: TEST_PASS } });
      const refreshedBody = await refreshed.json();
      assert.strictEqual(dbReads, 2);
      assert.strictEqual(refreshedBody.name1, 'Rina');
    });
  });

  it('should return safe generic 500 JSON without stack traces when upstream DB errors occur', async () => {
    const supabaseClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: null,
              error: { code: 'XX000', message: 'internal postgres connection string secret' },
            }),
          }),
        }),
      }),
      storage: { from: () => ({}) },
    };
    const config = loadConfig({ APP_PASSWORD: TEST_PASS });
    const app = createApp({ supabaseClient, config, logger: silentLogger });

    await withServer(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/data`, { headers: { Authorization: TEST_PASS } });
      const body = await res.json();
      assert.strictEqual(res.status, 500);
      assert.strictEqual(body.error, 'Internal server error');
      assert.strictEqual(JSON.stringify(body).includes('postgres'), false);
    });
  });
});
