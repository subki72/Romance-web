'use strict';

/**
 * Create an in-memory TTL cache for reducing redundant upstream reads.
 * @param {{ ttlMs?: number }} [options] - Cache TTL options in milliseconds.
 * @returns {{ get: Function, set: Function, invalidate: Function, clear: Function }} Cache API.
 */
function createTtlCache({ ttlMs = 5000 } = {}) {
  const store = new Map();

  const get = (key) => {
    if (ttlMs <= 0) {
      return null;
    }
    const entry = store.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() >= entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return entry.value;
  };

  const set = (key, value) => {
    if (ttlMs <= 0) {
      return;
    }
    store.set(key, { value, expiresAt: Date.now() + ttlMs });
  };

  const invalidate = (key) => {
    store.delete(key);
  };

  const clear = () => {
    store.clear();
  };

  return { get, set, invalidate, clear };
}

module.exports = { createTtlCache };
