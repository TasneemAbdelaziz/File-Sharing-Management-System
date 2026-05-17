process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../src/app");

describe("download-orchestrator", () => {
    it("returns health", async () => {
        const res = await request(app).get("/health");
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it("returns download plan", async () => {
        const res = await request(app).get("/downloads/file-1/plan?userId=user-7");
        expect(res.statusCode).toBe(200);
        expect(res.body.data.plan.fileId).toBe("file-1");
    });
});
