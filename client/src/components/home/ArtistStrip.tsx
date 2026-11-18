import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { formatFollowers } from '../../utils/format.js';
import { Skeleton } from '../common/Loading.js';

export interface HomeArtistItem {
  id: string;
  name: string;
  bio?: string;
  imageUrl?: string;
  _count?: { songs: number; followers: number };
}

interface ArtistStripProps {
  artists?: HomeArtistItem[];
  isLoading: boolean;
}

const FALLBACK_ARTIST_AVATAR =
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=80';

export const ArtistStrip: React.FC<ArtistStripProps> = ({ artists = [], isLoading }) => {
  const shouldReduceMotion = useReducedMotion();
  const stripRef = useRef<HTMLDivElement>(null);

  const scrollStrip = (dir: -1 | 1) => {
    stripRef.current?.scrollBy({ left: dir * 240, behavior: 'smooth' });
  };

  if (!isLoading && artists.length === 0) {
    return null;
  }

  return (
    <motion.section
      id="sec-artists"
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.28, ease: [0.32, 0.72, 0, 1] }}
      className="space-y-4 scroll-mt-28 rounded-2xl border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card p-4 sm:p-5 shadow-subtle h-full flex flex-col justify-between"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-hairline dark:border-hairline-dark pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="w-5 h-5 text-traffic-green shrink-0" />
            <h2 className="font-display font-bold text-xl text-neutral-900 dark:text-white truncate">
              Nghệ sĩ nổi bật
            </h2>
          </div>

          <Link
            to="/artists"
            className="text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white inline-flex items-center gap-1 group shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green rounded-md px-1"
          >
            <span>Xem tất cả ({artists.length})</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Horizontal Story-Style Avatar Strip (All Breakpoints) + Compact Desktop Controls */}
        {isLoading ? (
          <div className="flex items-center gap-4 overflow-hidden py-2">
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="w-24 shrink-0 flex flex-col items-center gap-2">
                <Skeleton width={80} height={80} circle />
                <Skeleton width="80%" height={12} />
                <Skeleton width="55%" height={10} />
              </div>
            ))}
          </div>
        ) : (
          <div className="relative">
            <div
              ref={stripRef}
              className="flex lg:grid lg:grid-cols-2 gap-3 overflow-x-auto lg:overflow-x-visible snap-x snap-mandatory pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {artists.slice(0, 6).map((artist) => (
                <Link
                  key={artist.id}
                  to={`/artists/${artist.id}`}
                  className="snap-start w-[118px] sm:w-[132px] lg:w-auto shrink-0 group relative flex flex-col items-center p-2.5 rounded-2xl border border-hairline/70 dark:border-hairline-dark/70 bg-surface-soft/45 dark:bg-surface-dark-soft/45 hover:bg-surface-soft dark:hover:bg-surface-dark-soft hover:border-traffic-green/50 transition-all duration-200 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green"
                >
                  <div className="relative w-16 h-16 rounded-full overflow-hidden bg-surface-soft dark:bg-surface-dark-soft mb-2 ring-2 ring-traffic-green/25 group-hover:ring-traffic-green group-hover:scale-105 transition-all duration-300">
                    <img
                      src={artist.imageUrl || FALLBACK_ARTIST_AVATAR}
                      alt={artist.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <h4 className="font-semibold text-xs sm:text-sm truncate w-full text-neutral-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-traffic-green transition-colors">
                    {artist.name}
                  </h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate w-full">
                    {formatFollowers(artist._count?.followers)}
                  </p>
                </Link>
              ))}
            </div>

            {/* Mobile/Tablet Story Scroll Arrows */}
            <div className="flex lg:hidden items-center justify-end gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => scrollStrip(-1)}
                aria-label="Cuộn sang trái nghệ sĩ"
                className="w-7 h-7 rounded-full border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card flex items-center justify-center text-mute hover:text-ink dark:hover:text-white cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => scrollStrip(1)}
                aria-label="Cuộn sang phải nghệ sĩ"
                className="w-7 h-7 rounded-full border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card flex items-center justify-center text-mute hover:text-ink dark:hover:text-white cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Quick Link */}
      {!isLoading && artists.length > 6 && (
        <div className="pt-3 border-t border-hairline/60 dark:border-hairline-dark/60 flex items-center justify-between text-xs text-mute">
          <span>Khám phá thêm {artists.length - 6} nghệ sĩ khác</span>
          <Link
            to="/artists"
            className="font-semibold text-traffic-green hover:underline inline-flex items-center gap-1"
          >
            <span>Mở danh sách</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </motion.section>
  );
};
