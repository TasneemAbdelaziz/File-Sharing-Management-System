const swaggerJsDoc = require("swagger-jsdoc");

const swaggerSpec = swaggerJsDoc({
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Download Orchestrator API",
            version: "1.0.0",
            description: "Hybrid REST + Kafka download orchestration service"
        }
    },
    apis: ["./src/routes/*.js"]
});

module.exports = swaggerSpec;
