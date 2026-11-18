import React from 'react';
import type { PresetAvatarCategory } from '../../data/presetAvatars.js';

interface AvatarCategoryTabsProps {
  categories: PresetAvatarCategory[];
  activeCategory: PresetAvatarCategory;
  onSelect: (category: PresetAvatarCategory) => void;
  counts?: Partial<Record<PresetAvatarCategory, number>>;
}

export const AvatarCategoryTabs: React.FC<AvatarCategoryTabsProps> = ({
  categories,
  activeCategory,
  onSelect,
  counts,
}) => {
  return (
    <div
      role="tablist"
      aria-label="Danh mục ảnh đại diện"
      className="flex flex-wrap items-center gap-1.5"
    >
      {categories.map((category) => {
        const isActive = category === activeCategory;
        const count = counts?.[category];
        return (
          <button
            key={category}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(category)}
            className={`px-2.5 py-1 rounded-pill text-[11px] sm:text-xs font-medium whitespace-nowrap border transition-colors cursor-pointer shrink-0 flex items-center gap-1 active:scale-[0.97] ${
              isActive
                ? 'bg-traffic-green border-traffic-green text-neutral-950 shadow-xs'
                : 'bg-surface-soft dark:bg-surface-dark-soft text-body dark:text-mute hover:text-ink dark:hover:text-white border-hairline dark:border-hairline-dark'
            }`}
          >
            <span>{category}</span>
            {typeof count === 'number' && (
              <span
                className={`text-[10px] min-w-[18px] text-center px-1.5 py-0.2 rounded-full tabular-nums ${
                  isActive
                    ? 'bg-black/15 text-neutral-950'
                    : 'bg-black/5 dark:bg-white/10 text-mute'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
