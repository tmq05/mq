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

export class SpotifyProvider implements MusicProvider {
  readonly name: MusicSource = 'spotify';
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

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
        params: { q: query, type: spotifyType, limit, offset },
        timeout: 5000,
      });

      if (res.data?.tracks?.items) {
        const rawTracks = res.data.tracks.items.map((item: any) => this.mapTrack(item));
        await Promise.allSettled(
          rawTracks.slice(0, 6).map(async (t: UnifiedTrack) => {
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

  async getStreamInfo(sourceId: string): Promise<StreamInfo | null> {
    const track = await this.getTrack(sourceId);
    if (!track) return null;

    const exactId = await resolveExactFullTrack(track.title, track.artists[0] || '');
    if (exactId) {
      return {
        playbackType: 'youtube',
        embedId: exactId,
      };
    }

    return {
      playbackType: track.playbackType,
      previewUrl: track.previewUrl,
      streamUrl: track.streamUrl,
      embedId: track.embedId,
    };
  }
}

export const spotifyProvider = new SpotifyProvider();

