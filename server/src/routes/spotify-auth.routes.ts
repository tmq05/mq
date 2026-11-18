import { Router, Request, Response } from 'express';
import axios from 'axios';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const router = Router();

const SPOTIFY_SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
].join(' ');

function getRedirectUri(customUri?: string): string {
  if (customUri && typeof customUri === 'string' && customUri.startsWith('http')) {
    return customUri;
  }
  if (env.SPOTIFY_REDIRECT_URI) {
    return env.SPOTIFY_REDIRECT_URI;
  }
  return `${env.CLIENT_URL.replace(/\/$/, '')}/spotify-callback`;
}

function getBasicAuthHeader(): string {
  return Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
}

router.get('/status', (_req: Request, res: Response) => {
  res.json({
    configured: Boolean(env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET),
    defaultRedirectUri: getRedirectUri(),
  });
});

router.get('/authorize-url', (req: Request, res: Response) => {
  if (!env.SPOTIFY_CLIENT_ID) {
    res.status(400).json({ message: 'SPOTIFY_CLIENT_ID chưa được cấu hình trên máy chủ.' });
    return;
  }

  const redirectUri = getRedirectUri(req.query.redirectUri as string | undefined);
  const params = new URLSearchParams({
    client_id: env.SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SPOTIFY_SCOPES,
    show_dialog: 'true',
  });

  res.json({
    url: `https://accounts.spotify.com/authorize?${params.toString()}`,
    redirectUri,
  });
});

router.post('/exchange', async (req: Request, res: Response) => {
  const { code, redirectUri } = req.body || {};
  if (!code || typeof code !== 'string') {
    res.status(400).json({ message: 'Thiếu mã xác thực Spotify (code).' });
    return;
  }
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
    res.status(400).json({ message: 'Máy chủ chưa cấu hình SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET.' });
    return;
  }

  try {
    const resolvedRedirect = getRedirectUri(redirectUri);
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: resolvedRedirect,
    });

    const tokenRes = await axios.post('https://accounts.spotify.com/api/token', body.toString(), {
      headers: {
        Authorization: `Basic ${getBasicAuthHeader()}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 8000,
    });

    const { access_token, refresh_token, expires_in } = tokenRes.data;

    const meRes = await axios.get('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${access_token}` },
      timeout: 8000,
    });

    const profile = meRes.data;
    res.json({
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
      user: {
        id: profile.id,
        displayName: profile.display_name || profile.email || 'Spotify User',
        product: profile.product || 'free',
        isPremium: profile.product === 'premium',
        avatarUrl: profile.images?.[0]?.url || null,
      },
    });
  } catch (err: any) {
    logger.warn({ err: err.response?.data || err.message }, 'Spotify OAuth exchange failed');
    res.status(400).json({
      message: err.response?.data?.error_description || 'Không thể kết nối tài khoản Spotify.',
    });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken || typeof refreshToken !== 'string') {
    res.status(400).json({ message: 'Thiếu refreshToken.' });
    return;
  }
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
    res.status(400).json({ message: 'Máy chủ chưa cấu hình Spotify OAuth.' });
    return;
  }

  try {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const tokenRes = await axios.post('https://accounts.spotify.com/api/token', body.toString(), {
      headers: {
        Authorization: `Basic ${getBasicAuthHeader()}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 8000,
    });

    res.json({
      accessToken: tokenRes.data.access_token,
      refreshToken: tokenRes.data.refresh_token || refreshToken,
      expiresIn: tokenRes.data.expires_in,
    });
  } catch (err: any) {
    logger.warn({ err: err.response?.data || err.message }, 'Spotify token refresh failed');
    res.status(401).json({ message: 'Phiên Spotify đã hết hạn, vui lòng kết nối lại.' });
  }
});

export default router;
