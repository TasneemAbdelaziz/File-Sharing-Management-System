require('dotenv').config();
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const { connectDB } = require('./config/db');
const { connectKafka } = require('./config/kafka');
const { logger, requestLogger } = require('./config/logger');
const { register, metricsMiddleware } = require('./config/metrics');
const quotaRoutes = require('./routes/quota.routes');

const app = express();
app.use(express.json());

// Observability middleware
app.use(requestLogger);
app.use(metricsMiddleware);

// Standard endpoints
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'file-quota' });
});

app.get('/ready', (req, res) => {
  res.status(200).json({ status: 'READY', service: 'file-quota' });
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
    title: 'File Quota Service API',
    version: '1.0.0',
    description: 'Manages and enforces storage limits for users on the Nexus platform.'
  },
  servers: [{ url: 'http://localhost:3001' }],
  paths: {
    '/quota/{user_id}': {
      get: {
        summary: 'Get quota for a user',
        tags: ['Quota'],
        parameters: [{ name: 'user_id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Quota data returned successfully' },
          404: { description: 'Quota not found for user' },
          500: { description: 'Internal server error' }
        }
      }
    },
    '/quota/check': {
      post: {
        summary: 'Check if a user has enough quota for a new file',
        tags: ['Quota'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['user_id', 'new_file_size'],
                properties: {
                  user_id: { type: 'string', example: 'user-123' },
                  new_file_size: { type: 'integer', example: 1048576, description: 'File size in bytes' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Quota check passed' },
          400: { description: 'Bad request - missing fields' },
          403: { description: 'Quota exceeded' },
          500: { description: 'Internal server error' }
        }
      }
    },
    '/quota/update': {
      post: {
        summary: 'Update used storage for a user',
        tags: ['Quota'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['user_id', 'used_storage'],
                properties: {
                  user_id: { type: 'string', example: 'user-123' },
                  used_storage: { type: 'integer', example: 2097152, description: 'New total used storage in bytes' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Quota updated successfully' },
          400: { description: 'Bad request - missing fields' },
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
app.use('/quota', quotaRoutes);

const PORT = process.env.PORT || 3001;

async function startServer() {
  await connectDB();
  await connectKafka();

  app.listen(PORT, () => {
    logger.info(`File Quota Service listening on port ${PORT}`);
  });
}

// Only start the server when this file is run directly (not when required by tests)
if (require.main === module) {
  startServer().catch((err) => logger.error('Failed to start server', { error: err.message }));
}

module.exports = app; // export for testing
