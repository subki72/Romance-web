'use strict';

const crypto = require('crypto');
const path = require('path');
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const { loadConfig } = require('./config');
const { logger: defaultLogger } = require('./utils/logger');
const { createTtlCache } = require('./utils/cache');
const {
  validateAppDataPayload,
  sanitizeUploadFilename,
  validateUploadedFile,
} = require('./utils/validator');
const { createAuthMiddleware, createVerifyHandler } = require('./middleware/auth');
const { createRateLimiter } = require('./middleware/rateLimiter');
const {
  securityHeaders,
  notFoundHandler,
  createErrorHandler,
} = require('./middleware/errorHandler');

const DEFAULT_APP_DATA = Object.freeze({
  poems: [],
  photos: [],
  playlist: [],
  anniversary: null,
  name1: 'Your Name',
  name2: 'Partner',
});

/**
 * Create a fetch wrapper enforcing an explicit per-request timeout via AbortSignal.
 * @param {number} timeoutMs - Maximum wait time in milliseconds.
 * @returns {typeof fetch} Timeout-guarded fetch function.
 */
function createTimeoutFetch(timeoutMs) {
  return function fetchWithTimeout(url, options = {}) {
    if (options.signal) {
      return fetch(url, options);
    }
    return fetch(url, {
      ...options,
      signal: AbortSignal.timeout(timeoutMs),
    });
  };
}

/**
 * Create a Supabase client configured with explicit HTTP request timeouts.
 * @param {object} config - Runtime configuration from loadConfig.
 * @returns {import('@supabase/supabase-js').SupabaseClient} Configured Supabase client.
 */
function createSupabaseClientWithTimeout(config) {
  return createClient(config.supabaseUrl, config.supabaseServiceKey, {
    global: {
      fetch: createTimeoutFetch(config.timeoutMs),
    },
  });
}

function buildCorsOptions(allowedOrigins) {
  if (!Array.isArray(allowedOrigins) || allowedOrigins.length === 0) {
    return undefined;
  }
  const allowSet = new Set(allowedOrigins);
  return {
    origin(origin, callback) {
      if (!origin || allowSet.has(origin)) {
        callback(null, true);
        return;
      }
      const err = new Error('Origin not allowed by CORS policy');
      err.statusCode = 403;
      callback(err);
    },
  };
}

function registerDataRoutes(app, { supabase, requireAuth, dataCache, appLogger }) {
  app.get('/api/data', requireAuth, async (_req, res, next) => {
    try {
      const cached = dataCache.get('app_data');
      if (cached) {
        res.json(cached);
        return;
      }

      const { data, error } = await supabase
        .from('app_data')
        .select('data')
        .eq('id', 1)
        .single();

      if (error && error.code === 'PGRST116') {
        res.json({ ...DEFAULT_APP_DATA });
        return;
      }
      if (error) {
        throw error;
      }

      const payload = data && data.data ? data.data : { ...DEFAULT_APP_DATA };
      dataCache.set('app_data', payload);
      res.json(payload);
    } catch (err) {
      appLogger.error('Failed to load app data', { reason: err.message });
      next(err);
    }
  });

  app.post('/api/data', requireAuth, async (req, res, next) => {
    try {
      const validation = validateAppDataPayload(req.body);
      if (!validation.valid) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const { error } = await supabase
        .from('app_data')
        .upsert({
          id: 1,
          data: validation.data,
          updated_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        throw error;
      }

      dataCache.invalidate('app_data');
      appLogger.info('App data updated successfully');
      res.json({ success: true });
    } catch (err) {
      appLogger.error('Failed to save app data', { reason: err.message });
      next(err);
    }
  });
}

function registerUploadRoutes(app, {
  supabase,
  requireAuth,
  uploadRateLimiter,
  upload,
  storageBucket,
  appLogger,
}) {
  app.post('/api/upload', requireAuth, uploadRateLimiter, upload.single('file'), async (req, res, next) => {
    try {
      const fileCheck = validateUploadedFile(req.file);
      if (!fileCheck.valid) {
        res.status(400).json({ error: fileCheck.error });
        return;
      }

      const fileName = `${Date.now()}-${crypto.randomUUID()}${fileCheck.ext}`;
      const { error } = await supabase.storage
        .from(storageBucket)
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          cacheControl: '31536000',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from(storageBucket)
        .getPublicUrl(fileName);

      appLogger.info('Media file uploaded', { fileName });
      res.json({ url: urlData.publicUrl });
    } catch (err) {
      appLogger.error('Media upload failed', { reason: err.message });
      next(err);
    }
  });

  app.delete('/api/upload/:filename', requireAuth, async (req, res, next) => {
    try {
      const nameCheck = sanitizeUploadFilename(req.params.filename);
      if (!nameCheck.valid) {
        res.status(400).json({ error: nameCheck.error });
        return;
      }

      const { error } = await supabase.storage
        .from(storageBucket)
        .remove([nameCheck.filename]);

      if (error) {
        throw error;
      }

      appLogger.info('Media file deleted', { fileName: nameCheck.filename });
      res.json({ success: true });
    } catch (err) {
      appLogger.error('Media deletion failed', { reason: err.message });
      next(err);
    }
  });
}

/**
 * Create a configured Express application with injectable dependencies for clean testing.
 * @param {{ supabaseClient?: object, config?: object, logger?: object }} [deps={}] - App dependencies.
 * @returns {import('express').Express} Configured Express application instance.
 */
function createApp({ supabaseClient, config, logger: customLogger } = {}) {
  const cfg = config || loadConfig();
  const appLogger = customLogger || defaultLogger;
  const supabase = supabaseClient || createSupabaseClientWithTimeout(cfg);
  const rootDir = path.resolve(__dirname, '..');
  const dataCache = createTtlCache({ ttlMs: cfg.dataCacheTtlMs });

  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.use(cors(buildCorsOptions(cfg.allowedOrigins)));
  app.use(express.json({ limit: '2mb' }));

  // Serve ONLY the public frontend directory and deny dotfiles so backend internals remain private.
  app.use('/src', express.static(path.join(rootDir, 'src'), { dotfiles: 'deny' }));

  app.get('/', (_req, res) => {
    res.redirect('/src/index.html');
  });

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'romance-web',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  const rateLimiterConfig = {
    windowMs: cfg.rateLimitWindowMs,
    maxRequests: cfg.rateLimitMax,
    logger: appLogger,
  };
  const verifyRateLimiter = createRateLimiter(rateLimiterConfig);
  const uploadRateLimiter = createRateLimiter(rateLimiterConfig);
  const requireAuth = createAuthMiddleware({ appPassword: cfg.appPassword, logger: appLogger });

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: cfg.maxUploadMb * 1024 * 1024 },
  });

  app.post('/api/verify', verifyRateLimiter, createVerifyHandler({ appPassword: cfg.appPassword, logger: appLogger }));
  registerDataRoutes(app, { supabase, requireAuth, dataCache, appLogger });
  registerUploadRoutes(app, {
    supabase,
    requireAuth,
    uploadRateLimiter,
    upload,
    storageBucket: cfg.storageBucket,
    appLogger,
  });

  app.use(notFoundHandler);
  app.use(createErrorHandler({ logger: appLogger }));

  return app;
}

module.exports = {
  createApp,
  createSupabaseClientWithTimeout,
  createTimeoutFetch,
  DEFAULT_APP_DATA,
};
