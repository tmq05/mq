import axios from 'axios';
import { cache } from '../config/redis.js';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';

export interface LyricsResponse {
  syncedLyrics?: string;
  plainLyrics?: string;
  source: 'lrclib' | 'local' | 'none';
}

export class LyricsService {
  async getLyrics(
    title: string,
    artist: string,
    durationMs?: number,
    songId?: string
  ): Promise<LyricsResponse> {
    const cleanTitle = title.trim();
    const cleanArtist = artist.trim();

    // 1. Check local DB if songId provided
    if (songId) {
      const cleanId = songId.replace(/^local:/, '');
      const localSong = await prisma.song.findFirst({
        where: { OR: [{ id: cleanId }, { sourceId: cleanId }] },
        select: { lyrics: true },
      });
      if (localSong?.lyrics) {
        const isSynced = localSong.lyrics.includes('[0');
        return {
          syncedLyrics: isSynced ? localSong.lyrics : undefined,
          plainLyrics: isSynced ? undefined : localSong.lyrics,
          source: 'local',
        };
      }
    }

    // 2. Check Cache
    const cacheKey = `lyrics:${cleanArtist.toLowerCase()}:${cleanTitle.toLowerCase()}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // proceed
      }
    }

    if (!env.LRCLIB_ENABLED) {
      return { source: 'none' };
    }

    // 3. Call LRCLIB API
    try {
      const durationSeconds = durationMs ? Math.round(durationMs / 1000) : undefined;
      const res = await axios.get('https://lrclib.net/api/get', {
        params: {
          artist_name: cleanArtist,
          track_name: cleanTitle,
          duration: durationSeconds,
        },
        headers: {
          'User-Agent': 'mq music app v1.0 (https://github.com/manhquan/mq)',
        },
        timeout: 5000,
      });

      if (res.data) {
        const data: LyricsResponse = {
          syncedLyrics: res.data.syncedLyrics || undefined,
          plainLyrics: res.data.plainLyrics || undefined,
          source: 'lrclib',
        };

        // Cache for 24 hours
        await cache.set(cacheKey, JSON.stringify(data), 'EX', 86400);
        return data;
      }
    } catch {
      // If exact match failed, try search endpoint
      try {
        const searchRes = await axios.get('https://lrclib.net/api/search', {
          params: { q: `${cleanArtist} ${cleanTitle}` },
          headers: {
            'User-Agent': 'mq music app v1.0 (https://github.com/manhquan/mq)',
          },
          timeout: 4000,
        });

        if (searchRes.data && Array.isArray(searchRes.data) && searchRes.data.length > 0) {
          const first = searchRes.data[0];
          const data: LyricsResponse = {
            syncedLyrics: first.syncedLyrics || undefined,
            plainLyrics: first.plainLyrics || undefined,
            source: 'lrclib',
          };
          await cache.set(cacheKey, JSON.stringify(data), 'EX', 86400);
          return data;
        }
      } catch (err: any) {
        logger.debug({ err: err.message }, 'LRCLIB search fallback also failed');
      }
    }

    const emptyResult: LyricsResponse = { source: 'none' };
    // Cache empty result for 1 hour to avoid spamming
    await cache.set(cacheKey, JSON.stringify(emptyResult), 'EX', 3600);
    return emptyResult;
  }
}

export const lyricsService = new LyricsService();
