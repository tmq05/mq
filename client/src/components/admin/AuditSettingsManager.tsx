import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Download,
  Search,
  CheckCircle2,
  User as UserIcon,
  Save,
  HardDrive,
  Globe,
  Lock,
  ChevronLeft,
  ChevronRight,
  Sliders,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { toast } from '../../stores/toast-store.js';
import { Button } from '../common/Button.js';
import { SelectDropdown } from '../common/SelectDropdown.js';
import { AnimatedTableBody } from '../common/AnimatedTableBody.js';
import { SegmentedTabs, SegmentedTabContent, useTabDirection } from '../layout/SegmentedTabs.js';

interface AuditLog {
  id: string;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  targetTitle?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

interface SystemSettingsState {
  siteName: string;
  maxUploadSizeMB: number;
  allowedAudioFormats: string[];
  registrationEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

export const AuditSettingsManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState<'audit' | 'settings'>('audit');

  // --- Audit Log State ---
  const [logPage, setLogPage] = useState(1);
  const [logAction, setLogAction] = useState('all');
  const [logSearch, setLogSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // --- Settings Form State ---
  const [siteName, setSiteName] = useState('');
  const [maxUploadSizeMB, setMaxUploadSizeMB] = useState(50);
  const [allowedFormats, setAllowedFormats] = useState<string[]>(['mp3', 'wav', 'flac', 'ogg', 'm4a']);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Query: Audit Logs
  const { data: logsData, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['admin-audit-logs', logPage, logAction, logSearch],
    queryFn: async () => {
      const res = await api.get('/admin/audit-logs', {
        params: {
          page: logPage,
          limit: 15,
          action: logAction,
          search: logSearch.trim() || undefined,
        },
      });
      return res.data as {
        logs: AuditLog[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        pagination?: { total: number; page: number; limit: number; totalPages: number };
      };
    },
    enabled: subTab === 'audit',
  });

  // Query: System Settings
  const { isLoading: isLoadingSettings } = useQuery({
    queryKey: ['admin-system-settings'],
    queryFn: async () => {
      const res = await api.get('/admin/settings');
      const s = res.data as SystemSettingsState;
      // Populate form fields
      setSiteName(s.siteName || '');
      setMaxUploadSizeMB(s.maxUploadSizeMB || 50);
      setAllowedFormats(s.allowedAudioFormats || ['mp3', 'wav', 'flac', 'ogg', 'm4a']);
      setRegistrationEnabled(s.registrationEnabled);
      setMaintenanceMode(s.maintenanceMode);
      setMaintenanceMessage(s.maintenanceMessage || '');
      return s;
    },
    enabled: subTab === 'settings',
  });

  // Export CSV
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const res = await api.get('/admin/audit-logs/export', {
        params: { action: logAction, search: logSearch.trim() || undefined },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mq-audit-logs-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể xuất file CSV nhật ký');
    } finally {
      setIsExporting(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSaveSuccess(false);
    try {
      await api.patch('/admin/settings', {
        siteName: siteName.trim(),
        maxUploadSizeMB: Number(maxUploadSizeMB),
        allowedAudioFormats: allowedFormats,
        registrationEnabled,
        maintenanceMode,
        maintenanceMessage: maintenanceMessage.trim(),
      });
      setSaveSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['admin-system-settings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể cập nhật cấu hình hệ thống');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'TOGGLE_USER_LOCK':
      case 'CHANGE_USER_ROLE':
      case 'DELETE_USER':
        return (
          <span className="px-2 py-0.5 rounded-pill font-sans text-[10px] bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold">
            Người dùng
          </span>
        );
      case 'CREATE_SONG':
      case 'UPDATE_SONG':
      case 'DELETE_SONG':
      case 'TOGGLE_SONG_VISIBILITY':
      case 'BATCH_SONG_ACTION':
        return (
          <span className="px-2 py-0.5 rounded-pill font-sans text-[10px] bg-purple-500/15 text-purple-600 dark:text-purple-400 font-semibold">
            Bài hát
          </span>
        );
      case 'CREATE_ARTIST':
      case 'UPDATE_ARTIST':
      case 'DELETE_ARTIST':
      case 'TOGGLE_ARTIST_VERIFIED':
        return (
          <span className="px-2 py-0.5 rounded-pill font-sans text-[10px] bg-green-500/15 text-green-600 dark:text-green-400 font-semibold">
            Nghệ sĩ
          </span>
        );
      case 'TOGGLE_PLAYLIST_PIN':
      case 'TOGGLE_PLAYLIST_BAN':
      case 'DELETE_PLAYLIST':
        return (
          <span className="px-2 py-0.5 rounded-pill font-sans text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold">
            Playlist
          </span>
        );
      case 'TAKEDOWN_REPORT':
      case 'UPDATE_REPORT':
      case 'DELETE_REPORT':
        return (
          <span className="px-2 py-0.5 rounded-pill font-sans text-[10px] bg-red-500/15 text-red-500 font-semibold">
            Báo cáo vi phạm
          </span>
        );
      case 'TOGGLE_PROVIDER':
        return (
          <span className="px-2 py-0.5 rounded-pill font-sans text-[10px] bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-semibold">
            Nguồn API
          </span>
        );
      case 'UPDATE_SETTINGS':
        return (
          <span className="px-2 py-0.5 rounded-pill font-sans text-[10px] bg-neutral-500/15 text-neutral-600 dark:text-neutral-400 font-semibold">
            Cài đặt
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-pill font-sans text-[10px] bg-surface-soft dark:bg-surface-dark-soft text-mute font-semibold">
            Hệ thống
          </span>
        );
    }
  };

  const allFormats = ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac'];

  const subTabs = [
    {
      id: 'audit',
      label: `Nhật ký hoạt động (${logsData?.pagination?.total ?? logsData?.total ?? 0})`,
      icon: <FileText className="w-3.5 h-3.5" />,
    },
    {
      id: 'settings',
      label: 'Cài đặt hệ thống',
      icon: <Sliders className="w-3.5 h-3.5" />,
    },
  ];
  const subTabDirection = useTabDirection(subTabs, subTab);

  return (
    <div className="space-y-6">
      {/* Sub-tab Segmented Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline dark:border-hairline-dark pb-3">
        <SegmentedTabs
          tabs={subTabs}
          activeId={subTab}
          ariaLabel="Nhật ký hoạt động và Cài đặt hệ thống"
          onChange={(id) => setSubTab(id as 'audit' | 'settings')}
        />

        {subTab === 'audit' && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center gap-1.5"
            title="Tải toàn bộ nhật ký kiểm toán dưới dạng file CSV"
          >
            <Download className="w-3.5 h-3.5" />
            {isExporting ? 'Đang xuất CSV...' : 'Xuất CSV'}
          </Button>
        )}
      </div>

      <SegmentedTabContent activeKey={subTab} direction={subTabDirection}>
      {/* ===================== TAB: AUDIT LOG ===================== */}
      {subTab === 'audit' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-soft/40 dark:bg-surface-dark-soft/40 p-3 rounded-card border border-hairline dark:border-hairline-dark">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
                <input
                  type="text"
                  placeholder="Tìm theo admin, mục tiêu, chi tiết..."
                  value={logSearch}
                  onChange={(e) => {
                    setLogSearch(e.target.value);
                    setLogPage(1);
                  }}
                  className="w-full bg-canvas dark:bg-surface-dark-card border border-hairline dark:border-hairline-dark rounded-pill pl-9 pr-3 py-1.5 text-xs text-ink dark:text-white placeholder-mute focus:outline-none focus:border-ink dark:focus:border-white"
                />
              </div>

              {/* Action Filter */}
              <SelectDropdown
                value={logAction}
                ariaLabel="Lọc hành động nhật ký"
                options={[
                  { value: 'all', label: 'Tất cả hành động' },
                  { value: 'TOGGLE_USER_LOCK', label: 'Khóa/Mở khóa User' },
                  { value: 'CHANGE_USER_ROLE', label: 'Đổi quyền User' },
                  { value: 'DELETE_USER', label: 'Xóa tài khoản' },
                  { value: 'CREATE_SONG', label: 'Tải lên bài hát' },
                  { value: 'UPDATE_SONG', label: 'Sửa bài hát' },
                  { value: 'DELETE_SONG', label: 'Xóa bài hát' },
                  { value: 'CREATE_ARTIST', label: 'Thêm nghệ sĩ' },
                  { value: 'TOGGLE_ARTIST_VERIFIED', label: 'Xác minh nghệ sĩ' },
                  { value: 'TOGGLE_PLAYLIST_PIN', label: 'Ghim Playlist' },
                  { value: 'TOGGLE_PLAYLIST_BAN', label: 'Gỡ vi phạm Playlist' },
                  { value: 'TAKEDOWN_REPORT', label: 'Gỡ nhanh vi phạm' },
                  { value: 'TOGGLE_PROVIDER', label: 'Bật/Tắt nguồn nhạc' },
                  { value: 'UPDATE_SETTINGS', label: 'Cập nhật Cài đặt' },
                ]}
                onChange={(val) => {
                  setLogAction(val);
                  setLogPage(1);
                }}
              />
            </div>

            <div className="text-xs text-mute font-sans">
              Tổng cộng {logsData?.pagination?.total ?? logsData?.total ?? 0} nhật ký
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-soft dark:bg-surface-dark-soft text-mute uppercase font-sans border-b border-hairline dark:border-hairline-dark">
                  <tr>
                    <th className="p-3">Thời gian</th>
                    <th className="p-3">Người thực hiện</th>
                    <th className="p-3">Phân loại</th>
                    <th className="p-3">Mã hành động</th>
                    <th className="p-3">Đối tượng</th>
                    <th className="p-3">Chi tiết</th>
                    <th className="p-3 text-right">Địa chỉ IP</th>
                  </tr>
                </thead>
                <AnimatedTableBody
                  transitionKey={`${logAction}:${logPage}:${logSearch}`}
                  className="divide-y divide-hairline dark:divide-hairline-dark"
                >
                  {isLoadingLogs ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-mute">
                        Đang tải danh sách nhật ký kiểm toán...
                      </td>
                    </tr>
                  ) : !logsData?.logs || logsData.logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-mute">
                        Chưa có bản ghi nhật ký hoạt động nào.
                      </td>
                    </tr>
                  ) : (
                    logsData.logs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-surface-soft/50 dark:hover:bg-surface-dark-soft/50 transition-colors"
                      >
                        {/* Time */}
                        <td className="p-3 whitespace-nowrap font-sans text-[11px] text-mute">
                          {new Date(log.createdAt).toLocaleString('vi-VN')}
                        </td>

                        {/* Admin Info */}
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-medium text-ink dark:text-white flex items-center gap-1.5">
                            <UserIcon className="w-3 h-3 text-mute" />
                            <span>{log.userName || 'Hệ thống'}</span>
                          </div>
                          <div className="text-[10px] font-sans text-mute">{log.userEmail || 'system@mq.vn'}</div>
                        </td>

                        {/* Category */}
                        <td className="p-3 whitespace-nowrap">{getActionBadge(log.action)}</td>

                        {/* Action Code */}
                        <td className="p-3 whitespace-nowrap font-sans text-[11px] font-bold text-ink dark:text-white">
                          {log.action}
                        </td>

                        {/* Target */}
                        <td className="p-3 max-w-[160px] truncate">
                          <span className="font-medium text-ink dark:text-white block truncate">
                            {log.targetTitle || log.targetType || 'Hệ thống'}
                          </span>
                          {log.targetId && (
                            <span className="text-[10px] font-sans text-mute block truncate">
                              #{log.targetId.slice(0, 8)}...
                            </span>
                          )}
                        </td>

                        {/* Details */}
                        <td className="p-3 max-w-xs text-mute truncate" title={log.details || ''}>
                          {log.details || '—'}
                        </td>

                        {/* IP Address */}
                        <td className="p-3 text-right font-sans text-[11px] text-mute whitespace-nowrap">
                          {log.ipAddress || '127.0.0.1'}
                        </td>
                      </tr>
                    ))
                  )}
                </AnimatedTableBody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {(logsData?.pagination?.totalPages ?? logsData?.totalPages ?? 1) > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-hairline dark:border-hairline-dark text-xs">
              <span className="text-mute font-sans">
                Trang {logsData?.pagination?.page ?? logsData?.page ?? logPage} /{' '}
                {logsData?.pagination?.totalPages ?? logsData?.totalPages ?? 1}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={logPage <= 1}
                  onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Trước
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={logPage >= (logsData?.pagination?.totalPages ?? logsData?.totalPages ?? 1)}
                  onClick={() => setLogPage((p) => p + 1)}
                >
                  Sau <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB: SYSTEM SETTINGS ===================== */}
      {subTab === 'settings' && (
        isLoadingSettings ? (
          <div className="p-8 text-center text-xs text-mute animate-pulse">
            Đang tải cấu hình hệ thống...
          </div>
        ) : (
        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-3xl">
          {/* Card 1: General Settings */}
          <div className="p-5 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-hairline dark:border-hairline-dark">
              <Globe className="w-4 h-4 text-mute" />
              <h4 className="font-semibold text-sm text-ink dark:text-white">Cấu hình chung</h4>
            </div>

            <div>
              <label className="block text-xs font-medium text-mute mb-1">Tên ứng dụng / Website *</label>
              <input
                type="text"
                required
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="mq - Âm nhạc tối giản & liền mạch"
                className="w-full bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark rounded-card p-2.5 text-xs text-ink dark:text-white focus:outline-none focus:border-ink dark:focus:border-white font-medium"
              />
              <span className="text-[11px] text-mute mt-1 block">
                Tên hiển thị trên thanh tiêu đề trình duyệt, header và email thông báo.
              </span>
            </div>
          </div>

          {/* Card 2: Upload Limits */}
          <div className="p-5 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-hairline dark:border-hairline-dark">
              <HardDrive className="w-4 h-4 text-mute" />
              <h4 className="font-semibold text-sm text-ink dark:text-white">Giới hạn tệp tải lên</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-mute mb-1">
                  Dung lượng tối đa mỗi tệp (MB) *
                </label>
                <input
                  type="number"
                  min="5"
                  max="500"
                  required
                  value={maxUploadSizeMB}
                  onChange={(e) => setMaxUploadSizeMB(Number(e.target.value))}
                  className="w-full bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark rounded-card p-2.5 text-xs text-ink dark:text-white font-sans focus:outline-none"
                />
                <span className="text-[11px] text-mute mt-1 block">
                  Giới hạn dung lượng áp dụng cho cả bài hát MP3/FLAC tải lên.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-mute mb-1">
                  Định dạng âm thanh được phép
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {allFormats.map((fmt) => {
                    const isChecked = allowedFormats.includes(fmt);
                    return (
                      <button
                        type="button"
                        key={fmt}
                        onClick={() => {
                          if (isChecked) {
                            if (allowedFormats.length > 1) {
                              setAllowedFormats(allowedFormats.filter((f) => f !== fmt));
                            }
                          } else {
                            setAllowedFormats([...allowedFormats, fmt]);
                          }
                        }}
                        className={`px-3 py-1 rounded-pill font-sans text-xs font-semibold uppercase transition-colors ${
                          isChecked
                            ? 'bg-ink dark:bg-white text-white dark:text-black shadow-xs'
                            : 'bg-surface-soft dark:bg-surface-dark-soft text-mute hover:text-ink dark:hover:text-white'
                        }`}
                      >
                        .{fmt}
                      </button>
                    );
                  })}
                </div>
                <span className="text-[11px] text-mute mt-1 block">
                  Chọn các định dạng chấp nhận khi người dùng hoặc admin tải lên.
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: System Access & Maintenance */}
          <div className="p-5 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-hairline dark:border-hairline-dark">
              <Lock className="w-4 h-4 text-mute" />
              <h4 className="font-semibold text-sm text-ink dark:text-white">Truy cập & Bảo trì</h4>
            </div>

            <div className="space-y-4">
              {/* Registration Toggle */}
              <div className="flex items-center justify-between p-3 rounded-card bg-surface-soft/40 dark:bg-surface-dark-soft/40 border border-hairline dark:border-hairline-dark">
                <div>
                  <h5 className="font-semibold text-xs text-ink dark:text-white">
                    Cho phép đăng ký tài khoản mới
                  </h5>
                  <p className="text-[11px] text-mute mt-0.5">
                    Khi tắt, chỉ người dùng hiện tại mới có thể đăng nhập. Người mới sẽ không thể đăng ký.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRegistrationEnabled(!registrationEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    registrationEnabled ? 'bg-green-500' : 'bg-surface-soft dark:bg-surface-dark-soft'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                      registrationEnabled ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Maintenance Toggle */}
              <div className="flex items-center justify-between p-3 rounded-card bg-surface-soft/40 dark:bg-surface-dark-soft/40 border border-hairline dark:border-hairline-dark">
                <div>
                  <h5 className="font-semibold text-xs text-ink dark:text-white flex items-center gap-1.5">
                    Chế độ bảo trì hệ thống
                    {maintenanceMode && (
                      <span className="px-2 py-0.5 rounded-pill font-sans text-[10px] bg-red-500/15 text-red-500 font-bold">
                        Đang bảo trì
                      </span>
                    )}
                  </h5>
                  <p className="text-[11px] text-mute mt-0.5">
                    Tạm khóa giao diện người dùng thường để cập nhật hệ thống. Quản trị viên vẫn truy cập bình thường.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMaintenanceMode(!maintenanceMode)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    maintenanceMode ? 'bg-red-500' : 'bg-surface-soft dark:bg-surface-dark-soft'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                      maintenanceMode ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Maintenance Message */}
              {maintenanceMode && (
                <div className="space-y-1 animate-in fade-in duration-200">
                  <label className="block text-xs font-medium text-mute">Thông báo hiển thị khi bảo trì</label>
                  <textarea
                    rows={3}
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                    placeholder="Hệ thống đang bảo trì định kỳ..."
                    className="w-full bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark rounded-card p-2.5 text-xs text-ink dark:text-white focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {saveSuccess && (
                <span className="text-green-600 dark:text-green-400 text-xs font-medium flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4" /> Đã lưu cấu hình hệ thống thành công!
                </span>
              )}
            </div>

            <Button type="submit" disabled={isSavingSettings} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              {isSavingSettings ? 'Đang lưu cấu hình...' : 'Lưu cấu hình hệ thống'}
            </Button>
          </div>
        </form>
        )
      )}
      </SegmentedTabContent>
    </div>
  );
};
