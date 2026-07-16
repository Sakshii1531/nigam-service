import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';

// Uses the local mongod already running for dev (see backend/README.md) against a
// dedicated *_test database, rather than pulling in mongodb-memory-server (its postinstall
// downloads a real mongod binary, which is unnecessary when a local one already exists).
const TEST_DB_URI = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/nigam_care_test';

let app;

beforeAll(async () => {
  await mongoose.connect(TEST_DB_URI);
  app = createApp();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('GET /api/v1/health', () => {
  it('returns 200 with db connected', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('up');
    expect(res.body.data.db).toBe('connected');
  });
});

describe('unknown route', () => {
  it('returns a consistent 404 envelope', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/Route not found/);
  });
});
