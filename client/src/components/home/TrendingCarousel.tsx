import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, Flame, Play, RefreshCw } from 'lucide-react';
import { UnifiedTrack } from '../../types/index.js';
import { SongCard } from '../song/SongCard.js';
import { Skeleton } from '../common/Loading.js';

interface TrendingCarouselProps {
  tracks?: UnifiedTrack[];
  isLoading: boolean;
  isShuffling: boolean;
  fromFallback?: boolean;
  version: number;
  onShuffle: () => void;
  onPlayAll: () => void;
}

export const TrendingCarousel: React.FC<TrendingCarouselProps> = ({
  tracks = [],
  isLoading,
  isShuffling,
  fromFallback,
  version,
  onShuffle,
  onPlayAll,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const trackStripRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollButtons = useCallback(() => {
    const el = trackStripRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    window.addEventListener('resize', updateScrollButtons);
    return () => window.removeEventListener('resize', updateScrollButtons);
  }, [tracks.length, version, isLoading, updateScrollButtons]);

  const scrollByAmount = (direction: -1 | 1) => {
    const el = trackStripRef.current;
    if (!el) return;
    const distance = Math.max(260, Math.round(el.clientWidth * 0.7));
    el.scrollBy({ left: direction * distance, behavior: 'smooth' });
  };

  const visibleTracks = tracks.slice(0, 6);

  return (
    <motion.section
      id="sec-trending"
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.28, ease: [0.32, 0.72, 0, 1] }}
      className="space-y-4 scroll-mt-28"
    >
      {/* Unified Section Header */}
      <div className="flex items-center justify-between gap-3 border-b border-hairline dark:border-hairline-dark pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Flame className="w-5 h-5 text-amber-500 shrink-0" />
          <h2 className="font-display font-bold text-xl text-ink dark:text-white truncate">
            Thịnh hành hôm nay
          </h2>
          <button
            type="button"
            onClick={onShuffle}
            disabled={isShuffling || isLoading}
            className="p-1.5 rounded-full text-neutral-500 dark:text-neutral-400 hover:text-ink dark:hover:text-white hover:bg-surface-soft dark:hover:bg-surface-dark-soft transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green"
            title="Làm mới danh sách Thịnh hành hôm nay"
            aria-label="Làm mới danh sách Thịnh hành hôm nay"
          >
            <RefreshCw
              className={`w-4 h-4 transition-transform duration-500 ${
                isShuffling ? 'animate-spin text-traffic-green' : ''
              }`}
            />
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Carousel Arrows (Desktop/Tablet) */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollByAmount(-1)}
              disabled={!canScrollLeft}
              aria-label="Cuộn sang trái danh sách thịnh hành"
              className="w-8 h-8 rounded-full border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card text-ink dark:text-white flex items-center justify-center hover:border-hairline-strong disabled:opacity-35 disabled:cursor-default transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollByAmount(1)}
              disabled={!canScrollRight}
              aria-label="Cuộn sang phải danh sách thịnh hành"
              className="w-8 h-8 rounded-full border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card text-ink dark:text-white flex items-center justify-center hover:border-hairline-strong disabled:opacity-35 disabled:cursor-default transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {visibleTracks.length > 0 && (
            <button
              type="button"
              onClick={onPlayAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-ink dark:bg-white text-white dark:text-black text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Phát tất cả</span>
            </button>
          )}
        </div>
      </div>

      {fromFallback && (
        <p className="text-[11px] text-amber-500">
          Đang hiển thị danh sách gợi ý dự phòng do kết nối tới nguồn nhạc tạm thời gián đoạn.
        </p>
      )}

      {isLoading ? (
        <div role="status" aria-busy="true" className="flex gap-4 overflow-hidden">
          <span className="sr-only">Đang tải danh sách thịnh hành hôm nay</span>
          <div className="w-[300px] sm:w-[360px] shrink-0 p-3.5 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card flex gap-3.5">
            <Skeleton width={140} height={140} radius="12px" className="shrink-0" />
            <div className="flex-1 space-y-2.5 py-2">
              <Skeleton width="60%" height={12} />
              <Skeleton width="90%" height={18} />
              <Skeleton width="70%" height={14} />
            </div>
          </div>
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="w-[168px] sm:w-[188px] shrink-0 p-3 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-3"
            >
              <Skeleton width="100%" height={156} radius="10px" />
              <Skeleton width="80%" height={14} />
              <Skeleton width="55%" height={12} />
            </div>
          ))}
        </div>
      ) : (
        <div
          key={`trending-carousel-${version}`}
          ref={trackStripRef}
          onScroll={updateScrollButtons}
          className="flex items-stretch gap-4 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {visibleTracks.map((track, idx) => {
            const isFirst = idx === 0;
            return (
              <motion.div
                key={track.id}
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: shouldReduceMotion
                    ? { duration: 0.12 }
                    : {
                        duration: 0.24,
                        delay: idx * 0.04,
                        ease: [0.32, 0.72, 0, 1],
                      },
                }}
                className={`snap-start shrink-0 ${
                  isFirst
                    ? 'w-[280px] sm:w-[380px] lg:w-[410px]'
                    : 'w-[166px] sm:w-[188px] lg:w-[198px]'
                }`}
              >
                <SongCard
                  track={track}
                  queueContext={tracks}
                  variant={isFirst ? 'bento' : 'compact'}
                  compactBadges
                  highlightBadge={isFirst ? '#1 Thịnh hành' : undefined}
                />
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.section>
  );
};
