require('dotenv').config();
require('express-async-errors');

const express = require('express');
const helmet = require('helmet'); //added for security
const cors = require('cors'); // enables cross origin requests
const morgan = require('morgan'); //added for logging
const { v4: uuidv4 } = require('uuid'); //added for request id generation

const uploadRoutes = require('./routes/uploads');
const response = require('./utils/response');
const logger = require('./utils/logger');
const db = require('./db');
const asyncLocalStorage = require('./utils/context');
const metrics = require('./utils/metrics');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./utils/swagger');

const createApp = () => {
  const app = express();

  // ── Security & middleware ──────────────────────────────────────────────────
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' })); // limit the size of the request body to 1mb
  app.use(express.urlencoded({ extended: true }));

  // Request ID propagation
  app.use((req, res, next) => {
    const requestId = req.headers['x-request-id'] || uuidv4(); // generate request id if not present
    req.requestId = requestId;
    asyncLocalStorage.run({ requestId }, () => {
      next();
    });
  });

  // HTTP request logging
  app.use(
    morgan('combined', { // combined is a predefined format for morgan that logs request id, method, url, status code, response time, etc.
      stream: { write: (msg) => logger.http(msg.trim()) }, // trim the log message to remove any extra whitespace
    })
  );

  // Metrics middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const route = req.route ? req.route.path : req.path;
      
      metrics.httpRequestDurationMicroseconds.labels(req.method, route, res.statusCode).observe(duration);
      metrics.httpRequestCount.labels(req.method, route, res.statusCode).inc();
      
      if (res.statusCode >= 400) {
        metrics.httpErrorCount.labels(req.method, route, res.statusCode).inc();
      }
    });
    next();
  });

  // ── Metrics endpoint ───────────────────────────────────────────────────────
  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', metrics.register.contentType);
      res.end(await metrics.register.metrics());
    } catch (ex) {
      res.status(500).end(ex.message);
    }
  });

  // ── Health & readiness ─────────────────────────────────────────────────────
  app.get('/health', (_req, res) => { // health check endpoint for docker
    res.status(200).json({
      success: true,
      data: { status: 'healthy', service: 'upload-session', uptime: process.uptime() },
    });
  });

  app.get('/ready', async (_req, res) => { // readiness probe endpoint for docker
    try {
      await db.query('SELECT 1'); // checks if the database is connected
      res.status(200).json({
        success: true,
        data: { status: 'ready', db: 'connected' },
      });
    } catch (err) {
      logger.error('Readiness probe failed', { error: err.message });
      res.status(503).json({
        success: false,
        data: { status: 'not ready', db: 'disconnected' },
      });
    }
  });

  // ── API routes ─────────────────────────────────────────────────────────────
  app.use('/uploads', uploadRoutes);

  // ── Swagger docs ───────────────────────────────────────────────────────────
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

  // ── 404 handler ───────────────────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json(
      response.error('NOT_FOUND', `Route ${req.method} ${req.path} not found`)
    );
  });

  // ── Global error handler ──────────────────────────────────────────────────
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => { // global error handler for all unhandled errors
    logger.error('Unhandled error', { // logs the unhandled error
      error: err.message, // the error message
      stack: err.stack, // the error stack trace
      path: req.path, // the path of the request
    });
    res.status(err.statusCode || 500).json( // sends the error response
      response.error(
        err.code || 'INTERNAL_SERVER_ERROR', // the error code
        err.message || 'An unexpected error occurred' // the error message
      )
    );
  });

  return app; // returns the express app
};

module.exports = createApp; // exports the express app
