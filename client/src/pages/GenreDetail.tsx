import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Play, ArrowLeft, Bookmark, Sparkles, Music2, Users } from 'lucide-react';
import { api } from '../api/client.js';
import { SongRow } from '../components/song/SongRow.js';
import { Button } from '../components/common/Button.js';
import { usePlayerStore } from '../stores/player-store.js';
import { useThemeStore } from '../stores/theme-store.js';
import { formatFollowers, getTrackPlayCount } from '../utils/format.js';
import { UnifiedTrack } from '../types/index.js';
import { getGenreGradient } from '../utils/genre-styles.js';

interface GenreDetailData {
  genre: {
    id: string;
    name: string;
    slug: string;
    category?: 'vietnam' | 'international' | 'mood';
    categoryLabel?: string;
    gradient?: string;
    color?: string;
    description: string;
    imageUrl?: string;
  };
  songs: UnifiedTrack[];
  artists: Array<{
    id: string;
    name: string;
    imageUrl?: string;
    followers?: number;
  }>;
}

type FilterTab = 'all' | 'popular' | 'newest' | 'mood';

export const GenreDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { playTrack } = usePlayerStore();
  const { isDark } = useThemeStore();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, [slug]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['genre-detail', slug],
    queryFn: async () => {
      const res = await api.get(`/genres/${slug}`);
      return res.data as GenreDetailData;
    },
    enabled: Boolean(slug),
  });

  const songs = data?.songs || [];
  const genre = data?.genre;
  const artists = data?.artists || [];

  // Sort / filter songs according to active tab
  const getFilteredSongs = (): UnifiedTrack[] => {
    if (!songs.length) return [];
    if (activeTab === 'popular') {
      return [...songs].sort((a, b) => getTrackPlayCount(b) - getTrackPlayCount(a));
    }
    if (activeTab === 'newest') {
      return [...songs].reverse();
    }
    if (activeTab === 'mood') {
      // Pick tracks with relaxed / chill tempo (< 4 min)
      return songs.filter((s) => s.durationMs > 0 && s.durationMs <= 240000);
    }
    return songs;
  };

  const filteredSongs = getFilteredSongs();

  const handlePlayAll = () => {
    if (filteredSongs.length > 0) {
      playTrack(filteredSongs[0], filteredSongs);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse max-w-7xl mx-auto pb-16">
        <div className="h-64 sm:h-72 rounded-3xl bg-neutral-200 dark:bg-neutral-800" />
        <div className="flex gap-4">
          <div className="w-32 h-10 rounded-pill bg-neutral-200 dark:bg-neutral-800" />
          <div className="w-24 h-10 rounded-pill bg-neutral-200 dark:bg-neutral-800" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !genre) {
    return (
      <div className="py-24 text-center space-y-4 max-w-md mx-auto">
        <Music2 className="w-12 h-12 text-mute mx-auto stroke-1" />
        <h2 className="font-display font-bold text-2xl text-ink dark:text-white">
          Không tìm thấy thể loại nhạc
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Thể loại nhạc này có thể đã bị di chuyển hoặc đường dẫn không chính xác.
        </p>
        <Link to="/">
          <Button size="md" icon={<ArrowLeft className="w-4 h-4 mr-1" />}>
            Quay lại Khám phá
          </Button>
        </Link>
      </div>
    );
  }



  return (
    <div className="space-y-10 pb-16 max-w-7xl mx-auto">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
        <Link to="/" className="hover:text-ink dark:hover:text-white flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Khám phá</span>
        </Link>
        <span>/</span>
        <span className="text-ink dark:text-white font-semibold">Thể loại: {genre.name}</span>
      </div>

      {/* Hero Banner with Bespoke Genre Gradient */}
      <section
        style={{ background: getGenreGradient(genre.slug) }}
        className="relative overflow-hidden rounded-3xl p-6 sm:p-10 text-white shadow-xl"
      >
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-sans font-semibold uppercase tracking-wider text-white">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{genre.categoryLabel || 'Thể loại âm nhạc'}</span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl font-black tracking-tight drop-shadow-sm">
            {genre.name}
          </h1>

          <p className="text-base sm:text-lg text-white/95 leading-relaxed max-w-xl font-normal drop-shadow-sm font-sans">
            {genre.description}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs sm:text-sm text-white/90 font-sans font-medium">
            <span>{songs.length} bài hát tuyển chọn</span>
            <span>·</span>
            <span>100% full track</span>
            <span>·</span>
            <span>Âm thanh chất lượng cao</span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-4">
            <button
              onClick={handlePlayAll}
              data-btn-white="true"
              className="btn-play-all inline-flex items-center gap-2 px-6 py-2.5 rounded-pill shadow-lg font-bold transition-all active:scale-95 cursor-pointer text-sm"
              style={{ backgroundColor: '#ffffff', color: '#000000' }}
            >
              <Play className="w-4 h-4 ml-0.5" style={{ color: '#000000', fill: '#000000' }} />
              <span className="font-bold" style={{ color: '#000000' }}>Phát tất cả</span>
            </button>

            <button
              onClick={() => setIsSaved(!isSaved)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-pill text-sm font-medium backdrop-blur-md transition-all active:scale-95 ${
                isSaved
                  ? 'bg-white/30 text-white font-semibold border border-white/40'
                  : 'bg-black/20 hover:bg-black/30 text-white border border-white/20'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              <span>{isSaved ? 'Đã lưu thể loại' : 'Lưu thể loại'}</span>
            </button>
          </div>
        </div>

        {/* 3D Tilted Big Album Cover in Bottom Right */}
        {genre.imageUrl && (
          <div className="hidden md:block absolute -bottom-6 -right-6 w-56 h-56 lg:w-72 lg:h-72 rounded-2xl overflow-hidden shadow-2xl rotate-12 transition-transform duration-500 hover:rotate-6 hover:scale-105 border-4 border-white/20 pointer-events-none">
            <img
              src={genre.imageUrl}
              alt={genre.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </section>

      {/* Featured Artists of this Genre (Circular Avatars) */}
      {artists.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2.5 border-b border-hairline dark:border-hairline-dark pb-3">
            <Users className="w-5 h-5 text-traffic-green" />
            <h2 className="font-display font-bold text-xl text-ink dark:text-white">
              Nghệ sĩ tiêu biểu
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {artists.map((artist) => (
              <Link
                key={artist.id}
                to={`/artists/${artist.id}`}
                className="group flex flex-col items-center text-center p-3.5 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card hover:bg-surface-soft dark:hover:bg-surface-dark-soft transition-all duration-200 cursor-pointer"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-surface-soft dark:bg-surface-dark-soft mb-3 border-2 border-hairline dark:border-hairline-dark group-hover:scale-105 transition-transform duration-300 shadow-sm">
                  <img
                    src={
                      artist.imageUrl ||
                      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80'
                    }
                    alt={artist.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <h4 className="font-semibold text-xs sm:text-sm truncate w-full text-neutral-900 dark:text-white group-hover:underline">
                  {artist.name}
                </h4>
                <p className="text-[11px] font-sans font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {formatFollowers(artist.followers)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Top Songs List with Filter Tabs */}
      <section className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline dark:border-hairline-dark pb-3">
          <div className="flex items-center gap-2.5">
            <Music2 className="w-5 h-5 text-red-500" />
            <h2 className="font-display font-bold text-xl text-neutral-900 dark:text-white">
              Tuyển tập bài hát ({filteredSongs.length})
            </h2>
          </div>

          {/* Filter Chips matching requirements */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'popular', label: 'Phổ biến nhất' },
              { id: 'newest', label: 'Mới phát hành' },
              { id: 'mood', label: 'Theo tâm trạng' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as FilterTab)}
                  data-pill-active={isActive ? 'true' : undefined}
                  style={
                    isActive
                      ? {
                          backgroundColor: isDark ? '#ffffff' : '#171717',
                          color: isDark ? '#000000' : '#ffffff',
                        }
                      : {}
                  }
                  className={`px-3.5 py-1.5 rounded-pill text-xs font-sans transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'font-bold shadow-sm'
                      : 'bg-white dark:bg-neutral-800/90 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 font-medium'
                  }`}
                >
                  <span style={isActive ? { color: isDark ? '#000000' : '#ffffff' } : undefined}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Song List */}
        {filteredSongs.length === 0 ? (
          <div className="py-16 text-center space-y-2 text-mute">
            <p className="text-sm">Không có bài hát nào trong bộ lọc này.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredSongs.map((track, idx) => (
              <SongRow
                key={`${track.id}-${idx}`}
                track={track}
                index={idx}
                queueContext={filteredSongs}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
