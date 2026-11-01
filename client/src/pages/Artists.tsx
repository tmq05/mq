import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, Search as SearchIcon, ArrowRight, Sparkles, Check } from 'lucide-react';
import { api } from '../api/client.js';
import { formatFollowers } from '../utils/format.js';
import { useThemeStore } from '../stores/theme-store.js';

interface ArtistItem {
  id: string;
  slug?: string;
  name: string;
  bio?: string;
  imageUrl?: string;
  genre?: string;
  category?: 'vietnam' | 'international';
  followers?: number;
  _count?: {
    songs: number;
    followers: number;
  };
}

export const ArtistsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'vietnam' | 'international'>('all');
  const { isDark } = useThemeStore();

  const { data: artistsData, isLoading } = useQuery({
    queryKey: ['artists', activeCategory],
    queryFn: async () => {
      const res = await api.get('/artists', {
        params: activeCategory !== 'all' ? { category: activeCategory } : {},
      });
      return res.data.artists as ArtistItem[];
    },
  });

  const filteredArtists = (artistsData || []).filter((a) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      a.name.toLowerCase().includes(term) ||
      (a.genre && a.genre.toLowerCase().includes(term)) ||
      (a.bio && a.bio.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-hairline dark:border-hairline-dark pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/60 shadow-sm text-xs font-sans font-medium text-neutral-700 dark:text-neutral-300">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>Kho nghệ sĩ Việt Nam & Quốc tế tuyển chọn</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink dark:text-white">
            Nghệ sĩ
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-xl font-sans">
            Khám phá hồ sơ, tuyển tập bài hát 100% full track và các album nổi bật từ những nghệ sĩ tài năng nhất.
          </p>
        </div>

        {/* Category Tabs & Search Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-full border border-neutral-200/80 dark:border-neutral-700/60">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'vietnam', label: 'Việt Nam' },
              { id: 'international', label: 'Quốc tế' },
            ].map((tab) => {
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id as any)}
                  data-pill-active={isActive ? 'true' : undefined}
                  style={
                    isActive
                      ? {
                          backgroundColor: isDark ? '#ffffff' : '#171717',
                          color: isDark ? '#000000' : '#ffffff',
                        }
                      : {}
                  }
                  className={`px-3.5 py-1.5 rounded-full text-xs font-sans transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'font-bold shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white font-medium'
                  }`}
                >
                  <span style={isActive ? { color: isDark ? '#000000' : '#ffffff' } : undefined}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <SearchIcon className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm nghệ sĩ, thể loại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-full bg-white dark:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all shadow-subtle font-sans"
            />
          </div>
        </div>
      </div>

      {/* Subheader Stats */}
      <div className="flex items-center justify-between text-xs font-sans text-neutral-500 dark:text-neutral-400">
        <span>
          Hiển thị <strong className="text-neutral-900 dark:text-white">{filteredArtists.length}</strong> nghệ sĩ
        </span>
        <span>100% full tracks · Âm thanh lossless</span>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 animate-pulse space-y-3"
            >
              <div className="w-28 h-28 rounded-full bg-neutral-200 dark:bg-neutral-800" />
              <div className="w-24 h-4 bg-neutral-200 dark:bg-neutral-800 rounded" />
              <div className="w-16 h-3 bg-neutral-200 dark:bg-neutral-800 rounded" />
            </div>
          ))}
        </div>
      ) : filteredArtists.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <Users className="w-12 h-12 text-neutral-400 mx-auto stroke-1" />
          <h3 className="font-semibold text-lg text-neutral-900 dark:text-white font-sans">
            Không tìm thấy nghệ sĩ nào
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto font-sans">
            Hãy thử tìm bằng tên nghệ sĩ khác hoặc chọn tab danh mục khác.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {filteredArtists.map((artist) => (
            <Link
              key={artist.id}
              to={`/artists/${artist.id}`}
              className="group relative flex flex-col items-center p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/90 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 hover:-translate-y-1.5 transition-all duration-200 cursor-pointer text-center shadow-subtle hover:shadow-lg"
            >
              {/* Circular Avatar */}
              <div className="relative w-28 h-28 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 mb-3 border-2 border-neutral-200 dark:border-neutral-700 shadow-sm group-hover:scale-105 transition-transform duration-300">
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

              {/* Verified Badge & Name */}
              <div className="flex items-center justify-center gap-1 w-full mb-1">
                <h3 className="font-display font-bold text-sm text-neutral-900 dark:text-white group-hover:underline truncate max-w-[85%]">
                  {artist.name}
                </h3>
                <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              </div>

              {/* Genre & Follower Count */}
              <div className="flex flex-col items-center gap-1 mb-2">
                {artist.genre && (
                  <span className="text-[10px] font-sans font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                    {artist.genre}
                  </span>
                )}
                <span className="text-xs font-sans font-medium text-emerald-600 dark:text-emerald-400">
                  {formatFollowers(artist.followers || artist._count?.followers)}
                </span>
              </div>

              {/* Bio snippet */}
              {artist.bio && (
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2 px-1 mb-3 leading-relaxed font-sans">
                  {artist.bio}
                </p>
              )}

              {/* View Profile Action */}
              <div className="mt-auto inline-flex items-center gap-1 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 group-hover:text-black dark:group-hover:text-white transition-colors">
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
