import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Heart,
  Pause,
  Play,
  RefreshCw,
  Users,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { UnifiedTrack } from '../../types/index.js';
import { useAuthStore } from '../../stores/auth-store.js';
import { usePlayerStore } from '../../stores/player-store.js';
import { useListeningHistoryStore } from '../../stores/listening-history-store.js';
import { getSaveListeningHistorySetting } from '../../utils/privacy-preferences.js';
import { cleanDisplayTitle, formatArtists, formatFollowers } from '../../utils/format.js';
import { SegmentedTabs, SegmentedTabContent, useTabDirection } from '../layout/SegmentedTabs.js';
import { Skeleton } from '../common/Loading.js';

const DISMISSED_STORAGE_KEY = 'mq_dismissed_recommendations_v1';

const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80';
const FALLBACK_ARTIST =
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=80';

interface RecommendedTrackItem {
  track: UnifiedTrack;
  reason: string;
  isDiscovery?: boolean;
}

interface RecommendedArtistItem {
  id: string;
  name: string;
  imageUrl?: string | null;
  followersCount: number;
  reason: string;
}

interface ForYouResponse {
  isColdStart: boolean;
  forYouTracks: RecommendedTrackItem[];
  becauseYouListened: {
    artistName: string | null;
    tracks: RecommendedTrackItem[];
  };
  recommendedArtists: RecommendedArtistItem[];
}

function readDismissed(): { trackIds: string[]; artists: string[] } {
  if (typeof window === 'undefined') return { trackIds: [], artists: [] };
  try {
    const raw = window.localStorage.getItem(DISMISSED_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      trackIds: Array.isArray(parsed?.trackIds) ? parsed.trackIds : [],
      artists: Array.isArray(parsed?.artists) ? parsed.artists : [],
    };
  } catch {
    return { trackIds: [], artists: [] };
  }
}

export const ForYouSection: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const { user, isAuthenticated } = useAuthStore();
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const guestHistoryItems = useListeningHistoryStore((s) => s.items);

  const [dismissed, setDismissed] = useState<{ trackIds: string[]; artists: string[] }>(readDismissed);
  const [activeGroup, setActiveGroup] = useState<'tracks' | 'because' | 'artists'>('tracks');
  const stripRef = useRef<HTMLDivElement>(null);

  const useHistory = getSaveListeningHistorySetting(user?.id);

  const guestSummary = useMemo(() => {
    if (isAuthenticated || !useHistory) return { artists: [], trackIds: [] };
    const artists: string[] = [];
    const trackIds: string[] = [];
    for (const item of guestHistoryItems.slice(0, 20)) {
      trackIds.push(item.track.id);
      for (const a of item.track.artists || []) {
        if (a && !artists.includes(a)) artists.push(a);
      }
    }
    return { artists: artists.slice(0, 8), trackIds: trackIds.slice(0, 15) };
  }, [isAuthenticated, useHistory, guestHistoryItems]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<ForYouResponse>({
    queryKey: [
      'recommendations-for-you',
      user?.id || 'guest',
      useHistory,
      guestSummary.artists.join(','),
    ],
    queryFn: async () => {
      const res = await api.get('/recommendations/for-you', {
        params: {
          useHistory: String(useHistory),
          guestArtists: guestSummary.artists.join(','),
          guestRecentTrackIds: guestSummary.trackIds.join(','),
          dismissedTrackIds: dismissed.trackIds.join(','),
          dismissedArtists: dismissed.artists.join(','),
        },
      });
      return res.data as ForYouResponse;
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const visibleForYou = useMemo(
    () =>
      (data?.forYouTracks || []).filter(
        (item) => !dismissed.trackIds.includes(item.track.id)
      ),
    [data?.forYouTracks, dismissed.trackIds]
  );

  const visibleBecause = useMemo(
    () =>
      (data?.becauseYouListened?.tracks || []).filter(
        (item) => !dismissed.trackIds.includes(item.track.id)
      ),
    [data?.becauseYouListened?.tracks, dismissed.trackIds]
  );

  const visibleArtists = useMemo(
    () =>
      (data?.recommendedArtists || []).filter(
        (a) => !dismissed.artists.includes(a.name.toLowerCase())
      ),
    [data?.recommendedArtists, dismissed.artists]
  );

  const groupTabs = useMemo(() => {
    const tabs: Array<{ id: string; label: string }> = [
      { id: 'tracks', label: 'Bài hát dành cho bạn' },
    ];
    if (data?.becauseYouListened?.artistName && visibleBecause.length > 0) {
      tabs.push({
        id: 'because',
        label: `Vì bạn đã nghe ${data.becauseYouListened.artistName}`,
      });
    }
    if (visibleArtists.length > 0) {
      tabs.push({ id: 'artists', label: 'Nghệ sĩ có thể bạn thích' });
    }
    return tabs;
  }, [data?.becauseYouListened?.artistName, visibleBecause.length, visibleArtists.length]);

  const tabDirection = useTabDirection(groupTabs, activeGroup);

  const handleDismissTrack = (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation();
    const next = {
      ...dismissed,
      trackIds: Array.from(new Set([trackId, ...dismissed.trackIds])).slice(0, 60),
    };
    setDismissed(next);
    try {
      window.localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleDismissArtist = (e: React.MouseEvent, artistName: string) => {
    e.preventDefault();
    e.stopPropagation();
    const lower = artistName.toLowerCase();
    const next = {
      ...dismissed,
      artists: Array.from(new Set([lower, ...dismissed.artists])).slice(0, 40),
    };
    setDismissed(next);
    try {
      window.localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const scrollStrip = (dir: -1 | 1) => {
    const el = stripRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, Math.round(el.clientWidth * 0.65)), behavior: 'smooth' });
  };

  const renderTrackCarousel = (items: RecommendedTrackItem[]) => {
    const queue = items.map((i) => i.track);
    if (items.length === 0) {
      return (
        <div className="py-10 text-center text-xs text-mute">
          Chưa có gợi ý phù hợp lúc này. Hãy nghe thêm vài bài hát để hệ thống hiểu gu của bạn!
        </div>
      );
    }

    return (
      <div
        ref={stripRef}
        className="flex items-stretch gap-3.5 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const track = item.track;
            const displayTitle = cleanDisplayTitle(track.title);
            const isCurrent = currentTrack?.id === track.id;

            return (
              <motion.div
                key={track.id}
                layout={!shouldReduceMotion}
                exit={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 0.9, transition: { duration: 0.16 } }
                }
                onClick={() => {
                  if (isCurrent) togglePlay();
                  else playTrack(track, queue);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (isCurrent) togglePlay();
                    else playTrack(track, queue);
                  }
                }}
                className={`snap-start w-[172px] sm:w-[192px] shrink-0 group relative flex flex-col p-2.5 rounded-2xl border transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green ${
                  isCurrent
                    ? 'border-traffic-green/70 bg-traffic-green/6 shadow-sm'
                    : 'border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card hover:bg-surface-soft dark:hover:bg-surface-dark-soft hover:border-hairline-strong dark:hover:border-white/20'
                }`}
              >
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-surface-soft dark:bg-surface-dark-soft mb-2.5">
                  <img
                    src={track.coverUrl || FALLBACK_COVER}
                    alt={displayTitle}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Dismiss ("Không quan tâm") button */}
                  <button
                    type="button"
                    onClick={(e) => handleDismissTrack(e, track.id)}
                    title="Không quan tâm"
                    aria-label={`Ẩn bài ${displayTitle} khỏi gợi ý`}
                    className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full bg-black/65 backdrop-blur-sm text-white/90 hover:text-white hover:bg-rose-600 flex items-center justify-center opacity-85 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer"
                  >
                    <EyeOff className="w-3 h-3" />
                  </button>

                  {/* Play / Pause Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isCurrent) togglePlay();
                      else playTrack(track, queue);
                    }}
                    aria-label={isCurrent && isPlaying ? `Tạm dừng ${displayTitle}` : `Phát ${displayTitle}`}
                    className={`absolute bottom-2 right-2 z-10 w-9 h-9 rounded-full bg-white text-black shadow-lg flex items-center justify-center transition-all duration-200 ${
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
                </div>

                <h4
                  title={track.title}
                  className="font-semibold text-xs sm:text-sm text-ink dark:text-white truncate"
                >
                  {displayTitle}
                </h4>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-300 truncate mb-1.5">
                  {formatArtists(track.artists)}
                </p>

                <span
                  title={item.reason}
                  className={`mt-auto inline-block px-2 py-0.5 rounded-pill text-[10px] font-medium truncate max-w-full ${
                    item.isDiscovery
                      ? 'bg-sky-500/12 text-sky-600 dark:text-sky-400'
                      : 'bg-traffic-green/12 text-emerald-700 dark:text-traffic-green'
                  }`}
                >
                  {item.reason}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.section
      id="sec-for-you"
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.28, ease: [0.32, 0.72, 0, 1] }}
      className="space-y-4 scroll-mt-28"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline dark:border-hairline-dark pb-3">
        <div className="flex items-center gap-2.5">
          <Heart className="w-5 h-5 text-traffic-green shrink-0" />
          <h2 className="font-display font-bold text-xl text-ink dark:text-white">
            Dành cho bạn
          </h2>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Làm mới gợi ý"
            aria-label="Làm mới gợi ý Dành cho bạn"
            className="p-1.5 rounded-full text-neutral-500 dark:text-neutral-400 hover:text-ink dark:hover:text-white hover:bg-surface-soft dark:hover:bg-surface-dark-soft transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-traffic-green' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollStrip(-1)}
              aria-label="Cuộn sang trái danh sách Dành cho bạn"
              className="w-8 h-8 rounded-full border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card text-ink dark:text-white flex items-center justify-center hover:border-hairline-strong cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollStrip(1)}
              aria-label="Cuộn sang phải danh sách Dành cho bạn"
              className="w-8 h-8 rounded-full border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card text-ink dark:text-white flex items-center justify-center hover:border-hairline-strong cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Group Tabs */}
      {!isLoading && !isError && groupTabs.length > 1 && (
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <SegmentedTabs
            tabs={groupTabs}
            activeId={activeGroup}
            size="sm"
            ariaLabel="Nhóm gợi ý Dành cho bạn"
            onChange={(id) => setActiveGroup(id as any)}
          />
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div role="status" aria-busy="true" className="flex gap-3.5 overflow-hidden">
          <span className="sr-only">Đang tải gợi ý Dành cho bạn</span>
          {[1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              className="w-[172px] sm:w-[192px] shrink-0 p-2.5 rounded-2xl border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-2.5"
            >
              <Skeleton width="100%" height={158} radius="12px" />
              <Skeleton width="80%" height={14} />
              <Skeleton width="60%" height={11} />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="p-5 rounded-2xl border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card text-center space-y-2.5">
          <AlertCircle className="w-5 h-5 text-rose-500 mx-auto" />
          <p className="text-xs text-mute">Không thể tải gợi ý cá nhân hóa lúc này.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill text-xs font-medium border border-hairline dark:border-hairline-dark hover:border-traffic-green cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Thử lại</span>
          </button>
        </div>
      ) : (
        <SegmentedTabContent activeKey={activeGroup} direction={tabDirection}>
          {activeGroup === 'tracks' && renderTrackCarousel(visibleForYou)}

          {activeGroup === 'because' && renderTrackCarousel(visibleBecause)}

          {activeGroup === 'artists' && (
            <div
              ref={stripRef}
              className="flex items-stretch gap-3.5 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {visibleArtists.map((artist) => (
                <Link
                  key={artist.id}
                  to={`/artists/${encodeURIComponent(artist.id)}`}
                  className="snap-start w-[166px] sm:w-[184px] shrink-0 group relative flex flex-col items-center p-3.5 rounded-2xl border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card hover:bg-surface-soft dark:hover:bg-surface-dark-soft hover:border-traffic-green/50 transition-all text-center"
                >
                  <button
                    type="button"
                    onClick={(e) => handleDismissArtist(e, artist.name)}
                    title="Không quan tâm"
                    aria-label={`Ẩn nghệ sĩ ${artist.name} khỏi gợi ý`}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-surface-soft dark:bg-surface-dark-soft text-mute hover:text-white hover:bg-rose-600 flex items-center justify-center opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-all cursor-pointer"
                  >
                    <EyeOff className="w-3 h-3" />
                  </button>

                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-surface-soft dark:bg-surface-dark-soft mb-2.5 ring-2 ring-traffic-green/25 group-hover:ring-traffic-green transition-all">
                    <img
                      src={artist.imageUrl || FALLBACK_ARTIST}
                      alt={artist.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <h4 className="font-semibold text-xs sm:text-sm text-ink dark:text-white truncate w-full">
                    {artist.name}
                  </h4>
                  <p className="text-[11px] text-mute mt-0.5 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{formatFollowers(artist.followersCount)}</span>
                  </p>
                  <span className="mt-2 inline-block px-2 py-0.5 rounded-pill text-[10px] font-medium bg-traffic-green/12 text-emerald-700 dark:text-traffic-green truncate max-w-full">
                    {artist.reason}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </SegmentedTabContent>
      )}
    </motion.section>
  );
};
