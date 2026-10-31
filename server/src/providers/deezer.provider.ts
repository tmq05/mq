import axios from 'axios';
import {
  MusicProvider,
  MusicSource,
  SearchResult,
  StreamInfo,
  UnifiedTrack,
  UnifiedArtist,
  UnifiedAlbum,
} from './music-provider.interface.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export class DeezerProvider implements MusicProvider {
  readonly name: MusicSource = 'deezer';
  private baseUrl = 'https://api.deezer.com';

  get isEnabled(): boolean {
    return env.DEEZER_ENABLED;
  }

  private mapTrack(item: any): UnifiedTrack {
    return {
      id: `deezer:${item.id}`,
      source: 'deezer',
      sourceId: String(item.id),
      title: item.title || 'Unknown Title',
      artists: item.artist?.name ? [item.artist.name] : ['Unknown Artist'],
      album: item.album?.title || '',
      coverUrl: item.album?.cover_big || item.album?.cover_medium || item.album?.cover,
      durationMs: (item.duration || 0) * 1000,
      playbackType: 'preview',
      previewUrl: item.preview,
      streamUrl: item.preview,
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

    try {
      const limit = 15;
      const index = (page - 1) * limit;

      const trackPromise = (type === 'track' || type === 'all')
        ? axios.get(`${this.baseUrl}/search/track`, {
            params: { q: query, limit, index },
            timeout: 5000,
          })
        : Promise.resolve({ data: { data: [] } });

      const artistPromise = (type === 'artist' || type === 'all')
        ? axios.get(`${this.baseUrl}/search/artist`, {
            params: { q: query, limit: 5 },
            timeout: 5000,
          })
        : Promise.resolve({ data: { data: [] } });

      const albumPromise = (type === 'album' || type === 'all')
        ? axios.get(`${this.baseUrl}/search/album`, {
            params: { q: query, limit: 5 },
            timeout: 5000,
          })
        : Promise.resolve({ data: { data: [] } });

      const [trackRes, artistRes, albumRes] = await Promise.all([
        trackPromise,
        artistPromise,
        albumPromise,
      ]);

      if (trackRes.data?.data) {
        result.tracks = trackRes.data.data.map((item: any) => this.mapTrack(item));
      }

      if (artistRes.data?.data) {
        result.artists = artistRes.data.data.map((a: any): UnifiedArtist => ({
          id: `deezer:${a.id}`,
          source: 'deezer',
          sourceId: String(a.id),
          name: a.name,
          imageUrl: a.picture_big || a.picture_medium,
        }));
      }

      if (albumRes.data?.data) {
        result.albums = albumRes.data.data.map((al: any): UnifiedAlbum => ({
          id: `deezer:${al.id}`,
          source: 'deezer',
          sourceId: String(al.id),
          title: al.title,
          artist: al.artist?.name || 'Various Artists',
          coverUrl: al.cover_big || al.cover_medium,
        }));
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Deezer search error');
    }

    return result;
  }

  async getTrack(sourceId: string): Promise<UnifiedTrack | null> {
    if (!this.isEnabled) return null;
    try {
      const res = await axios.get(`${this.baseUrl}/track/${sourceId}`, { timeout: 5000 });
      if (res.data && !res.data.error) {
        return this.mapTrack(res.data);
      }
    } catch (err: any) {
      logger.warn({ err: err.message, sourceId }, 'Deezer getTrack failed');
    }
    return null;
  }

  async getArtist(sourceId: string): Promise<UnifiedArtist | null> {
    if (!this.isEnabled) return null;
    try {
      const [artistRes, topRes] = await Promise.all([
        axios.get(`${this.baseUrl}/artist/${sourceId}`, { timeout: 5000 }),
        axios.get(`${this.baseUrl}/artist/${sourceId}/top?limit=10`, { timeout: 5000 }),
      ]);

      if (artistRes.data && !artistRes.data.error) {
        const a = artistRes.data;
        const topTracks = topRes.data?.data?.map((t: any) => this.mapTrack(t)) || [];
        return {
          id: `deezer:${a.id}`,
          source: 'deezer',
          sourceId: String(a.id),
          name: a.name,
          imageUrl: a.picture_big || a.picture_medium,
          topTracks,
        };
      }
    } catch (err: any) {
      logger.warn({ err: err.message, sourceId }, 'Deezer getArtist failed');
    }
    return null;
  }

  async getTrending(): Promise<UnifiedTrack[]> {
    if (!this.isEnabled) return [];
    try {
      const res = await axios.get(`${this.baseUrl}/chart/0/tracks?limit=15`, { timeout: 5000 });
      if (res.data?.data) {
        return res.data.data.map((t: any) => this.mapTrack(t));
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Deezer getTrending failed');
    }
    return [];
  }

  async getStreamInfo(sourceId: string): Promise<StreamInfo | null> {
    const track = await this.getTrack(sourceId);
    if (!track?.previewUrl) return null;
    return {
      streamUrl: track.previewUrl,
      previewUrl: track.previewUrl,
      playbackType: 'preview',
    };
  }
}

export const deezerProvider = new DeezerProvider();
