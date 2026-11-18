import axios from 'axios';
import { logger } from '../config/logger.js';

// Pre-indexed known exact official YouTube clean audio video IDs for instant 0ms lookup
const KNOWN_EXACT_TRACKS: Record<string, string> = {
  // Sơn Tùng M-TP
  'nhu ngay hom qua son tung m tp': 'YtkgtlfKaxM',
  'noi nay co anh son tung m tp': 'FN7ALfpGxiI',
  'chung ta cua hien tai son tung m tp': 'Z8pMSslQpKM',
  'lac troi son tung m tp': 'Llw9Q6akRo4',
  'co chac yeu la day son tung m tp': '6t-MjBazs3o',
  'hay trao cho anh son tung m tp': 'knW7-x7Y7RE',
  'am tham ben em son tung m tp': '3fNbfdACbzE',
  'chay ngay di son tung m tp': '32sYGCOYJUM',
  'dung ve tre con son tung m tp': 'L8l_D18sYj0',

  // Đen Vâu
  'nau an cho em den vau': 'ukHK1GVyr0I',
  'tron tim den vau': 'Ws-QlpSltr8',
  'di ve nha den vau': 'vTJdVE_gjI0',
  'bai nay chill phet den vau': 'ZZ5LpwO-An4',
  'muoi nam den vau': 'c4N3oV96yD0',
  'loi cam on den vau': 'QkK5G4U018E',

  // Vũ.
  'la lung vu': 'F5tS5m86bOI',
  'buoc qua mua co don vu': 'YCYbLEC9jNE',
  'buoc qua nhau vu': '4jZ_p5KxWv8',
  'bao tang cua nuoi tiec vu': '4Q2LT8X2cM8',
  'nhung loi hua bo quen vu': 'h6RONxjPBf4',
  'dong ki uc vu': '61mGk6yK9_U',

  // W/N
  '2 4 w n': 'DuzuhELUZw8',
  '24 w n': 'DuzuhELUZw8',
  '2 4': 'DuzuhELUZw8',
  '3107 w n': '9BFrP8kR9a4',
  '3107': '9BFrP8kR9a4',

  // HIEUTHUHAI
  'ngu mot minh hieuthuhai': '1OJQdxT6WHE',
  'khong the say hieuthuhai': 'd6pgocXnK8U',
  've tinh hieuthuhai': 'jXciGNaIoag',
  'gio thi ai cuoi hieuthuhai': 'R6p6c-feIqw',
  'hen gap em duoi anh trang hieuthuhai': 'Zl97G-eD9j0',

  // Hoàng Dũng
  'nang tho hoang dung': '0SJAzTGh1SE',
  'yeu duoi hoang dung': '7JkM3t8g-m4',
  'doi muoi hoang dung': 'WgYQhO5D9uk',
  'cho anh nhe hoang dung': '0chK12qHGfM',

  // MONO
  'waiting for you mono': 'CHw1b_1LVBA',
  'waiting for you': 'CHw1b_1LVBA',
  'em la mono': 'sRUoOA21ZFI',
  'quen anh di mono': 'Wsl5-SYE9gg',
  'l i e mono': 'KLZgIuTQDA4',
  'lie mono': 'KLZgIuTQDA4',
  'anh khong the mono': 'fyf8z1njZs4',
  'buong mono': '2jY2F_C6gBM',
  'cham hoa mono': 'WCm2elbTEZQ',

  // RPT MCK
  'chim sau rpt mck': 'Yw9Ra2UiVLw',
  'chim sau mck': 'Yw9Ra2UiVLw',
  'tai vi sao rpt mck': 'IE02GRUWnOw',
  'tai vi sao mck': 'IE02GRUWnOw',
  'suit tie rpt mck': '1jTSZWRFEB8',
  'suit tie mck': '1jTSZWRFEB8',
  'chi mot dem nua thoi rpt mck': '5WkwBKu1le0',
  'anh da on hon rpt mck': 'dz6xe0xXqYE',
  'ai moi la ke xau xa rpt mck': '9f1u_U3Hvf4',

  // GREY D
  'vaicaunoicokhiennguoithaydoi grey d': '2iidlwQ-NfU',
  'du bao thoi tiet hom nay mua grey d': 'c4MKfX6qSxE',
  'dua em ve nha grey d': 'wvcSGGdnnII',
  'anh sang man dem grey d': 'sXla4x9H2zA',

  // AMEE
  'sao anh chua ve nha amee': 'RlBkvjVss-s',
  'anh nha o dau the amee': 'iE52-XXnQqs',
  'troi giau troi mang di amee': 'QHDkHZPHzC0',
  'den da khong duong amee': 'ZwDxaM5VBJM',

  // Low G
  'co em madihu': 'DcCISK3sCYg',
  'co em low g': 'DcCISK3sCYg',
  'cang cua low g': 'yZW8jzWb5yA',
  'an than low g': 'wKiSIO6Tffo',
  'simp gai 808 low g': '6aBnhxRvmok',

  // Bích Phương
  'bua yeu bich phuong': 'FkOt19CUC30',
  'di du dua di bich phuong': 'ZF3b1nK-TjM',
  'mot cu lua bich phuong': 'gVlYxmdbYqM',
  'nang chen tieu sau bich phuong': 'sU8G7Q4rUA4',
  'bao gio lay chong bich phuong': '7p3h1Yd4-YQ',

  // Other Vietnamese Hits
  'vung an toan b ray': '_XX248bq6Pw',
  'cuoi chieu haisam': 'WfJC8yrsdnA',
  'lanh thoi dung mua haisam': 'pYmAgBSq_Ug',
  'bao tien mot mo binh yen 14 casper': 'b_d65e2qXlY',
  'huong mua he vu': '7gKkWpU-v78',
  'tung la vu cat tuong': 'u24-7w_lK5g',
  'sau loi tu khuoc phan manh quynh': 'lZ59l3cE58g',
  'cat doi noi sau tang duy tan': 'm8_s5nK2b2k',
  'ben tren tang lau tang duy tan': 'K2_sD3cE89I',
  'ngay dau tien duc phuc': 'dK89lZ59c8g',
};

const cache = new Map<string, string>();
const candidatesCache = new Map<string, string[]>();
for (const [k, v] of Object.entries(KNOWN_EXACT_TRACKS)) {
  cache.set(k, v);
}

function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseLengthTextSeconds(text?: string): number | null {
  if (!text) return null;
  const parts = text.trim().split(':').map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function scoreYouTubeCandidate(
  titleText: string,
  channelText: string,
  durationSec: number | null,
  targetDurationSec: number
): number {
  const lowerTitle = titleText.toLowerCase();
  const lowerChannel = channelText.toLowerCase();
  let score = 0;

  if (lowerChannel.includes(' - topic') || lowerChannel.endsWith('topic')) score += 35;
  if (lowerTitle.includes('official audio')) score += 30;
  else if (lowerTitle.includes('audio')) score += 15;
  if (lowerTitle.includes('lyrics') || lowerTitle.includes('lyric video')) score += 10;

  const noisyKeywords = [
    'official mv',
    'music video',
    'live',
    'remix',
    'cover',
    'karaoke',
    'instrumental',
    'nightcore',
    'slowed',
    'sped up',
    'reaction',
    'teaser',
  ];
  for (const kw of noisyKeywords) {
    if (lowerTitle.includes(kw)) score -= 35;
  }

  if (targetDurationSec > 0 && durationSec !== null) {
    const diff = Math.abs(durationSec - targetDurationSec);
    if (diff <= 5) score += 50;
    else if (diff <= 12) score += 25;
    else if (diff <= 25) score += 0;
    else score -= Math.min(80, Math.round(diff));
  }

  return score;
}

function pickCandidatesFromHtml(html: string, durationMs: number): string[] {
  const targetDurationSec = durationMs > 0 ? Math.round(durationMs / 1000) : 0;
  const dataMatch = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);
  if (dataMatch && dataMatch[1]) {
    try {
      const data = JSON.parse(dataMatch[1]);
      const contents =
        data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
          ?.contents?.[0]?.itemSectionRenderer?.contents;
      if (Array.isArray(contents)) {
        const candidates: Array<{ videoId: string; score: number }> = [];
        for (const item of contents) {
          const vr = item?.videoRenderer;
          if (!vr?.videoId || vr.videoId.length !== 11) continue;
          const titleText =
            vr.title?.runs?.map((r: any) => r.text).join('') || vr.title?.simpleText || '';
          const channelText =
            vr.ownerText?.runs?.map((r: any) => r.text).join('') || '';
          const durationSec = parseLengthTextSeconds(vr.lengthText?.simpleText);
          candidates.push({
            videoId: vr.videoId,
            score: scoreYouTubeCandidate(titleText, channelText, durationSec, targetDurationSec),
          });
          if (candidates.length >= 10) break;
        }
        if (candidates.length > 0) {
          candidates.sort((a, b) => b.score - a.score);
          return Array.from(new Set(candidates.map((c) => c.videoId)));
        }
      }
    } catch {
      // Fall through to regex fallback
    }
  }

  const matches = Array.from(html.matchAll(/\/watch\?v=([a-zA-Z0-9_-]{11})/g)).map((m) => m[1]);
  return Array.from(new Set(matches)).slice(0, 8);
}

/**
 * Resolve the exact full-length official YouTube video ID for any track title & artist.
 * 1. Checks memory cache of known clean audio tracks for instant 0ms response.
 * 2. Uses YouTube search with Official Audio constraint and duration matching.
 */
export async function resolveExactFullTrack(
  title: string,
  artist = '',
  durationMs = 0,
  excludeIds: string[] = []
): Promise<string | null> {
  if (!title) return null;

  const excluded = new Set(excludeIds.filter(Boolean));
  const key = normalizeKey(`${title} ${artist}`);
  const titleKey = normalizeKey(title);
  const cacheKey = durationMs > 0 ? `${key}:${Math.round(durationMs / 1000)}` : key;

  const cachedList = candidatesCache.get(cacheKey);
  if (cachedList && cachedList.length > 0) {
    const next = cachedList.find((id) => !excluded.has(id));
    if (next) return next;
  }

  // 1. Direct cache lookup (key with artist or title only) when not excluded
  if (cache.has(cacheKey) && !excluded.has(cache.get(cacheKey)!)) {
    return cache.get(cacheKey)!;
  }
  if (cache.has(key) && !excluded.has(cache.get(key)!)) {
    return cache.get(key)!;
  }
  if (cache.has(titleKey) && !excluded.has(cache.get(titleKey)!)) {
    return cache.get(titleKey)!;
  }

  // Safe fuzzy lookup only for reasonably long titles (>= 6 chars) to avoid false positives on short words
  if (titleKey.length >= 6) {
    for (const [k, v] of cache.entries()) {
      if ((k.startsWith(titleKey) || titleKey.startsWith(k)) && !excluded.has(v)) {
        return v;
      }
    }
  }

  // 2. Query YouTube search with Official Audio constraint
  try {
    const searchQuery =
      excluded.size > 0
        ? `${title} ${artist} Lyrics Audio`.trim()
        : `${title} ${artist} Official Audio`.trim();
    const res = await axios.get(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`,
      {
        timeout: 5000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      }
    );

    const html = res.data;
    if (typeof html === 'string') {
      const candidates = pickCandidatesFromHtml(html, durationMs);
      if (candidates.length > 0) {
        const merged = Array.from(new Set([...(cachedList || []), ...candidates]));
        candidatesCache.set(cacheKey, merged);
        const videoId = candidates.find((id) => !excluded.has(id)) || null;
        if (videoId) {
          cache.set(cacheKey, videoId);
          logger.info(
            { title, artist, durationMs, videoId, excludedCount: excluded.size },
            'Resolved duration-matched full-length track on YouTube'
          );
          return videoId;
        }
      }
    }
  } catch (err: any) {
    logger.warn({ err: err.message, title, artist }, 'Track resolver error');
  }

  return null;
}
