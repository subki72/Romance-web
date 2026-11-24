import { State } from './state.js';
import { showToast, showLogin } from './ui.js';

const DEFAULT_TIMEOUT_MS = 10000;
const MAX_DIAGNOSTIC_LOGS = 50;
const clientDiagnostics = [];

/**
 * Structured lightweight frontend logger that avoids leaking raw credentials or stack traces.
 * @param {'info' | 'warn' | 'error'} level - Log level.
 * @param {string} event - Machine-readable event identifier.
 * @param {Record<string, unknown>} [detail] - Safe diagnostic metadata.
 * @returns {void}
 */
function recordClientEvent(level, event, detail = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...detail,
  };
  clientDiagnostics.push(entry);
  if (clientDiagnostics.length > MAX_DIAGNOSTIC_LOGS) {
    clientDiagnostics.shift();
  }
}

const logger = {
  info: (event, detail) => recordClientEvent('info', event, detail),
  warn: (event, detail) => recordClientEvent('warn', event, detail),
  error: (event, detail) => recordClientEvent('error', event, detail),
};

// Store password in temporary memory only, never in browser storage
let currentPassword = '';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': currentPassword,
});

/**
 * Execute fetch with an explicit AbortController timeout to avoid hung requests.
 * @param {string} url - Request path.
 * @param {RequestInit} [options={}] - Fetch options.
 * @param {number} [timeoutMs=10000] - Request timeout in milliseconds.
 * @returns {Promise<Response>} Fetch response promise.
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timerId);
  }
}

const handleResponse = async (res) => {
  if (res.status === 401) {
    currentPassword = '';
    showLogin();
    throw new Error('Session expired or invalid password');
  }
  if (!res.ok) {
    throw new Error(`Server error (${res.status})`);
  }
  return res.json();
};

export const API = {
  /**
   * Verify user password against POST /api/verify and store in memory on success.
   * @param {string} password - Candidate passphrase.
   * @returns {Promise<boolean>} True if password matches server configuration.
   */
  async verifyPassword(password) {
    try {
      const res = await fetchWithTimeout('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        currentPassword = password;
        logger.info('auth.login_success');
        return true;
      }
      logger.warn('auth.login_rejected', { status: res.status });
      return false;
    } catch (err) {
      logger.error('auth.verify_failed', { reason: err?.name || 'Error' });
      return false;
    }
  },

  /**
   * Load couple memories and metadata from GET /api/data into client state.
   * @returns {Promise<boolean>} True when state hydration succeeds.
   */
  async loadData() {
    try {
      const data = await fetchWithTimeout('/api/data', { headers: getHeaders() }).then(handleResponse);
      Object.assign(State, data);
      if (data.playlist) {
        State.playlist = data.playlist;
      }
      return true;
    } catch (err) {
      logger.error('data.load_failed', { reason: err?.message || 'Error' });
      return false;
    }
  },

  /**
   * Persist current State payload via POST /api/data.
   * @returns {Promise<void>}
   */
  async saveData() {
    try {
      const dataToSave = {
        poems: State.poems,
        photos: State.photos.map((photo) => ({
          id: photo.id,
          type: photo.type,
          caption: photo.caption,
          date: photo.date,
          src: photo.src,
        })),
        playlist: State.playlist.map(({ title, artist, url }) => ({ title, artist, url })),
        anniversary: State.anniversary,
        name1: State.name1,
        name2: State.name2,
      };

      await fetchWithTimeout('/api/data', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(dataToSave),
      }).then(handleResponse);

      showToast('Memory saved 💕');
    } catch (err) {
      logger.error('data.save_failed', { reason: err?.message || 'Error' });
      showToast('Failed to save data', true);
    }
  },

  /**
   * Upload a media file via multipart POST /api/upload.
   * @param {File} file - Selected image, video, or audio file.
   * @returns {Promise<{ url: string }>} Uploaded asset public URL payload.
   */
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetchWithTimeout(
      '/api/upload',
      {
        method: 'POST',
        headers: {
          'Authorization': currentPassword,
        },
        body: formData,
      },
      30000
    );
    return handleResponse(res);
  },
};
