import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertCircle,
  ArrowRight,
  Award,
  Check,
  ChevronDown,
  Clock,
  Flame,
  Headphones,
  Heart,
  History,
  ListMusic,
  Mic2,
  Music,
  Play,
  RefreshCw,
  Sparkles,
  Trophy,
  UserPlus,
  X,
} from 'lucide-react';
import { PROFILE_ENHANCEMENTS_CONFIG } from '../../config/profile-enhancements.config.js';
import type { ProfileInsightsData } from './useProfileInsights.js';
import { computeProfileBadges } from './profile-badges.js';

export type BadgeTargetSection =
  | 'playlists'
  | 'likes'
  | 'following'
  | 'listening'
  | 'history'
  | 'streak';

interface ProfileAchievementsSectionProps {
  insights?: ProfileInsightsData;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  selectedBadgeId?: string | null;
  onSelectBadge?: (id: string | null) => void;
  onNavigateSection?: (section: BadgeTargetSection) => void;
  stats: {
    playlists: number;
    likes: number;
    following: number;
    hoursListened: number;
  };
}

function formatDayGroupLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Gần đây';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfTarget) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}/${date.getFullYear()}`;
}

function formatTimeHHMM(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(
    2,
    '0'
  )}`;
}

export const ProfileAchievementsSection: React.FC<ProfileAchievementsSectionProps> = ({
  insights,
  isLoading = false,
  isError = false,
  onRetry,
  selectedBadgeId: controlledBadgeId,
  onSelectBadge,
  onNavigateSection,
  stats,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const INITIAL_VISIBLE_ACTIVITIES = 6;
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ACTIVITIES);
  const [internalBadgeId, setInternalBadgeId] = useState<string | null>(null);
  const activeBadgeId = controlledBadgeId !== undefined ? controlledBadgeId : internalBadgeId;
  const setActiveBadgeId = (id: string | null) => {
    setInternalBadgeId(id);
    onSelectBadge?.(id);
  };

  const badges = useMemo(() => {
    const iconById: Record<string, React.ReactNode> = {
      'first-listen': <Headphones className="w-4 h-4 text-violet-500" />,
      'ten-hours': <Clock className="w-4 h-4 text-amber-500" />,
      'streak-7': <Flame className="w-4 h-4 text-orange-500" />,
      'first-playlist': <ListMusic className="w-4 h-4 text-blue-500" />,
      'ten-likes': <Heart className="w-4 h-4 text-rose-500" />,
      'five-follows': <UserPlus className="w-4 h-4 text-emerald-500" />,
    };

    return computeProfileBadges({
      totalPlays: insights?.totalPlays ?? 0,
      streakDays: insights?.streakDays ?? 0,
      hoursListened: stats.hoursListened ?? 0,
      playlists: stats.playlists ?? 0,
      likes: stats.likes ?? 0,
      following: stats.following ?? 0,
    }).map((b) => ({
      ...b,
      icon: iconById[b.id] || <Award className="w-4 h-4 text-traffic-green" />,
    }));
  }, [insights?.totalPlays, insights?.streakDays, stats]);

  const activities = insights?.recentActivities ?? [];
  const initialActivities = activities.slice(0, INITIAL_VISIBLE_ACTIVITIES);
  const extraActivities = activities.slice(INITIAL_VISIBLE_ACTIVITIES, visibleCount);

  const groupActivitiesByDay = (list: typeof activities) => {
    const groups: Array<{ day: string; items: typeof activities }> = [];
    for (const item of list) {
      const dayLabel = formatDayGroupLabel(item.timestamp);
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.day === dayLabel) {
        lastGroup.items.push(item);
      } else {
        groups.push({ day: dayLabel, items: [item] });
      }
    }
    return groups;
  };

  const initialGroups = useMemo(
    () => groupActivitiesByDay(initialActivities),
    [initialActivities]
  );
  const extraGroups = useMemo(
    () => groupActivitiesByDay(extraActivities),
    [extraActivities]
  );

  const selectedBadge = useMemo(
    () => badges.find((b) => b.id === activeBadgeId) || null,
    [badges, activeBadgeId]
  );

  if (!PROFILE_ENHANCEMENTS_CONFIG.enabled || !PROFILE_ENHANCEMENTS_CONFIG.achievementsAndActivity) {
    return null;
  }

  const blockMotion = (index: number) =>
    shouldReduceMotion
      ? { initial: { opacity: 1 }, animate: { opacity: 1 }, transition: { duration: 0 } }
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: {
            duration: 0.28,
            delay: index * 0.04,
            ease: [0.32, 0.72, 0, 1] as const,
          },
        };

  if (isLoading) {
    return (
      <div className="space-y-5">
        {[0, 1, 2].map((idx) => (
          <div
            key={idx}
            className="p-6 rounded-2xl border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card shadow-subtle space-y-4 animate-pulse"
          >
            <div className="h-4 w-40 rounded-full bg-surface-soft dark:bg-surface-dark-soft" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="h-16 rounded-xl bg-surface-soft dark:bg-surface-dark-soft" />
              <div className="h-16 rounded-xl bg-surface-soft dark:bg-surface-dark-soft" />
              <div className="h-16 rounded-xl bg-surface-soft dark:bg-surface-dark-soft" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <section className="p-6 rounded-2xl border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card shadow-subtle text-center space-y-3">
        <AlertCircle className="w-6 h-6 text-rose-500 mx-auto" />
        <div className="space-y-1">
          <h3 className="font-display font-bold text-sm text-ink dark:text-white">
            Không thể tải Thành tích và Hoạt động
          </h3>
          <p className="text-xs text-mute">Vui lòng kiểm tra kết nối và thử lại.</p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-pill text-xs font-medium border border-hairline dark:border-hairline-dark bg-surface-soft dark:bg-surface-dark-soft text-ink dark:text-white hover:border-traffic-green/60 hover:text-traffic-green transition-colors cursor-pointer focus:outline-none"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Thử lại</span>
          </button>
        )}
      </section>
    );
  }

  const highlights = insights?.monthlyHighlights;
  const topSongs = highlights?.topSongs ?? [];
  const topArtists = highlights?.topArtists ?? [];

  const badgeActionMap: Record<string, { label: string; section: BadgeTargetSection }> = {
    'first-listen': { label: 'Xem bài hát đã nghe', section: 'history' },
    'ten-hours': { label: 'Xem biểu đồ giờ nghe', section: 'listening' },
    'streak-7': { label: 'Xem chuỗi ngày nghe', section: 'streak' },
    'first-playlist': { label: 'Mở danh sách Playlist', section: 'playlists' },
    'ten-likes': { label: 'Xem bài hát đã thích', section: 'likes' },
    'five-follows': { label: 'Xem nghệ sĩ theo dõi', section: 'following' },
  };

  return (
    <div className="space-y-5">
      {/* 1. HUY HIỆU */}
      <motion.section
        id="profile-badges-section"
        {...blockMotion(0)}
        className="p-6 rounded-2xl border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card shadow-subtle"
      >
        <div className="flex items-center justify-between border-b border-hairline dark:border-hairline-dark pb-3 mb-4">
          <h3 className="font-display font-bold text-base text-ink dark:text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-traffic-green" />
            Huy hiệu ({badges.filter((b) => b.earned).length}/{badges.length})
          </h3>
          <span className="text-xs text-mute font-sans">Bấm vào huy hiệu để xem chi tiết</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {badges.map((badge, idx) => {
            const ratio = Math.min(1, badge.target > 0 ? badge.current / badge.target : 0);
            const isSelected = activeBadgeId === badge.id;
            return (
              <motion.button
                key={badge.id}
                type="button"
                onClick={() => setActiveBadgeId(isSelected ? null : badge.id)}
                {...blockMotion(idx * 0.5)}
                className={`p-3.5 rounded-xl border space-y-2.5 text-left transition-all cursor-pointer active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green/35 ${
                  isSelected
                    ? 'bg-traffic-green/12 border-traffic-green ring-1 ring-traffic-green/25 shadow-xs'
                    : badge.earned
                      ? 'bg-traffic-green/8 border-traffic-green/60 hover:border-traffic-green'
                      : 'bg-surface-soft/50 dark:bg-surface-dark-soft/50 border-hairline/60 dark:border-hairline-dark/60 opacity-65 hover:opacity-90 hover:border-hairline-strong dark:hover:border-white/25'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-canvas dark:bg-surface-dark-card border border-hairline/70 dark:border-hairline-dark/70 flex items-center justify-center shrink-0">
                      {badge.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-ink dark:text-white truncate">
                        {badge.title}
                      </div>
                      <p className="text-[11px] text-mute truncate">{badge.desc}</p>
                    </div>
                  </div>
                  {badge.earned && (
                    <span className="w-5 h-5 rounded-full bg-traffic-green text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                {!badge.earned && (
                  <div className="space-y-1">
                    <div className="h-1.5 w-full rounded-full bg-neutral-200/80 dark:bg-neutral-800 overflow-hidden">
                      <motion.div
                        initial={shouldReduceMotion ? { scaleX: ratio } : { scaleX: 0 }}
                        animate={{ scaleX: ratio }}
                        transition={
                          shouldReduceMotion
                            ? { duration: 0 }
                            : { duration: 0.45, ease: [0.32, 0.72, 0, 1] }
                        }
                        style={{ transformOrigin: 'left center' }}
                        className="h-full w-full rounded-full bg-traffic-green/80"
                      />
                    </div>
                    <div className="text-[10px] text-mute text-right tabular-nums">
                      {badge.current}/{badge.target} {badge.unit}
                    </div>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence initial={false}>
          {selectedBadge && (
            <motion.div
              key="badge-detail-wrapper"
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={{
                height: { duration: shouldReduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] },
                opacity: { duration: shouldReduceMotion ? 0.1 : 0.16, ease: 'easeOut' },
              }}
              className="overflow-hidden"
            >
              <div className="pt-4">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={selectedBadge.id}
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  transition={{ duration: shouldReduceMotion ? 0.1 : 0.15, ease: [0.22, 1, 0.36, 1] }}
                  className="p-4 rounded-xl border border-traffic-green/40 bg-traffic-green/6 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-canvas dark:bg-surface-dark-card border border-hairline dark:border-hairline-dark flex items-center justify-center shrink-0">
                      {selectedBadge.icon}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-ink dark:text-white">
                          {selectedBadge.title}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            selectedBadge.earned
                              ? 'bg-traffic-green/15 text-traffic-green'
                              : 'bg-surface-soft dark:bg-surface-dark-soft text-mute'
                          }`}
                        >
                          {selectedBadge.earned
                            ? 'Đã đạt được'
                            : `Tiến độ: ${selectedBadge.current}/${selectedBadge.target} ${selectedBadge.unit}`}
                        </span>
                      </div>
                      <p className="text-xs text-mute">{selectedBadge.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onNavigateSection && badgeActionMap[selectedBadge.id] && (
                      <button
                        type="button"
                        onClick={() => onNavigateSection(badgeActionMap[selectedBadge.id].section)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-medium bg-canvas dark:bg-surface-dark-card border border-hairline dark:border-hairline-dark text-ink dark:text-white hover:border-traffic-green/60 hover:text-traffic-green transition-colors cursor-pointer focus:outline-none"
                      >
                        <span>{badgeActionMap[selectedBadge.id].label}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveBadgeId(null)}
                      className="p-1.5 rounded-full text-mute hover:text-ink dark:hover:text-white cursor-pointer focus:outline-none"
                      aria-label="Đóng chi tiết huy hiệu"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* 2. HOẠT ĐỘNG GẦN ĐÂY */}
      <motion.section
        {...blockMotion(1)}
        className="p-6 rounded-2xl border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card shadow-subtle space-y-4"
      >
        <div className="flex items-center justify-between border-b border-hairline dark:border-hairline-dark pb-3">
          <h3 className="font-display font-bold text-base text-ink dark:text-white flex items-center gap-2">
            <History className="w-4 h-4 text-blue-500" />
            Hoạt động gần đây
          </h3>
          <span className="text-xs text-mute font-sans">Dòng thời gian</span>
        </div>

        {initialGroups.length === 0 ? (
          <div className="py-10 text-center space-y-1.5 text-xs text-mute">
            <Sparkles className="w-5 h-5 mx-auto opacity-50" />
            <p>Chưa có hoạt động nào gần đây. Hãy bắt đầu nghe nhạc hoặc tạo playlist!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {initialGroups.map((group) => (
              <div key={group.day} className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-mute">
                  {group.day}
                </div>
                <div className="space-y-1.5 border-l-2 border-hairline dark:border-hairline-dark pl-3.5 ml-1.5">
                  {group.items.map((item) => {
                    const icon =
                      item.type === 'like' ? (
                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                      ) : item.type === 'playlist' ? (
                        <ListMusic className="w-3.5 h-3.5 text-blue-500" />
                      ) : item.type === 'follow' ? (
                        <UserPlus className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Play className="w-3.5 h-3.5 text-violet-500" />
                      );
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 py-1.5 px-2.5 rounded-xl hover:bg-surface-soft/60 dark:hover:bg-surface-dark-soft/60 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="shrink-0">{icon}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-ink dark:text-white truncate">
                              {item.title}
                            </p>
                            {item.subtitle && (
                              <p className="text-[11px] text-mute truncate">{item.subtitle}</p>
                            )}
                          </div>
                        </div>
                        <span className="text-[11px] text-mute tabular-nums shrink-0">
                          {formatTimeHHMM(item.timestamp)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <AnimatePresence initial={false}>
              {extraGroups.length > 0 && (
                <motion.div
                  key="extra-activities"
                  initial={
                    shouldReduceMotion
                      ? { opacity: 0 }
                      : { height: 0, opacity: 0, y: -6 }
                  }
                  animate={
                    shouldReduceMotion
                      ? { opacity: 1 }
                      : { height: 'auto', opacity: 1, y: 0 }
                  }
                  exit={
                    shouldReduceMotion
                      ? { opacity: 0 }
                      : { height: 0, opacity: 0, y: -6 }
                  }
                  transition={{
                    duration: shouldReduceMotion ? 0.1 : 0.28,
                    ease: [0.32, 0.72, 0, 1],
                  }}
                  className="overflow-hidden space-y-4"
                >
                  {extraGroups.map((group) => (
                    <div key={`extra-${group.day}`} className="space-y-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-mute">
                        {group.day}
                      </div>
                      <div className="space-y-1.5 border-l-2 border-hairline dark:border-hairline-dark pl-3.5 ml-1.5">
                        {group.items.map((item) => {
                          const icon =
                            item.type === 'like' ? (
                              <Heart className="w-3.5 h-3.5 text-rose-500" />
                            ) : item.type === 'playlist' ? (
                              <ListMusic className="w-3.5 h-3.5 text-blue-500" />
                            ) : item.type === 'follow' ? (
                              <UserPlus className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Play className="w-3.5 h-3.5 text-violet-500" />
                            );
                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-3 py-1.5 px-2.5 rounded-xl hover:bg-surface-soft/60 dark:hover:bg-surface-dark-soft/60 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="shrink-0">{icon}</span>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-ink dark:text-white truncate">
                                    {item.title}
                                  </p>
                                  {item.subtitle && (
                                    <p className="text-[11px] text-mute truncate">{item.subtitle}</p>
                                  )}
                                </div>
                              </div>
                              <span className="text-[11px] text-mute tabular-nums shrink-0">
                                {formatTimeHHMM(item.timestamp)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {(visibleCount < activities.length || visibleCount > INITIAL_VISIBLE_ACTIVITIES) && (
              <div className="pt-1 flex items-center justify-center gap-2">
                {visibleCount < activities.length && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 8)}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-pill text-xs font-medium border border-hairline dark:border-hairline-dark bg-surface-soft/70 dark:bg-surface-dark-soft/70 text-ink dark:text-white hover:border-traffic-green/60 hover:text-traffic-green transition-colors cursor-pointer active:scale-[0.97] focus:outline-none"
                  >
                    <span>Xem thêm</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                )}

                {visibleCount > INITIAL_VISIBLE_ACTIVITIES && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount(INITIAL_VISIBLE_ACTIVITIES)}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-pill text-xs font-medium border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card text-mute hover:text-ink dark:hover:text-white hover:border-hairline-strong transition-colors cursor-pointer active:scale-[0.97] focus:outline-none"
                  >
                    <span>Rút gọn</span>
                    <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </motion.section>

      {/* 3. ĐIỂM NHẤN CỦA BẠN (THEO THÁNG) */}
      <motion.section
        {...blockMotion(2)}
        className="p-6 rounded-2xl border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card shadow-subtle space-y-4"
      >
        <div className="flex items-center justify-between border-b border-hairline dark:border-hairline-dark pb-3">
          <h3 className="font-display font-bold text-base text-ink dark:text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Điểm nhấn của bạn
          </h3>
          <span className="text-xs text-mute font-sans">
            {highlights?.monthLabel || 'Tháng này'}
          </span>
        </div>

        {topSongs.length === 0 && topArtists.length === 0 ? (
          <div className="py-10 text-center space-y-1.5 text-xs text-mute">
            <Music className="w-5 h-5 mx-auto opacity-50" />
            <p>Chưa có dữ liệu tổng kết trong tháng này. Hãy nghe thêm vài bài hát nhé!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top 5 Bài hát */}
            <div className="p-4 rounded-xl bg-surface-soft/50 dark:bg-surface-dark-soft/50 border border-hairline/60 dark:border-hairline-dark/60 space-y-3">
              <div className="text-xs font-semibold text-ink dark:text-white flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-traffic-green" />
                <span>Top 5 bài hát tháng này</span>
              </div>
              {topSongs.length === 0 ? (
                <p className="text-xs text-mute py-4 text-center">Chưa có bài hát nào</p>
              ) : (
                <div className="space-y-2">
                  {topSongs.map((song, idx) => (
                    <div key={song.id} className="flex items-center gap-2.5 text-xs">
                      <span className="w-4 text-mute font-semibold tabular-nums shrink-0">
                        {idx + 1}.
                      </span>
                      <div className="w-8 h-8 rounded-md bg-canvas dark:bg-surface-dark-card border border-hairline/60 dark:border-hairline-dark/60 overflow-hidden shrink-0 flex items-center justify-center">
                        {song.coverUrl ? (
                          <img
                            src={song.coverUrl}
                            alt={song.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Music className="w-3.5 h-3.5 text-mute" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-ink dark:text-white truncate">
                          {song.title}
                        </div>
                        <div className="text-[11px] text-mute truncate">
                          {song.artists.join(', ') || 'Nghệ sĩ'}
                        </div>
                      </div>
                      <span className="text-[11px] text-mute tabular-nums shrink-0">
                        {song.count} lượt
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top 5 Nghệ sĩ */}
            <div className="p-4 rounded-xl bg-surface-soft/50 dark:bg-surface-dark-soft/50 border border-hairline/60 dark:border-hairline-dark/60 space-y-3">
              <div className="text-xs font-semibold text-ink dark:text-white flex items-center gap-1.5">
                <Mic2 className="w-3.5 h-3.5 text-traffic-green" />
                <span>Top 5 nghệ sĩ tháng này</span>
              </div>
              {topArtists.length === 0 ? (
                <p className="text-xs text-mute py-4 text-center">Chưa có nghệ sĩ nào</p>
              ) : (
                <div className="space-y-2.5">
                  {topArtists.map((artist, idx) => (
                    <div
                      key={artist.name}
                      className="flex items-center justify-between gap-2 text-xs py-1"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-4 text-mute font-semibold tabular-nums shrink-0">
                          {idx + 1}.
                        </span>
                        <span className="font-medium text-ink dark:text-white truncate">
                          {artist.name}
                        </span>
                      </div>
                      <span className="text-[11px] text-mute tabular-nums shrink-0">
                        {artist.count} lượt
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </motion.section>
    </div>
  );
};
