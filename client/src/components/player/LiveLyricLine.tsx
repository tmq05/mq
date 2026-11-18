import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Music } from 'lucide-react';
import { usePlayerStore } from '../../stores/player-store.js';
import { useLyricPrefStore } from '../../stores/lyric-pref-store.js';
import { useCurrentLyric } from '../../hooks/useCurrentLyric.js';

export const LiveLyricLine: React.FC = () => {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const isLyricsOpen = usePlayerStore((s) => s.isLyricsOpen);
  const toggleLyrics = usePlayerStore((s) => s.toggleLyrics);
  const showInlineLyric = useLyricPrefStore((s) => s.showInlineLyric);
  const shouldReduceMotion = useReducedMotion();

  const { line, index, status } = useCurrentLyric(currentTrack, currentTime, showInlineLyric);

  const isVisible = showInlineLyric && status !== 'none';

  const handleOpenFullLyrics = () => {
    if (!isLyricsOpen) {
      toggleLyrics();
    }
  };

  return (
    <div
      className="h-6 mt-1.5 flex items-center justify-center md:justify-start overflow-hidden"
      aria-live="off"
    >
      <AnimatePresence mode="wait" initial={false}>
        {isVisible && (
          <motion.div
            key="inline-lyric-slot"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.985 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.985 }}
            transition={{
              duration: shouldReduceMotion ? 0.12 : 0.22,
              ease: [0.32, 0.72, 0, 1],
            }}
            className="w-full max-w-full flex items-center justify-center md:justify-start min-w-0"
          >
            {status === 'loading' ? (
              <div
                role="status"
                aria-label="Đang tải lời bài hát"
                className="h-3.5 w-48 max-w-full rounded-full bg-neutral-200/80 dark:bg-neutral-800/80 animate-pulse"
              />
            ) : (
              <button
                type="button"
                onClick={handleOpenFullLyrics}
                title={line || undefined}
                aria-label={
                  line ? `Lời đang phát: ${line}. Nhấn để mở toàn bộ lời bài hát` : 'Mở lời bài hát'
                }
                className="group inline-flex items-center gap-1.5 max-w-full min-w-0 text-left rounded-md px-1 -mx-1 py-0.5 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green"
              >
                <Music
                  className={`w-3.5 h-3.5 shrink-0 ${
                    status === 'ready'
                      ? 'text-traffic-green'
                      : 'text-neutral-400 dark:text-neutral-500'
                  }`}
                />
                <div className="relative min-w-0 flex-1 overflow-hidden">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={`${currentTrack?.id || 'none'}:${index}:${status}`}
                      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
                      transition={{
                        duration: shouldReduceMotion ? 0 : 0.18,
                        ease: [0.32, 0.72, 0, 1],
                      }}
                      className={`block truncate text-xs sm:text-sm leading-5 ${
                        status === 'ready'
                          ? 'font-medium text-neutral-700 dark:text-neutral-200 group-hover:text-neutral-950 dark:group-hover:text-white'
                          : 'font-normal italic text-neutral-500 dark:text-neutral-400'
                      }`}
                    >
                      {line}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
