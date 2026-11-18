import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, Clock3, Pause, Play, Trash2, X } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store.js';
import { usePlayerStore } from '../../stores/player-store.js';
import {
  ContinueListeningItem,
  useListeningHistoryStore,
} from '../../stores/listening-history-store.js';
import { cleanDisplayTitle, formatArtists, formatMs } from '../../utils/format.js';
import { Modal } from '../common/Modal.js';
import { Button } from '../common/Button.js';
import { Skeleton } from '../common/Loading.js';

interface ContinueListeningSectionProps {
  /** Optional external list (used later when SourceFilter is applied) */
  filteredItems?: ContinueListeningItem[];
}

const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80';

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Chào buổi sáng';
  if (hour >= 12 && hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

export const ContinueListeningSection: React.FC<ContinueListeningSectionProps> = ({
  filteredItems,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const { user, isAuthenticated } = useAuthStore();
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const { items: storeItems, isLoading, hasLoadedOnce, removeItem, clearAll } =
    useListeningHistoryStore();

  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [highlightedTrackId, setHighlightedTrackId] = useState<string | null>(null);
  const prevTopTrackIdRef = useRef<string | null>(null);
  const prevCountRef = useRef<number>(0);
  const stripRef = useRef<HTMLDivElement>(null);

  const items = filteredItems ?? storeItems;

  useEffect(() => {
    const topId = items[0]?.track?.id || null;
    if (
      topId &&
      hasLoadedOnce &&
      prevTopTrackIdRef.current !== null &&
      (topId !== prevTopTrackIdRef.current || items.length > prevCountRef.current)
    ) {
      setHighlightedTrackId(topId);
      const timer = window.setTimeout(() => {
        setHighlightedTrackId((curr) => (curr === topId ? null : curr));
      }, 2600);
      prevTopTrackIdRef.current = topId;
      prevCountRef.current = items.length;
      return () => window.clearTimeout(timer);
    }
    prevTopTrackIdRef.current = topId;
    prevCountRef.current = items.length;
  }, [items, hasLoadedOnce]);

  if (isLoading && !hasLoadedOnce && items.length === 0) {
    return (
      <section aria-label="Tiếp tục nghe" className="space-y-3">
        <Skeleton width={220} height={24} />
        <div className="flex gap-3.5 overflow-hidden">
          {[1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              className="w-[168px] sm:w-[186px] shrink-0 p-2.5 rounded-2xl border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-2.5"
            >
              <Skeleton width="100%" height={154} radius="12px" />
              <Skeleton width="80%" height={14} />
              <Skeleton width="55%" height={11} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Nếu chưa có lịch sử thì ẩn hẳn section (không hiện khung trống)
  if (!items || items.length === 0) {
    return null;
  }

  const greetingText = isAuthenticated && user?.name
    ? `${getTimeGreeting()}, ${user.name}`
    : getTimeGreeting();

  const allTracks = items.map((i) => i.track);

  const scrollStrip = (dir: -1 | 1) => {
    const el = stripRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, Math.round(el.clientWidth * 0.65)), behavior: 'smooth' });
  };

  const handleResumeTrack = (item: ContinueListeningItem) => {
    const isCurrent = currentTrack?.id === item.track.id;
    if (isCurrent) {
      togglePlay();
      return;
    }
    const durationSec = item.track.durationMs > 0 ? item.track.durationMs / 1000 : 0;
    const shouldRestart = durationSec > 0 && item.progressSeconds >= durationSec * 0.92;
    playTrack(item.track, allTracks, shouldRestart ? 0 : item.progressSeconds);
  };

  return (
    <>
      <motion.section
        id="sec-continue"
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: [0.32, 0.72, 0, 1] }}
        className="space-y-3.5 scroll-mt-28"
      >
        {/* Greeting + Header Controls */}
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-hairline dark:border-hairline-dark pb-3">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-emerald-600 dark:text-traffic-green font-sans">
              {greetingText}
            </p>
            <div className="flex items-center gap-2">
              <Clock3 className="w-5 h-5 text-traffic-green shrink-0" />
              <h2 className="font-display font-bold text-xl text-ink dark:text-white">
                Tiếp tục nghe
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1">
              <button
                type="button"
                onClick={() => scrollStrip(-1)}
                aria-label="Cuộn sang trái danh sách tiếp tục nghe"
                className="w-8 h-8 rounded-full border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card text-ink dark:text-white flex items-center justify-center hover:border-hairline-strong transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollStrip(1)}
                aria-label="Cuộn sang phải danh sách tiếp tục nghe"
                className="w-8 h-8 rounded-full border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card text-ink dark:text-white flex items-center justify-center hover:border-hairline-strong transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setConfirmClearOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill border border-hairline dark:border-hairline-dark bg-surface-soft/70 dark:bg-surface-dark-soft/70 text-xs font-medium text-mute hover:text-rose-500 hover:border-rose-400/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa lịch sử</span>
            </button>
          </div>
        </div>

        {/* Horizontal Carousel */}
        <div
          ref={stripRef}
          className="flex items-stretch gap-3.5 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <AnimatePresence initial={false}>
            {items.map((item) => {
              const track = item.track;
              const displayTitle = cleanDisplayTitle(track.title);
              const isCurrent = currentTrack?.id === track.id;
              const isJustAdded = highlightedTrackId === track.id;
              const durationSec = track.durationMs > 0 ? track.durationMs / 1000 : 0;
              const progressPct =
                durationSec > 0
                  ? Math.min(100, Math.max(4, Math.round((item.progressSeconds / durationSec) * 100)))
                  : item.progressSeconds > 0
                    ? 35
                    : 0;

              return (
                <motion.div
                  key={track.id}
                  layout={!shouldReduceMotion}
                  initial={
                    shouldReduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, scale: 0.9, x: -16 }
                  }
                  animate={{
                    opacity: 1,
                    scale: 1,
                    x: 0,
                    transition: {
                      duration: shouldReduceMotion ? 0.1 : 0.28,
                      ease: [0.32, 0.72, 0, 1],
                    },
                  }}
                  exit={
                    shouldReduceMotion
                      ? { opacity: 0 }
                      : {
                          opacity: 0,
                          scale: 0.9,
                          transition: { duration: 0.18, ease: 'easeOut' },
                        }
                  }
                  onClick={() => handleResumeTrack(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleResumeTrack(item);
                    }
                  }}
                  aria-label={`Nghe tiếp ${displayTitle} từ ${formatMs(item.progressSeconds * 1000)}`}
                  className={`snap-start w-[166px] sm:w-[186px] shrink-0 group relative flex flex-col p-2.5 rounded-2xl border transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green ${
                    isJustAdded
                      ? 'border-traffic-green bg-traffic-green/12 ring-2 ring-traffic-green/35 shadow-md'
                      : isCurrent
                        ? 'border-traffic-green/70 bg-traffic-green/6 shadow-sm'
                        : 'border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card hover:bg-surface-soft dark:hover:bg-surface-dark-soft hover:border-hairline-strong dark:hover:border-white/20'
                  }`}
                >
                  {/* Cover + Progress Bar + Remove X + Hover Play */}
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-surface-soft dark:bg-surface-dark-soft mb-2.5">
                    <img
                      src={track.coverUrl || FALLBACK_COVER}
                      alt={displayTitle}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    {isJustAdded && (
                      <span className="absolute top-1.5 left-1.5 z-10 px-2 py-0.5 rounded-pill bg-traffic-green text-black font-sans font-bold text-[10px] shadow-sm">
                        Vừa thêm
                      </span>
                    )}

                    {/* Remove single item button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(track.id, user?.id);
                      }}
                      title="Xóa khỏi Tiếp tục nghe"
                      aria-label={`Xóa ${displayTitle} khỏi lịch sử tiếp tục nghe`}
                      className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full bg-black/65 backdrop-blur-sm text-white/90 hover:text-white hover:bg-rose-600 flex items-center justify-center opacity-85 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>

                    {/* Hover Play/Pause button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResumeTrack(item);
                      }}
                      aria-label={isCurrent && isPlaying ? `Tạm dừng ${displayTitle}` : `Nghe tiếp ${displayTitle}`}
                      className={`absolute bottom-3 right-2 z-10 w-9 h-9 rounded-full bg-white text-black shadow-lg flex items-center justify-center transition-all duration-200 ${
                        isCurrent
                          ? 'opacity-100 scale-100'
                          : 'opacity-0 translate-y-1.5 group-hover:opacity-100 group-hover:translate-y-0'
                      }`}
                    >
                      {isCurrent && isPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>

                    {/* Thin Progress Bar at bottom of cover */}
                    {progressPct > 0 && (
                      <div
                        aria-hidden="true"
                        className="absolute inset-x-0 bottom-0 h-1 bg-black/45"
                      >
                        <div
                          className="h-full bg-traffic-green transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Track Info */}
                  <h4
                    title={track.title}
                    className="font-semibold text-xs sm:text-sm text-ink dark:text-white truncate"
                  >
                    {displayTitle}
                  </h4>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-300 truncate">
                    {formatArtists(track.artists)}
                  </p>
                  <span className="mt-1 text-[10px] font-medium text-emerald-600 dark:text-traffic-green tabular-nums">
                    {item.progressSeconds > 0
                      ? `Tiếp tục từ ${formatMs(item.progressSeconds * 1000)}`
                      : 'Vừa nghe'}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.section>

      {/* Shared Confirmation Modal for Clear History */}
      <Modal
        open={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        title="Xóa toàn bộ lịch sử Tiếp tục nghe?"
        subtitle="Danh sách bài hát bạn vừa nghe ở trang chủ sẽ được làm trống."
        icon={<Trash2 className="w-5 h-5 text-rose-500" />}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmClearOpen(false)}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white border-rose-600"
              onClick={async () => {
                await clearAll(user?.id);
                setConfirmClearOpen(false);
              }}
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Xóa lịch sử
            </Button>
          </div>
        }
      >
        <p className="text-xs text-body dark:text-neutral-300 leading-relaxed">
          Thao tác này không thể hoàn tác. Bạn vẫn có thể nghe lại các bài hát từ kho nhạc bất cứ lúc nào.
        </p>
      </Modal>
    </>
  );
};
