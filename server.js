'use strict';

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { loadConfig, validateRuntimeConfig } = require('./backend/config');
const { createApp } = require('./backend/app');
const { logger } = require('./backend/utils/logger');

/**
 * Bootstrap configuration validation, create the Express app, and bind the HTTP listener.
 * @returns {import('http').Server} Running HTTP server instance.
 */
function startServer() {
  const config = loadConfig();
  validateRuntimeConfig(config);

  const app = createApp({ config, logger });
  const server = app.listen(config.port, () => {
    logger.info('Sweet Memories server started', {
      port: config.port,
      nodeEnv: config.nodeEnv,
    });
  });

  const shutdown = (signal) => {
    logger.info('Shutdown signal received, closing HTTP server', { signal });
    server.close(() => {
      logger.info('HTTP server closed cleanly');
      process.exit(0);
    });
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
