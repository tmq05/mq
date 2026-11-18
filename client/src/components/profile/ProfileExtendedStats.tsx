import React, { useEffect, useState } from 'react';
import { Flame, Headphones, Mic2, Music2 } from 'lucide-react';
import { PROFILE_ENHANCEMENTS_CONFIG } from '../../config/profile-enhancements.config.js';
import type { ProfileInsightsData } from './useProfileInsights.js';

export type ExtendedInsightSection = 'history' | 'streak' | 'top-artists' | 'top-genres';

interface ProfileExtendedStatsProps {
  insights?: ProfileInsightsData;
  isLoading?: boolean;
  activeSection?: string;
  onSelectSection?: (section: ExtendedInsightSection) => void;
}

function useCountUp(target: number, durationMs = 800): number {
  const [value, setValue] = useState(0);
  const prevTargetRef = React.useRef(0);

  useEffect(() => {
    const from = prevTargetRef.current;
    prevTargetRef.current = target;

    if (target <= 0) {
      setValue(0);
      return;
    }

    if (from === target) {
      setValue(target);
      return;
    }

    let rafId = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, durationMs]);

  return value;
}

export const ProfileExtendedStats: React.FC<ProfileExtendedStatsProps> = ({
  insights,
  isLoading = false,
  activeSection,
  onSelectSection,
}) => {
  const totalPlays = useCountUp(insights?.totalPlays ?? 0, 800);
  const streakDays = useCountUp(insights?.streakDays ?? 0, 800);

  if (!PROFILE_ENHANCEMENTS_CONFIG.enabled || !PROFILE_ENHANCEMENTS_CONFIG.extendedStats) {
    return null;
  }

  const cardClass = (section: ExtendedInsightSection) =>
    `min-w-[170px] sm:min-w-0 p-3 rounded-xl border flex items-center gap-3 shrink-0 text-left transition-all cursor-pointer active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green/35 ${
      activeSection === section
        ? 'bg-traffic-green/8 border-traffic-green/70 ring-1 ring-traffic-green/20 shadow-xs'
        : 'bg-surface-soft/60 dark:bg-surface-dark-soft/60 border-hairline/60 dark:border-hairline-dark/60 hover:border-hairline-strong dark:hover:border-white/25'
    }`;

  return (
    <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 overflow-x-auto pb-1 sm:pb-0">
      <button
        type="button"
        onClick={() => onSelectSection?.('history')}
        className={cardClass('history')}
      >
        <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
          <Headphones className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="block text-xs font-sans text-mute truncate">Bài hát đã nghe</span>
          <strong className="text-sm font-semibold text-ink dark:text-white tabular-nums">
            {isLoading ? '...' : `${totalPlays} lượt`}
          </strong>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onSelectSection?.('streak')}
        className={cardClass('streak')}
      >
        <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
          <Flame className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="block text-xs font-sans text-mute truncate">Chuỗi ngày nghe</span>
          <strong className="text-sm font-semibold text-ink dark:text-white tabular-nums">
            {isLoading ? '...' : `${streakDays} ngày`}
          </strong>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onSelectSection?.('top-artists')}
        className={cardClass('top-artists')}
      >
        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <Mic2 className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="block text-xs font-sans text-mute truncate">Nghệ sĩ nghe nhiều</span>
          <strong className="block text-sm font-semibold text-ink dark:text-white truncate">
            {isLoading ? '...' : insights?.topArtist?.name || 'Chưa có'}
          </strong>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onSelectSection?.('top-genres')}
        className={cardClass('top-genres')}
      >
        <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
          <Music2 className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="block text-xs font-sans text-mute truncate">Thể loại nghe nhiều</span>
          <strong className="block text-sm font-semibold text-ink dark:text-white truncate">
            {isLoading ? '...' : insights?.topGenre || 'Chưa có'}
          </strong>
        </div>
      </button>
    </div>
  );
};
