import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Config Service API',
      version: '1.0.0',
      description: 'Manages runtime configuration for all microservices'
    }
  },
  apis: ['./src/routes/*.js', './src/index.js']
};

const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
