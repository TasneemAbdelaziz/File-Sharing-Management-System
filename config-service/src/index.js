import './tracing.js';
import express from 'express';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import configRouter from './routes/config.routes.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ensureMigrations } from './db/migrations.js';
import { initKafkaProducer, kafkaProducer } from './kafka/producer.js';
import pool from './db/pool.js';
import logger from './logger.js';
import swaggerSpec from './docs/swagger.js';
import metricsRegister, { metricsMiddleware } from './metrics.js';

dotenv.config();

const PORT = process.env.PORT || 3031;
const app = express();

app.use(express.json());
app.use(requestIdMiddleware);
app.use(metricsMiddleware);
app.use((req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    logger.info('request completed', {
      request_id: req.requestId,
      method: req.method,
      route: req.originalUrl,
      status_code: res.statusCode,
      duration_ms: Date.now() - startTime
    });
  });
  next();
});

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Service health check
 *     responses:
 *       200:
 *         description: Service is healthy
 */
app.get('/health', (req, res) => {
  return res.json({
    success: true,
    data: { status: 'ok' },
    meta: {
      service: 'config-service',
      request_id: req.requestId
    }
  });
});

/**
 * @openapi
 * /ready:
 *   get:
 *     summary: Service readiness check
 *     responses:
 *       200:
 *         description: Service is ready
 *       503:
 *         description: Service is not ready
 */
app.get('/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    if (!kafkaProducer.isConnected()) {
      await initKafkaProducer();
    }
    return res.status(200).json({
      success: true,
      data: { status: 'ready' },
      meta: { service: 'config-service', request_id: req.requestId }
    });
  } catch (error) {
    logger.error('Readiness check failed', { request_id: req.requestId, error: error.message });
    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_NOT_READY',
        message: 'Database or Kafka is unavailable',
        details: {
          message: error.message
        }
      },
      meta: { service: 'config-service', request_id: req.requestId }
    });
  }
});

/**
 * @openapi
 * /metrics:
 *   get:
 *     summary: Prometheus metrics endpoint
 *     responses:
 *       200:
 *         description: Prometheus metrics in text/plain format
 */
app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', metricsRegister.contentType);
  res.end(await metricsRegister.metrics());
});

app.get('/api-docs.json', (req, res) => {
  res.json(swaggerSpec);
});

app.get('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/config', configRouter);
app.use(errorHandler);

async function startServer() {
  try {
    await ensureMigrations();
    logger.info('Database migrations completed');
  } catch (error) {
    logger.error('Failed database migration', { error: error.message });
    process.exit(1);
  }

  try {
    await initKafkaProducer();
    logger.info('Kafka producer initialized');
  } catch (error) {
    logger.warn('Kafka unavailable at startup, continuing without producer.', { error: error.message });
  }

  app.listen(PORT, () => {
    logger.info('config-service listening', { port: PORT });
  });
}

if (process.argv[1] && process.argv[1].endsWith('src/index.js')) {
  startServer();
}

export default app;
