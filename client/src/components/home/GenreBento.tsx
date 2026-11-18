import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { Compass, Search } from 'lucide-react';
import { Genre } from '../../types/index.js';
import { getGenreColor, getGenreGradient } from '../../utils/genre-styles.js';
import { SegmentedTabs, SegmentedTabContent } from '../layout/SegmentedTabs.js';
import { ExpandableExtraGrid, ExpandMoreButton } from '../common/ExpandableGrid.js';
import { Skeleton } from '../common/Loading.js';

interface GenreBentoProps {
  genres?: Genre[];
  isLoading: boolean;
  genreCategory: 'all' | 'vietnam' | 'international' | 'mood';
  genreSearch: string;
  showAllGenres: boolean;
  genreDirection: number;
  filterTabs: Array<{ id: string; label: string }>;
  buttonRef: React.RefObject<HTMLButtonElement>;
  onCategoryChange: (cat: 'all' | 'vietnam' | 'international' | 'mood') => void;
  onSearchChange: (value: string) => void;
  onToggleExpand: () => void;
}

const FEATURED_BENTO_SLUGS = new Set(['v-pop', 'rap-viet', 'pop', 'hip-hop']);

export const GenreBento: React.FC<GenreBentoProps> = ({
  genres = [],
  isLoading,
  genreCategory,
  genreSearch,
  showAllGenres,
  genreDirection,
  filterTabs,
  buttonRef,
  onCategoryChange,
  onSearchChange,
  onToggleExpand,
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (isLoading) {
    return (
      <section id="sec-genres" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-2.5 border-b border-hairline dark:border-hairline-dark pb-3">
          <Skeleton width={20} height={20} circle />
          <Skeleton width={180} height={24} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <Skeleton key={idx} width="100%" height={144} radius="16px" />
          ))}
        </div>
      </section>
    );
  }

  if (genres.length === 0) return null;

  const filteredGenres = genres.filter((g) => {
    const matchCat = genreCategory === 'all' || g.category === genreCategory;
    const matchSearch =
      !genreSearch.trim() ||
      g.name.toLowerCase().includes(genreSearch.trim().toLowerCase()) ||
      (g.description && g.description.toLowerCase().includes(genreSearch.trim().toLowerCase()));
    return matchCat && matchSearch;
  });

  const isBentoActive = genreCategory === 'all' && !genreSearch.trim();
  const initialGenres = filteredGenres.slice(0, 12);
  const extraGenres = filteredGenres.slice(12);

  const renderGenreCard = (genre: Genre, allowBento = true) => {
    const isFeaturedBento =
      allowBento &&
      isBentoActive &&
      (FEATURED_BENTO_SLUGS.has(genre.slug) ||
        ['V-Pop', 'Rap Việt', 'Pop', 'Hip-Hop'].includes(genre.name));

    return (
      <Link
        key={genre.id}
        to={`/genres/${genre.slug}`}
        style={{
          background: getGenreGradient(genre.slug),
          backgroundColor: getGenreColor(genre.slug),
        }}
        className={`group relative overflow-hidden rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-xl exp-card-hover cursor-pointer border border-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green ${
          isFeaturedBento
            ? 'col-span-2 sm:col-span-2 h-40 sm:h-44'
            : 'h-36 sm:h-40'
        }`}
      >
        <div className="relative z-10 pr-14">
          {genre.categoryLabel && (
            <span
              className="block text-[10px] font-sans font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'rgba(255, 255, 255, 0.92)' }}
            >
              {genre.categoryLabel}
            </span>
          )}
          <h3
            className={`font-display font-black tracking-tight leading-tight drop-shadow-sm group-hover:drop-shadow-md ${
              isFeaturedBento ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'
            }`}
            style={{ color: '#ffffff' }}
          >
            {genre.name}
          </h3>
          {isFeaturedBento && genre.description && (
            <p
              className="mt-1.5 text-xs line-clamp-2 max-w-[80%]"
              style={{ color: 'rgba(255, 255, 255, 0.85)' }}
            >
              {genre.description}
            </p>
          )}
        </div>

        {genre.imageUrl && (
          <div
            className={`absolute -bottom-2 -right-3 rounded-lg overflow-hidden shadow-2xl rotate-[25deg] group-hover:rotate-[29deg] group-hover:scale-110 group-hover:translate-x-1 group-hover:translate-y-1 exp-card-art border border-white/20 pointer-events-none ${
              isFeaturedBento ? 'w-24 h-24 sm:w-28 sm:h-28' : 'w-16 h-16 sm:w-20 sm:h-20'
            }`}
          >
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
  };

  return (
    <motion.section
      id="sec-genres"
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.28, ease: [0.32, 0.72, 0, 1] }}
      className="space-y-4 pt-2 exp-grid-root scroll-mt-28"
    >
      {/* Title Row */}
      <div className="flex items-center justify-between border-b border-hairline dark:border-hairline-dark pb-3">
        <div className="flex items-center gap-2.5">
          <Compass className="w-5 h-5 text-indigo-500" />
          <h2 className="font-display font-bold text-xl text-neutral-900 dark:text-white">
            Duyệt theo thể loại
          </h2>
        </div>
        <span className="text-xs text-mute font-sans hidden sm:inline">
          {filteredGenres.length} thể loại
        </span>
      </div>

      {/* Compact Sticky Filter + Search Bar */}
      <div className="sticky top-[100px] z-10 -mx-2 px-2 py-2 rounded-2xl bg-canvas/90 dark:bg-canvas-dark/90 backdrop-blur-md border border-hairline/60 dark:border-hairline-dark/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs">
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <SegmentedTabs
            tabs={filterTabs}
            activeId={genreCategory}
            size="sm"
            ariaLabel="Lọc theo danh mục thể loại"
            onChange={(id) => onCategoryChange(id as any)}
          />
        </div>

        <div className="relative w-full sm:w-52 shrink-0">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Lọc thể loại..."
            value={genreSearch}
            aria-label="Lọc thể loại"
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-8 pl-8 pr-3 rounded-pill bg-white dark:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-traffic-green focus:ring-2 focus:ring-traffic-green/20 transition-all font-sans"
          />
        </div>
      </div>

      {/* Bento Grid */}
      <SegmentedTabContent activeKey={genreCategory} direction={genreDirection}>
        {filteredGenres.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-500 dark:text-neutral-400 font-sans">
            Không tìm thấy thể loại nào phù hợp với từ khóa "{genreSearch}".
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-6 grid-flow-dense gap-4">
              {initialGenres.map((genre) => renderGenreCard(genre, true))}
            </div>

            <ExpandableExtraGrid
              id="genres-extra-grid"
              expanded={showAllGenres}
              items={extraGenres}
              gridClassName="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
              topSpacingClass="pt-4"
              keyExtractor={(g) => g.id}
              renderItem={(genre) => renderGenreCard(genre, false)}
            />
          </div>
        )}
      </SegmentedTabContent>

      {/* Expand / Collapse Button */}
      {extraGenres.length > 0 && (
        <div className="pt-2 text-center">
          <ExpandMoreButton
            buttonRef={buttonRef}
            expanded={showAllGenres}
            controlsId="genres-extra-grid"
            collapsedLabel={`Xem thêm (${extraGenres.length} thể loại)`}
            onToggle={onToggleExpand}
          />
        </div>
      )}
    </motion.section>
  );
};
