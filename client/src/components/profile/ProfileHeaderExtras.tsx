import React, { useMemo, useState } from 'react';
import {
  Award,
  CalendarDays,
  Check,
  Clock,
  Flame,
  Headphones,
  Heart,
  Link2,
  ListMusic,
  UserPlus,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { PROFILE_ENHANCEMENTS_CONFIG } from '../../config/profile-enhancements.config.js';
import type { ProfileInsightsData } from './useProfileInsights.js';
import { computeProfileBadges } from './profile-badges.js';

interface ProfileHeaderExtrasProps {
  joinedAt?: string | null;
  username?: string;
  insights?: ProfileInsightsData;
  stats?: {
    playlists: number;
    likes: number;
    following: number;
    hoursListened: number;
  };
  onCopied?: (message: string) => void;
  onBadgeClick?: (badgeId: string) => void;
}

export const ProfileHeaderExtras: React.FC<ProfileHeaderExtrasProps> = ({
  joinedAt,
  username,
  insights,
  stats,
  onCopied,
  onBadgeClick,
}) => {
  const [copied, setCopied] = useState(false);

  const earnedBadges = useMemo(() => {
    const iconById: Record<string, React.ReactNode> = {
      'first-listen': <Headphones className="w-3 h-3 text-violet-500" />,
      'ten-hours': <Clock className="w-3 h-3 text-amber-500" />,
      'streak-7': <Flame className="w-3 h-3 text-orange-500" />,
      'first-playlist': <ListMusic className="w-3 h-3 text-blue-500" />,
      'ten-likes': <Heart className="w-3 h-3 text-rose-500" />,
      'five-follows': <UserPlus className="w-3 h-3 text-emerald-500" />,
    };

    return computeProfileBadges({
      totalPlays: insights?.totalPlays ?? 0,
      streakDays: insights?.streakDays ?? 0,
      hoursListened: stats?.hoursListened ?? 0,
      playlists: stats?.playlists ?? 0,
      likes: stats?.likes ?? 0,
      following: stats?.following ?? 0,
    })
      .filter((b) => b.earned)
      .map((b) => ({
        ...b,
        icon: iconById[b.id] || <Award className="w-3 h-3 text-traffic-green" />,
      }));
  }, [insights?.totalPlays, insights?.streakDays, stats]);

  if (!PROFILE_ENHANCEMENTS_CONFIG.enabled || !PROFILE_ENHANCEMENTS_CONFIG.headerMetaAndCopy) {
    return null;
  }

  const rawDate = insights?.joinedAt || joinedAt;
  let joinedLabel = '';
  if (rawDate) {
    const d = new Date(rawDate);
    if (!Number.isNaN(d.getTime())) {
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      joinedLabel = `Tham gia từ tháng ${month}/${year}`;
    }
  }

  const handleCopyProfileLink = async () => {
    const url = username
      ? `${window.location.origin}/profile?u=${encodeURIComponent(username)}`
      : `${window.location.origin}/profile`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onCopied?.('Đã sao chép');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      onCopied?.('Đã sao chép');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mt-2.5 flex flex-wrap items-center justify-center sm:justify-start gap-2">
      {joinedLabel && (
        <span className="inline-flex items-center gap-1.5 text-[11px] text-mute font-sans">
          <CalendarDays className="w-3.5 h-3.5 text-traffic-green" />
          <span>{joinedLabel}</span>
        </span>
      )}

      {earnedBadges.length > 0 && (
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
          {earnedBadges.map((badge) => (
            <button
              key={badge.id}
              type="button"
              onClick={() => onBadgeClick?.(badge.id)}
              title={badge.desc}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-traffic-green/10 border border-traffic-green/35 text-ink dark:text-neutral-200 hover:border-traffic-green hover:bg-traffic-green/15 transition-all cursor-pointer active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green/35"
            >
              {badge.icon}
              <span>{badge.title}</span>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleCopyProfileLink}
        className={`inline-flex items-center justify-center min-w-[168px] h-7 px-3 rounded-pill text-[11px] font-medium border transition-all duration-200 cursor-pointer active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green/35 ${
          copied
            ? 'border-traffic-green bg-traffic-green/12 text-traffic-green shadow-xs'
            : 'border-hairline dark:border-hairline-dark bg-surface-soft/70 dark:bg-surface-dark-soft/70 text-ink dark:text-white hover:border-traffic-green/60 hover:text-traffic-green'
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {copied ? (
            <motion.span
              key="copied"
              initial={{ opacity: 0, y: 4, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.94 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="inline-flex items-center gap-1.5"
            >
              <Check className="w-3 h-3 text-traffic-green" />
              <span>Đã sao chép</span>
            </motion.span>
          ) : (
            <motion.span
              key="copy"
              initial={{ opacity: 0, y: 4, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.94 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="inline-flex items-center gap-1.5"
            >
              <Link2 className="w-3 h-3" />
              <span>Sao chép liên kết hồ sơ</span>
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
};
