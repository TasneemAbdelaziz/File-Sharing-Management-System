const winston = require('winston');
const asyncLocalStorage = require('./context');

const addRequestId = winston.format((info) => {
  const store = asyncLocalStorage.getStore();
  if (store && store.requestId) {
    info.request_id = store.requestId;
  }
  return info;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    addRequestId(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'file-registry' },
  transports: [
    new winston.transports.Console()
  ],
});

module.exports = logger;
