import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Play, Music, Flame, Radio, Disc3, Users, ArrowRight, Compass, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../api/client.js';
import { SongCard } from '../components/song/SongCard.js';
import { SongRow } from '../components/song/SongRow.js';
import { NowPlayingHero } from '../components/player/NowPlayingHero.js';
import { Button } from '../components/common/Button.js';
import { usePlayerStore } from '../stores/player-store.js';
import { UnifiedTrack, Genre, Album } from '../types/index.js';
import { formatAlbumArtist, formatFollowers } from '../utils/format.js';

export const Home: React.FC = () => {
  const { playTrack, currentTrack } = usePlayerStore();

  const [genreCategory, setGenreCategory] = useState<'all' | 'vietnam' | 'international' | 'mood'>('all');
  const [genreSearch, setGenreSearch] = useState('');
  const [showAllGenres, setShowAllGenres] = useState(false);

  // 1. Trending Songs
  const { data: trendingData, isLoading: trendingLoading } = useQuery({
    queryKey: ['trending'],
    queryFn: async () => {
      const res = await api.get('/songs/trending');
      return res.data.trending as UnifiedTrack[];
    },
  });

  // 2. Nhạc Việt (V-Pop)
  const { data: vpopData } = useQuery({
    queryKey: ['vpop'],
    queryFn: async () => {
      const res = await api.get('/songs/vpop');
      return res.data.vpop as UnifiedTrack[];
    },
  });

  // 3. Genres
  const { data: genresData } = useQuery({
    queryKey: ['genres'],
    queryFn: async () => {
      const res = await api.get('/genres');
      return res.data.genres as Genre[];
    },
  });

  // 4. Albums
  const { data: albumsData } = useQuery({
    queryKey: ['albums'],
    queryFn: async () => {
      const res = await api.get('/albums');
      return res.data.albums as Album[];
    },
  });

  // 5. Artists
  const { data: artistsData } = useQuery({
    queryKey: ['featured-artists'],
    queryFn: async () => {
      const res = await api.get('/artists');
      return (res.data?.artists || []) as Array<{
        id: string;
        name: string;
        bio?: string;
        imageUrl?: string;
        _count?: { songs: number; followers: number };
      }>;
    },
  });

  const handlePlayAllTrending = () => {
    if (trendingData && trendingData.length > 0) {
      playTrack(trendingData[0], trendingData);
    }
  };

  return (
    <div className="space-y-14 pb-12">
      {/* Hero Section matching DESIGN.md (Ollama minimalist README style) */}
      <section className="text-center pt-6 pb-2 max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/60 shadow-sm text-xs font-sans font-medium text-neutral-700 dark:text-neutral-300">
          <Music className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
          <span>Âm nhạc đa nguồn · Trải nghiệm liền mạch</span>
        </div>

        <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-ink dark:text-white leading-[1.15]">
          Âm thanh thuần khiết, trải nghiệm tối giản.
        </h1>

        <p className="text-base text-neutral-600 dark:text-neutral-300 max-w-xl mx-auto leading-relaxed">
          Tìm kiếm và phát trực tuyến hàng triệu ca khúc từ Spotify, Zing MP3, YouTube và kho
          nghệ sĩ Việt Nam — không quảng cáo ngắt quãng, chất lượng full track.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Button
            size="lg"
            onClick={handlePlayAllTrending}
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
      </section>

      {/* Now Playing Banner (Section cho bài hát đang phát) */}
      {currentTrack && <NowPlayingHero />}

      {/* Trending Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-hairline dark:border-hairline-dark pb-3">
          <div className="flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-amber-500" />
            <h2 className="font-display font-bold text-xl text-ink dark:text-white">
              Thịnh hành hôm nay
            </h2>
          </div>
          {trendingData && trendingData.length > 0 && (
            <button
              onClick={handlePlayAllTrending}
              className="text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-ink dark:hover:text-white flex items-center gap-1"
            >
              Phát tất cả
            </button>
          )}
        </div>

        {trendingLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-card bg-surface-soft dark:bg-surface-dark-soft animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {trendingData?.slice(0, 6).map((track) => (
              <SongCard key={track.id} track={track} queueContext={trendingData} />
            ))}
          </div>
        )}
      </section>

      {/* Mục Nhạc Việt (Vietnamese Hits) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-hairline dark:border-hairline-dark pb-3">
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-red-500" />
            <h2 className="font-display font-bold text-xl text-ink dark:text-white">
              Giai điệu Nhạc Việt
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {vpopData?.slice(0, 8).map((track, idx) => (
            <SongRow
              key={track.id}
              track={track}
              index={idx}
              queueContext={vpopData}
              hideAlbum={true}
            />
          ))}
        </div>
      </section>

      {/* Nghệ sĩ nổi bật */}
      {artistsData && artistsData.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-hairline dark:border-hairline-dark pb-3">
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-traffic-green" />
              <h2 className="font-display font-bold text-xl text-neutral-900 dark:text-white">
                Nghệ sĩ nổi bật
              </h2>
            </div>
            <Link
              to="/artists"
              className="text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white flex items-center gap-1 group"
            >
              <span>Xem tất cả ({artistsData.length})</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {artistsData.slice(0, 6).map((artist) => (
              <Link
                key={artist.id}
                to={`/artists/${artist.id}`}
                className="group flex flex-col items-center p-3 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card hover:bg-surface-soft dark:hover:bg-surface-dark-soft transition-all duration-200 text-center"
              >
                <div className="w-20 h-20 rounded-full overflow-hidden bg-surface-soft dark:bg-surface-dark-soft mb-2.5 border border-hairline dark:border-hairline-dark group-hover:scale-105 transition-transform duration-300">
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
                <h4 className="font-semibold text-xs sm:text-sm truncate w-full text-neutral-900 dark:text-white group-hover:underline">
                  {artist.name}
                </h4>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {formatFollowers(artist._count?.followers)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Genres Grid - Duyệt theo thể loại */}
      {genresData && genresData.length > 0 && (() => {
        const filteredGenres = genresData.filter((g) => {
          const matchCat = genreCategory === 'all' || g.category === genreCategory;
          const matchSearch =
            !genreSearch.trim() ||
            g.name.toLowerCase().includes(genreSearch.trim().toLowerCase()) ||
            (g.description && g.description.toLowerCase().includes(genreSearch.trim().toLowerCase()));
          return matchCat && matchSearch;
        });

        const displayedGenres = showAllGenres ? filteredGenres : filteredGenres.slice(0, 12);

        return (
          <section className="space-y-5 pt-2">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-hairline dark:border-hairline-dark pb-3">
              <div className="flex items-center gap-2.5">
                <Compass className="w-5 h-5 text-indigo-500" />
                <h2 className="font-display font-bold text-xl text-neutral-900 dark:text-white">
                  Duyệt theo thể loại
                </h2>
              </div>

              {/* Category Filter Chips & Search Bar */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'vietnam', label: 'Việt Nam' },
                    { id: 'international', label: 'Quốc tế' },
                    { id: 'mood', label: 'Tâm trạng & Hoạt động' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setGenreCategory(tab.id as any)}
                      className={`px-3 py-1 rounded-pill text-xs font-mono transition-colors whitespace-nowrap ${
                        genreCategory === tab.id
                          ? 'bg-ink dark:bg-white text-white dark:text-black font-semibold shadow-sm'
                          : 'bg-surface-soft dark:bg-surface-dark-soft text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-hairline dark:border-hairline-dark font-medium'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Quick Genre Search */}
                <div className="relative w-full sm:w-48">
                  <Search className="w-3.5 h-3.5 text-mute absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Lọc thể loại..."
                    value={genreSearch}
                    onChange={(e) => setGenreSearch(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-xs text-ink dark:text-white placeholder-mute focus:outline-none focus:ring-1 focus:ring-ink dark:focus:ring-white transition-all shadow-subtle"
                  />
                </div>
              </div>
            </div>

            {/* 3D Tilted Cards Grid */}
            {displayedGenres.length === 0 ? (
              <div className="py-12 text-center text-xs text-mute">
                Không tìm thấy thể loại nào phù hợp với từ khóa "{genreSearch}".
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {displayedGenres.map((genre) => {
                  const gradientClass = genre.gradient || 'from-emerald-500 to-teal-700';
                  return (
                    <Link
                      key={genre.id}
                      to={`/genres/${genre.slug}`}
                      className={`group relative overflow-hidden rounded-2xl p-4 h-36 sm:h-40 flex flex-col justify-between shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer bg-gradient-to-br ${gradientClass}`}
                    >
                      {/* Top-Left: Category Label & Bold Genre Name */}
                      <div className="relative z-10 pr-10">
                        {genre.categoryLabel && (
                          <span className="block text-[10px] font-mono text-white/80 uppercase tracking-wider mb-1">
                            {genre.categoryLabel}
                          </span>
                        )}
                        <h3 className="font-display font-black text-lg sm:text-xl text-white tracking-tight leading-tight drop-shadow-sm group-hover:drop-shadow-md">
                          {genre.name}
                        </h3>
                      </div>

                      {/* 3D Tilted Album Cover in Bottom-Right Corner */}
                      {genre.imageUrl && (
                        <div className="absolute -bottom-2 -right-3 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden shadow-2xl rotate-[25deg] group-hover:rotate-[28deg] group-hover:scale-110 group-hover:translate-x-1 group-hover:translate-y-1 transition-all duration-300 border border-white/20 pointer-events-none">
                          <img
                            src={genre.imageUrl}
                            alt={genre.name}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Toggle More / Less Button */}
            {filteredGenres.length > 12 && (
              <div className="pt-2 text-center">
                <button
                  onClick={() => setShowAllGenres(!showAllGenres)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill bg-surface-soft dark:bg-surface-dark-soft hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 border border-hairline dark:border-hairline-dark shadow-sm transition-all"
                >
                  <span>{showAllGenres ? 'Thu gọn' : `Xem thêm (${filteredGenres.length - 12} thể loại)`}</span>
                  {showAllGenres ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </section>
        );
      })()}

      {/* Albums Grid */}
      {albumsData && albumsData.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-hairline dark:border-hairline-dark pb-3">
            <div className="flex items-center gap-2.5">
              <Disc3 className="w-5 h-5 text-indigo-500" />
              <h2 className="font-display font-bold text-xl text-ink dark:text-white">
                Album chọn lọc
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {albumsData.map((album) => (
              <Link
                key={album.id}
                to={`/albums/${album.id}`}
                className="group p-3 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card hover:bg-surface-soft dark:hover:bg-surface-dark-soft transition-all"
              >
                <div className="aspect-square w-full rounded-lg overflow-hidden bg-surface-soft mb-3">
                  <img
                    src={
                      album.coverUrl ||
                      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80'
                    }
                    alt={album.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <h4 className="font-semibold text-sm truncate text-neutral-900 dark:text-white">
                  {album.title}
                </h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 truncate">
                  {formatAlbumArtist(album.artist)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
