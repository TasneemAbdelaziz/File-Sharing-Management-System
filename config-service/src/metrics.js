import client from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

export const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5]
});

export const kafkaMessagesPublishedTotal = new client.Counter({
  name: 'kafka_messages_published_total',
  help: 'Total Kafka messages published',
  labelNames: ['topic']
});

register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDurationSeconds);
register.registerMetric(kafkaMessagesPublishedTotal);

export function metricsMiddleware(req, res, next) {
  const route = req.route?.path || req.path || req.originalUrl || 'unknown';
  const timer = httpRequestDurationSeconds.startTimer({ method: req.method, route });

  res.on('finish', () => {
    httpRequestsTotal.inc({ method: req.method, route, status_code: res.statusCode });
    timer({ method: req.method, route });
  });

  next();
}

export default register;
