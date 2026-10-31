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

export class AudiusProvider implements MusicProvider {
  readonly name: MusicSource = 'audius';
  private discoveryHost = 'https://discoveryprovider.audius.co';
  private lastHostCheck = 0;

  get isEnabled(): boolean {
    return env.AUDIUS_ENABLED;
  }

  private async getHost(): Promise<string> {
    const now = Date.now();
    // Cache discovery host for 30 minutes
    if (this.discoveryHost && now - this.lastHostCheck < 30 * 60 * 1000) {
      return this.discoveryHost;
    }

    try {
      const res = await axios.get('https://api.audius.co', { timeout: 3000 });
      if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        this.discoveryHost = res.data.data[0];
        this.lastHostCheck = now;
      }
    } catch {
      // Fallback host
      this.discoveryHost = 'https://discoveryprovider.audius.co';
    }

    return this.discoveryHost;
  }

  private mapTrack(item: any, host: string): UnifiedTrack {
    const streamUrl = `${host}/v1/tracks/${item.id}/stream?app_name=${env.AUDIUS_APP_NAME}`;
    const coverUrl =
      item.artwork?.['480x480'] ||
      item.artwork?.['150x150'] ||
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';

    return {
      id: `audius:${item.id}`,
      source: 'audius',
      sourceId: String(item.id),
      title: item.title || 'Unknown Title',
      artists: [item.user?.name || 'Unknown Artist'],
      album: item.genre || 'Audius Music',
      coverUrl,
      durationMs: (item.duration || 0) * 1000,
      playbackType: 'audio',
      streamUrl,
      isFullLength: true,
    };
  }

  async search(
    query: string,
    type: 'track' | 'artist' | 'album' | 'playlist' | 'all' = 'all',
    page = 1
  ): Promise<SearchResult> {
    const result: SearchResult = { tracks: [], artists: [], albums: [], playlists: [] };
    if (!this.isEnabled || !query.trim()) return result;

    try {
      const host = await this.getHost();
      const limit = 15;
      const offset = (page - 1) * limit;

      const trackPromise = (type === 'track' || type === 'all')
        ? axios.get(`${host}/v1/tracks/search`, {
            params: { query, app_name: env.AUDIUS_APP_NAME, limit, offset },
            timeout: 5000,
          })
        : Promise.resolve({ data: { data: [] } });

      const userPromise = (type === 'artist' || type === 'all')
        ? axios.get(`${host}/v1/users/search`, {
            params: { query, app_name: env.AUDIUS_APP_NAME, limit: 5 },
            timeout: 5000,
          })
        : Promise.resolve({ data: { data: [] } });

      const [trackRes, userRes] = await Promise.all([trackPromise, userPromise]);

      if (trackRes.data?.data) {
        result.tracks = trackRes.data.data.map((item: any) => this.mapTrack(item, host));
      }

      if (userRes.data?.data) {
        result.artists = userRes.data.data.map((u: any): UnifiedArtist => ({
          id: `audius:${u.id}`,
          source: 'audius',
          sourceId: String(u.id),
          name: u.name,
          imageUrl: u.profile_picture?.['480x480'] || u.profile_picture?.['150x150'],
          bio: u.bio || '',
        }));
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, 'AudiusProvider search failed');
    }

    return result;
  }

  async getTrack(sourceId: string): Promise<UnifiedTrack | null> {
    if (!this.isEnabled) return null;
    try {
      const host = await this.getHost();
      const res = await axios.get(`${host}/v1/tracks/${sourceId}`, {
        params: { app_name: env.AUDIUS_APP_NAME },
        timeout: 5000,
      });
      if (res.data?.data) {
        return this.mapTrack(res.data.data, host);
      }
    } catch (err: any) {
      logger.warn({ err: err.message, sourceId }, 'Audius getTrack failed');
    }
    return null;
  }

  async getTrending(): Promise<UnifiedTrack[]> {
    if (!this.isEnabled) return [];
    try {
      const host = await this.getHost();
      const res = await axios.get(`${host}/v1/tracks/trending`, {
        params: { app_name: env.AUDIUS_APP_NAME, limit: 15 },
        timeout: 5000,
      });
      if (res.data?.data) {
        return res.data.data.map((item: any) => this.mapTrack(item, host));
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Audius getTrending failed');
    }
    return [];
  }

  async getStreamInfo(sourceId: string): Promise<StreamInfo | null> {
    const host = await this.getHost();
    return {
      streamUrl: `${host}/v1/tracks/${sourceId}/stream?app_name=${env.AUDIUS_APP_NAME}`,
      playbackType: 'audio',
    };
  }
}

export const audiusProvider = new AudiusProvider();
