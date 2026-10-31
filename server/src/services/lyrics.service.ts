import axios from 'axios';
import { cache } from '../config/redis.js';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';
import { findCuratedLyrics } from '../utils/synced-lyrics-db.js';

export interface LyricsResponse {
  syncedLyrics?: string;
  plainLyrics?: string;
  source: 'lrclib' | 'curated' | 'local' | 'none';
}

function cleanTitleForLyrics(raw: string): string {
  let title = raw;
  // Remove parenthesized suffixes: (Remix), (Official Music Video), (Lyric Video), [MV], (Audio), (Live), (Acoustic), (Prod. by ...)
  title = title.replace(/\s*\([^)]*(remix|official|music video|lyric|mv|audio|live|acoustic|prod|ver|version|vietsub|karaoke|ft|feat)[^)]*\)/gi, '');
  title = title.replace(/\s*\[[^\]]*(remix|official|music video|lyric|mv|audio|live|acoustic|prod|ver|version|vietsub|karaoke|ft|feat)[^\]]*\]/gi, '');
  // Remove pipe and after: " | Official MV", etc.
  title = title.replace(/\s*\|.*$/g, '');
  // Remove trailing dash: " - Single", " - EP", " - Official Audio"
  title = title.replace(/\s*-\s*(single|ep|album|remix|mv|official).*$/gi, '');
  // Remove "feat. ..." or "ft. ..."
  title = title.replace(/\s+(feat\.|ft\.).*$/gi, '');
  return title.trim();
}

function cleanArtistForLyrics(raw: string): string {
  let artist = raw;
  if (artist.includes(',')) {
    artist = artist.split(',')[0];
  }
  artist = artist.replace(/\s+(x|ft\.|feat\.|&).*$/gi, '');
  return artist.trim();
}

export class LyricsService {
  async getLyrics(
    title: string,
    artist: string,
    durationMs?: number,
    songId?: string
  ): Promise<LyricsResponse> {
    const cleanTitle = cleanTitleForLyrics(title) || title.trim();
    const cleanArtist = cleanArtistForLyrics(artist) || artist.trim();

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

    // 2. Check Curated Synced Lyrics Library (Highest Accuracy for Vietnamese hits)
    const curatedLrc = findCuratedLyrics(cleanTitle, cleanArtist);
    if (curatedLrc) {
      return {
        syncedLyrics: curatedLrc,
        source: 'curated',
      };
    }

    // 3. Check Cache
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

    // 4. Call LRCLIB API with fallbacks
    try {
      const durationSeconds = durationMs ? Math.round(durationMs / 1000) : undefined;
      const res = await axios.get('https://lrclib.net/api/get', {
        params: {
          artist_name: cleanArtist,
          track_name: cleanTitle,
          duration: durationSeconds,
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 4000,
      });

      if (res.data?.syncedLyrics || res.data?.plainLyrics) {
        const data: LyricsResponse = {
          syncedLyrics: res.data.syncedLyrics || undefined,
          plainLyrics: res.data.plainLyrics || undefined,
          source: 'lrclib',
        };
        await cache.set(cacheKey, JSON.stringify(data), 'EX', 86400);
        return data;
      }
    } catch {
      // Step 4b: Fallback to LRCLIB Search endpoint with query
      try {
        const searchRes = await axios.get('https://lrclib.net/api/search', {
          params: { q: `${cleanTitle} ${cleanArtist}` },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          timeout: 4000,
        });

        if (searchRes.data && Array.isArray(searchRes.data) && searchRes.data.length > 0) {
          // Prioritize result with syncedLyrics
          const matchWithSynced = searchRes.data.find((item: any) => Boolean(item.syncedLyrics)) || searchRes.data[0];
          const data: LyricsResponse = {
            syncedLyrics: matchWithSynced.syncedLyrics || undefined,
            plainLyrics: matchWithSynced.plainLyrics || undefined,
            source: 'lrclib',
          };
          await cache.set(cacheKey, JSON.stringify(data), 'EX', 86400);
          return data;
        }
      } catch (err: any) {
        logger.debug({ err: err.message }, 'LRCLIB search fallback failed');
      }
    }

    const emptyResult: LyricsResponse = { source: 'none' };
    await cache.set(cacheKey, JSON.stringify(emptyResult), 'EX', 3600);
    return emptyResult;
  }
}

export const lyricsService = new LyricsService();
