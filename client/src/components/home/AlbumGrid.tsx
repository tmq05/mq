import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Disc3, LayoutGrid, List } from 'lucide-react';
import { Album } from '../../types/index.js';
import { AlbumCard } from '../album/AlbumCard.js';
import { SegmentedTabs, SegmentedTabContent } from '../layout/SegmentedTabs.js';
import { ExpandableExtraGrid, ExpandMoreButton } from '../common/ExpandableGrid.js';
import { Skeleton } from '../common/Loading.js';

interface AlbumGridProps {
  albums?: Album[];
  isLoading: boolean;
  albumFilter: 'all' | 'newest' | 'popular' | 'v-pop' | 'indie-viet' | 'rap-viet' | 'international';
  showAllAlbums: boolean;
  albumDirection: number;
  filterTabs: Array<{ id: string; label: string }>;
  buttonRef: React.RefObject<HTMLButtonElement>;
  onFilterChange: (
    filter: 'all' | 'newest' | 'popular' | 'v-pop' | 'indie-viet' | 'rap-viet' | 'international'
  ) => void;
  onToggleExpand: () => void;
}

export const AlbumGrid: React.FC<AlbumGridProps> = ({
  albums = [],
  isLoading,
  albumFilter,
  showAllAlbums,
  albumDirection,
  filterTabs,
  buttonRef,
  onFilterChange,
  onToggleExpand,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  if (isLoading) {
    return (
      <section id="sec-albums" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-2.5 border-b border-hairline dark:border-hairline-dark pb-3">
          <Skeleton width={20} height={20} circle />
          <Skeleton width={160} height={24} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((idx) => (
            <div key={idx} className="space-y-2.5">
              <Skeleton width="100%" height={180} radius="16px" />
              <Skeleton width="80%" height={14} />
              <Skeleton width="55%" height={12} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (albums.length === 0) return null;

  const filteredAlbums = albums.filter((a) => {
    if (albumFilter === 'all' || albumFilter === 'newest' || albumFilter === 'popular') return true;
    if (albumFilter === 'v-pop') return a.genre === 'v-pop';
    if (albumFilter === 'indie-viet') return a.genre === 'indie-viet';
    if (albumFilter === 'rap-viet') return a.genre === 'rap-viet';
    if (albumFilter === 'international') return a.category === 'international';
    return true;
  });

  const sortedAlbums = [...filteredAlbums].sort((a, b) => {
    if (albumFilter === 'newest') {
      const dateA = new Date(a.releaseDate || '').getTime() || 0;
      const dateB = new Date(b.releaseDate || '').getTime() || 0;
      return dateB - dateA;
    }
    if (albumFilter === 'popular') {
      return (b.playCount || 0) - (a.playCount || 0);
    }
    return (a.featuredOrder || 99) - (b.featuredOrder || 99);
  });

  const initialAlbums = sortedAlbums.slice(0, 10);
  const extraAlbums = sortedAlbums.slice(10);

  const itemsLayoutClass =
    viewMode === 'grid'
      ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5'
      : 'grid grid-cols-1 lg:grid-cols-2 gap-3';

  return (
    <motion.section
      id="sec-albums"
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.28, ease: [0.32, 0.72, 0, 1] }}
      className="space-y-4 pt-2 exp-grid-root scroll-mt-28"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline dark:border-hairline-dark pb-3">
        <div className="flex items-center gap-2.5">
          <Disc3 className="w-5 h-5 text-indigo-500 shrink-0" />
          <h2 className="font-display font-bold text-xl text-neutral-900 dark:text-white">
            Album chọn lọc
          </h2>
        </div>

        <Link
          to="/search?q=album"
          className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors group self-start sm:self-auto"
        >
          <span>Xem tất cả ({albums.length})</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Sticky Filter Tabs + Pure Client-Side Grid/List View Toggle */}
      <div className="sticky top-[100px] z-10 -mx-2 px-2 py-2 rounded-2xl bg-canvas/90 dark:bg-canvas-dark/90 backdrop-blur-md border border-hairline/60 dark:border-hairline-dark/60 flex items-center justify-between gap-3 shadow-xs">
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <SegmentedTabs
            tabs={filterTabs}
            activeId={albumFilter}
            size="sm"
            ariaLabel="Lọc album chọn lọc"
            onChange={(id) => onFilterChange(id as any)}
          />
        </div>

        <div
          role="group"
          aria-label="Chế độ hiển thị album"
          className="inline-flex items-center p-0.5 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark shrink-0"
        >
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            aria-label="Xem dạng lưới"
            aria-pressed={viewMode === 'grid'}
            title="Xem dạng lưới"
            className={`p-1.5 rounded-pill transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green ${
              viewMode === 'grid'
                ? 'bg-canvas dark:bg-surface-dark-card text-ink dark:text-white shadow-xs'
                : 'text-mute hover:text-ink dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            aria-label="Xem dạng danh sách"
            aria-pressed={viewMode === 'list'}
            title="Xem dạng danh sách"
            className={`p-1.5 rounded-pill transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green ${
              viewMode === 'list'
                ? 'bg-canvas dark:bg-surface-dark-card text-ink dark:text-white shadow-xs'
                : 'text-mute hover:text-ink dark:hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Album Grid or List */}
      <SegmentedTabContent activeKey={`${albumFilter}-${viewMode}`} direction={albumDirection}>
        {sortedAlbums.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-500 dark:text-neutral-400 font-sans">
            Không có album nào trong mục này.
          </div>
        ) : (
          <div>
            <div className={itemsLayoutClass}>
              {initialAlbums.map((album) => (
                <AlbumCard key={album.id} album={album} variant={viewMode} />
              ))}
            </div>

            <ExpandableExtraGrid
              id="albums-extra-grid"
              expanded={showAllAlbums}
              items={extraAlbums}
              gridClassName={itemsLayoutClass}
              topSpacingClass="pt-4 sm:pt-5"
              keyExtractor={(a) => a.id}
              renderItem={(album) => <AlbumCard album={album} variant={viewMode} />}
            />
          </div>
        )}
      </SegmentedTabContent>

      {/* Expand / Collapse Button */}
      {extraAlbums.length > 0 && (
        <div className="pt-2 text-center">
          <ExpandMoreButton
            buttonRef={buttonRef}
            expanded={showAllAlbums}
            controlsId="albums-extra-grid"
            collapsedLabel={`Xem thêm (${extraAlbums.length} album)`}
            onToggle={onToggleExpand}
          />
        </div>
      )}
    </motion.section>
  );
};
