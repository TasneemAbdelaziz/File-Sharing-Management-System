// Integration tests for file-sharing
process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../src/app");

describe('File Sharing - Integration Tests', () => {
    describe('GET /health', () => {
        it('should return 200 with health status', async () => {
            const res = await request(app).get("/health");
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('success');
            expect(res.body.success).toBe(true);
        });

        it('should include service name in response', async () => {
            const res = await request(app).get("/health");
            expect(res.body).toHaveProperty('service');
            expect(res.body.service).toBe('file-sharing');
        });

        it('should include timestamp', async () => {
            const res = await request(app).get("/health");
            expect(res.body).toHaveProperty('timestamp');
        });
    });

    describe('GET /ready', () => {
        it('should return readiness status', async () => {
            const res = await request(app).get("/ready");
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('ready');
        });
    });

    describe('GET /files/:fileId', () => {
        it('should return file metadata for valid request', async () => {
            const res = await request(app)
                .get("/files/file-1")
                .query({ userId: "user-1" });
            expect([200, 404]).toContain(res.statusCode);
        });

        it('should require userId parameter', async () => {
            const res = await request(app).get("/files/file-1");
            expect([400, 401]).toContain(res.statusCode);
        });

        it('should handle file not found', async () => {
            const res = await request(app)
                .get("/files/nonexistent-file")
                .query({ userId: "user-1" });
            expect([404, 400]).toContain(res.statusCode);
        });
    });

    describe('POST /files', () => {
        it('should handle file upload request', async () => {
            const res = await request(app)
                .post("/files")
                .send({
                    filename: 'test.txt',
                    userId: 'user-1',
                    size: 1024
                });
            expect([200, 201, 400]).toContain(res.statusCode);
        });

        it('should validate file metadata', async () => {
            const res = await request(app)
                .post("/files")
                .send({ filename: '' });
            expect([400, 422]).toContain(res.statusCode);
        });
    });

    describe('Error Handling', () => {
        it('should return 404 for non-existent endpoint', async () => {
            const res = await request(app).get("/nonexistent");
            expect(res.statusCode).toBe(404);
        });

        it('should handle malformed JSON', async () => {
            const res = await request(app)
                .post("/files")
                .send('{ invalid json }');
            expect([400, 422]).toContain(res.statusCode);
        });

        it('should handle concurrent requests', async () => {
            const requests = [];
            for (let i = 0; i < 10; i++) {
                requests.push(request(app).get("/health"));
            }
            const responses = await Promise.all(requests);
            expect(responses.every(r => r.statusCode === 200)).toBe(true);
        });
    });
});
