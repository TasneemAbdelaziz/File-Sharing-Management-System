const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [50, 100, 200, 300, 400, 500, 750, 1000, 2000]
});
register.registerMetric(httpRequestDurationMicroseconds);

const httpRequestCount = new client.Counter({
  name: 'http_request_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'code']
});
register.registerMetric(httpRequestCount);

const httpErrorCount = new client.Counter({
  name: 'http_error_total',
  help: 'Total number of HTTP errors',
  labelNames: ['method', 'route', 'code']
});
register.registerMetric(httpErrorCount);

module.exports = {
  register,
  httpRequestDurationMicroseconds,
  httpRequestCount,
  httpErrorCount
};
