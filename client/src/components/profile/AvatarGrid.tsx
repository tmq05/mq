import React, { useCallback, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import type { PresetAvatar } from '../../data/presetAvatars.js';

interface AvatarGridProps {
  avatars: PresetAvatar[];
  selectedId: string | null;
  currentAvatarUrl?: string | null;
  onSelect: (avatar: PresetAvatar) => void;
}

export const AvatarGrid: React.FC<AvatarGridProps> = ({
  avatars,
  selectedId,
  currentAvatarUrl,
  onSelect,
}) => {
  const [loadedIds, setLoadedIds] = useState<Record<string, boolean>>({});
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleMarkLoaded = useCallback((id: string) => {
    setLoadedIds((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const cols = window.innerWidth >= 768 ? 5 : window.innerWidth >= 640 ? 4 : 3;
    let nextIndex = -1;

    switch (e.key) {
      case 'ArrowRight':
        nextIndex = (index + 1) % avatars.length;
        break;
      case 'ArrowLeft':
        nextIndex = (index - 1 + avatars.length) % avatars.length;
        break;
      case 'ArrowDown':
        nextIndex = Math.min(avatars.length - 1, index + cols);
        break;
      case 'ArrowUp':
        nextIndex = Math.max(0, index - cols);
        break;
      default:
        return;
    }

    if (nextIndex !== -1 && nextIndex !== index) {
      e.preventDefault();
      itemRefs.current[nextIndex]?.focus();
    }
  };

  if (avatars.length === 0) {
    return (
      <div className="py-10 text-center text-xs text-mute">
        Không có ảnh đại diện nào trong danh mục này.
      </div>
    );
  }

  return (
    <div
      role="listbox"
      aria-label="Danh sách ảnh đại diện có sẵn"
      className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-3.5 py-1"
    >
      {avatars.map((avatar, index) => {
        const isCurrent = Boolean(currentAvatarUrl && avatar.url === currentAvatarUrl);
        const isSelected = selectedId === avatar.id;
        const isHighlighted = isSelected || (!selectedId && isCurrent);
        const isLoaded = Boolean(loadedIds[avatar.id]);

        return (
          <button
            key={avatar.id}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            type="button"
            role="option"
            aria-selected={isSelected}
            aria-pressed={isSelected}
            aria-label={`Chọn avatar ${avatar.name}`}
            onClick={() => onSelect(avatar)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`group relative flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green ${
              isHighlighted
                ? 'border-traffic-green bg-traffic-green/10 dark:bg-traffic-green/15 shadow-sm'
                : 'border-hairline/70 dark:border-hairline-dark/70 bg-surface-soft/50 dark:bg-surface-dark-soft/50 hover:border-hairline-strong dark:hover:border-white/25 hover:bg-surface-soft dark:hover:bg-surface-dark-soft'
            }`}
          >
            <div
              className={`relative w-16 h-16 sm:w-[70px] sm:h-[70px] rounded-full overflow-hidden transition-transform duration-200 group-hover:scale-105 ${
                isHighlighted
                  ? 'ring-2 ring-traffic-green ring-offset-2 ring-offset-canvas dark:ring-offset-surface-dark-card'
                  : 'ring-1 ring-hairline dark:ring-hairline-dark'
              }`}
            >
              {!isLoaded && (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse"
                />
              )}
              <img
                src={avatar.url}
                alt={avatar.name}
                loading="lazy"
                referrerPolicy="no-referrer"
                onLoad={() => handleMarkLoaded(avatar.id)}
                onError={() => handleMarkLoaded(avatar.id)}
                className={`w-full h-full object-cover transition-opacity duration-200 ${
                  isLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </div>

            {isHighlighted && (
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-traffic-green text-neutral-950 flex items-center justify-center shadow-sm"
              >
                <Check className="w-3 h-3 stroke-[2.75]" />
              </span>
            )}

            <span className="text-[11px] font-medium text-ink dark:text-on-dark truncate w-full text-center">
              {avatar.name}
            </span>
          </button>
        );
      })}
    </div>
  );
};
