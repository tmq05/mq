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

  it('POST /api/auth/otp/send and /verify should function correctly', async () => {
    // 1. Missing target -> 400
    const errRes = await request(app)
      .post('/api/auth/otp/send')
      .send({});
    expect(errRes.status).toBe(400);

    // 2. Send to admin@mq.vn via email
    const sendRes = await request(app)
      .post('/api/auth/otp/send')
      .send({
        target: 'admin@mq.vn',
        channel: 'email',
      });
    expect(sendRes.status).toBe(200);
    expect(sendRes.body.success).toBe(true);
    expect(sendRes.body.previewOtp).toBeDefined();

    const otpCode = sendRes.body.previewOtp;

    // 3. Verify with wrong code -> 400
    const wrongRes = await request(app)
      .post('/api/auth/otp/verify')
      .send({
        target: 'admin@mq.vn',
        channel: 'email',
        otp: '000000',
      });
    expect(wrongRes.status).toBe(400);

    // 4. Verify with correct code -> 200
    const verifyRes = await request(app)
      .post('/api/auth/otp/verify')
      .send({
        target: 'admin@mq.vn',
        channel: 'email',
        otp: otpCode,
      });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
  });

  it('Admin Management APIs should handle artists, playlists, users, and reports', async () => {
    // 1. Login as Admin
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@mq.vn', password: 'admin123' });
    if (!loginRes.body.accessToken) {
      console.error('LOGIN FAILED:', loginRes.status, loginRes.body);
    }
    const token = loginRes.body.accessToken;
    expect(token).toBeDefined();

    // 2. Artists CRUD & verify
    const createArtistRes = await request(app)
      .post('/api/admin/artists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Artist Vitest',
        bio: 'Created via automated integration test',
        isVerified: true,
      });
    expect(createArtistRes.status).toBe(201);
    const artistId = createArtistRes.body.id;
    expect(artistId).toBeDefined();

    // Toggle verify
    const toggleVerifyRes = await request(app)
      .patch(`/api/admin/artists/${artistId}/verify`)
      .set('Authorization', `Bearer ${token}`);
    expect(toggleVerifyRes.status).toBe(200);
    expect(toggleVerifyRes.body.artist.isVerified).toBe(false);

    // List artists
    const listArtistsRes = await request(app)
      .get('/api/admin/artists')
      .set('Authorization', `Bearer ${token}`);
    expect(listArtistsRes.status).toBe(200);
    expect(Array.isArray(listArtistsRes.body.artists)).toBe(true);

    // 3. Playlists management
    const listPlaylistsRes = await request(app)
      .get('/api/admin/playlists')
      .set('Authorization', `Bearer ${token}`);
    expect(listPlaylistsRes.status).toBe(200);
    expect(Array.isArray(listPlaylistsRes.body.playlists)).toBe(true);

    if (listPlaylistsRes.body.playlists.length > 0) {
      const pl = listPlaylistsRes.body.playlists[0];
      // Toggle pin
      const pinRes = await request(app)
        .patch(`/api/admin/playlists/${pl.id}/pin`)
        .set('Authorization', `Bearer ${token}`);
      expect(pinRes.status).toBe(200);

      // Get playlist details
      const plDetailRes = await request(app)
        .get(`/api/admin/playlists/${pl.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(plDetailRes.status).toBe(200);
      expect(plDetailRes.body.id).toBe(pl.id);
    }

    // 4. Reports management
    const listReportsRes = await request(app)
      .get('/api/admin/reports')
      .set('Authorization', `Bearer ${token}`);
    expect(listReportsRes.status).toBe(200);
    expect(Array.isArray(listReportsRes.body.reports)).toBe(true);
    expect(listReportsRes.body.stats).toBeDefined();

    // 5. Users management & details
    const listUsersRes = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`);
    expect(listUsersRes.status).toBe(200);
    expect(Array.isArray(listUsersRes.body.users)).toBe(true);

    const firstUser = listUsersRes.body.users[0];
    const userDetailRes = await request(app)
      .get(`/api/admin/users/${firstUser.id}/details`)
      .set('Authorization', `Bearer ${token}`);
    expect(userDetailRes.status).toBe(200);
    expect(userDetailRes.body.user.id).toBe(firstUser.id);
    expect(Array.isArray(userDetailRes.body.playlists)).toBe(true);
    expect(Array.isArray(userDetailRes.body.recentPlays)).toBe(true);
    expect(Array.isArray(userDetailRes.body.likedSongs)).toBe(true);

    // Clean up created artist
    await request(app)
      .delete(`/api/admin/artists/${artistId}`)
      .set('Authorization', `Bearer ${token}`);
  });

  it('Admin Providers Quota, Audit Logs & System Settings APIs should work correctly', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@mq.vn', password: 'admin123' });
    if (!loginRes.body.accessToken) {
      console.error('LOGIN FAILED:', loginRes.status, loginRes.body);
    }
    const token = loginRes.body.accessToken;
    expect(token).toBeDefined();

    // 1. Providers and quota status
    const providersRes = await request(app)
      .get('/api/admin/providers')
      .set('Authorization', `Bearer ${token}`);
    expect(providersRes.status).toBe(200);
    expect(providersRes.body.providers).toBeDefined();
    expect(providersRes.body.providers.youtube).toBeDefined();
    expect(providersRes.body.summary).toBeDefined();
    expect(providersRes.body.summary.total).toBeGreaterThan(0);

    // 2. Test provider connection
    const testConnRes = await request(app)
      .post('/api/admin/providers/jamendo/test')
      .set('Authorization', `Bearer ${token}`);
    expect(testConnRes.status).toBe(200);
    expect(testConnRes.body.provider).toBe('jamendo');
    expect(typeof testConnRes.body.latencyMs).toBe('number');

    // 3. Toggle provider
    const toggleRes = await request(app)
      .patch('/api/admin/providers/jamendo/toggle')
      .set('Authorization', `Bearer ${token}`)
      .send({ enabled: true });
    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.enabled).toBe(true);

    // 4. Audit Logs query & pagination
    const auditLogsRes = await request(app)
      .get('/api/admin/audit-logs?page=1&limit=10')
      .set('Authorization', `Bearer ${token}`);
    expect(auditLogsRes.status).toBe(200);
    expect(Array.isArray(auditLogsRes.body.logs)).toBe(true);
    expect(auditLogsRes.body.total).toBeGreaterThanOrEqual(1);

    // 5. Audit Logs CSV export
    const exportCsvRes = await request(app)
      .get('/api/admin/audit-logs/export')
      .set('Authorization', `Bearer ${token}`);
    expect(exportCsvRes.status).toBe(200);
    expect(exportCsvRes.header['content-type']).toContain('text/csv');
    expect(exportCsvRes.text).toContain('Thời gian,Người thực hiện');

    // 6. System Settings GET & PATCH
    const getSettingsRes = await request(app)
      .get('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`);
    expect(getSettingsRes.status).toBe(200);
    expect(getSettingsRes.body.siteName).toBeDefined();

    const patchSettingsRes = await request(app)
      .patch('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        siteName: 'mq - Âm nhạc thử nghiệm',
        maxUploadSizeMB: 75,
        allowedAudioFormats: ['mp3', 'wav', 'flac'],
        registrationEnabled: true,
        maintenanceMode: false,
      });
    expect(patchSettingsRes.status).toBe(200);
    expect(patchSettingsRes.body.settings.siteName).toBe('mq - Âm nhạc thử nghiệm');
    expect(patchSettingsRes.body.settings.maxUploadSizeMB).toBe(75);

    // Revert settings
    await request(app)
      .patch('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        siteName: 'mq - Âm nhạc tối giản & liền mạch',
        maxUploadSizeMB: 50,
        allowedAudioFormats: ['mp3', 'wav', 'flac', 'ogg', 'm4a'],
        registrationEnabled: true,
        maintenanceMode: false,
      });
  });
});

