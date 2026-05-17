require('dotenv').config();
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const { connectDB } = require('./config/db');
const { logger, requestLogger } = require('./config/logger');
const { register, metricsMiddleware } = require('./config/metrics');
const urlRoutes = require('./routes/url.routes');

const app = express();
app.use(express.json());

// Observability middleware
app.use(requestLogger);
app.use(metricsMiddleware);

// Standard endpoints
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'presigned-url' });
});

app.get('/ready', (req, res) => {
  res.status(200).json({ status: 'READY', service: 'presigned-url' });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Swagger API documentation
const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Presigned URL Service API',
    version: '1.0.0',
    description: 'Generates secure, temporary, time-bound URLs for uploading or downloading files directly to/from the storage gateway.'
  },
  servers: [{ url: 'http://localhost:3002' }],
  paths: {
    '/urls/upload': {
      post: {
        summary: 'Generate a presigned URL for file upload',
        tags: ['Presigned URLs'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['file_id', 'user_id'],
                properties: {
                  file_id: { type: 'string', example: 'file-abc-123' },
                  user_id: { type: 'string', example: 'user-456' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Upload URL generated successfully', content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' }, expires_at: { type: 'string', format: 'date-time' } } } } } },
          400: { description: 'Bad request - missing file_id or user_id' },
          500: { description: 'Internal server error' }
        }
      }
    },
    '/urls/download': {
      post: {
        summary: 'Generate a presigned URL for file download',
        tags: ['Presigned URLs'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['file_id', 'user_id'],
                properties: {
                  file_id: { type: 'string', example: 'file-abc-123' },
                  user_id: { type: 'string', example: 'user-456' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Download URL generated successfully' },
          400: { description: 'Bad request - missing file_id or user_id' },
          500: { description: 'Internal server error' }
        }
      }
    },
    '/health': {
      get: {
        summary: 'Health check',
        tags: ['System'],
        responses: { 200: { description: 'Service is UP' } }
      }
    },
    '/ready': {
      get: {
        summary: 'Readiness check',
        tags: ['System'],
        responses: { 200: { description: 'Service is READY' } }
      }
    },
    '/metrics': {
      get: {
        summary: 'Prometheus metrics',
        tags: ['System'],
        responses: { 200: { description: 'Prometheus formatted metrics' } }
      }
    }
  }
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// App routes
app.use('/urls', urlRoutes);

const PORT = process.env.PORT || 3002;

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    logger.info(`Presigned URL Service listening on port ${PORT}`);
  });
}

// Only start the server when this file is run directly (not when required by tests)
if (require.main === module) {
  startServer().catch((err) => logger.error('Failed to start server', { error: err.message }));
}

module.exports = app; // export for testing
