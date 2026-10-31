import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, Search as SearchIcon, ArrowRight } from 'lucide-react';
import { api } from '../api/client.js';
import { formatFollowers } from '../utils/format.js';

interface ArtistItem {
  id: string;
  name: string;
  bio?: string;
  imageUrl?: string;
  _count?: {
    songs: number;
    followers: number;
  };
}

export const ArtistsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: artistsData, isLoading } = useQuery({
    queryKey: ['artists'],
    queryFn: async () => {
      const res = await api.get('/artists');
      return res.data.artists as ArtistItem[];
    },
  });

  const filteredArtists = (artistsData || []).filter((a) =>
    a.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  return (
    <div className="space-y-10 pb-16 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-hairline dark:border-hairline-dark pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/60 shadow-sm text-xs font-sans font-medium text-neutral-700 dark:text-neutral-300">
            <Users className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
            <span>Kho nghệ sĩ Việt Nam & Quốc tế</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink dark:text-white">
            Nghệ sĩ
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-xl">
            Khám phá hồ sơ, tuyển tập bài hát và các album nổi bật từ những nghệ sĩ tài năng nhất.
          </p>
        </div>

        {/* Search Filter */}
        <div className="relative w-full md:w-72">
          <SearchIcon className="w-4 h-4 text-mute absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo tên nghệ sĩ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white placeholder-mute focus:outline-none focus:ring-2 focus:ring-ink dark:focus:ring-white transition-all shadow-subtle"
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center p-4 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card animate-pulse space-y-3"
            >
              <div className="w-24 h-24 rounded-full bg-surface-soft dark:bg-surface-dark-soft" />
              <div className="w-20 h-4 bg-surface-soft dark:bg-surface-dark-soft rounded" />
              <div className="w-12 h-3 bg-surface-soft dark:bg-surface-dark-soft rounded" />
            </div>
          ))}
        </div>
      ) : filteredArtists.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <Users className="w-12 h-12 text-mute mx-auto stroke-1" />
          <h3 className="font-semibold text-lg text-ink dark:text-white">
            Không tìm thấy nghệ sĩ nào
          </h3>
          <p className="text-xs text-mute max-w-sm mx-auto">
            Hãy thử tìm bằng tên nghệ sĩ khác hoặc kiểm tra lại chính tả.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {filteredArtists.map((artist) => (
            <Link
              key={artist.id}
              to={`/artists/${artist.id}`}
              className="group relative flex flex-col items-center p-4 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card hover:bg-surface-soft dark:hover:bg-surface-dark-soft hover:-translate-y-1 transition-all duration-200 cursor-pointer text-center"
            >
              {/* Circular Avatar */}
              <div className="w-28 h-28 rounded-full overflow-hidden bg-surface-soft dark:bg-surface-dark-soft mb-3 border-2 border-hairline dark:border-hairline-dark shadow-sm group-hover:scale-105 transition-transform duration-300">
                <img
                  src={
                    artist.imageUrl ||
                    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80'
                  }
                  alt={artist.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80';
                  }}
                />
              </div>

              {/* Info */}
              <h3 className="font-display font-bold text-sm text-neutral-900 dark:text-white group-hover:text-black dark:group-hover:text-white group-hover:underline truncate w-full mb-1">
                {artist.name}
              </h3>

              <span className="text-[11px] font-mono text-traffic-green font-semibold mb-2">
                {formatFollowers(artist._count?.followers)}
              </span>

              {artist.bio && (
                <p className="text-xs text-neutral-600 dark:text-neutral-300 line-clamp-2 px-1 mb-3 leading-relaxed">
                  {artist.bio}
                </p>
              )}

              {/* View Profile Action */}
              <div className="mt-auto inline-flex items-center gap-1 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 group-hover:text-ink dark:group-hover:text-white transition-colors">
                <span>Xem trang nghệ sĩ</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
