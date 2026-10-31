import axios from 'axios';
import {
  MusicProvider,
  MusicSource,
  SearchResult,
  StreamInfo,
  UnifiedTrack,
} from './music-provider.interface.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export class YouTubeProvider implements MusicProvider {
  readonly name: MusicSource = 'youtube';
  private quotaExceeded = false;
  private quotaResetTimeout: NodeJS.Timeout | null = null;

  get isEnabled(): boolean {
    return env.YOUTUBE_ENABLED && !this.quotaExceeded;
  }

  getQuotaStatus(): { enabled: boolean; hasKey: boolean; quotaExceeded: boolean } {
    return {
      enabled: env.YOUTUBE_ENABLED,
      hasKey: Boolean(env.YOUTUBE_API_KEY),
      quotaExceeded: this.quotaExceeded,
    };
  }

  private mapVideo(item: any): UnifiedTrack {
    const videoId = typeof item.id === 'string' ? item.id : item.id?.videoId;
    const title = item.snippet?.title || 'YouTube Video';
    const channelTitle = item.snippet?.channelTitle || 'YouTube Music';
    const coverUrl =
      item.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.medium?.url ||
      `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    return {
      id: `youtube:${videoId}`,
      source: 'youtube',
      sourceId: videoId,
      title: title.replace(/(\(Official.*?\)|\[Official.*?\]|\(MV\)|\(Audio\))/gi, '').trim(),
      artists: [channelTitle.replace(/ - Topic$/i, '').trim()],
      album: 'YouTube Music',
      coverUrl,
      durationMs: 0, // YouTube IFrame reports exact duration on player ready
      playbackType: 'youtube',
      embedId: videoId,
      isFullLength: true,
    };
  }

  async search(
    query: string,
    type: 'track' | 'artist' | 'album' | 'playlist' | 'all' = 'all',
    page = 1
  ): Promise<SearchResult> {
    const result: SearchResult = { tracks: [], artists: [], albums: [], playlists: [] };
    if (!this.isEnabled || !query.trim() || !env.YOUTUBE_API_KEY) return result;

    try {
      const res = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          part: 'snippet',
          q: `${query} music`,
          type: 'video',
          videoCategoryId: '10', // Music category
          maxResults: 10,
          key: env.YOUTUBE_API_KEY,
        },
        timeout: 5000,
      });

      if (res.data?.items) {
        result.tracks = res.data.items.map((item: any) => this.mapVideo(item));
      }
    } catch (err: any) {
      if (err.response?.status === 403 && err.response?.data?.error?.errors?.[0]?.reason === 'quotaExceeded') {
        logger.warn('⚠️ YouTube API quota exceeded for today. Temporarily disabling YouTube search.');
        this.quotaExceeded = true;
        // Reset after 4 hours
        if (!this.quotaResetTimeout) {
          this.quotaResetTimeout = setTimeout(() => {
            this.quotaExceeded = false;
            this.quotaResetTimeout = null;
          }, 4 * 60 * 60 * 1000);
        }
      } else {
        logger.warn({ err: err.message }, 'YouTube search error');
      }
    }

    return result;
  }

  async getTrack(sourceId: string): Promise<UnifiedTrack | null> {
    if (!env.YOUTUBE_API_KEY) {
      // Basic fallback metadata without calling API
      return {
        id: `youtube:${sourceId}`,
        source: 'youtube',
        sourceId,
        title: `YouTube Video (${sourceId})`,
        artists: ['YouTube'],
        coverUrl: `https://img.youtube.com/vi/${sourceId}/hqdefault.jpg`,
        durationMs: 0,
        playbackType: 'youtube',
        embedId: sourceId,
        isFullLength: true,
      };
    }

    try {
      const res = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          part: 'snippet,contentDetails',
          id: sourceId,
          key: env.YOUTUBE_API_KEY,
        },
        timeout: 5000,
      });

      if (res.data?.items?.[0]) {
        return this.mapVideo(res.data.items[0]);
      }
    } catch (err: any) {
      logger.warn({ err: err.message, sourceId }, 'YouTube getTrack failed');
    }

    return null;
  }

  async getStreamInfo(sourceId: string): Promise<StreamInfo | null> {
    return {
      embedId: sourceId,
      playbackType: 'youtube',
    };
  }
}

export const youtubeProvider = new YouTubeProvider();
