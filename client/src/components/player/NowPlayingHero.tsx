import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Plus,
  Mic2,
  Tv,
  ListMusic,
  Headphones,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { usePlayerStore } from '../../stores/player-store.js';
import { useAuthStore } from '../../stores/auth-store.js';
import { useAuthModalStore } from '../../stores/auth-modal-store.js';
import { usePlaylistModalStore } from '../../stores/playlist-modal-store.js';
import { useLikesStore } from '../../stores/likes-store.js';
import { useLyricPrefStore } from '../../stores/lyric-pref-store.js';
import { LiveLyricLine } from './LiveLyricLine.js';
import {
  formatDuration,
  formatArtists,
  formatPlays,
  getTrackPlayCount,
  cleanDisplayTitle,
} from '../../utils/format.js';
import { SourceBadge } from '../common/Badge.js';
import {
  AnimatedHeartIcon,
  RepeatControlButton,
  ShuffleControlButton,
} from '../common/ActionButtonFX.js';
import { NOW_PLAYING_CONFIG } from './now-playing.config.js';
import './now-playing.css';

/** Trích màu chủ đạo rực rỡ từ ảnh bìa (fallback về xanh lá traffic-green nếu bị CORS) */
function extractDominantRgb(url: string | undefined, callback: (rgb: string) => void) {
  if (!url) {
    callback(NOW_PLAYING_CONFIG.defaultAccentRgb);
    return;
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        callback(NOW_PLAYING_CONFIG.defaultAccentRgb);
        return;
      }
      ctx.drawImage(img, 0, 0, 16, 16);
      const data = ctx.getImageData(0, 0, 16, 16).data;
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let count = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        // Ưu tiên điểm ảnh có độ bão hòa màu tốt, tránh đen/trắng thuần
        if (max - min > 25 && max > 45 && min < 220) {
          rSum += r;
          gSum += g;
          bSum += b;
          count++;
        }
      }

      if (count > 0) {
        callback(
          `${Math.round(rSum / count)}, ${Math.round(gSum / count)}, ${Math.round(bSum / count)}`
        );
      } else {
        callback(NOW_PLAYING_CONFIG.defaultAccentRgb);
      }
    } catch {
      callback(NOW_PLAYING_CONFIG.defaultAccentRgb);
    }
  };
  img.onerror = () => callback(NOW_PLAYING_CONFIG.defaultAccentRgb);
  img.src = url;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export const NowPlayingHero: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    repeatMode,
    isShuffle,
    isLyricsOpen,
    isQueueOpen,
    miniVideoOpen,
    autoScrollToNowPlaying,
    focusNowPlayingNonce,
    togglePlay,
    next,
    previous,
    seekTo,
    setRepeatMode,
    toggleShuffle,
    toggleLyrics,
    toggleQueue,
    setMiniVideoOpen,
  } = usePlayerStore();

  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const { openAuthModal } = useAuthModalStore();
  const { openModal: openPlaylistModal } = usePlaylistModalStore();
  const shouldReduceMotion = useReducedMotion();

  const isLiked = useLikesStore((s) => s.isTrackLiked(currentTrack));
  const isLiking = useLikesStore((s) => s.isTrackPending(currentTrack));
  const toggleLike = useLikesStore((s) => s.toggleLike);
  const showInlineLyric = useLyricPrefStore((s) => s.showInlineLyric);
  const toggleInlineLyric = useLyricPrefStore((s) => s.toggleInlineLyric);
  const [accentRgb, setAccentRgb] = useState<string>(NOW_PLAYING_CONFIG.defaultAccentRgb);
  const [isGlowing, setIsGlowing] = useState(false);
  const [isResettingProgress, setIsResettingProgress] = useState(false);

  const sectionRef = useRef<HTMLElement | null>(null);
  const isVisibleRef = useRef<boolean>(false);
  const lastUserScrollRef = useRef<number>(0);
  const scrollRafRef = useRef<number | null>(null);
  const glowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingScrollRef = useRef<{ force: boolean } | null>(null);
  const lastTrackIdRef = useRef<string | null>(null);
  const lastNonceRef = useRef<number>(focusNowPlayingNonce);

  // Kích hoạt nháy sáng viền + glow xanh lá 800ms
  const triggerGlow = useCallback(() => {
    if (glowTimerRef.current) clearTimeout(glowTimerRef.current);
    setIsGlowing(false);
    requestAnimationFrame(() => {
      setIsGlowing(true);
      glowTimerRef.current = setTimeout(() => {
        setIsGlowing(false);
      }, NOW_PLAYING_CONFIG.glowDurationMs);
    });
  }, []);

  // Hủy smooth scroll đang chạy
  const cancelSmoothScroll = useCallback(() => {
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
  }, []);

  // Theo dõi người dùng tự cuộn tay để hủy auto-scroll trong vòng 1 giây
  useEffect(() => {
    const markUserScroll = () => {
      lastUserScrollRef.current = Date.now();
      cancelSmoothScroll();
    };
    const onKeyScroll = (e: KeyboardEvent) => {
      if (['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          lastUserScrollRef.current = Date.now();
          cancelSmoothScroll();
        }
      }
    };

    window.addEventListener('wheel', markUserScroll, { passive: true });
    window.addEventListener('touchmove', markUserScroll, { passive: true });
    window.addEventListener('keydown', onKeyScroll);
    return () => {
      window.removeEventListener('wheel', markUserScroll);
      window.removeEventListener('touchmove', markUserScroll);
      window.removeEventListener('keydown', onKeyScroll);
      cancelSmoothScroll();
    };
  }, [cancelSmoothScroll]);

  // IntersectionObserver kiểm tra khung đã nằm gọn trong màn hình chưa
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          isVisibleRef.current = entry.intersectionRatio >= 0.85;
        }
      },
      { threshold: [0, 0.5, 0.85, 1] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [currentTrack !== null]);

  // Hàm thực hiện cuộn mượt (650ms ease-in-out) chừa khoảng trống dưới header
  const performAutoScroll = useCallback(
    (force: boolean) => {
      const el = sectionRef.current;
      if (!el) return;

      if (!force) {
        if (!autoScrollToNowPlaying) return;
        if (Date.now() - lastUserScrollRef.current < NOW_PLAYING_CONFIG.userScrollCancelWindowMs) {
          return;
        }
      }

      const headerEl = document.querySelector('header');
      const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 56;
      const offsetTop = headerHeight + NOW_PLAYING_CONFIG.scrollExtraOffsetPx;
      const rect = el.getBoundingClientRect();

      const alreadyInView =
        isVisibleRef.current &&
        rect.top >= headerHeight + 4 &&
        rect.bottom <= window.innerHeight - 12;

      if (alreadyInView) {
        if (force) triggerGlow();
        return;
      }

      const targetY = Math.max(0, window.scrollY + rect.top - offsetTop);
      const startY = window.scrollY;
      const distance = targetY - startY;

      if (Math.abs(distance) < 8) {
        triggerGlow();
        return;
      }

      if (shouldReduceMotion) {
        window.scrollTo({ top: targetY, behavior: 'auto' });
        triggerGlow();
        return;
      }

      cancelSmoothScroll();
      const startTime = performance.now();
      const duration = NOW_PLAYING_CONFIG.scrollDurationMs;

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const eased = easeInOutCubic(progress);
        window.scrollTo(0, startY + distance * eased);

        if (progress < 1) {
          scrollRafRef.current = requestAnimationFrame(step);
        } else {
          scrollRafRef.current = null;
          triggerGlow();
        }
      };

      scrollRafRef.current = requestAnimationFrame(step);
    },
    [autoScrollToNowPlaying, cancelSmoothScroll, shouldReduceMotion, triggerGlow]
  );

  // Phát hiện đổi bài hát hoặc bấm từ PlayerBar
  useEffect(() => {
    if (!currentTrack) {
      lastTrackIdRef.current = null;
      return;
    }

    const isFirstMount = lastTrackIdRef.current === null;
    const trackChanged = lastTrackIdRef.current !== currentTrack.id;
    const nonceChanged = lastNonceRef.current !== focusNowPlayingNonce;

    if (trackChanged) {
      lastTrackIdRef.current = currentTrack.id;
      extractDominantRgb(currentTrack.coverUrl, setAccentRgb);

      // Reset thanh tiến trình mượt khi đổi bài
      if (!isFirstMount) {
        setIsResettingProgress(true);
        const t = setTimeout(() => setIsResettingProgress(false), 320);
        pendingScrollRef.current = { force: false };
        requestAnimationFrame(() => {
          if (pendingScrollRef.current) {
            const p = pendingScrollRef.current;
            pendingScrollRef.current = null;
            performAutoScroll(p.force);
          }
        });
        return () => clearTimeout(t);
      } else {
        // Lần đầu mở: đánh dấu chờ onAnimationComplete của chiều cao rồi cuộn
        pendingScrollRef.current = { force: nonceChanged };
      }
    }

    if (nonceChanged) {
      lastNonceRef.current = focusNowPlayingNonce;
      if (!isFirstMount) {
        requestAnimationFrame(() => performAutoScroll(true));
      } else {
        pendingScrollRef.current = { force: true };
      }
    }
  }, [currentTrack, focusNowPlayingNonce, performAutoScroll]);

  const handleToggleLike = async () => {
    if (!currentTrack) return;
    if (!isAuthenticated) {
      openAuthModal({
        title: 'Lưu bài hát yêu thích',
        message: `Đăng nhập để lưu "${cleanDisplayTitle(currentTrack.title)}" vào danh sách bài hát yêu thích của bạn.`,
        iconType: 'heart',
      });
      return;
    }
    if (isLiking) return;
    await toggleLike(currentTrack);
    queryClient.invalidateQueries({ queryKey: ['user-likes'] });
    queryClient.invalidateQueries({ queryKey: ['user-stats'] });
  };

  const handleRepeatClick = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  const staggerTransition = (order: number) =>
    shouldReduceMotion
      ? { duration: 0.12 }
      : {
          duration: NOW_PLAYING_CONFIG.durationItemMs / 1000,
          ease: NOW_PLAYING_CONFIG.easing,
          delay: (order * NOW_PLAYING_CONFIG.staggerDelayMs) / 1000,
        };

  return (
    <AnimatePresence initial={false}>
      {currentTrack && (
        <motion.div
          key="now-playing-container"
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: 'auto',
            opacity: 1,
            transition: shouldReduceMotion
              ? { duration: 0.15 }
              : {
                  height: {
                    duration: NOW_PLAYING_CONFIG.durationOpenMs / 1000,
                    ease: NOW_PLAYING_CONFIG.easing,
                  },
                  opacity: { duration: 0.28, ease: 'easeOut' },
                },
          }}
          exit={{
            height: 0,
            opacity: 0,
            transition: shouldReduceMotion
              ? { duration: 0.12 }
              : {
                  height: { duration: 0.35, ease: NOW_PLAYING_CONFIG.easing },
                  opacity: { duration: 0.2 },
                },
          }}
          onAnimationComplete={() => {
            if (pendingScrollRef.current) {
              const p = pendingScrollRef.current;
              pendingScrollRef.current = null;
              performAutoScroll(p.force);
            }
          }}
          className="overflow-hidden"
        >
          {(() => {
            const playCount = getTrackPlayCount(currentTrack);
            const displayTitle = cleanDisplayTitle(currentTrack.title);
            const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

            return (
              <motion.section
                ref={sectionRef}
                aria-live="polite"
                aria-label={`Đang phát: ${displayTitle} - ${formatArtists(currentTrack.artists)}`}
                initial={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: 24, scale: 0.97 }
                }
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: shouldReduceMotion
                    ? { duration: 0.15 }
                    : {
                        duration: NOW_PLAYING_CONFIG.durationOpenMs / 1000,
                        ease: NOW_PLAYING_CONFIG.easing,
                      },
                }}
                style={{ '--np-accent-rgb': accentRgb } as React.CSSProperties}
                className={`np-hero relative overflow-hidden border border-hairline dark:border-hairline-dark bg-gradient-to-b from-surface-soft/80 to-surface-soft/20 dark:from-surface-dark-card/90 dark:to-surface-dark-card/30 backdrop-blur-md p-6 sm:p-8 shadow-sm transition-colors duration-500 ${
                  isGlowing ? 'np-hero--glowing' : ''
                }`}
              >
                {/* Background Accent Gradient (lan dần & đổi theo màu ảnh bìa) */}
                <div
                  className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-700"
                  style={{
                    background: `radial-gradient(circle, rgba(${accentRgb}, 0.22) 0%, rgba(${accentRgb}, 0.04) 65%, transparent 100%)`,
                  }}
                />

                {/* Top Header Label + Badges (Stagger 5) */}
                <motion.div
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0, transition: staggerTransition(5) }}
                  className="flex items-center justify-between pb-5 border-b border-hairline dark:border-hairline-dark mb-6 relative z-10"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2.5 w-2.5">
                      {isPlaying && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-traffic-green opacity-75" />
                      )}
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-traffic-green" />
                    </span>
                    <span className="font-display font-bold text-sm tracking-wide uppercase text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                      {/* Icon sóng âm chuyển động theo nhạc */}
                      <span className="inline-flex items-end gap-[2px] h-3.5 w-4" aria-hidden="true">
                        <span
                          className={`w-[2.5px] h-full rounded-full bg-traffic-green ${
                            isPlaying ? 'np-wave-bar' : 'scale-y-50'
                          }`}
                        />
                        <span
                          className={`w-[2.5px] h-full rounded-full bg-traffic-green ${
                            isPlaying ? 'np-wave-bar np-wave-bar--2' : 'scale-y-75'
                          }`}
                        />
                        <span
                          className={`w-[2.5px] h-full rounded-full bg-traffic-green ${
                            isPlaying ? 'np-wave-bar np-wave-bar--3' : 'scale-y-40'
                          }`}
                        />
                        <span
                          className={`w-[2.5px] h-full rounded-full bg-traffic-green ${
                            isPlaying ? 'np-wave-bar np-wave-bar--4' : 'scale-y-60'
                          }`}
                        />
                      </span>
                      Đang phát
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <SourceBadge isFullLength={currentTrack.isFullLength} source={currentTrack.source} />
                    <span className="hidden sm:inline-flex items-center gap-1 text-xs font-sans font-medium tabular-nums text-neutral-500 dark:text-neutral-400">
                      <Headphones className="w-3.5 h-3.5 opacity-60" />
                      {formatPlays(playCount)} lượt nghe
                    </span>
                  </div>
                </motion.div>

                {/* Main Track Row */}
                <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 relative z-10">
                  {/* 1. Cover Art (Stagger 0, scale 0.9 -> 1 + cross-fade khi đổi bài) */}
                  <motion.div
                    initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1, transition: staggerTransition(0) }}
                    className="relative group shrink-0 will-change-transform"
                  >
                    <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden shadow-xl border border-hairline dark:border-hairline-dark bg-surface-soft dark:bg-surface-dark-soft">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.img
                          key={currentTrack.id}
                          src={
                            currentTrack.coverUrl ||
                            'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80'
                          }
                          alt={displayTitle}
                          initial={{ opacity: 0 }}
                          animate={{
                            opacity: 1,
                            transition: {
                              duration: shouldReduceMotion
                                ? 0.1
                                : NOW_PLAYING_CONFIG.durationCoverCrossfadeMs / 1000,
                              ease: 'easeOut',
                            },
                          }}
                          exit={{
                            opacity: 0,
                            transition: {
                              duration: shouldReduceMotion
                                ? 0.1
                                : NOW_PLAYING_CONFIG.durationCoverCrossfadeMs / 1000,
                              ease: 'easeIn',
                            },
                          }}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </AnimatePresence>
                    </div>

                    {/* Equalizer animation badge on artwork */}
                    {isPlaying && (
                      <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2 py-1 rounded-md flex items-end gap-0.5 h-4 z-10">
                        <span className="w-1 h-full bg-traffic-green rounded-full np-wave-bar" />
                        <span className="w-1 h-full bg-traffic-green rounded-full np-wave-bar np-wave-bar--2" />
                        <span className="w-1 h-full bg-traffic-green rounded-full np-wave-bar np-wave-bar--3" />
                      </div>
                    )}
                  </motion.div>

                  {/* Track Info & Controls */}
                  <div className="flex-1 min-w-0 w-full space-y-4">
                    {/* 2 & 3. Tên bài hát + Nghệ sĩ (trượt dọc mượt khi chuyển bài) */}
                    <div className="overflow-hidden">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={currentTrack.id}
                          initial={
                            shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }
                          }
                          animate={{
                            opacity: 1,
                            y: 0,
                            transition: shouldReduceMotion
                              ? { duration: 0.1 }
                              : {
                                  duration: NOW_PLAYING_CONFIG.durationTextSwapMs / 1000,
                                  ease: NOW_PLAYING_CONFIG.easing,
                                },
                          }}
                          exit={
                            shouldReduceMotion
                              ? { opacity: 0 }
                              : {
                                  opacity: 0,
                                  y: -10,
                                  transition: {
                                    duration: 0.15,
                                    ease: NOW_PLAYING_CONFIG.easing,
                                  },
                                }
                          }
                          className="text-center md:text-left"
                        >
                          <motion.h2
                            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0, transition: staggerTransition(1) }}
                            className="font-display font-extrabold text-2xl sm:text-3xl text-neutral-900 dark:text-white truncate"
                          >
                            {displayTitle}
                          </motion.h2>
                          <motion.p
                            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0, transition: staggerTransition(2) }}
                            className="text-sm sm:text-base font-medium text-neutral-600 dark:text-neutral-300 truncate mt-1"
                          >
                            {formatArtists(currentTrack.artists)}
                            {currentTrack.album && currentTrack.album !== '—' && (
                              <span className="text-neutral-400 dark:text-neutral-500 font-normal">
                                {' '}
                                · {currentTrack.album}
                              </span>
                            )}
                          </motion.p>
                        </motion.div>
                      </AnimatePresence>
                      <LiveLyricLine />
                    </div>

                    {/* 4. Thanh tiến trình (Stagger 3) */}
                    <motion.div
                      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0, transition: staggerTransition(3) }}
                      className="space-y-1.5"
                    >
                      <div className="relative flex items-center h-4 cursor-pointer group">
                        <input
                          type="range"
                          min="0"
                          max={duration || 100}
                          step="0.1"
                          value={currentTime}
                          onChange={(e) => seekTo(parseFloat(e.target.value))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          aria-label="Tua bài hát"
                        />
                        <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-traffic-green rounded-full"
                            style={{
                              width: `${progressPercent}%`,
                              transition: isResettingProgress
                                ? 'width 300ms cubic-bezier(0.32, 0.72, 0, 1)'
                                : 'width 75ms linear',
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs font-sans font-medium tabular-nums text-neutral-500 dark:text-neutral-400">
                        <span>{formatDuration(currentTime)}</span>
                        <span>{formatDuration(duration)}</span>
                      </div>
                    </motion.div>

                    {/* 5 & 6. Controls Bar (Stagger 4) & Quick Actions (Stagger 5) */}
                    <div className="flex flex-wrap items-center justify-center md:justify-between gap-4 pt-1">
                      {/* Playback Controls */}
                      <motion.div
                        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0, transition: staggerTransition(4) }}
                        className="flex items-center gap-3"
                      >
                        <ShuffleControlButton active={isShuffle} onClick={toggleShuffle} size="md" />

                        <button
                          onClick={previous}
                          className="p-2 text-neutral-800 dark:text-white hover:opacity-80 active:scale-95 transition-transform"
                          title="Bài trước"
                        >
                          <SkipBack className="w-5 h-5 fill-current" />
                        </button>

                        <button
                          onClick={togglePlay}
                          className="w-12 h-12 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-black flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                          title="Phát/Tạm dừng"
                        >
                          {isPlaying ? (
                            <Pause className="w-6 h-6 fill-current" />
                          ) : (
                            <Play className="w-6 h-6 fill-current ml-0.5" />
                          )}
                        </button>

                        <button
                          onClick={next}
                          className="p-2 text-neutral-800 dark:text-white hover:opacity-80 active:scale-95 transition-transform"
                          title="Bài tiếp theo"
                        >
                          <SkipForward className="w-5 h-5 fill-current" />
                        </button>

                        <RepeatControlButton mode={repeatMode} onClick={handleRepeatClick} size="md" />
                      </motion.div>

                      {/* Quick Action Buttons */}
                      <motion.div
                        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0, transition: staggerTransition(5) }}
                        className="flex flex-wrap items-center justify-center gap-2"
                      >
                        <button
                          onClick={handleToggleLike}
                          disabled={isLiking}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pill border text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                            isLiked
                              ? 'border-red-500/30 bg-red-500/10 text-red-500'
                              : 'border-hairline dark:border-hairline-dark bg-surface-soft dark:bg-surface-dark-soft text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white'
                          }`}
                          title={isLiked ? 'Bỏ thích' : 'Yêu thích bài hát'}
                        >
                          <AnimatedHeartIcon liked={isLiked} className="w-3.5 h-3.5" />
                          <span>{isLiked ? 'Đã thích' : 'Yêu thích'}</span>
                        </button>

                        <button
                          onClick={() => openPlaylistModal(currentTrack)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill border border-hairline dark:border-hairline-dark bg-surface-soft dark:bg-surface-dark-soft hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-all active:scale-95"
                          title="Thêm vào danh sách phát"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm vào playlist</span>
                        </button>

                        <button
                          onClick={toggleLyrics}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pill border text-xs font-semibold transition-all active:scale-95 ${
                            isLyricsOpen
                              ? 'border-traffic-green/30 bg-traffic-green/10 text-traffic-green'
                              : 'border-hairline dark:border-hairline-dark bg-surface-soft dark:bg-surface-dark-soft text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white'
                          }`}
                          title="Mở lời bài hát đồng bộ"
                        >
                          <Mic2 className="w-3.5 h-3.5" />
                          <span>Lời bài hát</span>
                        </button>

                        <button
                          type="button"
                          onClick={toggleInlineLyric}
                          aria-pressed={showInlineLyric}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-pill border text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                            showInlineLyric
                              ? 'border-traffic-green/35 bg-traffic-green/10 text-traffic-green'
                              : 'border-hairline dark:border-hairline-dark bg-surface-soft dark:bg-surface-dark-soft text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                          }`}
                          title={showInlineLyric ? 'Ẩn lyric 1 dòng' : 'Hiện lyric 1 dòng'}
                          aria-label={showInlineLyric ? 'Ẩn lyric 1 dòng' : 'Hiện lyric 1 dòng'}
                        >
                          <span className="font-mono text-[11px] leading-none">Aa</span>
                          <span className="hidden sm:inline">Hiện lyric</span>
                        </button>

                        {(currentTrack.playbackType === 'youtube' ||
                          currentTrack.source === 'youtube' ||
                          Boolean(currentTrack.embedId)) && (
                          <button
                            onClick={() => setMiniVideoOpen(!miniVideoOpen)}
                            className={`p-2 rounded-pill border transition-all ${
                              miniVideoOpen
                                ? 'border-neutral-400 bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white'
                                : 'border-hairline dark:border-hairline-dark bg-surface-soft dark:bg-surface-dark-soft text-neutral-500 hover:text-black dark:hover:text-white'
                            }`}
                            title="Bật/Tắt video"
                          >
                            <Tv className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={toggleQueue}
                          className={`p-2 rounded-pill border transition-all ${
                            isQueueOpen
                              ? 'border-neutral-400 bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white'
                              : 'border-hairline dark:border-hairline-dark bg-surface-soft dark:bg-surface-dark-soft text-neutral-500 hover:text-black dark:hover:text-white'
                          }`}
                          title="Hàng đợi"
                        >
                          <ListMusic className="w-4 h-4" />
                        </button>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.section>
            );
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
