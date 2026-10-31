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

export class ITunesProvider implements MusicProvider {
  readonly name: MusicSource = 'itunes';
  private baseUrl = 'https://itunes.apple.com';

  get isEnabled(): boolean {
    return env.ITUNES_ENABLED;
  }

  private mapTrack(item: any): UnifiedTrack {
    const coverUrl = item.artworkUrl100
      ? item.artworkUrl100.replace('100x100bb', '600x600bb')
      : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';

    return {
      id: `itunes:${item.trackId}`,
      source: 'itunes',
      sourceId: String(item.trackId),
      title: item.trackName || 'Unknown Title',
      artists: item.artistName ? [item.artistName] : ['Unknown Artist'],
      album: item.collectionName || '',
      coverUrl,
      durationMs: item.trackTimeMillis || 0,
      playbackType: 'youtube',
      previewUrl: item.previewUrl,
      streamUrl: item.previewUrl,
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
        ? axios.get(`${this.baseUrl}/search`, {
            params: {
              term: query,
              media: 'music',
              entity: 'song',
              limit,
              offset,
            },
            timeout: 5000,
          })
        : Promise.resolve({ data: { results: [] } });

      const artistPromise = (type === 'artist' || type === 'all')
        ? axios.get(`${this.baseUrl}/search`, {
            params: {
              term: query,
              media: 'music',
              entity: 'musicArtist',
              limit: 5,
            },
            timeout: 5000,
          })
        : Promise.resolve({ data: { results: [] } });

      const [trackRes, artistRes] = await Promise.all([trackPromise, artistPromise]);

      if (trackRes.data?.results) {
        const rawTracks = trackRes.data.results.map((item: any) => this.mapTrack(item));
        await Promise.allSettled(
          rawTracks.slice(0, 5).map(async (t: UnifiedTrack) => {
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

      if (artistRes.data?.results) {
        result.artists = artistRes.data.results.map((a: any): UnifiedArtist => ({
          id: `itunes:${a.artistId}`,
          source: 'itunes',
          sourceId: String(a.artistId),
          name: a.artistName,
        }));
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, 'iTunes search error');
    }

    return result;
  }

  async getTrack(sourceId: string): Promise<UnifiedTrack | null> {
    if (!this.isEnabled) return null;
    try {
      const res = await axios.get(`${this.baseUrl}/lookup`, {
        params: { id: sourceId },
        timeout: 5000,
      });
      if (res.data?.results && res.data.results.length > 0) {
        return this.mapTrack(res.data.results[0]);
      }
    } catch (err: any) {
      logger.warn({ err: err.message, sourceId }, 'iTunes getTrack failed');
    }
    return null;
  }

  async getStreamInfo(sourceId: string): Promise<StreamInfo | null> {
    const track = await this.getTrack(sourceId);
    if (!track) return null;

    const vid = await resolveExactFullTrack(track.title, track.artists[0] || '');
    if (vid) {
      return {
        playbackType: 'youtube',
        embedId: vid,
      };
    }

    return {
      streamUrl: track.previewUrl,
      previewUrl: track.previewUrl,
      playbackType: 'audio',
    };
  }
}

export const itunesProvider = new ITunesProvider();

