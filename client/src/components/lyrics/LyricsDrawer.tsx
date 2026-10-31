import React, { useEffect, useState, useRef } from 'react';
import { X, Mic2, AlertCircle } from 'lucide-react';
import { usePlayerStore } from '../../stores/player-store.js';
import { api } from '../../api/client.js';
import { LyricsLine } from '../../types/index.js';

export const LyricsDrawer: React.FC = () => {
  const { currentTrack, currentTime, isLyricsOpen, toggleLyrics, seekTo } = usePlayerStore();
  const [syncedLines, setSyncedLines] = useState<LyricsLine[]>([]);
  const [plainLyrics, setPlainLyrics] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const activeLineRef = useRef<HTMLParagraphElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch lyrics whenever currentTrack changes
  useEffect(() => {
    if (!currentTrack || !isLyricsOpen) return;

    let isCancelled = false;
    setIsLoading(true);
    setHasError(false);

    const title = currentTrack.title;
    const artist = currentTrack.artists[0] || '';

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
          // Parse LRC
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

  // Parse LRC helper
  function parseLrc(lrcText: string): LyricsLine[] {
    const lines = lrcText.split('\n');
    const result: LyricsLine[] = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.?(\d{2,3})?\]/;

    for (const rawLine of lines) {
      const match = timeRegex.exec(rawLine);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const millis = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
        const timeMs = minutes * 60 * 1000 + seconds * 1000 + millis;
        const text = rawLine.replace(timeRegex, '').trim();
        if (text) {
          result.push({ timeMs, text });
        }
      }
    }

    return result.sort((a, b) => a.timeMs - b.timeMs);
  }

  // Find active line index
  const currentMs = currentTime * 1000;
  let activeIndex = -1;
  for (let i = 0; i < syncedLines.length; i++) {
    if (syncedLines[i].timeMs <= currentMs + 200) {
      activeIndex = i;
    } else {
      break;
    }
  }

  // Auto-scroll active line to center
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
        <div className="flex items-center gap-2.5">
          <Mic2 className="w-5 h-5 text-ink dark:text-white" />
          <div>
            <h3 className="font-semibold text-base text-ink dark:text-white">
              {currentTrack?.title}
            </h3>
            <p className="text-xs text-body dark:text-mute">
              {currentTrack?.artists.join(', ')}
            </p>
          </div>
        </div>

        <button
          onClick={toggleLyrics}
          className="p-2 rounded-pill hover:bg-surface-soft dark:hover:bg-surface-dark-soft text-body dark:text-mute"
          title="Đóng (Phím L)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto py-10 px-4 text-center space-y-6 scroll-smooth"
      >
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-mute gap-3">
            <span className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Đang tải lời bài hát từ LRCLIB...</p>
          </div>
        )}

        {!isLoading && hasError && (
          <div className="flex flex-col items-center justify-center h-full text-mute gap-2">
            <AlertCircle className="w-8 h-8 stroke-1" />
            <p className="text-sm">Không thể tải lời bài hát lúc này</p>
          </div>
        )}

        {!isLoading && !hasError && syncedLines.length === 0 && !plainLyrics && (
          <div className="flex flex-col items-center justify-center h-full text-mute gap-2">
            <Mic2 className="w-8 h-8 stroke-1 opacity-50" />
            <p className="text-base font-medium">Chưa có lời bài hát cho tác phẩm này</p>
            <p className="text-xs text-mute">
              Hệ thống tự động tra cứu từ kho dữ liệu LRCLIB và kho lưu trữ của mq
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
                onClick={() => seekTo(line.timeMs / 1000)}
                className={`transition-all duration-300 font-display text-xl md:text-2xl font-bold cursor-pointer py-1.5 px-3 rounded-xl hover:scale-105 ${
                  isActive
                    ? 'text-ink dark:text-white scale-110 opacity-100'
                    : 'text-neutral-400 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-400 opacity-60'
                }`}
              >
                {line.text}
              </p>
            );
          })}

        {/* Plain Lyrics fallback */}
        {!isLoading && plainLyrics && (
          <div className="whitespace-pre-line font-display text-lg leading-relaxed text-charcoal dark:text-neutral-300 max-w-xl mx-auto">
            {plainLyrics}
          </div>
        )}
      </div>
    </div>
  );
};
