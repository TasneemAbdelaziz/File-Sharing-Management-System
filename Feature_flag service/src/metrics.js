const client = require('prom-client');
const { pool } = require('./db/pool');
const logger = require('./logger');

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5]
});

const kafkaMessagesPublishedTotal = new client.Counter({
  name: 'kafka_messages_published_total',
  help: 'Total number of Kafka messages published',
  labelNames: ['topic']
});

const featureFlagsTotal = new client.Gauge({
  name: 'feature_flags_total',
  help: 'Total number of feature flags in the database'
});

client.collectDefaultMetrics({ prefix: 'feature_flag_service_', timeout: 5000 });

function metricsMiddleware(req, res, next) {
  const start = process.hrtime();

  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const durationSeconds = seconds + nanoseconds / 1e9;
    const route = req.route?.path || req.path;
    httpRequestsTotal.labels(req.method, route, res.statusCode.toString()).inc();
    httpRequestDurationSeconds.labels(req.method, route).observe(durationSeconds);
    logger.info('Request completed', {
      request_id: req.requestId,
      method: req.method,
      route,
      status_code: res.statusCode,
      duration_seconds: durationSeconds
    });
  });

  logger.info('Incoming request', {
    request_id: req.requestId,
    method: req.method,
    path: req.path
  });

  next();
}

async function updateFeatureFlagGauge() {
  try {
    const result = await pool.query('SELECT COUNT(*)::int AS total FROM feature_flags');
    const count = result?.rows?.[0]?.total ?? 0;
    featureFlagsTotal.set(count);
  } catch (error) {
    logger.warn('Failed to update feature flag gauge', { message: error.message });
  }
}

async function metricsEndpoint(req, res) {
  try {
    res.set('Content-Type', client.register.contentType);
    res.send(await client.register.metrics());
  } catch (error) {
    res.status(500).send(error.message);
  }
}

function incrementKafkaPublished(topic) {
  kafkaMessagesPublishedTotal.labels(topic).inc();
}

module.exports = {
  metricsMiddleware,
  metricsEndpoint,
  updateFeatureFlagGauge,
  incrementKafkaPublished
};
