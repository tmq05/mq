import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { Play, Pause, Music, Headphones, Sparkles, Clock } from 'lucide-react';
import { Button } from '../common/Button.js';
import { SourceBadge } from '../common/Badge.js';
import { Skeleton } from '../common/Loading.js';
import { UnifiedTrack } from '../../types/index.js';
import {
  cleanDisplayTitle,
  formatArtists,
  formatMs,
  formatPlays,
  getTrackPlayCount,
} from '../../utils/format.js';

interface HeroSpotlightProps {
  featuredTrack?: UnifiedTrack;
  isLoading: boolean;
  isPlayingCurrentTrack: boolean;
  onPlayAllTrending: () => void;
  onPlaySpotlight: (track: UnifiedTrack) => void;
}

const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80';

export const HeroSpotlight: React.FC<HeroSpotlightProps> = ({
  featuredTrack,
  isLoading,
  isPlayingCurrentTrack,
  onPlayAllTrending,
  onPlaySpotlight,
}) => {
  const shouldReduceMotion = useReducedMotion();

  const coverUrl = featuredTrack?.coverUrl || FALLBACK_COVER;
  const title = featuredTrack ? cleanDisplayTitle(featuredTrack.title) : '';
  const artistText = featuredTrack ? formatArtists(featuredTrack.artists) : '';
  const playCount = featuredTrack ? getTrackPlayCount(featuredTrack) : 0;

  return (
    <motion.section
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.32, ease: [0.32, 0.72, 0, 1] }}
      className="relative overflow-hidden rounded-3xl border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card p-6 sm:p-8 lg:p-9 shadow-subtle"
    >
      {/* Ambient Blurred Background & Subtle Emerald Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-traffic-green/10 blur-3xl"
      />
      {featuredTrack && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden opacity-20 dark:opacity-30"
        >
          <img
            src={coverUrl}
            alt=""
            className="w-full h-full object-cover scale-125 blur-3xl saturate-150"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-canvas via-canvas/90 to-canvas/60 dark:from-surface-dark-card dark:via-surface-dark-card/90 dark:to-surface-dark-card/55" />
        </div>
      )}

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
        {/* Left Column: Value Proposition & CTAs */}
        <div className="lg:col-span-7 space-y-4 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-soft/90 dark:bg-neutral-800/80 border border-hairline dark:border-neutral-700/60 shadow-xs text-xs font-sans font-medium text-neutral-700 dark:text-neutral-300">
            <span className="w-2 h-2 rounded-full bg-traffic-green animate-pulse" />
            <Music className="w-3.5 h-3.5 text-traffic-green" />
            <span>Âm nhạc đa nguồn · Trải nghiệm liền mạch</span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl xl:text-[2.5rem] font-extrabold tracking-tight text-ink dark:text-white leading-[1.15]">
            Âm thanh thuần khiết,{' '}
            <span className="text-emerald-600 dark:text-traffic-green">trải nghiệm tối giản.</span>
          </h1>

          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
            Tìm kiếm và phát trực tuyến hàng triệu ca khúc từ Spotify, Zing MP3, YouTube và kho
            nghệ sĩ Việt Nam — không quảng cáo ngắt quãng, đồng bộ lời bài hát theo thời gian thực.
          </p>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1">
            <Button
              size="lg"
              onClick={onPlayAllTrending}
              disabled={isLoading || !featuredTrack}
              icon={<Play className="w-4 h-4 fill-current ml-0.5" />}
            >
              Nghe ngay danh sách hot
            </Button>
            <Link to="/search">
              <Button variant="secondary" size="lg">
                Khám phá kho nhạc
              </Button>
            </Link>
          </div>
        </div>

        {/* Right Column: Featured Spotlight Player Card */}
        <div className="lg:col-span-5">
          {isLoading ? (
            <div className="p-5 rounded-2xl border border-hairline dark:border-hairline-dark bg-surface-soft/75 dark:bg-surface-dark-soft/75 backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton width={130} height={22} radius="9999px" />
                <Skeleton width={70} height={20} radius="9999px" />
              </div>
              <div className="flex items-center gap-4">
                <Skeleton width={96} height={96} radius="14px" className="shrink-0" />
                <div className="flex-1 space-y-2.5">
                  <Skeleton width="85%" height={20} />
                  <Skeleton width="60%" height={15} />
                  <Skeleton width="50%" height={14} />
                </div>
              </div>
            </div>
          ) : featuredTrack ? (
            <div
              onClick={() => onPlaySpotlight(featuredTrack)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onPlaySpotlight(featuredTrack);
                }
              }}
              aria-label={`Phát bài hát nổi bật ${title} của ${artistText}`}
              className="group relative p-5 rounded-2xl border border-hairline dark:border-white/12 bg-white/85 dark:bg-neutral-900/75 backdrop-blur-xl shadow-md hover:shadow-xl hover:border-traffic-green/60 transition-all duration-300 cursor-pointer space-y-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green"
            >
              {/* Card Top Header: Badge + Source */}
              <div className="flex items-center justify-between gap-2 border-b border-hairline/70 dark:border-white/10 pb-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill bg-traffic-green/15 text-emerald-700 dark:text-traffic-green text-[11px] font-semibold">
                  <Sparkles className="w-3 h-3" />
                  <span>Tiêu điểm thịnh hành</span>
                </div>
                <SourceBadge
                  isFullLength={featuredTrack.isFullLength}
                  source={featuredTrack.source}
                />
              </div>

              {/* Card Body: Cover + Metadata + Play CTA */}
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-surface-soft dark:bg-surface-dark-soft shrink-0 shadow-md border border-black/5 dark:border-white/10">
                  <img
                    src={coverUrl}
                    alt={`Ảnh bìa ${title}`}
                    width={112}
                    height={112}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <h2
                    title={featuredTrack.title}
                    className="font-display font-extrabold text-lg sm:text-xl text-ink dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-traffic-green transition-colors"
                  >
                    {title}
                  </h2>

                  <p className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-300 truncate">
                    {artistText}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-mute tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <Headphones className="w-3 h-3" />
                      <span>{formatPlays(playCount)} lượt nghe</span>
                    </span>
                    {featuredTrack.durationMs > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatMs(featuredTrack.durationMs)}</span>
                      </span>
                    )}
                  </div>
                </div>

                <span
                  aria-hidden="true"
                  className="w-11 h-11 rounded-full bg-traffic-green text-black flex items-center justify-center shadow-lg shrink-0 group-hover:scale-105 active:scale-95 transition-transform"
                >
                  {isPlayingCurrentTrack ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </motion.section>
  );
};
