import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  Sliders,
  MessageSquare,
  Power,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Search,
  Download,
  Trash2,
  Eye,
  Clock,
  Cpu,
  Wrench,
  ThumbsDown,
  ThumbsUp,
  Save,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Button } from '../common/Button.js';
import { SelectDropdown } from '../common/SelectDropdown.js';
import { Modal, ModalSection } from '../common/Modal.js';
import { TableSkeleton, ListSkeleton } from '../common/Loading.js';
import {
  SegmentedTabs,
  SegmentedTabContent,
  useTabDirection,
} from '../layout/SegmentedTabs.js';

const CHATBOT_ADMIN_TABS = [
  { id: 'settings', label: 'Cấu hình động', icon: <Sliders className="w-3.5 h-3.5" /> },
  { id: 'conversations', label: 'Nhật ký hội thoại', icon: <MessageSquare className="w-3.5 h-3.5" /> },
];

const FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả hội thoại' },
  { value: 'tool', label: 'Có gọi công cụ (Tool)' },
  { value: 'error', label: 'Có lỗi thực thi' },
  { value: 'bad_feedback', label: 'Bị đánh giá kém (👎)' },
  { value: 'flagged', label: 'Bị gắn cờ cảnh báo' },
];

const TOOL_DESCRIPTIONS: Record<string, string> = {
  search_songs: 'Tìm kiếm bài hát đa nguồn',
  get_current_track: 'Đọc bài hát đang phát từ context',
  get_favorites: 'Đọc danh sách bài hát yêu thích',
  get_listening_history: 'Đọc lịch sử nghe nhạc',
  get_playlists: 'Đọc danh sách playlist cá nhân',
  get_playlist_tracks: 'Đọc các bài hát trong playlist',
  get_recommendations: 'Gợi ý cá nhân hóa theo bài/nghệ sĩ/tâm trạng',
  get_artist_info: 'Tra cứu thông tin nghệ sĩ trong DB',
  explain_copyright: 'Giải thích nguồn nhạc & bản quyền Full/Preview',
  play_song: 'Phát nhạc trên giao diện (ui_action)',
  control_player: 'Điều khiển trình phát (play/pause/next/volume...)',
  add_to_queue: 'Thêm bài vào hàng chờ phát',
  open_lyrics: 'Mở bảng lời bài hát đồng bộ LRCLIB',
  navigate: 'Chuyển trang trên ứng dụng',
  create_playlist: 'Tạo playlist mới (cần xác nhận)',
  add_to_playlist: 'Thêm bài vào playlist (cần xác nhận)',
  remove_from_playlist: 'Gỡ bài khỏi playlist (cần xác nhận)',
  delete_playlist: 'Xóa playlist (luôn cần xác nhận)',
  get_stats: 'Xem thống kê hệ thống (chỉ Admin)',
  get_source_errors: 'Kiểm tra lỗi/quota nguồn nhạc (chỉ Admin)',
};

export const ChatbotManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState<'settings' | 'conversations'>('settings');
  const tabDirection = useTabDirection(CHATBOT_ADMIN_TABS, subTab);

  // State cho Cấu hình động
  const [draftSettings, setDraftSettings] = useState<any | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmSaveModalOpen, setConfirmSaveModalOpen] = useState(false);

  // State cho Nhật ký hội thoại
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

  // Cảnh báo khi rời trang nếu chưa lưu cấu hình
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // 1. Fetch Cấu hình động
  const {
    data: settingsData,
    isLoading: isLoadingSettings,
    isError: isSettingsError,
    error: settingsErrorObj,
  } = useQuery({
    queryKey: ['admin-chatbot-settings'],
    queryFn: async () => {
      const res = await api.get('/admin/chatbot/settings');
      return res.data;
    },
  });

  useEffect(() => {
    if (settingsData?.settings && !isDirty) {
      setDraftSettings(settingsData.settings);
    }
  }, [settingsData, isDirty]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.put('/admin/chatbot/settings', payload);
      return res.data;
    },
    onSuccess: (data) => {
      setDraftSettings(data.settings);
      setIsDirty(false);
      setConfirmSaveModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-chatbot-settings'] });
      setToast('Đã lưu cấu hình Trợ lý âm nhạc thành công!');
      setTimeout(() => setToast(null), 3200);
    },
  });

  // 2. Fetch Danh sách hội thoại
  const { data: convData, isLoading: isLoadingConvs } = useQuery({
    queryKey: ['admin-chatbot-conversations', page, search, filter, dateFrom, dateTo],
    queryFn: async () => {
      const res = await api.get('/admin/chatbot/conversations', {
        params: {
          page,
          limit: 10,
          search: search.trim() || undefined,
          filter,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
      });
      return res.data;
    },
    enabled: subTab === 'conversations',
  });

  // 3. Fetch Chi tiết dòng thời gian hội thoại
  const { data: convDetailData, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['admin-chatbot-conversation-detail', selectedConvId],
    queryFn: async () => {
      const res = await api.get(`/admin/chatbot/conversations/${selectedConvId}`);
      return res.data?.conversation;
    },
    enabled: Boolean(selectedConvId),
  });

  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/admin/chatbot/conversations/cleanup');
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-chatbot-conversations'] });
      setToast(data.message || 'Đã dọn nhật ký cũ.');
      setTimeout(() => setToast(null), 3200);
    },
  });

  const handleUpdateField = (patch: Record<string, any>) => {
    setDraftSettings((prev: any) => ({ ...prev, ...patch }));
    setIsDirty(true);
  };

  const handleSaveClick = () => {
    if (!draftSettings || !settingsData?.settings) return;
    const orig = settingsData.settings;
    const isDangerousChange =
      draftSettings.enabled !== orig.enabled ||
      draftSettings.primaryModel !== orig.primaryModel;

    if (isDangerousChange) {
      setConfirmSaveModalOpen(true);
    } else {
      saveSettingsMutation.mutate(draftSettings);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const res = await api.get('/admin/chatbot/conversations/export', {
        params: { format },
        responseType: format === 'csv' ? 'blob' : 'json',
      });

      const blob =
        format === 'csv'
          ? new Blob([res.data], { type: 'text/csv;charset=utf-8;' })
          : new Blob([JSON.stringify(res.data, null, 2)], {
              type: 'application/json;charset=utf-8;',
            });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mq-chatbot-logs-${Date.now()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      setToast(`Đã xuất tệp ${format.toUpperCase()} (đã che dữ liệu nhạy cảm).`);
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast('Không thể xuất dữ liệu lúc này.');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const allowedModels: string[] = settingsData?.apiKeyStatus?.allowedModels || [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
  ];

  return (
    <div className="space-y-6">
      {/* Toast thông báo */}
      {toast && (
        <div className="fixed bottom-24 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-pill bg-traffic-green text-black text-xs font-semibold shadow-xl">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header & Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline dark:border-hairline-dark pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-traffic-green/15 border border-traffic-green/30 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5 text-traffic-green" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-ink dark:text-white">
              Quản trị Trợ lý âm nhạc mq
            </h2>
            <p className="text-xs text-mute">
              Điều khiển cấu hình động, bật/tắt công cụ, giới hạn tần suất và gỡ lỗi nhật ký hội thoại
            </p>
          </div>
        </div>

        <SegmentedTabs
          tabs={CHATBOT_ADMIN_TABS}
          activeId={subTab}
          ariaLabel="Chế độ quản lý chatbot"
          onChange={(id) => setSubTab(id as any)}
        />
      </div>

      <SegmentedTabContent activeKey={subTab} direction={tabDirection}>
        {/* ======================= TAB 1: CẤU HÌNH ĐỘNG ======================= */}
        {subTab === 'settings' && (
          <div className="space-y-6">
            {isLoadingSettings ? (
              <div className="rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card p-6">
                <ListSkeleton count={5} />
              </div>
            ) : isSettingsError || !draftSettings ? (
              <div className="rounded-card border border-red-500/20 bg-red-500/5 p-6 text-center space-y-2">
                <AlertTriangle className="w-6 h-6 text-red-500 mx-auto" />
                <p className="text-sm font-medium text-ink dark:text-white">
                  Không thể tải cấu hình Trợ lý AI
                </p>
                <p className="text-xs text-mute">
                  {(settingsErrorObj as any)?.response?.data?.message ||
                    'Vui lòng kiểm tra quyền truy cập hoặc thử tải lại trang.'}
                </p>
              </div>
            ) : (
              <>
                {/* Banner cảnh báo chưa lưu */}
                {isDirty && (
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-card bg-amber-500/10 border border-amber-500/30 text-xs">
                    <div className="flex items-center gap-2 text-amber-500 font-medium">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Bạn có thay đổi cấu hình chưa lưu.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setDraftSettings(settingsData?.settings);
                          setIsDirty(false);
                        }}
                        icon={<RotateCcw className="w-3.5 h-3.5" />}
                      >
                        Hoàn tác
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveClick}
                        disabled={saveSettingsMutation.isPending}
                        icon={<Save className="w-3.5 h-3.5" />}
                      >
                        {saveSettingsMutation.isPending ? 'Đang lưu...' : 'Lưu cấu hình'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* 1. Kill Switch & Trạng thái khóa API */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card p-5 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        <Power
                          className={`w-5 h-5 ${
                            draftSettings.enabled ? 'text-traffic-green' : 'text-red-500'
                          }`}
                        />
                        <div>
                          <h3 className="font-semibold text-sm text-ink dark:text-white">
                            Trạng thái hoạt động (Kill Switch)
                          </h3>
                          <p className="text-xs text-mute">
                            Khi tắt, toàn bộ người dùng sẽ nhận thông báo bảo trì bên dưới
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={draftSettings.enabled}
                        onClick={() => handleUpdateField({ enabled: !draftSettings.enabled })}
                        className={`px-3.5 py-1.5 rounded-pill text-xs font-semibold transition-colors cursor-pointer ${
                          draftSettings.enabled
                            ? 'bg-traffic-green text-black'
                            : 'bg-red-500/20 text-red-500 border border-red-500/30'
                        }`}
                      >
                        {draftSettings.enabled ? 'ĐANG BẬT' : 'ĐANG TẮT (BẢO TRÌ)'}
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-mute mb-1.5">
                        Thông báo hiển thị khi tạm bảo trì:
                      </label>
                      <input
                        type="text"
                        value={draftSettings.maintenanceMessage || ''}
                        onChange={(e) =>
                          handleUpdateField({ maintenanceMessage: e.target.value })
                        }
                        className="w-full h-9 px-3.5 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-xs text-ink dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Trạng thái khóa API (Không lộ key) */}
                  <div className="rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card p-5 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-mute uppercase">
                          Kết nối Mô hình AI
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-pill text-[11px] font-semibold ${
                            settingsData?.apiKeyStatus?.configured
                              ? 'bg-traffic-green/15 text-traffic-green'
                              : 'bg-amber-500/15 text-amber-500'
                          }`}
                        >
                          {settingsData?.apiKeyStatus?.configured
                            ? 'Đã cấu hình API Key'
                            : 'Chế độ NLU nội bộ'}
                        </span>
                      </div>
                      <p className="text-xs text-mute leading-relaxed">
                        Khóa <code className="text-ink dark:text-white">GEMINI_API_KEY</code> được
                        bảo mật tuyệt đối trên biến môi trường máy chủ, không bao giờ gửi xuống
                        trình duyệt.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-hairline dark:border-hairline-dark flex items-center justify-between text-xs">
                      <span className="text-mute">Bộ nhớ đệm cấu hình:</span>
                      <span className="font-semibold text-ink dark:text-white">TTL 45 giây</span>
                    </div>
                  </div>
                </div>

                {/* 2. Cấu hình Model & Vòng lặp Agent */}
                <div className="rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-hairline dark:border-hairline-dark pb-3">
                    <Cpu className="w-4 h-4 text-traffic-green" />
                    <h3 className="font-semibold text-sm text-ink dark:text-white">
                      Mô hình ngôn ngữ & Vòng lặp Agent
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block text-mute font-medium mb-1.5">
                        Model chính (Gợi ý / Hỏi đáp phức tạp)
                      </label>
                      <SelectDropdown
                        value={draftSettings.primaryModel}
                        options={allowedModels.map((m) => ({ value: m, label: m }))}
                        onChange={(val) => handleUpdateField({ primaryModel: val })}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-mute font-medium mb-1.5">
                        Model phụ (Lệnh điều khiển nhanh)
                      </label>
                      <SelectDropdown
                        value={draftSettings.secondaryModel}
                        options={allowedModels.map((m) => ({ value: m, label: m }))}
                        onChange={(val) => handleUpdateField({ secondaryModel: val })}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-mute font-medium mb-1.5">
                        Max Output Tokens ({draftSettings.maxTokens})
                      </label>
                      <input
                        type="number"
                        min={100}
                        max={2048}
                        value={draftSettings.maxTokens}
                        onChange={(e) =>
                          handleUpdateField({ maxTokens: Number(e.target.value) || 800 })
                        }
                        className="w-full h-9 px-3 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-ink dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-mute font-medium mb-1.5">
                        Temperature ({draftSettings.temperature})
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min={0}
                        max={1}
                        value={draftSettings.temperature}
                        onChange={(e) =>
                          handleUpdateField({
                            temperature: Math.min(1, Math.max(0, Number(e.target.value) || 0)),
                          })
                        }
                        className="w-full h-9 px-3 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-ink dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-mute font-medium mb-1.5">
                        Số vòng lặp Agent tối đa ({draftSettings.maxAgentIterations})
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={8}
                        value={draftSettings.maxAgentIterations}
                        onChange={(e) =>
                          handleUpdateField({
                            maxAgentIterations: Math.min(
                              8,
                              Math.max(1, Number(e.target.value) || 5)
                            ),
                          })
                        }
                        className="w-full h-9 px-3 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-ink dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-mute font-medium mb-1.5">
                        Timeout mỗi Tool (ms) & Lưu log (ngày)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          min={1000}
                          max={20000}
                          step={500}
                          value={draftSettings.toolTimeoutMs}
                          onChange={(e) =>
                            handleUpdateField({ toolTimeoutMs: Number(e.target.value) || 8000 })
                          }
                          title="Timeout mỗi tool (ms)"
                          className="w-full h-9 px-3 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-ink dark:text-white"
                        />
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={draftSettings.retentionDays}
                          onChange={(e) =>
                            handleUpdateField({ retentionDays: Number(e.target.value) || 30 })
                          }
                          title="Số ngày lưu nhật ký hội thoại"
                          className="w-full h-9 px-3 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-ink dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Rate Limit theo vai trò */}
                <div className="rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-hairline dark:border-hairline-dark pb-3">
                    <ShieldAlert className="w-4 h-4 text-traffic-green" />
                    <h3 className="font-semibold text-sm text-ink dark:text-white">
                      Giới hạn tần suất (Rate Limit) theo vai trò
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {(['GUEST', 'USER', 'ADMIN'] as const).map((roleKey) => {
                      const rl = draftSettings.rateLimits?.[roleKey] || {
                        perMinute: 20,
                        perDay: 200,
                        maxMessageLength: 1000,
                      };
                      const roleLabel =
                        roleKey === 'GUEST'
                          ? 'Khách chưa đăng nhập (GUEST)'
                          : roleKey === 'USER'
                            ? 'Thành viên (USER)'
                            : 'Quản trị viên (ADMIN)';

                      return (
                        <div
                          key={roleKey}
                          className="p-4 rounded-xl bg-surface-soft/50 dark:bg-surface-dark-soft/50 border border-hairline dark:border-hairline-dark space-y-3"
                        >
                          <div className="font-semibold text-ink dark:text-white">{roleLabel}</div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[11px] text-mute mb-1">Tin / phút</label>
                              <input
                                type="number"
                                min={1}
                                max={500}
                                value={rl.perMinute}
                                onChange={(e) =>
                                  handleUpdateField({
                                    rateLimits: {
                                      ...draftSettings.rateLimits,
                                      [roleKey]: {
                                        ...rl,
                                        perMinute: Number(e.target.value) || 10,
                                      },
                                    },
                                  })
                                }
                                className="w-full h-8 px-2.5 rounded-lg bg-canvas dark:bg-surface-dark-card border border-hairline dark:border-hairline-dark text-ink dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-mute mb-1">Tin / ngày</label>
                              <input
                                type="number"
                                min={1}
                                max={10000}
                                value={rl.perDay}
                                onChange={(e) =>
                                  handleUpdateField({
                                    rateLimits: {
                                      ...draftSettings.rateLimits,
                                      [roleKey]: {
                                        ...rl,
                                        perDay: Number(e.target.value) || 100,
                                      },
                                    },
                                  })
                                }
                                className="w-full h-8 px-2.5 rounded-lg bg-canvas dark:bg-surface-dark-card border border-hairline dark:border-hairline-dark text-ink dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-mute mb-1">Ký tự tối đa</label>
                              <input
                                type="number"
                                min={50}
                                max={4000}
                                value={rl.maxMessageLength}
                                onChange={(e) =>
                                  handleUpdateField({
                                    rateLimits: {
                                      ...draftSettings.rateLimits,
                                      [roleKey]: {
                                        ...rl,
                                        maxMessageLength: Number(e.target.value) || 800,
                                      },
                                    },
                                  })
                                }
                                className="w-full h-8 px-2.5 rounded-lg bg-canvas dark:bg-surface-dark-card border border-hairline dark:border-hairline-dark text-ink dark:text-white"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Bật/tắt từng Tool & Phân quyền theo vai trò */}
                <div className="rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-hairline dark:border-hairline-dark pb-3">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-traffic-green" />
                      <h3 className="font-semibold text-sm text-ink dark:text-white">
                        Quản lý Công cụ (Tools) & Phân quyền gọi hàm
                      </h3>
                    </div>
                    <span className="text-xs text-mute">
                      Tool tắt sẽ không được đăng ký cho mô hình AI
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-soft dark:bg-surface-dark-soft text-mute uppercase font-sans border-b border-hairline dark:border-hairline-dark">
                        <tr>
                          <th className="p-3">Tên công cụ (Tool)</th>
                          <th className="p-3">Mô tả chức năng</th>
                          <th className="p-3">Vai trò được phép</th>
                          <th className="p-3 text-right">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline dark:divide-hairline-dark">
                        {Object.entries(draftSettings.tools || {}).map(
                          ([toolName, policy]: [string, any]) => {
                            const toggleRole = (role: 'GUEST' | 'USER' | 'ADMIN') => {
                              const currentRoles: string[] = policy.allowedRoles || ['USER', 'ADMIN'];
                              const exists = currentRoles.includes(role);
                              const nextRoles = exists
                                ? currentRoles.filter((r) => r !== role)
                                : [...currentRoles, role];
                              if (nextRoles.length === 0) return;
                              handleUpdateField({
                                tools: {
                                  ...draftSettings.tools,
                                  [toolName]: {
                                    ...policy,
                                    allowedRoles: nextRoles,
                                  },
                                },
                              });
                            };

                            return (
                              <tr
                                key={toolName}
                                className="hover:bg-surface-soft/40 dark:hover:bg-surface-dark-soft/40"
                              >
                                <td className="p-3 font-mono font-semibold text-ink dark:text-white">
                                  {toolName}
                                </td>
                                <td className="p-3 text-mute">
                                  {TOOL_DESCRIPTIONS[toolName] || 'Công cụ trợ lý âm nhạc'}
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-1.5">
                                    {(['GUEST', 'USER', 'ADMIN'] as const).map((r) => {
                                      const active = policy.allowedRoles?.includes(r);
                                      return (
                                        <button
                                          key={r}
                                          type="button"
                                          onClick={() => toggleRole(r)}
                                          className={`px-2 py-0.5 rounded-pill text-[10px] font-semibold transition-colors cursor-pointer ${
                                            active
                                              ? 'bg-ink text-white dark:bg-white dark:text-black'
                                              : 'bg-surface-soft dark:bg-surface-dark-soft text-mute'
                                          }`}
                                        >
                                          {r}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </td>
                                <td className="p-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateField({
                                        tools: {
                                          ...draftSettings.tools,
                                          [toolName]: {
                                            ...policy,
                                            enabled: !policy.enabled,
                                          },
                                        },
                                      })
                                    }
                                    className={`px-3 py-1 rounded-pill text-[11px] font-semibold transition-colors cursor-pointer ${
                                      policy.enabled
                                        ? 'bg-traffic-green/15 text-traffic-green'
                                        : 'bg-neutral-500/15 text-mute'
                                    }`}
                                  >
                                    {policy.enabled ? 'Đang bật' : 'Đã tắt'}
                                  </button>
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={handleSaveClick}
                      disabled={!isDirty || saveSettingsMutation.isPending}
                      icon={<Save className="w-4 h-4" />}
                    >
                      {saveSettingsMutation.isPending ? 'Đang lưu...' : 'Lưu toàn bộ cấu hình'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ======================= TAB 2: NHẬT KÝ HỘI THOẠI ======================= */}
        {subTab === 'conversations' && (
          <div className="space-y-4">
            {/* Thanh công cụ tìm kiếm, lọc & xuất CSV/JSON */}
            <div className="rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="w-3.5 h-3.5 text-mute absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Tìm theo người dùng, nội dung, tên tool..."
                    className="w-full h-9 pl-9 pr-3 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-xs text-ink dark:text-white focus:outline-none"
                  />
                </div>

                <SelectDropdown
                  value={filter}
                  options={FILTER_OPTIONS}
                  onChange={(val) => {
                    setFilter(val);
                    setPage(1);
                  }}
                />

                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  title="Từ ngày"
                  className="h-9 px-3 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-xs text-ink dark:text-white"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  title="Đến ngày"
                  className="h-9 px-3 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-xs text-ink dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleExport('csv')}
                  icon={<Download className="w-3.5 h-3.5" />}
                >
                  Xuất CSV
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleExport('json')}
                  icon={<Download className="w-3.5 h-3.5" />}
                >
                  Xuất JSON
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => cleanupMutation.mutate()}
                  disabled={cleanupMutation.isPending}
                  icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
                >
                  Dọn log cũ
                </Button>
              </div>
            </div>

            {/* Bảng danh sách hội thoại */}
            <div className="rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card overflow-hidden">
              {isLoadingConvs ? (
                <TableSkeleton rows={6} />
              ) : !convData?.conversations || convData.conversations.length === 0 ? (
                <div className="py-16 text-center text-xs text-mute space-y-2">
                  <MessageSquare className="w-8 h-8 mx-auto stroke-1 text-mute" />
                  <p>Không tìm thấy nhật ký hội thoại nào phù hợp bộ lọc.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-soft dark:bg-surface-dark-soft text-mute uppercase font-sans border-b border-hairline dark:border-hairline-dark">
                      <tr>
                        <th className="p-3">Thời gian</th>
                        <th className="p-3">Người dùng</th>
                        <th className="p-3">Tin nhắn mở đầu</th>
                        <th className="p-3">Công cụ đã gọi</th>
                        <th className="p-3">Model / Token</th>
                        <th className="p-3">Chi phí / Độ trễ</th>
                        <th className="p-3">Cờ / Đánh giá</th>
                        <th className="p-3 text-right">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline dark:divide-hairline-dark">
                      {convData.conversations.map((conv: any) => (
                        <tr
                          key={conv.id}
                          className="hover:bg-surface-soft/40 dark:hover:bg-surface-dark-soft/40"
                        >
                          <td className="p-3 whitespace-nowrap text-mute font-sans">
                            {new Date(conv.startedAt).toLocaleString('vi-VN')}
                          </td>
                          <td className="p-3">
                            <div className="font-medium text-ink dark:text-white">
                              {conv.userName || 'Khách ẩn danh'}
                            </div>
                            <div className="text-[10px] text-mute font-mono">
                              IP: {conv.ipHash || '—'}
                            </div>
                          </td>
                          <td className="p-3 max-w-xs truncate text-ink dark:text-neutral-200">
                            {conv.previewMessage || '—'}
                          </td>
                          <td className="p-3">
                            {conv.toolsSummary?.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {conv.toolsSummary.map((tName: string, idx: number) => (
                                  <span
                                    key={`${tName}-${idx}`}
                                    className="px-2 py-0.5 rounded-pill bg-traffic-green/12 text-traffic-green font-mono text-[10px]"
                                  >
                                    {tName}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-mute">—</span>
                            )}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="font-mono text-[11px] text-ink dark:text-white">
                              {conv.model}
                            </div>
                            <div className="text-[10px] text-mute">
                              {conv.totalTokens} tokens ({conv.totalTokenIn} in / {conv.totalTokenOut} out)
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap font-sans">
                            <div className="text-ink dark:text-white font-medium">
                              ${Number(conv.cost || 0).toFixed(5)}
                            </div>
                            <div className="text-[10px] text-mute">{conv.latencyMs} ms</div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              {conv.flagged && (
                                <span
                                  title={conv.flagReason || 'Đáng ngờ'}
                                  className="px-2 py-0.5 rounded-pill bg-amber-500/15 text-amber-500 text-[10px] font-semibold"
                                >
                                  Gắn cờ
                                </span>
                              )}
                              {conv.hasError && (
                                <span className="px-2 py-0.5 rounded-pill bg-red-500/15 text-red-500 text-[10px] font-semibold">
                                  Lỗi
                                </span>
                              )}
                              {conv.hasBadFeedback && (
                                <span className="px-2 py-0.5 rounded-pill bg-rose-500/15 text-rose-500 text-[10px] font-semibold inline-flex items-center gap-1">
                                  <ThumbsDown className="w-2.5 h-2.5" /> 👎
                                </span>
                              )}
                              {!conv.flagged && !conv.hasError && !conv.hasBadFeedback && (
                                <span className="text-[10px] text-traffic-green">Bình thường</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedConvId(conv.id)}
                              icon={<Eye className="w-3.5 h-3.5" />}
                            >
                              Dòng thời gian
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Phân trang */}
              {convData?.pagination && convData.pagination.totalPages > 1 && (
                <div className="p-3 border-t border-hairline dark:border-hairline-dark flex items-center justify-between text-xs text-mute">
                  <span>
                    Trang {convData.pagination.page} / {convData.pagination.totalPages} (Tổng{' '}
                    {convData.pagination.total} hội thoại)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      icon={<ChevronLeft className="w-3.5 h-3.5" />}
                    >
                      Trước
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={page >= convData.pagination.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      icon={<ChevronRight className="w-3.5 h-3.5" />}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </SegmentedTabContent>

      {/* ======================= MODAL 1: XÁC NHẬN THAY ĐỔI NGUY HIỂM ======================= */}
      <Modal
        open={confirmSaveModalOpen}
        onClose={() => setConfirmSaveModalOpen(false)}
        title="Xác nhận thay đổi cấu hình quan trọng"
        icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
        size="md"
        bodyClassName="p-5 sm:p-6 space-y-5"
      >
        <ModalSection index={0}>
          <p className="text-sm text-mute leading-relaxed">
            Bạn đang thay đổi{' '}
            <strong className="text-ink dark:text-white">
              Trạng thái Bật/Tắt Chatbot (Kill Switch)
            </strong>{' '}
            hoặc{' '}
            <strong className="text-ink dark:text-white">Mô hình AI chính</strong>.
            Thay đổi này sẽ áp dụng ngay lập tức cho toàn bộ người dùng và được ghi vào Audit Log.
          </p>
        </ModalSection>
        <ModalSection index={1} className="flex justify-end gap-2.5 pt-1">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setConfirmSaveModalOpen(false)}
          >
            Hủy
          </Button>
          <Button
            size="sm"
            onClick={() => saveSettingsMutation.mutate(draftSettings)}
            disabled={saveSettingsMutation.isPending}
          >
            {saveSettingsMutation.isPending ? 'Đang lưu...' : 'Xác nhận lưu'}
          </Button>
        </ModalSection>
      </Modal>

      {/* ======================= MODAL 2: DÒNG THỜI GIAN CHI TIẾT HỘI THOẠI ======================= */}
      <Modal
        open={Boolean(selectedConvId)}
        onClose={() => setSelectedConvId(null)}
        title="Dòng thời gian chi tiết hội thoại (Timeline Debugger)"
        icon={<Clock className="w-4 h-4 text-traffic-green" />}
        size="xl"
        bodyClassName="p-5 sm:p-6 space-y-4"
        footer={
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" onClick={() => setSelectedConvId(null)}>
              Đóng
            </Button>
          </div>
        }
      >
        {isLoadingDetail ? (
          <ListSkeleton count={4} />
        ) : !convDetailData ? (
          <div className="py-12 text-center text-xs text-mute">
            Không tìm thấy dữ liệu hội thoại.
          </div>
        ) : (
          <div className="space-y-5 text-xs">
            {/* Tóm tắt metadata */}
            <ModalSection index={0}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-card bg-surface-soft/50 dark:bg-surface-dark-soft/50 border border-hairline dark:border-hairline-dark">
                <div>
                  <span className="text-[10px] text-mute uppercase block">Người dùng</span>
                  <strong className="text-ink dark:text-white">
                    {convDetailData.userName || 'Khách'} (IP: {convDetailData.ipHash})
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-mute uppercase block">Mô hình & Prompt</span>
                  <strong className="text-ink dark:text-white font-mono">
                    {convDetailData.model} (v{convDetailData.promptVersion?.version || 1})
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-mute uppercase block">Tổng Token & Chi phí</span>
                  <strong className="text-ink dark:text-white">
                    {convDetailData.totalTokens} tokens · ${Number(convDetailData.cost || 0).toFixed(5)}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-mute uppercase block">Độ trễ</span>
                  <strong className="text-ink dark:text-white">
                    {convDetailData.latencyMs} ms
                  </strong>
                </div>
              </div>
            </ModalSection>

            {convDetailData.flagged && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Cảnh báo tự động:</strong> {convDetailData.flagReason}
                </span>
              </div>
            )}

            {/* Dòng thời gian từng bước */}
            <ModalSection index={1} className="space-y-3">
              <h4 className="font-semibold text-ink dark:text-white uppercase text-[11px] tracking-wider">
                Diễn biến từng bước (Messages & Agent Tool Calls)
              </h4>

              <div className="space-y-3 border-l-2 border-traffic-green/40 pl-4 ml-2">
                {convDetailData.messages?.map((m: any) => (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-xl border border-hairline dark:border-hairline-dark bg-surface-soft/30 dark:bg-surface-dark-soft/30 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded-pill text-[10px] font-semibold uppercase ${
                          m.role === 'user'
                            ? 'bg-blue-500/15 text-blue-500'
                            : 'bg-traffic-green/15 text-traffic-green'
                        }`}
                      >
                        {m.role === 'user' ? 'Người dùng' : 'Trợ lý mq'}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-mute">
                        {m.feedback === 'up' && (
                          <span className="text-traffic-green inline-flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" /> Đánh giá tốt
                          </span>
                        )}
                        {m.feedback === 'down' && (
                          <span className="text-rose-500 inline-flex items-center gap-1">
                            <ThumbsDown className="w-3 h-3" /> Đánh giá kém ({m.feedbackReason})
                          </span>
                        )}
                        <span>{new Date(m.createdAt).toLocaleTimeString('vi-VN')}</span>
                      </div>
                    </div>

                    {/* Hiển thị nội dung tin nhắn dưới dạng văn bản thuần (escape tự động bởi React chống XSS) */}
                    <p className="text-ink dark:text-neutral-200 whitespace-pre-wrap leading-relaxed">
                      {m.content}
                    </p>
                  </div>
                ))}

                {/* Các bước gọi Tool trong hội thoại */}
                {convDetailData.toolCalls?.map((tc: any) => (
                  <div
                    key={tc.id}
                    className="p-3.5 rounded-xl border border-traffic-green/30 bg-traffic-green/5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-pill bg-traffic-green text-black font-mono text-[10px] font-bold">
                          Bước Tool #{tc.stepIndex}: {tc.toolName}
                        </span>
                        <span
                          className={`text-[10px] font-semibold ${
                            tc.status === 'error'
                              ? 'text-red-500'
                              : tc.status === 'needs_confirmation'
                                ? 'text-amber-500'
                                : 'text-traffic-green'
                          }`}
                        >
                          [{tc.status}]
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-mute">{tc.durationMs} ms</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                      <div className="p-2 rounded-lg bg-black/5 dark:bg-black/40 overflow-x-auto">
                        <div className="text-[10px] text-mute mb-1">Tham số đầu vào (args):</div>
                        <pre className="text-ink dark:text-neutral-300">
                          {JSON.stringify(tc.args, null, 2)}
                        </pre>
                      </div>
                      <div className="p-2 rounded-lg bg-black/5 dark:bg-black/40 overflow-x-auto">
                        <div className="text-[10px] text-mute mb-1">Kết quả rút gọn (resultSummary):</div>
                        <pre className="text-ink dark:text-neutral-300">
                          {JSON.stringify(tc.resultSummary, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ModalSection>
          </div>
        )}
      </Modal>
    </div>
  );
};
