import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Search as SearchIcon,
  Youtube,
  Music,
  User,
  Disc3,
  AlertCircle,
  X,
  Clock,
  TrendingUp,
  Play,
  Pause,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client.js';
import { SongRow } from '../components/song/SongRow.js';
import { UnifiedTrack, UnifiedArtist, UnifiedAlbum, Genre } from '../types/index.js';
import { SegmentedTabs, SegmentedTabContent, useTabDirection } from '../components/layout/SegmentedTabs.js';
import { SearchSkeleton } from '../components/common/Loading.js';
import { SourceBadge } from '../components/common/Badge.js';
import { usePlayerStore } from '../stores/player-store.js';
import { cleanDisplayTitle, formatArtists, formatMs } from '../utils/format.js';

const SOURCES_TABS = [
  { id: 'all', label: 'Tất cả nguồn' },
  { id: 'spotify', label: 'Spotify' },
  { id: 'zingmp3', label: 'Zing MP3' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'audius', label: 'Audius' },
  { id: 'jamendo', label: 'Jamendo' },
  { id: 'itunes', label: 'Apple Music' },
];

type ResultTypeFilter = 'all' | 'tracks' | 'artists' | 'albums';

const RESULT_TYPE_TABS: Array<{ id: ResultTypeFilter; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'tracks', label: 'Bài hát' },
  { id: 'artists', label: 'Nghệ sĩ' },
  { id: 'albums', label: 'Album' },
];

const RECENT_SEARCHES_KEY = 'mq_recent_searches_v1';
const TRENDING_QUERIES = [
  'Sơn Tùng M-TP',
  'Đen Vâu',
  'HIEUTHUHAI',
  'Vũ.',
  'MONO',
  'RPT MCK',
  'Ballad Việt',
  'Lo-Fi Chill',
];

function readRecentSearches(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string').slice(0, 8) : [];
  } catch {
    return [];
  }
}

function saveRecentSearches(items: string[]) {
  try {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(items.slice(0, 8)));
  } catch {
    // ignore
  }
}

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const shouldReduceMotion = useReducedMotion();

  const [query, setQuery] = useState(initialQuery);
  const [activeSource, setActiveSource] = useState<string>('all');
  const [resultType, setResultType] = useState<ResultTypeFilter>('all');
  const [includeYouTube, setIncludeYouTube] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tookMs, setTookMs] = useState<number | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(readRecentSearches);
  const sourceDirection = useTabDirection(SOURCES_TABS, activeSource);

  const [tracks, setTracks] = useState<UnifiedTrack[]>([]);
  const [artists, setArtists] = useState<UnifiedArtist[]>([]);
  const [albums, setAlbums] = useState<UnifiedAlbum[]>([]);

  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { data: genresData } = useQuery<Genre[]>({
    queryKey: ['genres-browse-search'],
    queryFn: async () => {
      const res = await api.get('/genres');
      return Array.isArray(res.data) ? res.data : res.data?.genres || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Sync URL search params with query state
  useEffect(() => {
    const qParam = searchParams.get('q') || '';
    if (qParam !== query) {
      setQuery(qParam);
    }
  }, [searchParams]);

  const recordRecentSearch = (term: string) => {
    const clean = term.trim();
    if (clean.length < 2) return;
    setRecentSearches((prev) => {
      const next = [clean, ...prev.filter((x) => x.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
      saveRecentSearches(next);
      return next;
    });
  };

  const applyQuickQuery = (term: string) => {
    setQuery(term);
    setSearchParams({ q: term });
    recordRecentSearch(term);
  };

  const handleClearQuery = () => {
    setQuery('');
    setSearchParams({});
    setResultType('all');
    inputRef.current?.focus();
  };

  const handleRemoveRecent = (term: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((x) => x !== term);
      saveRecentSearches(next);
      return next;
    });
  };

  const handleClearAllRecent = () => {
    setRecentSearches([]);
    saveRecentSearches([]);
  };

  // Debounce search effect (300ms)
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setTracks([]);
      setArtists([]);
      setAlbums([]);
      setTookMs(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const timer = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const sourcesParam = activeSource === 'all' ? undefined : activeSource;

      api
        .get('/search', {
          params: {
            q: trimmed,
            type: 'all',
            sources: sourcesParam,
            includeYouTube: includeYouTube || activeSource === 'youtube',
          },
          signal: abortControllerRef.current.signal,
        })
        .then((res) => {
          const data = res.data.data || {};
          setTracks(data.tracks || []);
          setArtists(data.artists || []);
          setAlbums(data.albums || []);
          setTookMs(res.data.tookMs ?? null);
          if ((data.tracks?.length || 0) > 0 || (data.artists?.length || 0) > 0) {
            recordRecentSearch(trimmed);
          }
        })
        .catch((err) => {
          if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
            console.error('Search error:', err);
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [query, activeSource, includeYouTube]);

  const topTrack = tracks[0] || null;
  const isTopPlaying = Boolean(topTrack && currentTrack?.id === topTrack.id && isPlaying);
  const showTopSection = resultType === 'all' && tracks.length > 0;
  const remainingTracks = showTopSection ? tracks.slice(4) : tracks;
  const showTracksList = (resultType === 'all' || resultType === 'tracks') && remainingTracks.length > 0;
  const showArtistsList = (resultType === 'all' || resultType === 'artists') && artists.length > 0;
  const showAlbumsList = (resultType === 'all' || resultType === 'albums') && albums.length > 0;
  const hasAnyResults = tracks.length > 0 || artists.length > 0 || albums.length > 0;

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      {/* Search Header & Filters */}
      <div className="pt-4 max-w-2xl mx-auto space-y-4">
        <div className="relative flex items-center">
          <SearchIcon className="w-5 h-5 text-mute absolute left-4 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Tìm kiếm bài hát, ca sĩ, album hoặc thể loại..."
            value={query}
            onChange={(e) => {
              const val = e.target.value;
              setQuery(val);
              setSearchParams(val ? { q: val } : {});
            }}
            autoFocus
            className="w-full h-12 pl-12 pr-11 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-base text-ink dark:text-on-dark placeholder-mute focus:outline-none focus:ring-2 focus:ring-traffic-green/70 focus:border-traffic-green/60 transition-all shadow-subtle"
          />
          {query && (
            <button
              type="button"
              onClick={handleClearQuery}
              aria-label="Xóa từ khóa tìm kiếm"
              title="Xóa từ khóa"
              className="absolute right-3 p-1.5 rounded-full text-mute hover:text-ink dark:hover:text-white hover:bg-neutral-200/70 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Source Segmented Filter Tabs */}
        <div className="flex justify-center overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <SegmentedTabs
            tabs={SOURCES_TABS}
            activeId={activeSource}
            size="sm"
            ariaLabel="Chọn nguồn tìm kiếm"
            onChange={(id) => {
              setActiveSource(id);
              if (id === 'youtube') setIncludeYouTube(true);
            }}
          />
        </div>
      </div>

      {/* Idle State: Recent Searches + Trending Queries + Browse Genres */}
      {!query.trim() && (
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.22 }}
          className="pt-2"
        >
          {/* Recent Searches (pb-8 inside overflow-hidden prevents 32px jump on unmount) */}
          <AnimatePresence initial={false}>
            {recentSearches.length > 0 && (
              <motion.section
                key="recent-searches-section"
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                transition={{
                  height: { duration: shouldReduceMotion ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] },
                  opacity: { duration: shouldReduceMotion ? 0.1 : 0.18, ease: 'easeOut' },
                }}
                className="overflow-hidden"
              >
                <div className="space-y-3 pb-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-traffic-green" />
                      <h2 className="font-display font-bold text-base text-ink dark:text-white">
                        Tìm kiếm gần đây
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearAllRecent}
                      className="text-xs text-mute hover:text-ink dark:hover:text-white transition-colors cursor-pointer active:scale-95"
                    >
                      Xóa tất cả
                    </button>
                  </div>
                  <div className="flex flex-wrap">
                    <AnimatePresence initial={false}>
                      {recentSearches.map((term) => (
                        <motion.div
                          key={term}
                          initial={
                            shouldReduceMotion
                              ? { opacity: 0 }
                              : { opacity: 0, scale: 0.9, maxWidth: 0, marginRight: 0 }
                          }
                          animate={
                            shouldReduceMotion
                              ? { opacity: 1 }
                              : { opacity: 1, scale: 1, maxWidth: 260, marginRight: 8 }
                          }
                          exit={
                            shouldReduceMotion
                              ? { opacity: 0 }
                              : { opacity: 0, scale: 0.85, maxWidth: 0, marginRight: 0 }
                          }
                          transition={{
                            duration: shouldReduceMotion ? 0.1 : 0.22,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          className="mb-2 inline-flex items-center overflow-hidden whitespace-nowrap rounded-pill border border-hairline dark:border-hairline-dark bg-surface-soft/70 dark:bg-surface-dark-soft/70 hover:border-traffic-green/60 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => applyQuickQuery(term)}
                            className="pl-3.5 pr-2 py-1.5 text-xs font-medium text-ink dark:text-white cursor-pointer"
                          >
                            {term}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveRecent(term)}
                            aria-label={`Xóa "${term}" khỏi lịch sử tìm kiếm`}
                            className="pr-2.5 pl-0.5 py-1.5 text-mute hover:text-ink dark:hover:text-white transition-transform active:scale-90 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Quick Trending Queries */}
          <section className="space-y-3 pb-8">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-traffic-green" />
              <h2 className="font-display font-bold text-base text-ink dark:text-white">
                Gợi ý tìm kiếm nhanh
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {TRENDING_QUERIES.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => applyQuickQuery(term)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill text-xs font-medium border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card text-neutral-700 dark:text-neutral-200 hover:border-traffic-green/60 hover:text-ink dark:hover:text-white transition-all active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-traffic-green" />
                  <span>{term}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Browse Genres */}
          {genresData && genresData.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-traffic-green" />
                  <h2 className="font-display font-bold text-base text-ink dark:text-white">
                    Duyệt theo Thể loại
                  </h2>
                </div>
                <Link
                  to="/"
                  className="text-xs text-mute hover:text-ink dark:hover:text-white transition-colors"
                >
                  Khám phá thêm →
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {genresData.slice(0, 12).map((genre) => (
                  <Link
                    key={genre.id}
                    to={`/genres/${genre.slug}`}
                    className="group relative overflow-hidden rounded-2xl border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card p-4 hover:border-traffic-green/60 transition-all duration-200"
                  >
                    <div
                      className="absolute inset-x-0 top-0 h-1 opacity-80"
                      style={{ backgroundColor: genre.color || '#22c55e' }}
                    />
                    <div className="font-display font-bold text-sm text-ink dark:text-white truncate group-hover:text-traffic-green transition-colors">
                      {genre.name}
                    </div>
                    <div className="text-[11px] text-mute mt-1 truncate">
                      {genre.categoryLabel || 'Thể loại nhạc'}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </motion.div>
      )}

      {/* Query stats, Result Type Filters & YouTube expand CTA */}
      {query.trim() && (
        <div className="space-y-3 border-b border-hairline dark:border-hairline-dark pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-mute">
            <span>
              {isLoading ? (
                <>
                  Đang tìm kiếm trên các nền tảng
                  <span className="mq-loading-dots" aria-hidden="true">
                    <span>.</span><span>.</span><span>.</span>
                  </span>
                </>
              ) : (
                `Tìm thấy ${tracks.length} bài hát · ${artists.length} nghệ sĩ${
                  albums.length > 0 ? ` · ${albums.length} album` : ''
                }${tookMs !== null ? ` (${tookMs}ms)` : ''}`
              )}
            </span>

            {!includeYouTube && activeSource !== 'youtube' && (
              <button
                type="button"
                onClick={() => setIncludeYouTube(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:underline cursor-pointer"
              >
                <Youtube className="w-3.5 h-3.5" />
                Tìm thêm kết quả trên YouTube
              </button>
            )}
          </div>

          {!isLoading && hasAnyResults && (
            <div className="flex flex-wrap items-center gap-2">
              {RESULT_TYPE_TABS.map((tab) => {
                const count =
                  tab.id === 'tracks'
                    ? tracks.length
                    : tab.id === 'artists'
                      ? artists.length
                      : tab.id === 'albums'
                        ? albums.length
                        : null;
                if (tab.id !== 'all' && count === 0) return null;
                const active = resultType === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setResultType(tab.id)}
                    className={`px-3 py-1 rounded-pill text-xs font-medium border transition-all cursor-pointer ${
                      active
                        ? 'bg-ink text-canvas dark:bg-white dark:text-black border-transparent font-semibold'
                        : 'bg-surface-soft/70 dark:bg-surface-dark-soft/70 border-hairline dark:border-hairline-dark text-neutral-600 dark:text-neutral-300 hover:text-ink dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                    {count !== null && <span className="ml-1 opacity-70">({count})</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <SegmentedTabContent activeKey={`${activeSource}:${resultType}`} direction={sourceDirection} className="space-y-8">
        {isLoading && query.trim() && (
          <div role="status" aria-busy="true">
            <span className="sr-only">Đang tìm kiếm bài hát và nghệ sĩ</span>
            <SearchSkeleton />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && query.trim() && !hasAnyResults && (
          <div className="py-16 px-4 text-center space-y-4 rounded-2xl border border-hairline dark:border-hairline-dark bg-surface-soft/40 dark:bg-surface-dark-card/50">
            <AlertCircle className="w-10 h-10 text-mute mx-auto stroke-1" />
            <div className="space-y-1">
              <h3 className="font-semibold text-base text-ink dark:text-white">
                Không tìm thấy kết quả phù hợp cho "{query.trim()}"
              </h3>
              <p className="text-xs text-mute max-w-md mx-auto">
                Hãy thử kiểm tra lại chính tả, chọn "Tất cả nguồn" hoặc mở rộng tìm kiếm trên YouTube.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {activeSource !== 'all' && (
                <button
                  type="button"
                  onClick={() => setActiveSource('all')}
                  className="px-3.5 py-1.5 rounded-pill text-xs font-semibold bg-ink text-canvas dark:bg-white dark:text-black cursor-pointer"
                >
                  Tìm trên tất cả nguồn
                </button>
              )}
              {!includeYouTube && activeSource !== 'youtube' && (
                <button
                  type="button"
                  onClick={() => setIncludeYouTube(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill text-xs font-semibold border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 cursor-pointer"
                >
                  <Youtube className="w-3.5 h-3.5" />
                  Tìm thêm trên YouTube
                </button>
              )}
            </div>
          </div>
        )}

        {/* Top Result + Top 4 Tracks (2 columns on Desktop) */}
        {!isLoading && showTopSection && topTrack && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Top Result Card */}
            <div className="lg:col-span-5 flex flex-col space-y-3">
              <h3 className="font-display font-bold text-lg text-ink dark:text-white">
                Kết quả hàng đầu
              </h3>
              <div
                onClick={() => {
                  if (currentTrack?.id === topTrack.id) togglePlay();
                  else playTrack(topTrack, tracks);
                }}
                className="group relative flex-1 flex flex-col justify-between p-5 rounded-2xl border border-hairline dark:border-hairline-dark bg-surface-soft/60 dark:bg-surface-dark-card hover:bg-surface-soft dark:hover:bg-surface-dark-soft transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-surface-soft border border-hairline dark:border-hairline-dark shadow-md shrink-0">
                    <img
                      src={
                        topTrack.coverUrl ||
                        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80'
                      }
                      alt={cleanDisplayTitle(topTrack.title)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <SourceBadge isFullLength={topTrack.isFullLength} source={topTrack.source} />
                </div>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-display font-extrabold text-xl sm:text-2xl text-ink dark:text-white truncate">
                      {cleanDisplayTitle(topTrack.title)}
                    </h4>
                    <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 truncate mt-1">
                      {formatArtists(topTrack.artists)}
                      {topTrack.durationMs > 0 ? ` · ${formatMs(topTrack.durationMs)}` : ''}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentTrack?.id === topTrack.id) togglePlay();
                      else playTrack(topTrack, tracks);
                    }}
                    aria-label={isTopPlaying ? 'Tạm dừng' : 'Phát kết quả hàng đầu'}
                    className="w-12 h-12 rounded-full bg-traffic-green text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform shrink-0 cursor-pointer"
                  >
                    {isTopPlaying ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Top 4 Tracks */}
            <div className="lg:col-span-7 space-y-3 min-w-0">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-traffic-green" />
                <h3 className="font-display font-bold text-lg text-ink dark:text-white">
                  Phù hợp nhất
                </h3>
              </div>
              <div className="space-y-1">
                {tracks.slice(0, 4).map((track, idx) => (
                  <SongRow
                    key={`${track.id}-top-${idx}`}
                    track={track}
                    index={idx}
                    queueContext={tracks}
                    hideAlbum
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Remaining / All Tracks Results */}
        {!isLoading && showTracksList && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-ink dark:text-white" />
              <h3 className="font-display font-bold text-lg text-ink dark:text-white">
                {showTopSection ? 'Thêm bài hát' : 'Bài hát'}
              </h3>
            </div>
            <div className="space-y-1">
              {remainingTracks.map((track, idx) => (
                <SongRow
                  key={`${track.id}-${idx}`}
                  track={track}
                  index={showTopSection ? idx + 4 : idx}
                  queueContext={tracks}
                />
              ))}
            </div>
          </section>
        )}

        {/* Artists Results */}
        {!isLoading && showArtistsList && (
          <section className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-ink dark:text-white" />
              <h3 className="font-display font-bold text-lg text-ink dark:text-white">Nghệ sĩ</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {artists.map((artist) => (
                <Link
                  key={artist.id}
                  to={`/artists/${artist.id}`}
                  className="group flex flex-col items-center text-center p-3 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card hover:bg-surface-soft dark:hover:bg-surface-dark-soft transition-all duration-200 cursor-pointer"
                >
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-surface-soft mb-2.5 border border-hairline dark:border-hairline-dark group-hover:scale-105 transition-transform duration-300">
                    <img
                      src={
                        artist.imageUrl ||
                        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=80'
                      }
                      alt={artist.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <span className="font-semibold text-sm truncate text-ink dark:text-white w-full group-hover:underline">
                    {artist.name}
                  </span>
                  <span className="text-[11px] text-mute">Nghệ sĩ</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Albums Results */}
        {!isLoading && showAlbumsList && (
          <section className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <Disc3 className="w-4 h-4 text-ink dark:text-white" />
              <h3 className="font-display font-bold text-lg text-ink dark:text-white">Album</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {albums.map((album) => (
                <Link
                  key={album.id}
                  to={`/albums/${album.id}`}
                  className="group flex flex-col p-3 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card hover:bg-surface-soft dark:hover:bg-surface-dark-soft transition-all duration-200 cursor-pointer"
                >
                  <div className="aspect-square w-full rounded-xl overflow-hidden bg-surface-soft mb-2.5 border border-hairline dark:border-hairline-dark">
                    <img
                      src={
                        album.coverUrl ||
                        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80'
                      }
                      alt={album.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                  <span className="font-semibold text-sm truncate text-ink dark:text-white group-hover:underline">
                    {album.title}
                  </span>
                  <span className="text-[11px] text-mute truncate">{album.artist}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </SegmentedTabContent>
    </div>
  );
};
