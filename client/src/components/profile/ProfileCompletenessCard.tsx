import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { PROFILE_ENHANCEMENTS_CONFIG } from '../../config/profile-enhancements.config.js';

interface ProfileCompletenessCardProps {
  hasBio: boolean;
  hasAvatar: boolean;
  playlistCount: number;
  followingCount: number;
  onActionClick?: (step: 'bio' | 'avatar' | 'playlist' | 'follow') => void;
}

export const ProfileCompletenessCard: React.FC<ProfileCompletenessCardProps> = ({
  hasBio,
  hasAvatar,
  playlistCount,
  followingCount,
  onActionClick,
}) => {
  const steps = [
    { id: 'bio' as const, label: 'Thêm giới thiệu bản thân', done: hasBio },
    { id: 'avatar' as const, label: 'Cập nhật ảnh đại diện', done: hasAvatar },
    { id: 'playlist' as const, label: 'Tạo playlist đầu tiên', done: playlistCount > 0 },
    { id: 'follow' as const, label: 'Theo dõi nghệ sĩ', done: followingCount > 0 },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const targetPercent = Math.round((completedCount / steps.length) * 100);
  const [animatedPercent, setAnimatedPercent] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAnimatedPercent(targetPercent);
    }, 60);
    return () => window.clearTimeout(timer);
  }, [targetPercent]);

  if (!PROFILE_ENHANCEMENTS_CONFIG.enabled || !PROFILE_ENHANCEMENTS_CONFIG.completenessBar) {
    return null;
  }

  if (targetPercent >= 100) {
    return null;
  }

  const pendingSteps = steps.filter((s) => !s.done);

  return (
    <div className="p-4 rounded-xl border border-hairline/70 dark:border-hairline-dark/70 bg-surface-soft/50 dark:bg-surface-dark-soft/50 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-traffic-green shrink-0" />
          <span className="text-xs font-semibold text-ink dark:text-white">
            Mức hoàn thiện hồ sơ
          </span>
        </div>
        <span className="text-xs font-bold text-traffic-green tabular-nums">
          {targetPercent}%
        </span>
      </div>

      <div className="h-2 w-full rounded-full bg-neutral-200/80 dark:bg-neutral-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-traffic-green transition-all duration-700 ease-out"
          style={{ width: `${animatedPercent}%` }}
        />
      </div>

      {pendingSteps.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[11px] text-mute mr-1">Bước tiếp theo:</span>
          {pendingSteps.map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => onActionClick?.(step.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill text-[11px] font-medium bg-canvas dark:bg-surface-dark-card border border-hairline dark:border-hairline-dark text-body dark:text-neutral-300 hover:border-traffic-green/60 hover:text-traffic-green transition-colors cursor-pointer focus:outline-none"
            >
              <span>{step.label}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
