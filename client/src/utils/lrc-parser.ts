import { LyricsLine } from '../types/index.js';

const META_TAG_RE = /^\[(ar|ti|al|by|length|id|offset|re|ve):/i;
const OFFSET_TAG_RE = /\[offset:\s*([+-]?\d+)\]/i;
const TIME_TAG_RE = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
const METADATA_TEXT_RE =
  /^(bài hát|ca sĩ|nhạc sĩ|sáng tác|album|lời bài hát|beat|producer|mv|official):/i;

/**
 * Parse LRC text into sorted timestamped lines.
 * Supports [mm:ss.xx], [mm:ss.xxx], [mm:ss], multiple timestamps per line,
 * and [offset:ms] + ID3 meta tags.
 */
export function parseLrc(lrcText: string): LyricsLine[] {
  if (!lrcText || typeof lrcText !== 'string') return [];

  const offsetMatch = OFFSET_TAG_RE.exec(lrcText);
  const globalOffset = offsetMatch ? parseInt(offsetMatch[1], 10) : 0;

  const lines = lrcText.split(/\r?\n/);
  const result: LyricsLine[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || META_TAG_RE.test(trimmed)) continue;

    const matches = Array.from(trimmed.matchAll(TIME_TAG_RE));
    if (matches.length === 0) continue;

    const text = trimmed.replace(TIME_TAG_RE, '').trim();
    if (METADATA_TEXT_RE.test(text)) continue;

    for (const match of matches) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      let millis = 0;
      if (match[3]) {
        if (match[3].length === 1) millis = parseInt(match[3], 10) * 100;
        else if (match[3].length === 2) millis = parseInt(match[3], 10) * 10;
        else millis = parseInt(match[3].slice(0, 3), 10);
      }

      const timeMs = Math.max(0, minutes * 60 * 1000 + seconds * 1000 + millis + globalOffset);
      result.push({ timeMs, text });
    }
  }

  return result.sort((a, b) => a.timeMs - b.timeMs);
}

/**
 * Binary search for the largest index whose timeMs <= targetTimeMs.
 * Returns -1 if targetTimeMs is before the first timestamp.
 */
export function findCurrentLyricIndex(lines: LyricsLine[], targetTimeMs: number): number {
  if (lines.length === 0 || targetTimeMs < lines[0].timeMs) {
    return -1;
  }

  let low = 0;
  let high = lines.length - 1;
  let best = -1;

  while (low <= high) {
    const mid = (low + high) >>> 1;
    if (lines[mid].timeMs <= targetTimeMs) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best;
}
