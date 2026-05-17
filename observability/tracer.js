// Tracing utility for OpenTelemetry
class Tracer {
    constructor(serviceName, jaegerEndpoint) {
        this.serviceName = serviceName;
        this.jaegerEndpoint = jaegerEndpoint || 'http://localhost:14268/api/traces';
        this.traces = [];
    }

    startSpan(spanName, parentTraceId = null) {
        const traceId = parentTraceId || this.generateTraceId();
        const spanId = this.generateSpanId();

        return {
            traceId,
            spanId,
            name: spanName,
            service: this.serviceName,
            startTime: Date.now(),
            tags: {},
            logs: []
        };
    }

    endSpan(span) {
        span.duration = Date.now() - span.startTime;
        this.traces.push(span);
        return span;
    }

    async exportTraces() {
        try {
            const payload = {
                traceID: this.traces[0]?.traceId,
                spans: this.traces.map(s => ({
                    traceID: s.traceId,
                    spanID: s.spanId,
                    operationName: s.name,
                    startTime: s.startTime * 1000,
                    duration: s.duration * 1000,
                    tags: s.tags,
                    logs: s.logs,
                    references: []
                }))
            };

            await fetch(`${this.jaegerEndpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('Failed to export traces:', error);
        }
    }

    generateTraceId() {
        return Math.random().toString(16).slice(2, 18).padStart(16, '0');
    }

    generateSpanId() {
        return Math.random().toString(16).slice(2, 10).padStart(8, '0');
    }
}

module.exports = Tracer;
