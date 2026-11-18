import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { LyricsLine, UnifiedTrack } from '../types/index.js';
import { findCurrentLyricIndex, parseLrc } from '../utils/lrc-parser.js';

export type CurrentLyricStatus = 'loading' | 'none' | 'instrumental' | 'ready';

export interface CurrentLyricResult {
  line: string | null;
  index: number;
  status: CurrentLyricStatus;
}

interface CachedTrackLyrics {
  lines: LyricsLine[];
  hasSynced: boolean;
}

const LYRIC_LEAD_OFFSET_MS = 200; // +0.2s lead for natural reading
const lyricsMemoryCache = new Map<string, CachedTrackLyrics>();

export function useCurrentLyric(
  track: UnifiedTrack | null,
  currentTimeSeconds: number,
  enabled = true
): CurrentLyricResult {
  const trackId = track?.id || null;
  const [loadedTrackId, setLoadedTrackId] = useState<string | null>(null);
  const [lines, setLines] = useState<LyricsLine[]>([]);
  const [hasSynced, setHasSynced] = useState(false);

  useEffect(() => {
    if (!enabled || !track || !trackId) {
      setLoadedTrackId(trackId);
      setLines([]);
      setHasSynced(false);
      return;
    }

    const cached = lyricsMemoryCache.get(trackId);
    if (cached) {
      setLoadedTrackId(trackId);
      setLines(cached.lines);
      setHasSynced(cached.hasSynced);
      return;
    }

    const controller = new AbortController();
    setLoadedTrackId(null);

    const artist =
      Array.isArray(track.artists) && track.artists.length > 0 ? track.artists[0] : '';

    api
      .get('/lyrics', {
        params: {
          title: track.title,
          artist,
          durationMs: track.durationMs,
          songId: track.id,
        },
        signal: controller.signal,
      })
      .then((res) => {
        if (controller.signal.aborted) return;

        const syncedRaw = res.data?.syncedLyrics;
        if (typeof syncedRaw === 'string' && syncedRaw.trim()) {
          const parsed = parseLrc(syncedRaw);
          const entry: CachedTrackLyrics = {
            lines: parsed,
            hasSynced: parsed.length > 0,
          };
          lyricsMemoryCache.set(trackId, entry);
          setLines(entry.lines);
          setHasSynced(entry.hasSynced);
        } else {
          // Plain-text-only or no lyrics: do not fake sync
          const entry: CachedTrackLyrics = { lines: [], hasSynced: false };
          lyricsMemoryCache.set(trackId, entry);
          setLines([]);
          setHasSynced(false);
        }
        setLoadedTrackId(trackId);
      })
      .catch((err) => {
        if (controller.signal.aborted || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
          return;
        }
        console.warn('Could not load inline synced lyric:', err?.message || err);
        setLines([]);
        setHasSynced(false);
        setLoadedTrackId(trackId);
      });

    return () => {
      controller.abort();
    };
  }, [enabled, trackId, track?.title, track?.durationMs]);

  const isLoading = Boolean(enabled && trackId && loadedTrackId !== trackId);

  const activeIndex = useMemo(() => {
    if (!enabled || isLoading || !hasSynced || lines.length === 0) return -1;
    const targetMs = Math.max(0, currentTimeSeconds * 1000 + LYRIC_LEAD_OFFSET_MS);
    return findCurrentLyricIndex(lines, targetMs);
  }, [enabled, isLoading, hasSynced, lines, currentTimeSeconds]);

  return useMemo<CurrentLyricResult>(() => {
    if (!enabled || !trackId) {
      return { line: null, index: -1, status: 'none' };
    }
    if (isLoading) {
      return { line: null, index: -1, status: 'loading' };
    }
    if (!hasSynced || lines.length === 0) {
      return { line: null, index: -1, status: 'none' };
    }
    if (activeIndex < 0) {
      return { line: '♪', index: -1, status: 'instrumental' };
    }

    const activeText = lines[activeIndex]?.text?.trim() || '';
    if (!activeText) {
      return { line: '♪ ♪ ♪', index: activeIndex, status: 'instrumental' };
    }

    return {
      line: activeText,
      index: activeIndex,
      status: 'ready',
    };
  }, [enabled, trackId, isLoading, hasSynced, lines, activeIndex]);
}
