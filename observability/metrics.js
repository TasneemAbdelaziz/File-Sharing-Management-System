// Metrics collector for Prometheus
class MetricsCollector {
    constructor(serviceName) {
        this.serviceName = serviceName;
        this.metrics = {
            http_requests_total: 0,
            http_request_duration_seconds: [],
            http_errors_total: 0
        };
    }

    recordRequest(method, path, statusCode, duration) {
        this.metrics.http_requests_total++;
        this.metrics.http_request_duration_seconds.push({
            method,
            path,
            duration
        });

        if (statusCode >= 400) {
            this.metrics.http_errors_total++;
        }
    }

    getMetrics() {
        const metrics = [];

        metrics.push(`# HELP http_requests_total Total HTTP requests`);
        metrics.push(`# TYPE http_requests_total counter`);
        metrics.push(`http_requests_total{service="${this.serviceName}"} ${this.metrics.http_requests_total}`);

        metrics.push(`# HELP http_errors_total Total HTTP errors`);
        metrics.push(`# TYPE http_errors_total counter`);
        metrics.push(`http_errors_total{service="${this.serviceName}"} ${this.metrics.http_errors_total}`);

        // Calculate latency percentiles
        const sorted = this.metrics.http_request_duration_seconds
            .map(m => m.duration)
            .sort((a, b) => a - b);

        if (sorted.length > 0) {
            const p50 = sorted[Math.floor(sorted.length * 0.50)];
            const p95 = sorted[Math.floor(sorted.length * 0.95)];
            const p99 = sorted[Math.floor(sorted.length * 0.99)];

            metrics.push(`# HELP http_request_duration_seconds Request latency`);
            metrics.push(`# TYPE http_request_duration_seconds summary`);
            metrics.push(`http_request_duration_seconds{service="${this.serviceName}",quantile="0.5"} ${p50}`);
            metrics.push(`http_request_duration_seconds{service="${this.serviceName}",quantile="0.95"} ${p95}`);
            metrics.push(`http_request_duration_seconds{service="${this.serviceName}",quantile="0.99"} ${p99}`);
        }

        return metrics.join('\n');
    }
}

module.exports = MetricsCollector;
