import React, { useState } from 'react';
import { BarChart3, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { PROFILE_ENHANCEMENTS_CONFIG } from '../../config/profile-enhancements.config.js';
import { SegmentedTabs, SegmentedTabContent, useTabDirection } from '../layout/SegmentedTabs.js';
import type { ProfileInsightsData } from './useProfileInsights.js';

interface ListeningChartPanelProps {
  insights?: ProfileInsightsData;
  totalHours: number;
  isLoading?: boolean;
}

const CHART_TABS = [
  { id: 'week', label: 'Theo tuần' },
  { id: 'month', label: 'Theo tháng' },
];

export const ListeningChartPanel: React.FC<ListeningChartPanelProps> = ({
  insights,
  totalHours,
  isLoading = false,
}) => {
  const [mode, setMode] = useState<'week' | 'month'>('week');
  const direction = useTabDirection(CHART_TABS, mode);

  if (!PROFILE_ENHANCEMENTS_CONFIG.enabled || !PROFILE_ENHANCEMENTS_CONFIG.listeningChart) {
    return null;
  }

  const data = mode === 'week' ? insights?.weeklyChart || [] : insights?.monthlyChart || [];
  const maxMinutes = Math.max(10, ...data.map((d) => d.minutes));
  const totalMinutesInRange = data.reduce((sum, d) => sum + d.minutes, 0);

  return (
    <section className="p-6 rounded-2xl border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card shadow-subtle space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline dark:border-hairline-dark pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          <h3 className="font-display font-bold text-base text-ink dark:text-white">
            Thống kê thời gian nghe ({totalHours}h tổng)
          </h3>
        </div>

        <SegmentedTabs
          tabs={CHART_TABS}
          activeId={mode}
          size="sm"
          ariaLabel="Chế độ xem biểu đồ nghe nhạc"
          onChange={(id) => setMode(id as 'week' | 'month')}
        />
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-xs text-mute">Đang tải biểu đồ nghe nhạc...</div>
      ) : (
        <SegmentedTabContent activeKey={mode} direction={direction}>
          {data.length === 0 ? (
            <div className="py-12 text-center space-y-2 text-xs text-mute">
              <BarChart3 className="w-6 h-6 mx-auto opacity-50" />
              <p>Chưa có dữ liệu nghe nhạc trong khoảng thời gian này.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-end justify-between gap-2 sm:gap-4 h-44 pt-4 px-2">
                {data.map((item, idx) => {
                  const heightPct =
                    item.minutes > 0 ? Math.max(8, Math.round((item.minutes / maxMinutes) * 100)) : 4;
                  return (
                    <div
                      key={`${mode}-${item.label}`}
                      className="flex-1 flex flex-col items-center gap-2 h-full justify-end group"
                    >
                      <span className="text-[11px] font-medium text-mute group-hover:text-ink dark:group-hover:text-white tabular-nums transition-colors">
                        {item.minutes}p
                      </span>
                      <div className="w-full max-w-[44px] flex-1 flex items-end">
                        <motion.div
                          initial={{ height: 0, opacity: 0.5 }}
                          animate={{ height: `${heightPct}%`, opacity: 1 }}
                          transition={{
                            duration: 0.42,
                            delay: idx * 0.035,
                            ease: [0.32, 0.72, 0, 1],
                          }}
                          className={`w-full rounded-t-xl transition-colors duration-200 ${
                            item.minutes > 0
                              ? 'bg-traffic-green/80 group-hover:bg-traffic-green'
                              : 'bg-neutral-200/70 dark:bg-neutral-800/70'
                          }`}
                          title={`${item.label}: ${item.minutes} phút`}
                        />
                      </div>
                      <span className="text-[11px] text-mute font-sans truncate max-w-full">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-mute text-right font-sans">
                Tổng thời lượng {mode === 'week' ? '7 ngày qua' : '4 tuần qua'}:{' '}
                <strong className="text-ink dark:text-white">{totalMinutesInRange} phút</strong>
              </p>
            </div>
          )}
        </SegmentedTabContent>
      )}
    </section>
  );
};
