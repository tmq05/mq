import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Radio, RefreshCw } from 'lucide-react';
import { UnifiedTrack } from '../../types/index.js';
import { SongRow } from '../song/SongRow.js';
import { SongRowSkeleton } from '../common/Loading.js';

interface ChartListProps {
  tracks?: UnifiedTrack[];
  isLoading: boolean;
  isShuffling: boolean;
  version: number;
  onShuffle: () => void;
}

export const ChartList: React.FC<ChartListProps> = ({
  tracks = [],
  isLoading,
  isShuffling,
  version,
  onShuffle,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const visibleTracks = tracks.slice(0, 8);

  return (
    <motion.section
      id="sec-chart"
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.28, ease: [0.32, 0.72, 0, 1] }}
      className="space-y-4 scroll-mt-28 rounded-2xl border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card p-4 sm:p-5 shadow-subtle"
    >
      <div className="flex items-center justify-between gap-3 border-b border-hairline dark:border-hairline-dark pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Radio className="w-5 h-5 text-red-500 shrink-0" />
          <h2 className="font-display font-bold text-xl text-ink dark:text-white truncate">
            Giai điệu Nhạc Việt
          </h2>
          <button
            type="button"
            onClick={onShuffle}
            disabled={isShuffling || isLoading}
            className="p-1.5 rounded-full text-neutral-500 dark:text-neutral-400 hover:text-ink dark:hover:text-white hover:bg-surface-soft dark:hover:bg-surface-dark-soft transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green"
            title="Làm mới danh sách Giai điệu Nhạc Việt"
            aria-label="Làm mới danh sách Giai điệu Nhạc Việt"
          >
            <RefreshCw
              className={`w-4 h-4 transition-transform duration-500 ${
                isShuffling ? 'animate-spin text-traffic-green' : ''
              }`}
            />
          </button>
        </div>

        <span className="hidden sm:inline-block text-[11px] font-medium text-mute">
          BXH Chọn lọc · Top {visibleTracks.length || 8}
        </span>
      </div>

      {isLoading ? (
        <div role="status" aria-busy="true">
          <span className="sr-only">Đang tải danh sách giai điệu nhạc Việt</span>
          <SongRowSkeleton count={8} />
        </div>
      ) : (
        <div
          key={`vietnamese-chart-${version}`}
          className="divide-y divide-hairline/45 dark:divide-hairline-dark/45"
        >
          {visibleTracks.map((track, idx) => (
            <motion.div
              key={track.id}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: shouldReduceMotion
                  ? { duration: 0.12 }
                  : {
                      duration: 0.22,
                      delay: idx * 0.035,
                      ease: [0.32, 0.72, 0, 1],
                    },
              }}
            >
              <SongRow
                track={track}
                index={idx}
                queueContext={tracks}
                hideAlbum
                variant="chart"
              />
            </motion.div>
          ))}
        </div>
      )}
    </motion.section>
  );
};
