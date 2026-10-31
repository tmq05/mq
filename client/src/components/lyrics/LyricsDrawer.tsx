import React, { useEffect, useState, useRef } from 'react';
import { X, Mic2, AlertCircle, RotateCcw } from 'lucide-react';
import { usePlayerStore } from '../../stores/player-store.js';
import { api } from '../../api/client.js';
import { LyricsLine } from '../../types/index.js';
import { formatArtists } from '../../utils/format.js';

export const LyricsDrawer: React.FC = () => {
  const { currentTrack, currentTime, isLyricsOpen, toggleLyrics, seekTo } = usePlayerStore();
  const [syncedLines, setSyncedLines] = useState<LyricsLine[]>([]);
  const [plainLyrics, setPlainLyrics] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [manualOffsetMs, setManualOffsetMs] = useState(0);

  const activeLineRef = useRef<HTMLParagraphElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset manual offset on track change
  useEffect(() => {
    setManualOffsetMs(0);
  }, [currentTrack?.id]);

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
        if (res.data.syncedLyrics) {
          const lines = parseLrc(res.data.syncedLyrics);
          setSyncedLines(lines);
          setPlainLyrics(null);
        } else if (res.data.plainLyrics) {
          setPlainLyrics(res.data.plainLyrics);
          setSyncedLines([]);
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

  // Enhanced LRC Parser: supports [offset: ms], [mm:ss.xx], [mm:ss:xx], and multiple tags
  function parseLrc(lrcText: string): LyricsLine[] {
    const lines = lrcText.split('\n');
    const result: LyricsLine[] = [];

    const offsetMatch = /\[offset:\s*([+-]?\d+)\]/i.exec(lrcText);
    const globalOffset = offsetMatch ? parseInt(offsetMatch[1], 10) : 0;

    const timeRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

    for (const rawLine of lines) {
      const matches = Array.from(rawLine.matchAll(timeRegex));
      if (matches.length > 0) {
        const text = rawLine.replace(timeRegex, '').trim();
        if (text) {
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
    }

    return result.sort((a, b) => a.timeMs - b.timeMs);
  }

  // Find active line index using current time & manual offset
  const effectiveCurrentMs = currentTime * 1000 - manualOffsetMs;
  let activeIndex = -1;
  for (let i = 0; i < syncedLines.length; i++) {
    // Lead time compensation for natural lyric reading (~250ms)
    if (syncedLines[i].timeMs <= effectiveCurrentMs + 250) {
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
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-hairline dark:border-hairline-dark shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Mic2 className="w-5 h-5 text-traffic-green shrink-0" />
          <div className="min-w-0">
            <h3 className="font-semibold text-base text-neutral-900 dark:text-white truncate">
              {currentTrack?.title}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
              {formatArtists(currentTrack?.artists)}
            </p>
          </div>
        </div>

        {/* Sync Controls & Close */}
        <div className="flex items-center gap-3">
          {syncedLines.length > 0 && (
            <div className="flex items-center gap-1 bg-surface-soft dark:bg-surface-dark-soft px-2.5 py-1 rounded-pill border border-hairline dark:border-hairline-dark text-xs font-mono">
              <span className="text-neutral-400 text-[11px] mr-1 hidden sm:inline">Khớp lời:</span>
              <button
                onClick={() => setManualOffsetMs((prev) => prev - 500)}
                className="px-1.5 py-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 active:scale-95 transition-transform"
                title="Lùi lời 0.5s"
              >
                -0.5s
              </button>
              <button
                onClick={() => setManualOffsetMs(0)}
                className={`px-1.5 py-0.5 rounded text-[11px] flex items-center gap-1 ${
                  manualOffsetMs === 0
                    ? 'text-neutral-500'
                    : 'bg-traffic-green/20 text-traffic-green font-bold'
                }`}
                title="Đặt lại độ trễ ban đầu"
              >
                {manualOffsetMs !== 0 && <RotateCcw className="w-2.5 h-2.5" />}
                {manualOffsetMs === 0
                  ? 'Chuẩn'
                  : `${manualOffsetMs > 0 ? '+' : ''}${(manualOffsetMs / 1000).toFixed(1)}s`}
              </button>
              <button
                onClick={() => setManualOffsetMs((prev) => prev + 500)}
                className="px-1.5 py-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 active:scale-95 transition-transform"
                title="Tiến lời 0.5s"
              >
                +0.5s
              </button>
            </div>
          )}

          <button
            onClick={toggleLyrics}
            className="p-2 rounded-pill hover:bg-surface-soft dark:hover:bg-surface-dark-soft text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
            title="Đóng (Phím L)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
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
              Hệ thống tự động tra cứu từ kho dữ liệu lời bài hát LRCLIB và kho lưu trữ của mq
            </p>
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
                onClick={() => seekTo(Math.max(0, (line.timeMs + manualOffsetMs) / 1000))}
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

        {/* Plain Lyrics fallback */}
        {!isLoading && plainLyrics && (
          <div className="whitespace-pre-line font-display text-lg leading-relaxed text-neutral-700 dark:text-neutral-300 max-w-xl mx-auto">
            {plainLyrics}
          </div>
        )}
      </div>
    </div>
  );
};
