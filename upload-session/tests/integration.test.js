const request = require('supertest');
const createApp = require('../src/app');
const db = require('../src/db');
const kafka = require('../src/kafka/producer');

jest.mock('../src/kafka/producer', () => ({
  publish: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
}));

const app = createApp();

describe('Upload Session Integration Tests', () => {
  beforeAll(async () => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS upload_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_id UUID NOT NULL,
        owner_id UUID NOT NULL,
        total_chunks INTEGER NOT NULL,
        uploaded_chunks INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'initialized',
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });

  beforeEach(async () => {
    await db.query('DELETE FROM upload_sessions');
  });

  afterAll(async () => {
    await db.pool.end();
  });

  it('should create an upload session and save it to the database', async () => {
    const payload = {
      file_id: 'b2c3d4e5-f678-90ab-cdef-123456789012',
      owner_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      total_chunks: 5,
    };

    const res = await request(app).post('/uploads/sessions').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const sessionId = res.body.data.id;
    const dbRes = await db.query('SELECT * FROM upload_sessions WHERE id = $1', [sessionId]);
    expect(dbRes.rows.length).toBe(1);
    expect(dbRes.rows[0].total_chunks).toBe(5);
  });

  it('should retrieve a created upload session', async () => {
    const payload = {
      file_id: 'c3d4e5f6-7890-abcd-ef12-345678901234',
      owner_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      total_chunks: 3,
    };
    const createRes = await request(app).post('/uploads/sessions').send(payload);
    const sessionId = createRes.body.data.id;

    const res = await request(app).get(`/uploads/sessions/${sessionId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.total_chunks).toBe(3);
  });

  it('should mark a session as failed', async () => {
    const payload = {
      file_id: 'd4e5f678-90ab-cdef-1234-567890123456',
      owner_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      total_chunks: 10,
    };
    const createRes = await request(app).post('/uploads/sessions').send(payload);
    const sessionId = createRes.body.data.id;

    const failRes = await request(app).post(`/uploads/sessions/${sessionId}/fail`);
    expect(failRes.status).toBe(200);

    const dbRes = await db.query('SELECT status FROM upload_sessions WHERE id = $1', [sessionId]);
    expect(dbRes.rows[0].status).toBe('failed');
  });
});
