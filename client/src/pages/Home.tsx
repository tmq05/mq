import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Play, Sparkles, Flame, Radio, Disc3, Users, ArrowRight } from 'lucide-react';
import { api } from '../api/client.js';
import { SongCard } from '../components/song/SongCard.js';
import { SongRow } from '../components/song/SongRow.js';
import { Button } from '../components/common/Button.js';
import { usePlayerStore } from '../stores/player-store.js';
import { UnifiedTrack, Genre, Album } from '../types/index.js';
import { formatAlbumArtist, formatFollowers } from '../utils/format.js';

export const Home: React.FC = () => {
  const { playTrack } = usePlayerStore();

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

  // 5. Featured Artists
  const { data: artistsData } = useQuery({
    queryKey: ['featured-artists'],
    queryFn: async () => {
      const res = await api.get('/artists');
      return res.data.artists as Array<{
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
    <div className="space-y-16 pb-12">
      {/* Hero Section matching DESIGN.md (Ollama minimalist README style) */}
      <section className="text-center pt-8 pb-4 max-w-3xl mx-auto space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-xs font-mono text-neutral-600 dark:text-neutral-300">
          <Sparkles className="w-3.5 h-3.5 text-traffic-green" />
          <span>Âm nhạc đa nguồn · Không ngắt quãng</span>
        </div>

        <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-ink dark:text-white leading-[1.15]">
          Âm thanh thuần khiết, trải nghiệm tối giản.
        </h1>

        <p className="text-base text-neutral-600 dark:text-neutral-300 max-w-xl mx-auto leading-relaxed">
          Tìm kiếm và phát hàng triệu ca khúc từ Audius, Jamendo, Deezer, YouTube và kho nhạc
          Việt Nam tuyển chọn — không quảng cáo gây rối, hoàn toàn liền mạch.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
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

      {/* Genres Grid */}
      {genresData && genresData.length > 0 && (
        <section className="space-y-4">
          <div className="border-b border-hairline dark:border-hairline-dark pb-3">
            <h2 className="font-display font-bold text-xl text-ink dark:text-white">
              Duyệt theo thể loại
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {genresData.map((genre) => (
              <Link
                key={genre.id}
                to={`/search?q=${encodeURIComponent(genre.name)}`}
                className="group relative h-28 rounded-card overflow-hidden border border-hairline dark:border-hairline-dark bg-surface-soft dark:bg-surface-dark-soft p-4 flex flex-col justify-end transition-transform hover:-translate-y-1"
              >
                {genre.imageUrl && (
                  <img
                    src={genre.imageUrl}
                    alt={genre.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-60 dark:opacity-40 group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <span className="relative z-10 font-display font-bold text-white text-base">
                  {genre.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

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
                    src={album.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80'}
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

