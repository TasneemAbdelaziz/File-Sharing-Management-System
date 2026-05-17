require('./tracing');
require('dotenv').config();
const createApp = require('./app');
const kafka = require('./kafka/producer');
const logger = require('./utils/logger');

const PORT = parseInt(process.env.PORT) || 3007;

const start = async () => {
  const app = createApp();

  const server = app.listen(PORT, () => {
    logger.info(`File Registry service started`, { port: PORT, env: process.env.NODE_ENV });
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      await kafka.disconnect();
      logger.info('Server closed. Exiting.');
      process.exit(0);
    });
    // Force exit after 10s
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason: String(reason) });
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });
};

start().catch((err) => {
  logger.error('Failed to start File Registry service', { error: err.message });
  process.exit(1);
});
