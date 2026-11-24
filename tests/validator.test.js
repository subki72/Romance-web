'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  validateLoginPayload,
  validateAppDataPayload,
  sanitizeUploadFilename,
  validateUploadedFile,
} = require('../backend/utils/validator');

describe('backend/utils/validator', () => {
  it('should validate login payloads cleanly', () => {
    assert.strictEqual(validateLoginPayload(null).valid, false);
    assert.strictEqual(validateLoginPayload({ password: '' }).valid, false);
    assert.strictEqual(validateLoginPayload({ password: 'x'.repeat(300) }).valid, false);

    const ok = validateLoginPayload({ password: 'dummy-example-passphrase' });
    assert.strictEqual(ok.valid, true);
    assert.strictEqual(ok.password, 'dummy-example-passphrase');
  });

  it('should sanitize valid app data and reject malformed collections or dates', () => {
    // Arrange
    const validPayload = {
      poems: [{ id: 1, title: 'Moonlight', text: 'You shine bright.', date: '2026-01-01', extra: 'ignored' }],
      photos: [{ id: 2, type: 'image', caption: 'Beach', date: '2026-01-02', src: 'https://cdn.example.com/a.jpg' }],
      playlist: [{ title: 'Song A', artist: 'Artist A', url: 'https://cdn.example.com/a.mp3' }],
      anniversary: '2024-02-14',
      name1: 'Alex',
      name2: 'Sam',
    };

    // Act
    const result = validateAppDataPayload(validPayload);

    // Assert
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.data.poems[0].extra, undefined);
    assert.strictEqual(result.data.name1, 'Alex');

    const badDate = validateAppDataPayload({ ...validPayload, anniversary: 'not-a-valid-date' });
    assert.strictEqual(badDate.valid, false);
    assert.strictEqual(validateAppDataPayload([]).valid, false);
  });

  it('should block path traversal attempts in uploaded filenames', () => {
    assert.strictEqual(sanitizeUploadFilename('1700000000-photo.jpg').valid, true);
    assert.strictEqual(sanitizeUploadFilename('../server.js').valid, false);
    assert.strictEqual(sanitizeUploadFilename('..%2Fserver.js').valid, false);
    assert.strictEqual(sanitizeUploadFilename('sub/photo.jpg').valid, false);
    assert.strictEqual(sanitizeUploadFilename('.env').valid, false);
    assert.strictEqual(sanitizeUploadFilename('bad\0file.png').valid, false);
  });

  it('should enforce media MIME type and extension allowlists on file uploads', () => {
    const validImage = {
      originalname: 'memory.png',
      mimetype: 'image/png',
      buffer: Buffer.from('png-bytes'),
    };
    const svgUpload = {
      originalname: 'vector.svg',
      mimetype: 'image/svg+xml',
      buffer: Buffer.from('<svg></svg>'),
    };
    const scriptUpload = {
      originalname: 'payload.html',
      mimetype: 'text/html',
      buffer: Buffer.from('<script>alert(1)</script>'),
    };
    const emptyUpload = {
      originalname: 'empty.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.alloc(0),
    };

    assert.strictEqual(validateUploadedFile(validImage).valid, true);
    assert.strictEqual(validateUploadedFile(svgUpload).valid, false);
    assert.strictEqual(validateUploadedFile(scriptUpload).valid, false);
    assert.strictEqual(validateUploadedFile(emptyUpload).valid, false);
  });
});
