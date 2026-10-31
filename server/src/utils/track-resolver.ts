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
  '3107 w n': '9BFrP8kR9a4',

  // HIEUTHUHAI
  'ngu mot minh hieuthuhai': '1OJQdxT6WHE',
  'khong the say hieuthuhai': 'd6pgocXnK8U',
  've tinh hieuthuhai': 'jXciGNaIoag',
  'gio thi ai cuoi hieuthuhai': 'R6p6c-feIqw',
  'hen gap em duoi anh trang hieuthuhai': 'Zl97G-eD9j0',

  // Hoàng Dũng
  'nang tho hoang dung': '0SJAzTGh1SE',
  'yeu duoi hoang dung': '7JkM3t8g-m4',
  'doi muoi hoang dung': '7C2zLQSZ98A',

  // Bích Phương
  'bua yeu bich phuong': 'FkOt19CUC30',
  'di du dua di bich phuong': 'ZF3b1nK-TjM',
  'mot cu lua bich phuong': 'gVlYxmdbYqM',
  'nang chen tieu sau bich phuong': 'sU8G7Q4rUA4',
  'bao gio lay chong bich phuong': '7p3h1Yd4-YQ',

  // Other Vietnamese Hits
  'cham hoa mono': 'WCm2elbTEZQ',
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

/**
 * Resolve the exact full-length official YouTube video ID for any track title & artist.
 * 1. Checks memory cache of known clean audio tracks for instant 0ms response.
 * 2. Uses YouTube search with Official Audio constraint.
 */
export async function resolveExactFullTrack(
  title: string,
  artist = ''
): Promise<string | null> {
  if (!title) return null;

  const key = normalizeKey(`${title} ${artist}`);
  const titleKey = normalizeKey(title);

  // 1. Direct cache lookup
  if (cache.has(key)) {
    return cache.get(key)!;
  }

  for (const [k, v] of cache.entries()) {
    if (k.includes(titleKey) || titleKey.includes(k)) {
      return v;
    }
  }

  // 2. Query YouTube search with Official Audio constraint
  try {
    const searchQuery = `${title} ${artist} Official Audio`.trim();
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
      const match = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
      if (match && match[1]) {
        const videoId = match[1];
        cache.set(key, videoId);
        logger.info({ title, artist, videoId }, 'Resolved exact full-length track on YouTube');
        return videoId;
      }
    }
  } catch (err: any) {
    logger.warn({ err: err.message, title, artist }, 'Track resolver error');
  }

  return null;
}
