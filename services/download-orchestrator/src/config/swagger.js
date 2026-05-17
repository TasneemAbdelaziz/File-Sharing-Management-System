// Swagger configuration for download-orchestrator
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUiExpress = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Download Orchestrator API',
            version: '1.0.0',
            description: 'Microservice for orchestrating file downloads'
        },
        servers: [
            { url: 'http://localhost:3001', description: 'Development' },
            { url: 'https://api.cse474.local/downloads', description: 'Production' }
        ]
    },
    apis: ['./src/routes/*.js', './src/docs/swagger.js']
};

const specs = swaggerJsDoc(options);

module.exports = { swaggerUiExpress, specs };
