// Swagger configuration for file-sharing
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUiExpress = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'File Sharing API',
            version: '1.0.0',
            description: 'Microservice for managing shared files'
        },
        servers: [
            { url: 'http://localhost:3002', description: 'Development' },
            { url: 'https://api.cse474.local/files', description: 'Production' }
        ]
    },
    apis: ['./src/routes/*.js', './src/docs/swagger.js']
};

const specs = swaggerJsDoc(options);

module.exports = { swaggerUiExpress, specs };
