const dotenv = require('dotenv');
const logger = require('./logger');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

dotenv.config();

const exporter = new JaegerExporter({
  endpoint: process.env.JAEGER_ENDPOINT || 'http://jaeger:14268/api/traces'
});

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]: 'feature-flag-service'
  }),
  traceExporter: exporter,
  instrumentations: [getNodeAutoInstrumentations()]
});

try {
  sdk.start();
  logger.info('OpenTelemetry tracing initialized');
} catch (error) {
  logger.error('OpenTelemetry initialization failed', { message: error.message });
}

process.on('SIGTERM', () => {
  try {
    sdk.shutdown();
  } catch (error) {
    logger.error('OpenTelemetry shutdown failed', { message: error.message });
  }
});
