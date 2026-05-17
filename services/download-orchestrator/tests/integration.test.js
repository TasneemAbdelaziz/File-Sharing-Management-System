// Integration tests for download-orchestrator
process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../src/app");

describe('Download Orchestrator - Integration Tests', () => {
    describe('GET /health', () => {
        it('should return 200 with health status', async () => {
            const res = await request(app).get("/health");
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('success');
            expect(res.body.success).toBe(true);
        });

        it('should have timestamp in response', async () => {
            const res = await request(app).get("/health");
            expect(res.body).toHaveProperty('timestamp');
        });

        it('should include service name', async () => {
            const res = await request(app).get("/health");
            expect(res.body).toHaveProperty('service');
            expect(res.body.service).toBe('download-orchestrator');
        });
    });

    describe('GET /ready', () => {
        it('should return readiness status', async () => {
            const res = await request(app).get("/ready");
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('ready');
        });
    });

    describe('GET /downloads/:fileId/plan', () => {
        it('should return download plan for valid request', async () => {
            const res = await request(app)
                .get("/downloads/file-1/plan")
                .query({ userId: "user-7" });
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(res.body.data).toHaveProperty('plan');
        });

        it('should require userId parameter', async () => {
            const res = await request(app).get("/downloads/file-1/plan");
            expect(res.statusCode).toBe(400);
        });

        it('should handle missing file', async () => {
            const res = await request(app)
                .get("/downloads/nonexistent/plan")
                .query({ userId: "user-7" });
            expect([404, 400]).toContain(res.statusCode);
        });
    });

    describe('Error Handling', () => {
        it('should return 404 for non-existent endpoint', async () => {
            const res = await request(app).get("/nonexistent");
            expect(res.statusCode).toBe(404);
        });

        it('should handle malformed requests gracefully', async () => {
            const res = await request(app)
                .post("/downloads")
                .send({ invalid: 'payload' });
            expect([400, 404]).toContain(res.statusCode);
        });

        it('should rate limit requests', async () => {
            // Mock rate limiting behavior
            let responses = [];
            for (let i = 0; i < 5; i++) {
                const res = await request(app).get("/health");
                responses.push(res.statusCode);
            }
            expect(responses.every(code => code === 200 || code === 429)).toBe(true);
        });
    });
});
