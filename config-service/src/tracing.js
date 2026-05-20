import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import dotenv from 'dotenv';
import logger from './logger.js';

dotenv.config();

process.env.OTEL_SERVICE_NAME = 'config-service';

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({ endpoint: process.env.JAEGER_ENDPOINT || 'http://jaeger:14268/api/traces' }),
  instrumentations: [getNodeAutoInstrumentations()]
});

const sdkStartResult = sdk.start();
if (sdkStartResult && typeof sdkStartResult.catch === 'function') {
  sdkStartResult.catch((error) => {
    logger.error('OpenTelemetry initialization failed', { error: error.message });
  });
}
