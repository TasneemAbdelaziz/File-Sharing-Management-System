const client = require('prom-client');

// Enable default Node.js metrics (event loop, memory, CPU)
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// --- Custom Metrics ---

// Counter: total HTTP requests received
const httpRequestCount = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// Histogram: request duration in seconds
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds (p50/p95/p99)',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register]
});

// Counter: total errors
const errorCount = new client.Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP errors (5xx)',
  labelNames: ['method', 'route'],
  registers: [register]
});

// Middleware: record metrics for every request
function metricsMiddleware(req, res, next) {
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    const route = req.route ? req.route.path : req.path;
    const labels = { method: req.method, route, status_code: res.statusCode };

    httpRequestCount.inc(labels);
    end(labels);

    if (res.statusCode >= 500) {
      errorCount.inc({ method: req.method, route });
    }
  });

  next();
}

module.exports = { register, metricsMiddleware };
