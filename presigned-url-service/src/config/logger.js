const winston = require('winston');
const Tracer = require('../../../observability/tracer');

// Initialize the shared tracer
const tracer = new Tracer('presigned-url-service', process.env.JAEGER_ENDPOINT);

// Structured JSON logger — every entry includes timestamp, service, level, message
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'presigned-url-service' },
  transports: [
    new winston.transports.Console()
  ]
});

// Middleware: attaches request_id to every incoming request log and tracks tracing spans
function requestLogger(req, res, next) {
  const requestId = req.headers['x-request-id'] || require('crypto').randomUUID();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  // Extract or start tracing span
  const parentTraceId = req.headers['x-trace-id'] || req.headers['traceparent'] || requestId;
  const span = tracer.startSpan(`${req.method} ${req.path}`, parentTraceId);
  req.span = span;

  span.tags.method = req.method;
  span.tags.path = req.path;
  span.tags.ip = req.ip;

  logger.info('Incoming request', {
    request_id: requestId,
    trace_id: span.traceId,
    span_id: span.spanId,
    method: req.method,
    path: req.path,
    ip: req.ip
  });

  res.on('finish', () => {
    span.tags.status_code = res.statusCode;
    tracer.endSpan(span);
    tracer.exportTraces().catch(() => {}); // fire-and-forget jaeger export

    logger.info('Request completed', {
      request_id: requestId,
      trace_id: span.traceId,
      span_id: span.spanId,
      method: req.method,
      path: req.path,
      status_code: res.statusCode
    });
  });

  next();
}

module.exports = { logger, requestLogger };
