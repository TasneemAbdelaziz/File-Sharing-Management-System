require('./tracing');

const express = require('express');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const { swaggerSpec } = require('./docs/swagger');
const flagsRoutes = require('./routes/flags.routes');
const { errorHandler } = require('./middleware/errorHandler');
const { requestIdMiddleware } = require('./middleware/requestId');
const { connectProducer, isProducerReady } = require('./kafka/producer');
const { pool } = require('./db/pool');
const { migrate } = require('./db/migrations');
const logger = require('./logger');
const { metricsMiddleware, metricsEndpoint } = require('./metrics');

dotenv.config();

const app = express();
app.use(express.json());
app.use(requestIdMiddleware);
app.use(metricsMiddleware);

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Service is healthy
 *       500:
 *         description: Service health check failed
 */
app.get('/health', (req, res) => {
  logger.info('Health check request', { request_id: req.requestId });
  return res.json({
    success: true,
    data: { status: 'ok' },
    meta: { service: 'feature-flag-service', request_id: req.requestId }
  });
});

/**
 * @openapi
 * /ready:
 *   get:
 *     summary: Readiness check endpoint
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Service is ready
 *       503:
 *         description: Service is not ready
 */
app.get('/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    if (!await isProducerReady()) {
      await connectProducer();
    }

    logger.info('Readiness check passed', { request_id: req.requestId });

    return res.json({
      success: true,
      data: { status: 'ready' },
      meta: { service: 'feature-flag-service', request_id: req.requestId }
    });
  } catch (error) {
    logger.error('Readiness check failed', { request_id: req.requestId, message: error.message });
    return res.status(503).json({
      success: false,
      error: { message: 'service not ready', details: error.message },
      meta: { service: 'feature-flag-service', request_id: req.requestId }
    });
  }
});

app.use('/flags', flagsRoutes);

/**
 * @openapi
 * /metrics:
 *   get:
 *     summary: Prometheus metrics endpoint
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Prometheus metrics in text format
 *       500:
 *         description: Metrics could not be generated
 */
app.get('/metrics', metricsEndpoint);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));
app.use(errorHandler);

const PORT = process.env.PORT || 3032;

async function start() {
  try {
    await migrate();
  } catch (error) {
    logger.error('Database migration failed', { message: error.message });
    process.exit(1);
  }

  try {
    await pool.query('SELECT 1');
    logger.info('Database connection verified');
  } catch (error) {
    logger.error('Database connection failed', { message: error.message });
    process.exit(1);
  }

  try {
    await connectProducer();
  } catch (error) {
    logger.warn('Kafka producer connection failed, service will still run', { message: error.message });
  }

  app.listen(PORT, () => {
    logger.info('Feature flag service listening', { port: PORT });
  });
}

if (require.main === module) {
  start().catch((error) => {
    logger.error('Failed to start service', { message: error.message });
    process.exit(1);
  });
}

module.exports = app;
