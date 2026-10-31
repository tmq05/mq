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

export class ZingMp3Provider implements MusicProvider {
  readonly name: MusicSource = 'zingmp3';
  private trackCache = new Map<string, UnifiedTrack>();

  get isEnabled(): boolean {
    return env.ZINGMP3_ENABLED;
  }

  async search(
    query: string,
    _type: 'track' | 'artist' | 'album' | 'playlist' | 'all' = 'all',
    _page = 1
  ): Promise<SearchResult> {
    const result: SearchResult = { tracks: [], artists: [], albums: [], playlists: [] };
    if (!this.isEnabled || !query.trim()) return result;

    try {
      const res = await axios.get(
        `https://ac.zingmp3.vn/v1/web/ac-suggestions?query=${encodeURIComponent(query.trim())}`,
        {
          timeout: 4500,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        }
      );

      const items = res.data?.data?.items;
      if (Array.isArray(items)) {
        for (const group of items) {
          if (Array.isArray(group.suggestions)) {
            for (const s of group.suggestions) {
              if (s.type === 1 && s.id) {
                // Song
                const track: UnifiedTrack = {
                  id: `zingmp3:${s.id}`,
                  source: 'zingmp3',
                  sourceId: s.id,
                  title: s.title || 'Zing MP3 Song',
                  artists:
                    Array.isArray(s.artists) && s.artists.length > 0
                      ? s.artists.map((a: any) => a.name)
                      : ['Nghệ sĩ Zing MP3'],
                  album: s.title + ' (Single)',
                  coverUrl:
                    s.thumb ||
                    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
                  durationMs: (s.duration || 0) * 1000,
                  playbackType: 'audio',
                  embedId: s.id,
                  streamUrl: `/api/songs/zingmp3:${s.id}/stream`,
                  previewUrl: `/api/songs/zingmp3:${s.id}/stream`,
                  isFullLength: false,
                };
                this.trackCache.set(s.id, track);
                result.tracks.push(track);
              } else if (s.type === 4 && s.id) {
                // Artist
                const artist: UnifiedArtist = {
                  id: `zingmp3:${s.id}`,
                  source: 'zingmp3',
                  sourceId: s.id,
                  name: s.name,
                  imageUrl: s.avatar,
                };
                result.artists.push(artist);
              }
            }
          }
        }
      }

      if (result.tracks.length > 0) {
        await Promise.allSettled(
          result.tracks.slice(0, 5).map(async (t) => {
            const vid = await resolveExactFullTrack(t.title, t.artists[0]);
            if (vid) {
              t.embedId = vid;
              t.playbackType = 'youtube';
              t.isFullLength = true;
            }
          })
        );
      }
    } catch (err: any) {
      logger.warn({ err: err.message, query }, 'Zing MP3 search error');
    }

    return result;
  }

  async getTrack(sourceId: string): Promise<UnifiedTrack | null> {
    if (this.trackCache.has(sourceId)) {
      return this.trackCache.get(sourceId)!;
    }

    try {
      const searchRes = await this.search(sourceId);
      const found = searchRes.tracks.find((t) => t.sourceId === sourceId) || searchRes.tracks[0];
      if (found) {
        this.trackCache.set(sourceId, found);
        return found;
      }
    } catch {
      // ignore
    }

    return {
      id: `zingmp3:${sourceId}`,
      source: 'zingmp3',
      sourceId,
      title: 'Zing MP3 Track',
      artists: ['Zing MP3 Artist'],
      durationMs: 240000,
      playbackType: 'audio',
      embedId: sourceId,
      streamUrl: `/api/songs/zingmp3:${sourceId}/stream`,
      previewUrl: `/api/songs/zingmp3:${sourceId}/stream`,
      isFullLength: false,
    };
  }

  async getStreamInfo(sourceId: string): Promise<StreamInfo | null> {
    const track = await this.getTrack(sourceId);
    if (track) {
      const vid = await resolveExactFullTrack(track.title, track.artists[0] || '');
      if (vid) {
        return {
          playbackType: 'youtube',
          embedId: vid,
        };
      }
    }
    return {
      playbackType: 'audio',
      embedId: sourceId,
      streamUrl: track?.streamUrl || `/api/songs/zingmp3:${sourceId}/stream`,
      previewUrl: track?.previewUrl || `/api/songs/zingmp3:${sourceId}/stream`,
    };
  }
}

export const zingMp3Provider = new ZingMp3Provider();

