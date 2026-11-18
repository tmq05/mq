import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCw,
  Power,
  Clock,
  Radio,
  Server,
  Key,
  Zap,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Button } from '../common/Button.js';
import { Modal, ModalSection } from '../common/Modal.js';

interface QuotaInfo {
  name: string;
  displayName: string;
  used: number;
  limit: number;
  unit: string;
  percentage: number;
  isWarning: boolean;
  isExceeded: boolean;
  resetsAt: string;
  costPerRequest: number;
  rateLimitNote: string;
}

interface ProviderItem {
  name: string;
  enabled: boolean;
  status: 'operational' | 'warning' | 'quota_exceeded' | 'disabled';
  keyRequired: boolean;
  hasKey: boolean;
  quota?: QuotaInfo;
}

interface ProvidersResponse {
  providers: Record<string, ProviderItem>;
  summary: {
    total: number;
    active: number;
    warning: number;
  };
}

export const ProviderQuotaManager: React.FC = () => {
  const queryClient = useQueryClient();
  const shouldReduceMotion = useReducedMotion();
  const [testingSource, setTestingSource] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; latencyMs: number; message: string; timestamp: number }>
  >({});
  const [actionError, setActionError] = useState<string | null>(null);

  // Query: Providers & Quota status
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-providers-quota'],
    queryFn: async () => {
      const res = await api.get('/admin/providers');
      return res.data as ProvidersResponse;
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  // Mutation: Toggle Provider
  const toggleMutation = useMutation({
    mutationFn: async ({ name, enabled }: { name: string; enabled: boolean }) => {
      return api.patch(`/admin/providers/${name}/toggle`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-providers-quota'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || 'Không thể thay đổi trạng thái nguồn nhạc');
    },
  });

  // Handle test connection
  const handleTestConnection = async (name: string) => {
    setTestingSource(name);
    try {
      const res = await api.post(`/admin/providers/${name}/test`);
      setTestResults((prev) => ({
        ...prev,
        [name]: { ...res.data, timestamp: Date.now() },
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [name]: {
          success: false,
          latencyMs: 0,
          message: err.response?.data?.message || err.message || 'Lỗi kiểm tra kết nối',
          timestamp: Date.now(),
        },
      }));
    } finally {
      setTestingSource(null);
    }
  };

  const providers = data?.providers || {};
  const summary = data?.summary || { total: 0, active: 0, warning: 0 };

  const formatResetTime = (isoString?: string) => {
    if (!isoString) return 'Chưa xác định';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString('vi-VN');
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card flex items-center justify-between">
          <div>
            <div className="text-xs text-mute font-medium">Tổng số nguồn API</div>
            <div className="text-2xl font-bold font-sans text-ink dark:text-white mt-1">
              {summary.total}
            </div>
            <div className="text-[11px] text-mute mt-0.5">8 tích hợp bên thứ ba</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Radio className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card flex items-center justify-between">
          <div>
            <div className="text-xs text-mute font-medium">Nguồn đang hoạt động</div>
            <div className="text-2xl font-bold font-sans text-green-500 mt-1">
              {summary.active} / {summary.total}
            </div>
            <div className="text-[11px] text-green-600 dark:text-green-400 mt-0.5">
              Sẵn sàng phân phối nhạc
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div
          className={`p-4 rounded-card border transition-all flex items-center justify-between ${
            summary.warning > 0
              ? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400'
              : 'border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card'
          }`}
        >
          <div>
            <div className="text-xs font-medium text-mute">Cảnh báo Quota (≥ 80%)</div>
            <div className="text-2xl font-bold font-sans mt-1 text-amber-500">
              {summary.warning}
            </div>
            <div className="text-[11px] text-mute mt-0.5">
              {summary.warning > 0 ? 'Cần chú ý mức tiêu thụ' : 'Tất cả mức dùng ổn định'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Toolbar / Header Actions */}
      <div className="flex items-center justify-between pt-2">
        <h3 className="font-semibold text-sm text-ink dark:text-white flex items-center gap-2">
          <Server className="w-4 h-4 text-mute" />
          Trạng thái Quota & Kết nối API ({Object.keys(providers).length})
        </h3>

        <Button size="sm" variant="secondary" onClick={() => refetch()} className="flex items-center gap-1.5">
          <RotateCw className="w-3.5 h-3.5" />
          Làm mới trạng thái
        </Button>
      </div>

      {/* Providers Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-mute text-xs">Đang tải trạng thái các nguồn nhạc...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Object.entries(providers).map(([key, item]) => {
            const quota = item.quota;
            const percentage = quota?.percentage ?? 0;
            const isWarning = quota?.isWarning ?? false;
            const isExceeded = quota?.isExceeded ?? false;
            const testResult = testResults[key];
            const isTesting = testingSource === key;

            return (
              <div
                key={key}
                className={`p-5 rounded-card border transition-all flex flex-col justify-between space-y-4 ${
                  !item.enabled
                    ? 'border-hairline dark:border-hairline-dark bg-surface-soft/20 dark:bg-surface-dark-soft/20 opacity-80'
                    : isExceeded
                    ? 'border-red-500/50 bg-red-500/5'
                    : isWarning
                    ? 'border-amber-500/50 bg-amber-500/5'
                    : 'border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card'
                }`}
              >
                {/* Header: Name + Status badge + Toggle Button */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-card flex items-center justify-center shrink-0 ${
                          !item.enabled
                            ? 'bg-surface-soft dark:bg-surface-dark-soft text-mute'
                            : isWarning
                            ? 'bg-amber-500/15 text-amber-500'
                            : 'bg-green-500/15 text-green-500'
                        }`}
                      >
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-ink dark:text-white flex items-center gap-1.5">
                          {quota?.displayName || item.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] font-sans text-mute mt-0.5">
                          <span className="uppercase font-semibold">[{key}]</span>
                          {item.keyRequired ? (
                            <span className="flex items-center gap-1">
                              <Key className="w-3 h-3" />
                              {item.hasKey ? 'Đã có API Key' : 'Thiếu API Key'}
                            </span>
                          ) : (
                            <span>Public API (Không cần key)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-sans px-2.5 py-0.5 rounded-pill font-semibold flex items-center gap-1 ${
                          !item.enabled
                            ? 'bg-surface-soft dark:bg-surface-dark-soft text-mute'
                            : isExceeded
                            ? 'bg-red-500/15 text-red-500'
                            : isWarning
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            : 'bg-green-500/15 text-green-600 dark:text-green-400'
                        }`}
                      >
                        {!item.enabled ? (
                          'Đã tắt'
                        ) : isExceeded ? (
                          <>
                            <XCircle className="w-3 h-3" /> Vượt Quota
                          </>
                        ) : isWarning ? (
                          <>
                            <AlertTriangle className="w-3 h-3" /> Cảnh báo ≥ 80%
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Sẵn sàng
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Quota Progress Bar & Stats */}
                  {quota && (
                    <div className="space-y-2 pt-2 border-t border-hairline dark:border-hairline-dark">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-mute">
                          <span>Mức dùng hôm nay:</span>
                          <strong className="font-sans text-ink dark:text-white">
                            {quota.used.toLocaleString('vi-VN')} / {quota.limit.toLocaleString('vi-VN')} {quota.unit}
                          </strong>
                        </div>
                        <span
                          className={`font-sans text-xs font-bold ${
                            isWarning ? 'text-amber-500' : 'text-ink dark:text-white'
                          }`}
                        >
                          {percentage}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 rounded-full bg-surface-soft dark:bg-surface-dark-soft overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isExceeded
                              ? 'bg-red-500'
                              : isWarning
                              ? 'bg-amber-500'
                              : percentage > 50
                              ? 'bg-blue-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(3, percentage))}%` }}
                        />
                      </div>

                      {/* Quota Info & Reset Time */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] font-sans text-mute pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          Reset chu kỳ: <strong className="text-ink dark:text-white">{formatResetTime(quota.resetsAt)}</strong>
                        </span>
                        <span>{quota.rateLimitNote}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Test Connection Result Box */}
                <AnimatePresence mode="wait" initial={false}>
                  {testResult && (
                    <motion.div
                      key={testResult.timestamp}
                      initial={
                        shouldReduceMotion
                          ? { opacity: 0 }
                          : { height: 0, opacity: 0, y: -6, scale: 0.97 }
                      }
                      animate={
                        shouldReduceMotion
                          ? { opacity: 1, transition: { duration: 0.12 } }
                          : {
                              height: 'auto',
                              opacity: 1,
                              y: 0,
                              scale: 1,
                              transition: {
                                height: { duration: 0.26, ease: [0.32, 0.72, 0, 1] },
                                opacity: { duration: 0.2, delay: 0.03 },
                                y: { duration: 0.24, ease: [0.32, 0.72, 0, 1] },
                                scale: { duration: 0.24, ease: [0.32, 0.72, 0, 1] },
                              },
                            }
                      }
                      exit={
                        shouldReduceMotion
                          ? { opacity: 0, transition: { duration: 0.1 } }
                          : {
                              height: 0,
                              opacity: 0,
                              y: -4,
                              transition: {
                                height: { duration: 0.2, ease: [0.32, 0.72, 0, 1] },
                                opacity: { duration: 0.12 },
                              },
                            }
                      }
                      className="overflow-hidden"
                    >
                      <div
                        className={`p-2.5 rounded-card text-xs font-sans border flex items-center justify-between ${
                          testResult.success
                            ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300'
                            : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {testResult.success ? (
                            <motion.span
                              initial={shouldReduceMotion ? false : { scale: 0.4, rotate: -20 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ type: 'spring', stiffness: 420, damping: 20 }}
                              className="inline-flex shrink-0"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-traffic-green" />
                            </motion.span>
                          ) : (
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span className="truncate font-medium">{testResult.message}</span>
                        </div>
                        {testResult.latencyMs > 0 && (
                          <span className="font-bold shrink-0 ml-2 tabular-nums">
                            ⚡ {testResult.latencyMs}ms
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Bottom Actions: Toggle & Ping Test */}
                <div className="flex items-center justify-between pt-3 border-t border-hairline dark:border-hairline-dark">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleTestConnection(key)}
                    disabled={isTesting || !item.enabled}
                    className="flex items-center gap-1.5"
                    title="Gửi truy vấn kiểm tra độ trễ và khả năng phản hồi của API"
                  >
                    <Zap className={`w-3.5 h-3.5 ${isTesting ? 'animate-pulse text-amber-500' : ''}`} />
                    {isTesting ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
                  </Button>

                  <Button
                    size="sm"
                    variant={item.enabled ? 'secondary' : 'primary'}
                    onClick={() => toggleMutation.mutate({ name: key, enabled: !item.enabled })}
                    disabled={toggleMutation.isPending}
                    className="flex items-center gap-1.5"
                  >
                    <Power className={`w-3.5 h-3.5 ${item.enabled ? 'text-red-500' : 'text-green-500'}`} />
                    {item.enabled ? 'Tạm tắt nguồn' : 'Bật nguồn nhạc'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal thông báo lỗi phân quyền / thao tác */}
      <Modal
        open={Boolean(actionError)}
        onClose={() => setActionError(null)}
        title="Không thể thực hiện"
        icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
        size="sm"
        bodyClassName="p-5 sm:p-6 space-y-5"
      >
        <ModalSection index={0}>
          <p className="text-sm text-mute leading-relaxed">{actionError}</p>
        </ModalSection>
        <ModalSection index={1} className="flex justify-end pt-1">
          <Button variant="primary" size="sm" onClick={() => setActionError(null)}>
            Đã hiểu
          </Button>
        </ModalSection>
      </Modal>
    </div>
  );
};
