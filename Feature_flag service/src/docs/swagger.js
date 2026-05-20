const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Feature Flag Service API',
      version: '1.0.0',
      description: 'Manages feature flags for all microservices'
    },
    servers: [{ url: 'http://localhost:3032' }],
    components: {
      schemas: {
        FeatureFlag: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            service: { type: 'string' },
            name: { type: 'string' },
            enabled: { type: 'boolean' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' }
              }
            },
            meta: {
              type: 'object',
              properties: {
                service: { type: 'string' },
                request_id: { type: 'string' }
              }
            }
          }
        }
      }
    }
  },
  apis: ['./src/**/*.js']
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = { swaggerSpec };
