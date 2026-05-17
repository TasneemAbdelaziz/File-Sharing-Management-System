require('./tracing');
require('dotenv').config();
const createApp = require('./app');
const kafka = require('./kafka/producer');
const sessionService = require('./services/sessionService');
const logger = require('./utils/logger');

const PORT = parseInt(process.env.PORT) || 3008;

const start = async () => {
  const app = createApp();

  const server = app.listen(PORT, () => {
    logger.info(`Upload Session service started`, { port: PORT, env: process.env.NODE_ENV });
  });

  // ── Session expiry job (runs every minute) ─────────────────────────────────
  // In production this is managed by the Scheduler service (#30),
  // but we keep a local fallback for resilience.
  const expiryJob = setInterval(async () => {
    try {
      await sessionService.expireStale();
    } catch (err) {
      logger.warn('Session expiry job failed (non-fatal)', { error: err.message });
    }
  }, 60 * 1000);

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    clearInterval(expiryJob);
    server.close(async () => {
      await kafka.disconnect();
      logger.info('Server closed. Exiting.');
      process.exit(0); //added for docker stop issues 10 sec delay to prevent data loss
    });
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
  logger.error('Failed to start Upload Session service', { error: err.message });
  process.exit(1);
});
