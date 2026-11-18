import axios from 'axios';
import {
  MusicProvider,
  MusicSource,
  SearchResult,
  StreamInfo,
  UnifiedTrack,
  UnifiedArtist,
} from './music-provider.interface.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { resolveExactFullTrack } from '../utils/track-resolver.js';

export interface SpotifyArtistBatchItem {
  id: string;
  name: string;
  imageUrl?: string;
  followersCount: number;
  genres: string[];
  topTrackCount?: number;
}

const artistBatchCache = new Map<string, { data: SpotifyArtistBatchItem; expiresAt: number }>();
const ARTIST_BATCH_CACHE_TTL_MS = 15 * 60 * 1000; // 15 phút

async function fetchPublicSpotifyListeners(sourceId: string): Promise<number> {
  try {
    const res = await axios.get(`https://open.spotify.com/artist/${sourceId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 4500,
    });
    const html = String(res.data || '');
    const m = html.match(/([0-9][0-9,.]+)\s+monthly listeners/i);
    if (m?.[1]) {
      const parsed = parseInt(m[1].replace(/[,.]/g, ''), 10);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  } catch {
    // ignore scrape failure
  }
  return 0;
}

export class SpotifyProvider implements MusicProvider {
  readonly name: MusicSource = 'spotify';
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;
  private embedPreviewCache = new Map<string, { url: string | null; expiresAt: number }>();

  get isEnabled(): boolean {
    return env.SPOTIFY_ENABLED && Boolean(env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET);
  }

  private async getAppToken(): Promise<string | null> {
    if (!this.isEnabled) return null;
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    try {
      const authHeader = Buffer.from(
        `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64');

      const res = await axios.post(
        'https://accounts.spotify.com/api/token',
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 5000,
        }
      );

      this.accessToken = res.data.access_token;
      this.tokenExpiresAt = Date.now() + res.data.expires_in * 1000;
      return this.accessToken;
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Failed to get Spotify app token');
      return null;
    }
  }

  private mapTrack(item: any): UnifiedTrack {
    const coverUrl =
      item.album?.images?.[0]?.url ||
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';

    const streamUrl = item.preview_url || `/api/songs/spotify:${item.id}/stream`;

    return {
      id: `spotify:${item.id}`,
      source: 'spotify',
      sourceId: item.id,
      title: item.name,
      artists: item.artists?.map((a: any) => a.name) || ['Spotify Artist'],
      album: item.album?.name || '',
      coverUrl,
      durationMs: item.duration_ms || 0,
      playbackType: 'audio',
      previewUrl: streamUrl,
      streamUrl,
      embedId: item.id,
      isFullLength: false,
    };
  }

  async search(
    query: string,
    type: 'track' | 'artist' | 'album' | 'playlist' | 'all' = 'all',
    page = 1
  ): Promise<SearchResult> {
    const result: SearchResult = { tracks: [], artists: [], albums: [], playlists: [] };
    if (!this.isEnabled || !query.trim()) return result;

    const token = await this.getAppToken();
    if (!token) return result;

    try {
      const limit = 10;
      const offset = (page - 1) * limit;
      const spotifyType = type === 'all' ? 'track,artist,album' : type;

      const res = await axios.get('https://api.spotify.com/v1/search', {
        headers: { Authorization: `Bearer ${token}` },
        params: { q: query, type: spotifyType, limit, offset, market: 'VN' },
        timeout: 5000,
      });

      if (res.data?.tracks?.items) {
        const rawTracks = res.data.tracks.items.map((item: any) => this.mapTrack(item));
        await Promise.allSettled(
          rawTracks.map(async (t: UnifiedTrack) => {
            const vid = await resolveExactFullTrack(t.title, t.artists[0]);
            if (vid) {
              t.embedId = vid;
              t.playbackType = 'youtube';
              t.isFullLength = true;
            }
          })
        );
        result.tracks = rawTracks;
      }

      if (res.data?.artists?.items) {
        result.artists = res.data.artists.items.map((a: any): UnifiedArtist => ({
          id: `spotify:${a.id}`,
          source: 'spotify',
          sourceId: a.id,
          name: a.name,
          imageUrl: a.images?.[0]?.url,
        }));
      }
    } catch (err: any) {
      logger.warn({ err: err.message, response: err.response?.data }, 'Spotify search failed');
    }

    return result;
  }

  async getTrack(sourceId: string): Promise<UnifiedTrack | null> {
    if (!this.isEnabled) return null;
    const token = await this.getAppToken();
    if (!token) return null;

    try {
      const res = await axios.get(`https://api.spotify.com/v1/tracks/${sourceId}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      if (res.data) {
        return this.mapTrack(res.data);
      }
    } catch (err: any) {
      logger.warn({ err: err.message, sourceId }, 'Spotify getTrack failed');
    }

    return null;
  }

  async getEmbedPreviewUrl(sourceId: string): Promise<string | null> {
    const cleanId = sourceId.trim();
    if (!cleanId) return null;

    const cached = this.embedPreviewCache.get(cleanId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.url;
    }

    try {
      const res = await axios.get<string>(
        `https://open.spotify.com/embed/track/${encodeURIComponent(cleanId)}`,
        {
          timeout: 6000,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          responseType: 'text',
        }
      );
      const html = typeof res.data === 'string' ? res.data : '';
      const match = html.match(/https:\/\/p\.scdn\.co\/mp3-preview\/[a-zA-Z0-9_?=&%-]+/);
      const url = match ? match[0] : null;
      this.embedPreviewCache.set(cleanId, {
        url,
        expiresAt: Date.now() + (url ? 6 * 60 * 60 * 1000 : 15 * 60 * 1000),
      });
      return url;
    } catch (err: any) {
      logger.warn({ err: err.message, sourceId: cleanId }, 'Spotify embed preview lookup failed');
      return null;
    }
  }

  async getStreamInfo(sourceId: string): Promise<StreamInfo | null> {
    const track = await this.getTrack(sourceId);
    if (!track) return null;

    return {
      playbackType: 'audio',
      previewUrl: track.previewUrl,
      streamUrl: track.streamUrl,
      embedId: track.embedId,
    };
  }

  async getArtist(sourceId: string): Promise<any | null> {
    if (!this.isEnabled) return null;
    const token = await this.getAppToken();
    if (!token) return null;

    try {
      const [artistRes, topRes, albumsRes] = await Promise.allSettled([
        axios.get(`https://api.spotify.com/v1/artists/${sourceId}`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        }),
        axios.get(`https://api.spotify.com/v1/artists/${sourceId}/top-tracks?market=VN`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        }),
        axios.get(`https://api.spotify.com/v1/artists/${sourceId}/albums?market=VN&limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        }),
      ]);

      if (artistRes.status !== 'fulfilled') return null;
      const a = artistRes.value.data;

      let topTracks: UnifiedTrack[] = [];
      if (topRes.status === 'fulfilled' && topRes.value.data?.tracks) {
        topTracks = topRes.value.data.tracks.map((item: any) => this.mapTrack(item));
        await Promise.allSettled(
          topTracks.slice(0, 10).map(async (t) => {
            const vid = await resolveExactFullTrack(t.title, t.artists[0]);
            if (vid) {
              t.embedId = vid;
              t.playbackType = 'youtube';
              t.isFullLength = true;
            }
          })
        );
      }

      // Spotify Dev Mode chặn /top-tracks (403) -> fallback sang tìm kiếm track theo tên nghệ sĩ
      if (topTracks.length === 0 && a.name) {
        try {
          const searchRes = await this.search(a.name, 'track');
          const norm = (s: string) =>
            s
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/đ/gi, 'd')
              .toLowerCase()
              .trim();
          const targetKey = norm(a.name);
          const matched = searchRes.tracks.filter((t) =>
            t.artists.some((art) => norm(art).includes(targetKey) || targetKey.includes(norm(art)))
          );
          topTracks = (matched.length > 0 ? matched : searchRes.tracks).slice(0, 10);
        } catch {
          // ignore
        }
      }

      let albums: any[] = [];
      if (albumsRes.status === 'fulfilled' && albumsRes.value.data?.items) {
        albums = albumsRes.value.data.items.map((al: any) => ({
          id: `spotify:${al.id}`,
          title: al.name,
          coverUrl: al.images?.[0]?.url,
          releaseDate: al.release_date,
        }));
      }

      let followersCount: number = a.followers?.total || 0;
      if (followersCount === 0) {
        followersCount = await fetchPublicSpotifyListeners(a.id);
      }

      return {
        id: `spotify:${a.id}`,
        source: 'spotify',
        sourceId: a.id,
        name: a.name,
        imageUrl: a.images?.[0]?.url,
        bio: `Nghệ sĩ trên Spotify (${a.genres?.slice(0, 3).join(', ') || 'Âm nhạc'})`,
        followersCount,
        isFollowing: false,
        topTracks,
        albums,
      };
    } catch (err: any) {
      logger.warn({ err: err.message, sourceId }, 'Spotify getArtist failed');
      return null;
    }
  }

  /**
   * Lấy thông tin & số liệu thật hàng loạt (tối đa 50 nghệ sĩ / request) từ Spotify API, có cache 15 phút.
   */
  async getArtistsBatch(sourceIds: string[]): Promise<Map<string, SpotifyArtistBatchItem>> {
    const result = new Map<string, SpotifyArtistBatchItem>();
    const uniqueIds = Array.from(new Set(sourceIds.filter(Boolean)));
    if (uniqueIds.length === 0 || !this.isEnabled) return result;

    const now = Date.now();
    const missingIds: string[] = [];

    for (const id of uniqueIds) {
      const cached = artistBatchCache.get(id);
      if (cached && cached.expiresAt > now) {
        result.set(id, cached.data);
      } else {
        missingIds.push(id);
      }
    }

    if (missingIds.length === 0) return result;

    const token = await this.getAppToken();
    if (!token) return result;

    // Chia batch 50 ID mỗi lần gọi /v1/artists?ids=...
    for (let i = 0; i < missingIds.length; i += 50) {
      const chunk = missingIds.slice(i, i + 50);
      try {
        const res = await axios.get('https://api.spotify.com/v1/artists', {
          params: { ids: chunk.join(',') },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 7000,
        });
        const artists: any[] = res.data?.artists || [];
        for (const a of artists) {
          if (!a || !a.id) continue;
          const item: SpotifyArtistBatchItem = {
            id: a.id,
            name: a.name,
            imageUrl: a.images?.[0]?.url,
            followersCount: a.followers?.total ?? 0,
            genres: Array.isArray(a.genres) ? a.genres : [],
          };
          result.set(a.id, item);
          artistBatchCache.set(a.id, {
            data: item,
            expiresAt: now + ARTIST_BATCH_CACHE_TTL_MS,
          });
        }
      } catch (err: any) {
        logger.warn({ err: err.message }, 'Spotify getArtistsBatch chunk failed');
      }
    }

    // Lấy thêm số liệu thật (followers/monthly listeners + số bài hát) khi Spotify Dev Mode ẩn
    const needEnrich = Array.from(result.values()).filter(
      (item) => item.topTrackCount === undefined || item.followersCount === 0
    );
    const CONCURRENCY = 6;
    for (let i = 0; i < needEnrich.length; i += CONCURRENCY) {
      const slice = needEnrich.slice(i, i + CONCURRENCY);
      await Promise.allSettled(
        slice.map(async (item) => {
          if (item.followersCount === 0) {
            const listeners = await fetchPublicSpotifyListeners(item.id);
            if (listeners > 0) item.followersCount = listeners;
          }
          if (item.topTrackCount === undefined) {
            let count = 0;
            try {
              const topRes = await axios.get(
                `https://api.spotify.com/v1/artists/${item.id}/top-tracks?market=VN`,
                { headers: { Authorization: `Bearer ${token}` }, timeout: 4000 }
              );
              count = Array.isArray(topRes.data?.tracks) ? topRes.data.tracks.length : 0;
            } catch {
              // Spotify Dev Mode chặn /top-tracks -> đếm qua /v1/search theo tên nghệ sĩ
              try {
                const sRes = await axios.get('https://api.spotify.com/v1/search', {
                  params: { q: item.name, type: 'track', market: 'VN', limit: 10 },
                  headers: { Authorization: `Bearer ${token}` },
                  timeout: 4000,
                });
                count = Array.isArray(sRes.data?.tracks?.items) ? sRes.data.tracks.items.length : 0;
              } catch {
                // ignore
              }
            }
            item.topTrackCount = count;
          }
          artistBatchCache.set(item.id, {
            data: item,
            expiresAt: Date.now() + ARTIST_BATCH_CACHE_TTL_MS,
          });
        })
      );
    }

    return result;
  }
}

export const spotifyProvider = new SpotifyProvider();

