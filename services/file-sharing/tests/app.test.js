process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../src/app");

describe("file-sharing", () => {
    it("returns health", async () => {
        const res = await request(app).get("/health");
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it("creates share token", async () => {
        const res = await request(app).post("/shares").send({
            file_id: "file-9",
            recipient_email: "user@example.com"
        });

        expect(res.statusCode).toBe(201);
        expect(res.body.data.token).toBeDefined();
    });

    it("gets share by token", async () => {
        const res = await request(app).get("/shares/tok-123");
        expect(res.statusCode).toBe(200);
        expect(res.body.data.token).toBe("tok-123");
    });
});
