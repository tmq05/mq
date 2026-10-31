import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

describe('Backend API Integration Tests', () => {
  beforeAll(async () => {
    // Database is connected
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /health should return 200 and healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('POST /api/auth/login with valid admin credentials should return token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@mq.vn', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.role).toBe('ADMIN');
  });

  it('POST /api/auth/login with invalid password should return 400 or 500 error message', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@mq.vn', password: 'wrongpassword' });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('GET /api/songs/trending should return list of trending tracks', async () => {
    const res = await request(app).get('/api/songs/trending');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.trending)).toBe(true);
    expect(res.body.trending.length).toBeGreaterThan(0);
  });

  it('GET /api/songs/:id/stream should support HTTP 206 Partial Content Range request', async () => {
    // Get first seeded song
    const song = await prisma.song.findFirst({ where: { source: 'local' } });
    expect(song).toBeDefined();

    const res = await request(app)
      .get(`/api/songs/${song!.id}/stream`)
      .set('Range', 'bytes=0-1024');

    expect(res.status).toBe(206);
    expect(res.headers['content-range']).toMatch(/^bytes 0-1024\/\d+/);
    expect(res.headers['accept-ranges']).toBe('bytes');
  });

  it('GET /api/search should return aggregated search results with query stats', async () => {
    const res = await request(app).get('/api/search?q=Vũ&type=all');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data.tracks)).toBe(true);
    expect(res.body.tookMs).toBeDefined();
  });
});

