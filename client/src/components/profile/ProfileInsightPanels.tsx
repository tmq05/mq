import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Flame, Headphones, Mic2, Music2 } from 'lucide-react';
import { api } from '../../api/client.js';
import { SongRow } from '../song/SongRow.js';
import { PROFILE_ENHANCEMENTS_CONFIG } from '../../config/profile-enhancements.config.js';
import type { UnifiedTrack } from '../../types/index.js';
import type { ProfileInsightsData } from './useProfileInsights.js';
import type { ExtendedInsightSection } from './ProfileExtendedStats.js';

interface ProfileInsightPanelsProps {
  section: ExtendedInsightSection;
  userId?: string;
  insights?: ProfileInsightsData;
  isInsightsLoading?: boolean;
}

export const ProfileInsightPanels: React.FC<ProfileInsightPanelsProps> = ({
  section,
  userId,
  insights,
  isInsightsLoading = false,
}) => {
  const { data: historyTracks, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['profile-history', userId],
    queryFn: async () => {
      const res = await api.get('/users/history');
      return (res.data?.history || []) as UnifiedTrack[];
    },
    enabled:
      Boolean(userId) &&
      PROFILE_ENHANCEMENTS_CONFIG.enabled &&
      PROFILE_ENHANCEMENTS_CONFIG.extendedStats &&
      section === 'history',
  });

  if (!PROFILE_ENHANCEMENTS_CONFIG.enabled || !PROFILE_ENHANCEMENTS_CONFIG.extendedStats) {
    return null;
  }

  if (section === 'history') {
    return (
      <section className="p-6 rounded-2xl border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card shadow-subtle space-y-4">
        <div className="flex items-center justify-between border-b border-hairline dark:border-hairline-dark pb-3">
          <h3 className="font-display font-bold text-base text-ink dark:text-white flex items-center gap-2">
            <Headphones className="w-4 h-4 text-violet-500" />
            Bài hát đã nghe gần đây ({insights?.totalPlays ?? historyTracks?.length ?? 0} lượt)
          </h3>
          <Link to="/library" className="text-xs font-medium text-traffic-green hover:underline">
            Xem trong Thư viện →
          </Link>
        </div>

        {isHistoryLoading ? (
          <div className="py-10 text-center text-xs text-mute">Đang tải lịch sử nghe nhạc...</div>
        ) : !historyTracks || historyTracks.length === 0 ? (
          <div className="py-12 text-center text-xs text-mute">
            Bạn chưa nghe bài hát nào gần đây.
          </div>
        ) : (
          <div className="divide-y divide-hairline/40 dark:divide-hairline-dark/40">
            {historyTracks.map((track, idx) => (
              <SongRow
                key={`${track.id}-${idx}`}
                track={track}
                index={idx}
                queueContext={historyTracks}
              />
            ))}
          </div>
        )}
      </section>
    );
  }

  if (section === 'streak') {
    const days = insights?.recentActiveDays || [];
    const activeCount = days.filter((d) => d.active).length;

    return (
      <section className="p-6 rounded-2xl border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card shadow-subtle space-y-5">
        <div className="flex items-center justify-between border-b border-hairline dark:border-hairline-dark pb-3">
          <h3 className="font-display font-bold text-base text-ink dark:text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            Chuỗi ngày nghe liên tiếp ({insights?.streakDays ?? 0} ngày)
          </h3>
          <span className="text-xs text-mute font-sans">
            {activeCount}/14 ngày gần đây có nghe nhạc
          </span>
        </div>

        {isInsightsLoading ? (
          <div className="py-10 text-center text-xs text-mute">Đang tải dữ liệu chuỗi ngày...</div>
        ) : (
          <div className="grid grid-cols-7 gap-2 sm:gap-3">
            {days.map((day, idx) => (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, delay: idx * 0.025 }}
                className={`p-2.5 rounded-xl border text-center space-y-1 transition-colors ${
                  day.active
                    ? 'bg-traffic-green/12 border-traffic-green/60 text-ink dark:text-white'
                    : 'bg-surface-soft/50 dark:bg-surface-dark-soft/50 border-hairline/60 dark:border-hairline-dark/60 text-mute'
                }`}
                title={`${day.label}: ${day.plays} lượt nghe`}
              >
                <div className="text-[11px] font-medium tabular-nums">{day.label}</div>
                <div
                  className={`mx-auto w-2.5 h-2.5 rounded-full ${
                    day.active ? 'bg-traffic-green' : 'bg-neutral-300 dark:bg-neutral-700'
                  }`}
                />
                <div className="text-[10px] text-mute tabular-nums">{day.plays} lượt</div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    );
  }

  if (section === 'top-artists') {
    const artists = insights?.topArtists || [];
    const maxCount = Math.max(1, ...artists.map((a) => a.count));

    return (
      <section className="p-6 rounded-2xl border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card shadow-subtle space-y-4">
        <div className="flex items-center justify-between border-b border-hairline dark:border-hairline-dark pb-3">
          <h3 className="font-display font-bold text-base text-ink dark:text-white flex items-center gap-2">
            <Mic2 className="w-4 h-4 text-emerald-500" />
            Nghệ sĩ bạn nghe nhiều nhất
          </h3>
          <Link to="/artists" className="text-xs font-medium text-traffic-green hover:underline">
            Khám phá nghệ sĩ →
          </Link>
        </div>

        {isInsightsLoading ? (
          <div className="py-10 text-center text-xs text-mute">Đang tải danh sách nghệ sĩ...</div>
        ) : artists.length === 0 ? (
          <div className="py-12 text-center text-xs text-mute">
            Chưa có dữ liệu nghệ sĩ nghe nhiều.
          </div>
        ) : (
          <div className="space-y-3">
            {artists.map((artist, idx) => {
              const pct = Math.max(8, Math.round((artist.count / maxCount) * 100));
              return (
                <div key={artist.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 text-mute font-semibold tabular-nums">#{idx + 1}</span>
                      <span className="font-semibold text-ink dark:text-white truncate">
                        {artist.name}
                      </span>
                    </div>
                    <span className="text-mute tabular-nums shrink-0">{artist.count} lượt nghe</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-soft dark:bg-surface-dark-soft overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.45, delay: idx * 0.04, ease: [0.32, 0.72, 0, 1] }}
                      className="h-full rounded-full bg-traffic-green"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  // section === 'top-genres'
  const genres = insights?.topGenres || [];
  const totalGenrePlays = Math.max(
    1,
    genres.reduce((sum, g) => sum + g.count, 0)
  );

  return (
    <section className="p-6 rounded-2xl border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card shadow-subtle space-y-4">
      <div className="flex items-center justify-between border-b border-hairline dark:border-hairline-dark pb-3">
        <h3 className="font-display font-bold text-base text-ink dark:text-white flex items-center gap-2">
          <Music2 className="w-4 h-4 text-sky-500" />
          Thể loại âm nhạc bạn nghe nhiều
        </h3>
        <Link to="/search" className="text-xs font-medium text-traffic-green hover:underline">
          Tìm theo thể loại →
        </Link>
      </div>

      {isInsightsLoading ? (
        <div className="py-10 text-center text-xs text-mute">Đang tải thống kê thể loại...</div>
      ) : genres.length === 0 ? (
        <div className="py-12 text-center text-xs text-mute">
          Chưa có dữ liệu thể loại âm nhạc.
        </div>
      ) : (
        <div className="space-y-3">
          {genres.map((genre, idx) => {
            const sharePct = Math.round((genre.count / totalGenrePlays) * 100);
            return (
              <div key={genre.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-mute font-semibold tabular-nums">#{idx + 1}</span>
                    <span className="font-semibold text-ink dark:text-white">{genre.name}</span>
                  </div>
                  <span className="text-mute tabular-nums">
                    {genre.count} lượt ({sharePct}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-soft dark:bg-surface-dark-soft overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(6, sharePct)}%` }}
                    transition={{ duration: 0.45, delay: idx * 0.04, ease: [0.32, 0.72, 0, 1] }}
                    className="h-full rounded-full bg-sky-500"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
