'use strict';

const path = require('path');

const MAX_PASSWORD_LENGTH = 256;
const MAX_ITEMS_PER_COLLECTION = 500;
const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/;

// Disallow SVG uploads because inline SVG can carry active script payloads.
const ALLOWED_MEDIA_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/ogg',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
  'audio/aac',
  'audio/flac',
]);

const ALLOWED_MEDIA_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.mp4',
  '.webm',
  '.mov',
  '.ogg',
  '.mp3',
  '.m4a',
  '.wav',
  '.aac',
  '.flac',
]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateBoundedString(value, field, { min = 0, max = 2000, defaultVal = undefined } = {}) {
  if (value === undefined && defaultVal !== undefined) {
    return { valid: true, value: defaultVal };
  }
  if (typeof value !== 'string') {
    return { valid: false, error: `${field} must be a string` };
  }
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    return { valid: false, error: `${field} length must be between ${min} and ${max}` };
  }
  return { valid: true, value: trimmed };
}

/**
 * Validate login payload for POST /api/verify.
 * @param {unknown} body - Request JSON body.
 * @returns {{ valid: boolean, password?: string, error?: string }} Validation result.
 */
function validateLoginPayload(body) {
  if (!isPlainObject(body)) {
    return { valid: false, error: 'Request body must be a JSON object' };
  }
  if (typeof body.password !== 'string' || body.password.length === 0) {
    return { valid: false, error: 'Password is required' };
  }
  if (body.password.length > MAX_PASSWORD_LENGTH) {
    return { valid: false, error: 'Password exceeds maximum allowed length' };
  }
  return { valid: true, password: body.password };
}

function validatePoemsCollection(rawPoems) {
  if (!Array.isArray(rawPoems) || rawPoems.length > MAX_ITEMS_PER_COLLECTION) {
    return { valid: false, error: 'poems must be an array within size limits' };
  }
  const sanitized = [];
  for (const item of rawPoems) {
    if (!isPlainObject(item)) {
      return { valid: false, error: 'Each poem must be an object' };
    }
    const title = validateBoundedString(item.title, 'poem.title', { min: 1, max: 120 });
    const text = validateBoundedString(item.text, 'poem.text', { min: 1, max: 5000 });
    const date = validateBoundedString(item.date, 'poem.date', { min: 0, max: 60, defaultVal: '' });
    if (!title.valid || !text.valid || !date.valid) {
      return { valid: false, error: title.error || text.error || date.error };
    }
    if (typeof item.id !== 'number' && typeof item.id !== 'string') {
      return { valid: false, error: 'poem.id must be a number or string' };
    }
    sanitized.push({ id: item.id, title: title.value, text: text.value, date: date.value });
  }
  return { valid: true, value: sanitized };
}

function validatePhotosCollection(rawPhotos) {
  if (!Array.isArray(rawPhotos) || rawPhotos.length > MAX_ITEMS_PER_COLLECTION) {
    return { valid: false, error: 'photos must be an array within size limits' };
  }
  const sanitized = [];
  for (const item of rawPhotos) {
    if (!isPlainObject(item)) {
      return { valid: false, error: 'Each photo entry must be an object' };
    }
    const type = item.type === 'video' ? 'video' : 'image';
    const src = validateBoundedString(item.src, 'photo.src', { min: 1, max: 2048 });
    const caption = validateBoundedString(item.caption, 'photo.caption', { min: 0, max: 200, defaultVal: '' });
    const date = validateBoundedString(item.date, 'photo.date', { min: 0, max: 60, defaultVal: '' });
    if (!src.valid || !caption.valid || !date.valid) {
      return { valid: false, error: src.error || caption.error || date.error };
    }
    if (typeof item.id !== 'number' && typeof item.id !== 'string') {
      return { valid: false, error: 'photo.id must be a number or string' };
    }
    sanitized.push({ id: item.id, type, src: src.value, caption: caption.value, date: date.value });
  }
  return { valid: true, value: sanitized };
}

function validatePlaylistCollection(rawPlaylist) {
  if (!Array.isArray(rawPlaylist) || rawPlaylist.length > MAX_ITEMS_PER_COLLECTION) {
    return { valid: false, error: 'playlist must be an array within size limits' };
  }
  const sanitized = [];
  for (const item of rawPlaylist) {
    if (!isPlainObject(item)) {
      return { valid: false, error: 'Each playlist entry must be an object' };
    }
    const title = validateBoundedString(item.title, 'song.title', { min: 1, max: 160 });
    const artist = validateBoundedString(item.artist, 'song.artist', { min: 0, max: 160, defaultVal: 'Unknown Artist' });
    const url = validateBoundedString(item.url, 'song.url', { min: 0, max: 2048, defaultVal: '' });
    if (!title.valid || !artist.valid || !url.valid) {
      return { valid: false, error: title.error || artist.error || url.error };
    }
    sanitized.push({ title: title.value, artist: artist.value, url: url.value });
  }
  return { valid: true, value: sanitized };
}

/**
 * Validate and sanitize the application state payload for POST /api/data.
 * @param {unknown} body - Request JSON body.
 * @returns {{ valid: boolean, data?: object, error?: string }} Validation result.
 */
function validateAppDataPayload(body) {
  if (!isPlainObject(body)) {
    return { valid: false, error: 'Payload must be a JSON object' };
  }

  const poems = validatePoemsCollection(body.poems ?? []);
  if (!poems.valid) return { valid: false, error: poems.error };

  const photos = validatePhotosCollection(body.photos ?? []);
  if (!photos.valid) return { valid: false, error: photos.error };

  const playlist = validatePlaylistCollection(body.playlist ?? []);
  if (!playlist.valid) return { valid: false, error: playlist.error };

  const name1 = validateBoundedString(body.name1, 'name1', { min: 1, max: 80, defaultVal: 'Your Name' });
  const name2 = validateBoundedString(body.name2, 'name2', { min: 1, max: 80, defaultVal: 'Partner' });
  if (!name1.valid || !name2.valid) {
    return { valid: false, error: name1.error || name2.error };
  }

  let anniversary = null;
  if (body.anniversary !== null && body.anniversary !== undefined && body.anniversary !== '') {
    const annRes = validateBoundedString(body.anniversary, 'anniversary', { min: 4, max: 40 });
    if (!annRes.valid || Number.isNaN(Date.parse(annRes.value))) {
      return { valid: false, error: 'anniversary must be a valid date string or null' };
    }
    anniversary = annRes.value;
  }

  return {
    valid: true,
    data: {
      poems: poems.value,
      photos: photos.value,
      playlist: playlist.value,
      anniversary,
      name1: name1.value,
      name2: name2.value,
    },
  };
}

/**
 * Sanitize an uploaded filename param against path traversal and unsafe characters.
 * @param {unknown} rawName - Raw filename route parameter.
 * @returns {{ valid: boolean, filename?: string, error?: string }} Sanitized filename check.
 */
function sanitizeUploadFilename(rawName) {
  if (typeof rawName !== 'string' || rawName.trim() === '') {
    return { valid: false, error: 'Filename is required' };
  }

  let decoded;
  try {
    decoded = decodeURIComponent(rawName);
  } catch {
    return { valid: false, error: 'Malformed filename encoding' };
  }

  if (
    decoded.includes('\0') ||
    decoded.includes('..') ||
    decoded.includes('/') ||
    decoded.includes('\\')
  ) {
    return { valid: false, error: 'Invalid filename: path traversal is not allowed' };
  }

  if (!SAFE_FILENAME_REGEX.test(decoded) || path.basename(decoded) !== decoded) {
    return { valid: false, error: 'Filename contains disallowed characters' };
  }

  return { valid: true, filename: decoded };
}

/**
 * Validate a Multer uploaded media file against MIME type and extension allowlists.
 * @param {Express.Multer.File | undefined} file - Uploaded file metadata from Multer.
 * @returns {{ valid: boolean, ext?: string, error?: string }} File validation result.
 */
function validateUploadedFile(file) {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    return { valid: false, error: 'No non-empty file uploaded' };
  }

  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase().split(';')[0].trim();

  if (!ALLOWED_MEDIA_EXTENSIONS.has(ext)) {
    return { valid: false, error: `Unsupported file extension: ${ext || 'none'}` };
  }
  if (!ALLOWED_MEDIA_MIME_TYPES.has(mime)) {
    return { valid: false, error: `Unsupported media MIME type: ${mime || 'unknown'}` };
  }

  return { valid: true, ext };
}

module.exports = {
  ALLOWED_MEDIA_EXTENSIONS,
  ALLOWED_MEDIA_MIME_TYPES,
  validateLoginPayload,
  validateAppDataPayload,
  sanitizeUploadFilename,
  validateUploadedFile,
};
