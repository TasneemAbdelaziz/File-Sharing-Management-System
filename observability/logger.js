// Logger utility for structured JSON logging
class Logger {
    constructor(serviceName) {
        this.serviceName = serviceName;
    }

    formatLog(level, message, meta = {}) {
        return {
            timestamp: new Date().toISOString(),
            service: this.serviceName,
            level: level.toUpperCase(),
            message: message,
            request_id: meta.requestId || 'N/A',
            ...meta
        };
    }

    info(message, meta = {}) {
        console.log(JSON.stringify(this.formatLog('info', message, meta)));
    }

    warn(message, meta = {}) {
        console.warn(JSON.stringify(this.formatLog('warn', message, meta)));
    }

    error(message, meta = {}) {
        console.error(JSON.stringify(this.formatLog('error', message, meta)));
    }

    debug(message, meta = {}) {
        if (process.env.LOG_LEVEL === 'debug') {
            console.log(JSON.stringify(this.formatLog('debug', message, meta)));
        }
    }
}

module.exports = Logger;
