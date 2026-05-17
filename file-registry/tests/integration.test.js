const request = require('supertest');
const createApp = require('../src/app');
const db = require('../src/db');
const kafka = require('../src/kafka/producer');

jest.mock('../src/kafka/producer', () => ({
  publish: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
}));

const app = createApp();

describe('File Registry Integration Tests', () => {
  beforeAll(async () => {
    // Wait for DB migration if needed, or create tables here
    await db.query(`
      CREATE TABLE IF NOT EXISTS files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID NOT NULL,
        filename VARCHAR(255) NOT NULL,
        size BIGINT NOT NULL,
        mime_type VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });

  beforeEach(async () => {
    await db.query('DELETE FROM files');
  });

  afterAll(async () => {
    await db.pool.end();
  });

  it('should create a file and save it to the database', async () => {
    const payload = {
      owner_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      filename: 'integration-test.pdf',
      size: 102400,
      mime_type: 'application/pdf',
    };

    const res = await request(app).post('/files').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const fileId = res.body.data.id;
    const dbRes = await db.query('SELECT * FROM files WHERE id = $1', [fileId]);
    expect(dbRes.rows.length).toBe(1);
    expect(dbRes.rows[0].filename).toBe('integration-test.pdf');
  });

  it('should get a created file by id', async () => {
    const payload = {
      owner_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      filename: 'integration-get.pdf',
      size: 512,
      mime_type: 'application/pdf',
    };
    const createRes = await request(app).post('/files').send(payload);
    const fileId = createRes.body.data.id;

    const res = await request(app).get(`/files/${fileId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.filename).toBe('integration-get.pdf');
  });

  it('should delete a file and mark it as deleted in the database', async () => {
    const payload = {
      owner_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      filename: 'integration-delete.pdf',
      size: 1024,
      mime_type: 'application/pdf',
    };
    const createRes = await request(app).post('/files').send(payload);
    const fileId = createRes.body.data.id;

    const delRes = await request(app).delete(`/files/${fileId}`);
    expect(delRes.status).toBe(200);

    const dbRes = await db.query('SELECT status FROM files WHERE id = $1', [fileId]);
    expect(dbRes.rows[0].status).toBe('deleted');
  });
});
