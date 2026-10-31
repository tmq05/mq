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

export class JamendoProvider implements MusicProvider {
  readonly name: MusicSource = 'jamendo';
  private baseUrl = 'https://api.jamendo.com/v3.0';

  get isEnabled(): boolean {
    return env.JAMENDO_ENABLED;
  }

  private mapTrack(item: any): UnifiedTrack {
    return {
      id: `jamendo:${item.id}`,
      source: 'jamendo',
      sourceId: String(item.id),
      title: item.name || 'Unknown Title',
      artists: [item.artist_name || 'Jamendo Artist'],
      album: item.album_name || 'Creative Commons Single',
      coverUrl:
        item.image ||
        item.album_image ||
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
      durationMs: (item.duration || 0) * 1000,
      playbackType: 'audio',
      streamUrl: item.audio,
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
      const limit = 15;
      const offset = (page - 1) * limit;

      const trackPromise = (type === 'track' || type === 'all')
        ? axios.get(`${this.baseUrl}/tracks/`, {
            params: {
              client_id: env.JAMENDO_CLIENT_ID,
              format: 'json',
              limit,
              offset,
              search: query,
              include: 'musicinfo',
            },
            timeout: 5000,
          })
        : Promise.resolve({ data: { results: [] } });

      const artistPromise = (type === 'artist' || type === 'all')
        ? axios.get(`${this.baseUrl}/artists/`, {
            params: {
              client_id: env.JAMENDO_CLIENT_ID,
              format: 'json',
              limit: 5,
              name: query,
            },
            timeout: 5000,
          })
        : Promise.resolve({ data: { results: [] } });

      const [trackRes, artistRes] = await Promise.all([trackPromise, artistPromise]);

      if (trackRes.data?.results) {
        result.tracks = trackRes.data.results.map((item: any) => this.mapTrack(item));
      }

      if (artistRes.data?.results) {
        result.artists = artistRes.data.results.map((a: any): UnifiedArtist => ({
          id: `jamendo:${a.id}`,
          source: 'jamendo',
          sourceId: String(a.id),
          name: a.name,
          imageUrl: a.image,
          bio: 'Creative Commons Artist on Jamendo',
        }));
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, 'JamendoProvider search failed');
    }

    return result;
  }

  async getTrack(sourceId: string): Promise<UnifiedTrack | null> {
    if (!this.isEnabled) return null;
    try {
      const res = await axios.get(`${this.baseUrl}/tracks/`, {
        params: {
          client_id: env.JAMENDO_CLIENT_ID,
          format: 'json',
          id: sourceId,
        },
        timeout: 5000,
      });
      if (res.data?.results && res.data.results.length > 0) {
        return this.mapTrack(res.data.results[0]);
      }
    } catch (err: any) {
      logger.warn({ err: err.message, sourceId }, 'Jamendo getTrack failed');
    }
    return null;
  }

  async getTrending(): Promise<UnifiedTrack[]> {
    if (!this.isEnabled) return [];
    try {
      const res = await axios.get(`${this.baseUrl}/tracks/`, {
        params: {
          client_id: env.JAMENDO_CLIENT_ID,
          format: 'json',
          limit: 15,
          order: 'popularity_total',
        },
        timeout: 5000,
      });
      if (res.data?.results) {
        return res.data.results.map((item: any) => this.mapTrack(item));
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Jamendo getTrending failed');
    }
    return [];
  }

  async getStreamInfo(sourceId: string): Promise<StreamInfo | null> {
    const track = await this.getTrack(sourceId);
    if (!track?.streamUrl) return null;
    return {
      streamUrl: track.streamUrl,
      playbackType: 'audio',
    };
  }
}

export const jamendoProvider = new JamendoProvider();

