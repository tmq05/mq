import React, { useEffect, useState, useRef } from 'react';
import { X, Mic2, AlertCircle } from 'lucide-react';
import { usePlayerStore } from '../../stores/player-store.js';
import { api } from '../../api/client.js';
import { LyricsLine } from '../../types/index.js';
import { formatArtists, cleanDisplayTitle } from '../../utils/format.js';

export const LyricsDrawer: React.FC = () => {
  const { currentTrack, currentTime, isLyricsOpen, toggleLyrics, seekTo } = usePlayerStore();
  const [syncedLines, setSyncedLines] = useState<LyricsLine[]>([]);
  const [plainLyrics, setPlainLyrics] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const activeLineRef = useRef<HTMLParagraphElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Enhanced LRC Parser with metadata filtering
  function parseLrc(lrcText: string): LyricsLine[] {
    const lines = lrcText.split('\n');
    const result: LyricsLine[] = [];

    const offsetMatch = /\[offset:\s*([+-]?\d+)\]/i.exec(lrcText);
    const globalOffset = offsetMatch ? parseInt(offsetMatch[1], 10) : 0;

    const timeRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

    for (const rawLine of lines) {
      // Skip ID3 tags
      if (/^\[(ar|ti|al|by|length|id|offset|re|ve):/i.test(rawLine.trim())) continue;

      const matches = Array.from(rawLine.matchAll(timeRegex));
      if (matches.length > 0) {
        const text = rawLine.replace(timeRegex, '').trim();
        // Skip metadata header lines
        if (
          !text ||
          /^(bài hát|ca sĩ|nhạc sĩ|sáng tác|album|lời bài hát|beat|producer|mv|official):/i.test(text)
        ) {
          continue;
        }

        for (const match of matches) {
          const minutes = parseInt(match[1], 10);
          const seconds = parseInt(match[2], 10);
          let millis = 0;
          if (match[3]) {
            if (match[3].length === 1) millis = parseInt(match[3], 10) * 100;
            else if (match[3].length === 2) millis = parseInt(match[3], 10) * 10;
            else millis = parseInt(match[3].slice(0, 3), 10);
          }
          const timeMs = minutes * 60 * 1000 + seconds * 1000 + millis + globalOffset;
          result.push({ timeMs, text });
        }
      }
    }

    return result.sort((a, b) => a.timeMs - b.timeMs);
  }

  // Auto-sync plain lyrics if no LRC timestamps exist
  function autoSyncPlainLyrics(plainText: string, durationMs: number): LyricsLine[] {
    const rawLines = plainText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('[') && !l.endsWith(']'));

    if (rawLines.length === 0) return [];

    const total = rawLines.length;
    const startMs = 4000;
    const endMs = Math.max(startMs + 30000, durationMs - 12000);
    const step = (endMs - startMs) / Math.max(1, total - 1);

    return rawLines.map((text, i) => ({
      timeMs: Math.round(startMs + i * step),
      text,
    }));
  }

  // Fetch lyrics whenever currentTrack changes
  useEffect(() => {
    if (!currentTrack || !isLyricsOpen) return;

    let isCancelled = false;
    setIsLoading(true);
    setHasError(false);

    const title = currentTrack.title;
    const artist =
      Array.isArray(currentTrack.artists) && currentTrack.artists.length > 0
        ? currentTrack.artists[0]
        : '';

    api
      .get('/lyrics', {
        params: {
          title,
          artist,
          durationMs: currentTrack.durationMs,
          songId: currentTrack.id,
        },
      })
      .then((res) => {
        if (isCancelled) return;
        if (res.data?.syncedLyrics) {
          const lines = parseLrc(res.data.syncedLyrics);
          setSyncedLines(lines);
          setPlainLyrics(null);
        } else if (res.data?.plainLyrics) {
          const duration = currentTrack.durationMs > 0 ? currentTrack.durationMs : 210000;
          const autoSynced = autoSyncPlainLyrics(res.data.plainLyrics, duration);
          setSyncedLines(autoSynced);
          setPlainLyrics(res.data.plainLyrics);
        } else {
          setSyncedLines([]);
          setPlainLyrics(null);
        }
      })
      .catch(() => {
        if (!isCancelled) setHasError(true);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [currentTrack?.id, isLyricsOpen]);

  // Compute active line index using current playback time with human reading lead compensation (~150ms)
  const currentMs = currentTime * 1000;
  let activeIndex = -1;
  for (let i = 0; i < syncedLines.length; i++) {
    if (syncedLines[i].timeMs <= currentMs + 150) {
      activeIndex = i;
    } else {
      break;
    }
  }

  // Auto-scroll active line smoothly to center
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  if (!isLyricsOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 top-14 bottom-24 z-30 bg-canvas/98 dark:bg-canvas-dark/98 backdrop-blur-xl flex flex-col p-6 max-w-4xl mx-auto rounded-t-2xl border-t border-hairline dark:border-hairline-dark select-none animate-in fade-in slide-in-from-bottom-6 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-hairline dark:border-hairline-dark shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Mic2 className="w-5 h-5 text-traffic-green shrink-0" />
          <div className="min-w-0">
            <h3 className="font-semibold text-base text-neutral-900 dark:text-white truncate">
              {cleanDisplayTitle(currentTrack?.title)}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
              {formatArtists(currentTrack?.artists)}
            </p>
          </div>
        </div>

        <button
          onClick={toggleLyrics}
          className="p-2 rounded-pill hover:bg-surface-soft dark:hover:bg-surface-dark-soft text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
          title="Đóng (Phím L)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto py-12 px-4 text-center space-y-6 scroll-smooth"
      >
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-neutral-400 gap-3">
            <span className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Đang tải và đồng bộ lời bài hát...</p>
          </div>
        )}

        {!isLoading && hasError && (
          <div className="flex flex-col items-center justify-center h-full text-neutral-400 gap-2">
            <AlertCircle className="w-8 h-8 stroke-1 text-amber-500" />
            <p className="text-sm">Không thể tải lời bài hát lúc này</p>
          </div>
        )}

        {!isLoading && !hasError && syncedLines.length === 0 && !plainLyrics && (
          <div className="flex flex-col items-center justify-center h-full text-neutral-400 gap-2">
            <Mic2 className="w-8 h-8 stroke-1 opacity-50" />
            <p className="text-base font-medium text-neutral-800 dark:text-neutral-200">
              Chưa có lời bài hát đồng bộ cho tác phẩm này
            </p>
            <p className="text-xs text-neutral-500 max-w-sm">
              Hệ thống tự động tra cứu từ kho dữ liệu Zing MP3, LRCLIB và kho lưu trữ của mq
            </p>
          </div>
        )}

        {/* Instrumental Intro Countdown Badge */}
        {!isLoading && activeIndex === -1 && syncedLines.length > 0 && (
          <div className="py-6 flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-traffic-green/10 border border-traffic-green/20 text-traffic-green text-xs font-mono font-medium">
              <span className="w-2 h-2 rounded-full bg-traffic-green animate-ping" />
              <span>
                Đoạn dạo nhạc · Lời bài hát sẽ vào sau{' '}
                {Math.max(1, Math.ceil((syncedLines[0].timeMs - currentMs) / 1000))}s
              </span>
            </div>
          </div>
        )}

        {/* Synced Lyrics Rendering */}
        {!isLoading &&
          syncedLines.length > 0 &&
          syncedLines.map((line, idx) => {
            const isActive = idx === activeIndex;
            return (
              <p
                key={idx}
                ref={isActive ? activeLineRef : null}
                onClick={() => seekTo(line.timeMs / 1000)}
                title="Nhấn để phát đoạn này"
                className={`transition-all duration-300 font-display cursor-pointer py-2 px-4 rounded-xl max-w-2xl mx-auto select-none ${
                  isActive
                    ? 'text-neutral-900 dark:text-white text-2xl md:text-3xl font-extrabold scale-[1.04] bg-neutral-100 dark:bg-white/10 shadow-sm border border-neutral-200 dark:border-white/10'
                    : 'text-neutral-400 dark:text-neutral-500 text-lg md:text-xl font-medium hover:text-neutral-800 dark:hover:text-neutral-200 opacity-60 hover:opacity-100 hover:scale-105'
                }`}
              >
                {line.text}
              </p>
            );
          })}
      </div>
    </div>
  );
};
