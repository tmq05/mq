import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, Search as SearchIcon, ArrowRight, Sparkles, Check, X, Disc3 } from 'lucide-react';
import { api } from '../api/client.js';
import { formatFollowers } from '../utils/format.js';
import { SegmentedTabs, SegmentedTabContent, useTabDirection } from '../components/layout/SegmentedTabs.js';
import { SelectDropdown } from '../components/common/SelectDropdown.js';
import { CardSkeleton } from '../components/common/Loading.js';

const ARTIST_CATEGORY_TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'vietnam', label: 'Việt Nam' },
  { id: 'international', label: 'Quốc tế' },
];

type ArtistSortKey = 'followers' | 'name' | 'songs';

const FALLBACK_AVATAR =
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80';

interface ArtistItem {
  id: string;
  slug?: string;
  name: string;
  bio?: string;
  imageUrl?: string;
  genre?: string;
  category?: 'vietnam' | 'international';
  isVerified?: boolean;
  followers?: number;
  _count?: {
    songs: number;
    followers: number;
  };
}

export const ArtistsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'vietnam' | 'international'>('all');
  const [sortBy, setSortBy] = useState<ArtistSortKey>('followers');
  const categoryDirection = useTabDirection(ARTIST_CATEGORY_TABS, activeCategory);

  const { data: artistsData, isLoading } = useQuery({
    queryKey: ['artists', activeCategory],
    queryFn: async () => {
      const res = await api.get('/artists', {
        params: activeCategory !== 'all' ? { category: activeCategory } : {},
      });
      return res.data.artists as ArtistItem[];
    },
  });

  const sortedArtists = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = (artistsData || []).filter((a) => {
      if (!term) return true;
      return (
        a.name.toLowerCase().includes(term) ||
        (a.genre && a.genre.toLowerCase().includes(term)) ||
        (a.bio && a.bio.toLowerCase().includes(term))
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'vi');
      }
      if (sortBy === 'songs') {
        return (b._count?.songs || 0) - (a._count?.songs || 0);
      }
      const fa = a.followers || a._count?.followers || 0;
      const fb = b.followers || b._count?.followers || 0;
      return fb - fa;
    });
  }, [artistsData, searchTerm, sortBy]);

  const showSpotlight = !searchTerm.trim() && sortBy === 'followers' && sortedArtists.length >= 3;
  const spotlightArtists = showSpotlight ? sortedArtists.slice(0, 3) : [];
  const gridArtists = showSpotlight ? sortedArtists.slice(3) : sortedArtists;

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-hairline dark:border-hairline-dark pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/60 shadow-sm text-xs font-sans font-medium text-neutral-700 dark:text-neutral-300">
            <Sparkles className="w-3.5 h-3.5 text-traffic-green" />
            <span>Kho nghệ sĩ Việt Nam & Quốc tế tuyển chọn</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink dark:text-white">
            Nghệ sĩ
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-xl font-sans">
            Khám phá hồ sơ, tuyển tập bài hát chất lượng cao và các album nổi bật từ những nghệ sĩ được yêu thích nhất.
          </p>
        </div>

        {/* Category Segmented Tabs & Search Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <SegmentedTabs
            tabs={ARTIST_CATEGORY_TABS}
            activeId={activeCategory}
            ariaLabel="Lọc nghệ sĩ theo khu vực"
            onChange={(id) => setActiveCategory(id as any)}
          />

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <SearchIcon className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm nghệ sĩ, thể loại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-9 rounded-full bg-white dark:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-traffic-green/70 focus:border-traffic-green/60 transition-all shadow-subtle font-sans"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Xóa từ khóa tìm nghệ sĩ"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Subheader Stats & Sort */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-sans text-neutral-500 dark:text-neutral-400">
        <span>
          Hiển thị <strong className="text-neutral-900 dark:text-white">{sortedArtists.length}</strong> nghệ sĩ
        </span>

        <div className="flex items-center gap-2">
          <span className="text-mute">Sắp xếp:</span>
          <SelectDropdown
            size="sm"
            value={sortBy}
            ariaLabel="Sắp xếp danh sách nghệ sĩ"
            options={[
              { value: 'followers', label: 'Nhiều người theo dõi' },
              { value: 'name', label: 'Tên (A–Z)' },
              { value: 'songs', label: 'Nhiều bài hát nhất' },
            ]}
            onChange={(val) => setSortBy(val as ArtistSortKey)}
          />
        </div>
      </div>

      {/* Content */}
      <SegmentedTabContent activeKey={`${activeCategory}:${sortBy}`} direction={categoryDirection} className="space-y-8">
        {isLoading ? (
          <div role="status" aria-busy="true">
            <span className="sr-only">Đang tải danh sách nghệ sĩ</span>
            <CardSkeleton
              count={10}
              circle
              columnsClassName="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5"
            />
          </div>
        ) : sortedArtists.length === 0 ? (
          <div className="py-20 text-center space-y-3 rounded-2xl border border-hairline dark:border-hairline-dark bg-surface-soft/30 dark:bg-surface-dark-card/40">
            <Users className="w-12 h-12 text-neutral-400 mx-auto stroke-1" />
            <h3 className="font-semibold text-lg text-neutral-900 dark:text-white font-sans">
              Không tìm thấy nghệ sĩ nào
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto font-sans">
              Hãy thử tìm bằng tên nghệ sĩ khác hoặc chọn tab khu vực khác.
            </p>
          </div>
        ) : (
          <>
            {/* Top 3 Spotlight Bento */}
            {showSpotlight && spotlightArtists.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-display font-bold text-lg text-ink dark:text-white">
                  Nghệ sĩ tiêu biểu
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {spotlightArtists.map((artist, idx) => (
                    <Link
                      key={artist.id}
                      to={`/artists/${artist.id}`}
                      className="group relative flex items-center gap-4 p-4 rounded-2xl border border-hairline dark:border-hairline-dark bg-surface-soft/50 dark:bg-surface-dark-card hover:bg-surface-soft dark:hover:bg-surface-dark-soft hover:border-traffic-green/60 transition-all duration-200 cursor-pointer shadow-subtle"
                    >
                      <div className="relative w-20 h-20 rounded-full overflow-hidden shrink-0 bg-surface-soft dark:bg-neutral-800 ring-2 ring-traffic-green/35 group-hover:ring-traffic-green transition-all">
                        <img
                          src={artist.imageUrl || FALLBACK_AVATAR}
                          alt={artist.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = FALLBACK_AVATAR;
                          }}
                        />
                        <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-neutral-900/90 dark:bg-white text-white dark:text-black text-[11px] font-bold flex items-center justify-center border border-canvas dark:border-surface-dark-card">
                          #{idx + 1}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-display font-bold text-base text-ink dark:text-white truncate group-hover:text-traffic-green transition-colors">
                            {artist.name}
                          </h3>
                          {artist.isVerified && (
                            <span
                              className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0"
                              title="Nghệ sĩ xác minh"
                            >
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            {formatFollowers(artist.followers || artist._count?.followers)}
                          </span>
                          {artist.genre && (
                            <span className="px-2 py-0.5 rounded-pill text-[10px] bg-canvas dark:bg-neutral-800 border border-hairline dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 truncate max-w-[110px]">
                              {artist.genre}
                            </span>
                          )}
                        </div>

                        {artist.bio && (
                          <p className="text-[11px] text-mute line-clamp-2 leading-relaxed">
                            {artist.bio}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Uniform 5-Column Grid */}
            {gridArtists.length > 0 && (
              <section className="space-y-3">
                {showSpotlight && (
                  <h2 className="font-display font-bold text-lg text-ink dark:text-white">
                    Tất cả nghệ sĩ
                  </h2>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                  {gridArtists.map((artist) => (
                    <Link
                      key={artist.id}
                      to={`/artists/${artist.id}`}
                      className="group h-full flex flex-col items-center justify-between p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/90 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 hover:border-traffic-green/50 hover:-translate-y-1 transition-all duration-200 cursor-pointer text-center shadow-subtle"
                    >
                      <div className="w-full flex flex-col items-center">
                        {/* Circular Avatar */}
                        <div className="relative w-24 h-24 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 mb-3 ring-2 ring-transparent group-hover:ring-traffic-green/60 shadow-sm transition-all duration-300">
                          <img
                            src={artist.imageUrl || FALLBACK_AVATAR}
                            alt={artist.name}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = FALLBACK_AVATAR;
                            }}
                          />
                        </div>

                        {/* Verified Badge & Name */}
                        <div className="flex items-center justify-center gap-1 w-full h-6 mb-1.5">
                          <h3 className="font-display font-bold text-sm text-neutral-900 dark:text-white group-hover:text-traffic-green transition-colors truncate max-w-[85%]">
                            {artist.name}
                          </h3>
                          {artist.isVerified && (
                            <span
                              className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0"
                              title="Nghệ sĩ xác minh"
                            >
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                        </div>

                        {/* Fixed-height Genre Slot */}
                        <div className="h-5 flex items-center justify-center mb-1.5">
                          {artist.genre ? (
                            <span className="text-[10px] font-sans font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 truncate max-w-[140px]">
                              {artist.genre}
                            </span>
                          ) : (
                            <span className="text-[10px] font-sans text-mute">Nghệ sĩ</span>
                          )}
                        </div>

                        {/* Follower & Song Count */}
                        <span className="text-xs font-sans font-medium text-emerald-600 dark:text-emerald-400">
                          {formatFollowers(artist.followers || artist._count?.followers)}
                        </span>
                        {typeof artist._count?.songs === 'number' && artist._count.songs > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-mute mt-1">
                            <Disc3 className="w-3 h-3" />
                            {artist._count.songs} bài hát
                          </span>
                        )}
                      </div>

                      {/* View Profile Footer */}
                      <div className="mt-3 pt-2.5 w-full border-t border-hairline/60 dark:border-hairline-dark/60 inline-flex items-center justify-center gap-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 group-hover:text-ink dark:group-hover:text-white transition-colors">
                        <span>Xem hồ sơ</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </SegmentedTabContent>
    </div>
  );
};
