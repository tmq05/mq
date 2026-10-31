import axios from 'axios';
import { cache } from '../config/redis.js';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';
import { findCuratedLyrics } from '../utils/synced-lyrics-db.js';
import { removeAccents } from '../utils/unaccent.js';

export interface LyricsResponse {
  syncedLyrics?: string;
  plainLyrics?: string;
  source: 'lrclib' | 'curated' | 'local' | 'ovh' | 'zingmp3' | 'none';
}

function cleanTitleForLyrics(raw: string): string {
  let title = raw;
  // Remove parenthesized suffixes: (Remix), (Official Music Video), (Lyric Video), [MV], (Audio), (Live), (Acoustic), (Prod. by ...)
  title = title.replace(
    /\s*\([^)]*(remix|official|music video|lyric|mv|audio|live|acoustic|prod|ver|version|vietsub|karaoke|ft|feat|am remix|nhacpro)[^)]*\)/gi,
    ''
  );
  title = title.replace(
    /\s*\[[^\]]*(remix|official|music video|lyric|mv|audio|live|acoustic|prod|ver|version|vietsub|karaoke|ft|feat|am remix|nhacpro)[^\]]*\]/gi,
    ''
  );
  // Remove pipe and after: " | Official MV", etc.
  title = title.replace(/\s*\|.*$/g, '');
  // Remove trailing dash: " - Single", " - EP", " - Official Audio", " - AM Remix"
  title = title.replace(/\s*-\s*(single|ep|album|remix|mv|official|am remix|nhacpro|remastered).*$/gi, '');
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

function cleanLrcLines(rawLrc: string): string {
  const lines = rawLrc.split('\n');
  const cleaned: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Remove metadata tags like [ar: ...], [ti: ...], [length: ...], [id: ...]
    if (/^\[(ar|ti|al|by|length|id|offset|re|ve):/i.test(trimmed)) continue;

    // Check text after timestamp tag
    const text = trimmed.replace(/\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\]/g, '').trim();
    if (!text) continue;

    // Filter out song meta header lines like "Bài hát: ...", "Ca sĩ: ..."
    if (/^(bài hát|ca sĩ|nhạc sĩ|sáng tác|album|lời bài hát|beat|producer|mv|official):/i.test(text)) {
      continue;
    }

    cleaned.push(trimmed);
  }

  return cleaned.join('\n');
}

async function fetchZingLyrics(title: string, artist: string): Promise<string | null> {
  try {
    const ZingPkg: any = await import('zingmp3-api-full');
    const ZingMp3 = ZingPkg.ZingMp3 || ZingPkg.default?.ZingMp3;
    if (!ZingMp3) return null;

    const normTitle = removeAccents(title).toLowerCase();
    const query = `${title} ${artist}`.trim();

    // 1. Try search with title and artist
    let searchRes = await ZingMp3.search(query);
    let songs = searchRes?.data?.songs || [];

    // Find song matching title
    let match = songs.find((s: any) => {
      const sNorm = removeAccents(s.title || '').toLowerCase();
      return sNorm.includes(normTitle) || normTitle.includes(sNorm);
    });

    // 2. If no title match with artist, search by title alone
    if (!match) {
      searchRes = await ZingMp3.search(title);
      songs = searchRes?.data?.songs || [];
      match = songs.find((s: any) => {
        const sNorm = removeAccents(s.title || '').toLowerCase();
        return sNorm.includes(normTitle) || normTitle.includes(sNorm);
      }) || songs[0];
    }

    if (!match?.encodeId) return null;

    const lyricRes = await ZingMp3.getLyric(match.encodeId);
    if (lyricRes?.err !== 0 || !lyricRes?.data) return null;

    // A. If static .lrc file is provided by Zing CDN
    if (lyricRes.data.file) {
      try {
        const lrcRes = await axios.get(lyricRes.data.file, { timeout: 3500 });
        if (typeof lrcRes.data === 'string' && lrcRes.data.includes('[')) {
          const cleaned = cleanLrcLines(lrcRes.data);
          if (cleaned.length > 0) {
            return cleaned;
          }
        }
      } catch {
        // Fallback to sentences
      }
    }

    // B. Convert sentence word timestamps to LRC format
    if (Array.isArray(lyricRes.data.sentences) && lyricRes.data.sentences.length > 0) {
      const lrcLines: string[] = [];
      for (const sent of lyricRes.data.sentences) {
        if (Array.isArray(sent.words) && sent.words.length > 0) {
          const startMs = sent.words[0].startTime || 0;
          const mins = Math.floor(startMs / 60000);
          const secs = Math.floor((startMs % 60000) / 1000);
          const millis = Math.floor((startMs % 1000) / 10);
          const timeTag = `[${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}]`;
          const text = sent.words.map((w: any) => w.data).join(' ').trim();
          if (text && !/^(bài hát|ca sĩ|nhạc sĩ|sáng tác|album|lời|beat|producer):/i.test(text)) {
            lrcLines.push(`${timeTag}${text}`);
          }
        }
      }
      if (lrcLines.length > 0) {
        return lrcLines.join('\n');
      }
    }
  } catch (err: any) {
    logger.warn({ err: err.message, title, artist }, 'Zing MP3 lyric fetch warning');
  }
  return null;
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

    // 1. Try Zing MP3 official studio LRC (Highest precision, matched to authentic track)
    const zingLrc = await fetchZingLyrics(cleanTitle, cleanArtist);
    if (zingLrc) {
      return {
        syncedLyrics: zingLrc,
        source: 'zingmp3',
      };
    }

    // 2. Check Memory/Redis Cache
    const cacheKey = `lyrics:${cleanArtist.toLowerCase()}:${cleanTitle.toLowerCase()}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.syncedLyrics || parsed.plainLyrics) {
          return parsed;
        }
      } catch {
        // proceed
      }
    }

    // 3. Check Curated Synced Lyrics Library
    const curatedLrc = findCuratedLyrics(cleanTitle, cleanArtist);
    if (curatedLrc) {
      return {
        syncedLyrics: curatedLrc,
        source: 'curated',
      };
    }

    // 4. Try lyrics.ovh API (Fast public lyrics library)
    try {
      const ovhRes = await axios.get(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`,
        { timeout: 3000 }
      );
      if (ovhRes.data?.lyrics) {
        const data: LyricsResponse = {
          plainLyrics: ovhRes.data.lyrics,
          source: 'ovh',
        };
        await cache.set(cacheKey, JSON.stringify(data), 'EX', 86400);
        return data;
      }
    } catch {
      // lyrics.ovh didn't match, continue to LRCLIB
    }

    // 5. Try LRCLIB API if enabled
    if (env.LRCLIB_ENABLED) {
      try {
        const durationSeconds = durationMs ? Math.round(durationMs / 1000) : undefined;
        const res = await axios.get('https://lrclib.net/api/get', {
          params: {
            artist_name: cleanArtist,
            track_name: cleanTitle,
            duration: durationSeconds,
          },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          },
          timeout: 2500,
        });

        if (res.data?.syncedLyrics || res.data?.plainLyrics) {
          const data: LyricsResponse = {
            syncedLyrics: res.data.syncedLyrics ? cleanLrcLines(res.data.syncedLyrics) : undefined,
            plainLyrics: res.data.plainLyrics || undefined,
            source: 'lrclib',
          };
          await cache.set(cacheKey, JSON.stringify(data), 'EX', 86400);
          return data;
        }
      } catch {
        // Search fallback on LRCLIB
        try {
          const searchRes = await axios.get('https://lrclib.net/api/search', {
            params: { q: `${cleanTitle} ${cleanArtist}` },
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            },
            timeout: 2500,
          });

          if (searchRes.data && Array.isArray(searchRes.data) && searchRes.data.length > 0) {
            const matchWithSynced =
              searchRes.data.find((item: any) => Boolean(item.syncedLyrics)) || searchRes.data[0];
            const data: LyricsResponse = {
              syncedLyrics: matchWithSynced.syncedLyrics
                ? cleanLrcLines(matchWithSynced.syncedLyrics)
                : undefined,
              plainLyrics: matchWithSynced.plainLyrics || undefined,
              source: 'lrclib',
            };
            await cache.set(cacheKey, JSON.stringify(data), 'EX', 86400);
            return data;
          }
        } catch {
          // ignore
        }
      }
    }

    // 6. Check local DB if songId provided
    if (songId) {
      const cleanId = songId.replace(/^local:/, '');
      const localSong = await prisma.song.findFirst({
        where: { OR: [{ id: cleanId }, { sourceId: cleanId }] },
        select: { lyrics: true },
      });
      if (localSong?.lyrics) {
        const isSynced = localSong.lyrics.includes('[0');
        return {
          syncedLyrics: isSynced ? cleanLrcLines(localSong.lyrics) : undefined,
          plainLyrics: isSynced ? undefined : localSong.lyrics,
          source: 'local',
        };
      }
    }

    return { source: 'none' };
  }
}

export const lyricsService = new LyricsService();
