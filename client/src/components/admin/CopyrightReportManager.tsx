import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Shield,
  Music,
  ListMusic,
  User as UserIcon,
  FileText,
  Zap,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { toast } from '../../stores/toast-store.js';
import { Button } from '../common/Button.js';
import { SelectDropdown } from '../common/SelectDropdown.js';
import { AnimatedTableBody } from '../common/AnimatedTableBody.js';
import { Modal, ModalSection } from '../common/Modal.js';

interface Report {
  id: string;
  targetType: 'SONG' | 'PLAYLIST' | 'USER';
  targetId: string;
  targetTitle: string;
  reason: string;
  description?: string | null;
  reporterEmail?: string | null;
  reporterName?: string | null;
  status: 'PENDING' | 'PROCESSING' | 'RESOLVED' | 'REJECTED';
  type: 'COPYRIGHT' | 'INAPPROPRIATE' | 'SPAM' | 'OTHER';
  internalNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const CopyrightReportManager: React.FC = () => {
  const queryClient = useQueryClient();

  // Filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'PROCESSING' | 'RESOLVED' | 'REJECTED'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'COPYRIGHT' | 'INAPPROPRIATE' | 'SPAM' | 'OTHER'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Quick takedown confirm state
  const [takedownReport, setTakedownReport] = useState<Report | null>(null);

  // Notes Modal state
  const [editingNotesReport, setEditingNotesReport] = useState<{ id: string; notes: string } | null>(null);
  const [notesInput, setNotesInput] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Delete confirm state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Query: Fetch reports
  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['admin-reports', page, statusFilter, typeFilter, search],
    queryFn: async () => {
      const res = await api.get('/admin/reports', {
        params: {
          page,
          limit: 15,
          status: statusFilter,
          type: typeFilter,
          search: search.trim() || undefined,
        },
      });
      return res.data as {
        reports: Report[];
        stats: {
          pending: number;
          processing: number;
          resolved: number;
          rejected: number;
          total: number;
        };
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
        pagination?: { total: number; page: number; limit: number; totalPages: number };
      };
    },
  });

  // Mutation: Update status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, internalNotes }: { id: string; status: string; internalNotes?: string }) => {
      return api.patch(`/admin/reports/${id}`, { status, internalNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    },
  });

  // Mutation: Quick takedown
  const quickTakedownMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/admin/reports/${id}/takedown`);
    },
    onSuccess: () => {
      setTakedownReport(null);
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-songs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-playlists'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Không thể thực hiện gỡ nội dung nhanh');
    },
  });

  // Mutation: Delete report
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/admin/reports/${id}`);
    },
    onSuccess: () => {
      setDeleteConfirmId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    },
  });

  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNotesReport) return;
    setIsSavingNotes(true);
    try {
      await api.patch(`/admin/reports/${editingNotesReport.id}`, {
        internalNotes: notesInput.trim() || null,
      });
      setEditingNotesReport(null);
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể lưu ghi chú nội bộ');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const getTargetIcon = (type: string) => {
    switch (type) {
      case 'SONG':
        return <Music className="w-3.5 h-3.5" />;
      case 'PLAYLIST':
        return <ListMusic className="w-3.5 h-3.5" />;
      case 'USER':
        return <UserIcon className="w-3.5 h-3.5" />;
      default:
        return <Shield className="w-3.5 h-3.5" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'COPYRIGHT':
        return (
          <span className="px-2 py-0.5 rounded-pill text-[10px] font-sans bg-purple-500/15 text-purple-600 dark:text-purple-400 font-medium">
            Bản quyền
          </span>
        );
      case 'INAPPROPRIATE':
        return (
          <span className="px-2 py-0.5 rounded-pill text-[10px] font-sans bg-red-500/15 text-red-600 dark:text-red-400 font-medium">
            Nội dung xấu
          </span>
        );
      case 'SPAM':
        return (
          <span className="px-2 py-0.5 rounded-pill text-[10px] font-sans bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium">
            Spam / Gian lận
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-pill text-[10px] font-sans bg-surface-soft dark:bg-surface-dark-soft text-mute font-medium">
            Khác
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Counters Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => {
            setStatusFilter('PENDING');
            setPage(1);
          }}
          className={`p-3 rounded-card border cursor-pointer transition-all ${
            statusFilter === 'PENDING'
              ? 'border-amber-500/50 bg-amber-500/10'
              : 'border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card hover:border-amber-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-mute">
            <span>Mới chờ duyệt</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-sans text-amber-500 mt-1">
            {reportsData?.stats.pending ?? 0}
          </div>
        </div>

        <div
          onClick={() => {
            setStatusFilter('PROCESSING');
            setPage(1);
          }}
          className={`p-3 rounded-card border cursor-pointer transition-all ${
            statusFilter === 'PROCESSING'
              ? 'border-blue-500/50 bg-blue-500/10'
              : 'border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card hover:border-blue-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-mute">
            <span>Đang xử lý</span>
            <AlertTriangle className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-bold font-sans text-blue-500 mt-1">
            {reportsData?.stats.processing ?? 0}
          </div>
        </div>

        <div
          onClick={() => {
            setStatusFilter('RESOLVED');
            setPage(1);
          }}
          className={`p-3 rounded-card border cursor-pointer transition-all ${
            statusFilter === 'RESOLVED'
              ? 'border-green-500/50 bg-green-500/10'
              : 'border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card hover:border-green-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-mute">
            <span>Đã gỡ / Giải quyết</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          </div>
          <div className="text-xl font-bold font-sans text-green-500 mt-1">
            {reportsData?.stats.resolved ?? 0}
          </div>
        </div>

        <div
          onClick={() => {
            setStatusFilter('REJECTED');
            setPage(1);
          }}
          className={`p-3 rounded-card border cursor-pointer transition-all ${
            statusFilter === 'REJECTED'
              ? 'border-red-500/50 bg-red-500/10'
              : 'border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card hover:border-red-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-mute">
            <span>Đã từ chối</span>
            <XCircle className="w-3.5 h-3.5 text-mute" />
          </div>
          <div className="text-xl font-bold font-sans text-ink dark:text-white mt-1">
            {reportsData?.stats.rejected ?? 0}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-soft/40 dark:bg-surface-dark-soft/40 p-3 rounded-card border border-hairline dark:border-hairline-dark">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
            <input
              type="text"
              placeholder="Tìm theo nội dung, người gửi..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-canvas dark:bg-surface-dark-card border border-hairline dark:border-hairline-dark rounded-pill pl-9 pr-3 py-1.5 text-xs text-ink dark:text-white placeholder-mute focus:outline-none focus:border-ink dark:focus:border-white"
            />
          </div>

          {/* Status Filter */}
          <SelectDropdown
            value={statusFilter}
            ariaLabel="Lọc trạng thái báo cáo"
            options={[
              { value: 'all', label: 'Tất cả trạng thái' },
              { value: 'PENDING', label: 'Mới chờ duyệt (PENDING)' },
              { value: 'PROCESSING', label: 'Đang xử lý (PROCESSING)' },
              { value: 'RESOLVED', label: 'Đã gỡ / Giải quyết (RESOLVED)' },
              { value: 'REJECTED', label: 'Từ chối (REJECTED)' },
            ]}
            onChange={(val) => {
              setStatusFilter(val as any);
              setPage(1);
            }}
          />

          {/* Type Filter */}
          <SelectDropdown
            value={typeFilter}
            ariaLabel="Lọc lý do báo cáo"
            options={[
              { value: 'all', label: 'Tất cả lý do' },
              { value: 'COPYRIGHT', label: 'Bản quyền' },
              { value: 'INAPPROPRIATE', label: 'Nội dung xấu' },
              { value: 'SPAM', label: 'Spam' },
              { value: 'OTHER', label: 'Khác' },
            ]}
            onChange={(val) => {
              setTypeFilter(val as any);
              setPage(1);
            }}
          />
        </div>

        <div className="text-xs text-mute font-sans">
          Tổng cộng {reportsData?.pagination?.total ?? reportsData?.stats?.total ?? 0} báo cáo
        </div>
      </div>

      {/* Reports Table */}
      <div className="rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-soft dark:bg-surface-dark-soft text-mute uppercase font-sans border-b border-hairline dark:border-hairline-dark">
              <tr>
                <th className="p-3">Mục tiêu vi phạm</th>
                <th className="p-3">Loại vi phạm</th>
                <th className="p-3">Lý do & Mô tả</th>
                <th className="p-3">Người báo cáo</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Ghi chú nội bộ</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <AnimatedTableBody
              transitionKey={`${statusFilter}:${typeFilter}:${page}:${search}`}
              className="divide-y divide-hairline dark:divide-hairline-dark"
            >
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-mute">
                    Đang tải danh sách báo cáo vi phạm...
                  </td>
                </tr>
              ) : !reportsData?.reports || reportsData.reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-mute">
                    Không có báo cáo nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                reportsData.reports.map((report) => (
                  <tr
                    key={report.id}
                    className={`hover:bg-surface-soft/50 dark:hover:bg-surface-dark-soft/50 transition-colors ${
                      report.status === 'PENDING' ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    {/* Target info */}
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-full bg-surface-soft dark:bg-surface-dark-soft text-mute shrink-0">
                          {getTargetIcon(report.targetType)}
                        </span>
                        <div className="min-w-0">
                          <span className="font-semibold text-ink dark:text-white block truncate max-w-[180px]">
                            {report.targetTitle}
                          </span>
                          <span className="text-[10px] font-sans text-mute block">
                            [{report.targetType}] #{report.targetId.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Report Type Badge */}
                    <td className="p-3 whitespace-nowrap">
                      {getTypeBadge(report.type)}
                    </td>

                    {/* Reason & Details */}
                    <td className="p-3 max-w-xs">
                      <div className="font-medium text-ink dark:text-white truncate">
                        {report.reason}
                      </div>
                      {report.description && (
                        <p className="text-[11px] text-mute line-clamp-2 mt-0.5">
                          {report.description}
                        </p>
                      )}
                    </td>

                    {/* Reporter */}
                    <td className="p-3 whitespace-nowrap">
                      <div className="text-ink dark:text-white font-medium">
                        {report.reporterName || 'Người dùng ẩn danh'}
                      </div>
                      <div className="text-[10px] font-sans text-mute">
                        {report.reporterEmail || 'Không có email'}
                      </div>
                      <div className="text-[10px] font-sans text-mute mt-0.5">
                        {new Date(report.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </td>

                    {/* Status Dropdown */}
                    <td className="p-3 whitespace-nowrap">
                      <SelectDropdown
                        size="xs"
                        value={report.status}
                        ariaLabel="Cập nhật trạng thái báo cáo"
                        options={[
                          { value: 'PENDING', label: 'Mới (PENDING)' },
                          { value: 'PROCESSING', label: 'Đang xử lý (PROCESSING)' },
                          { value: 'RESOLVED', label: 'Đã gỡ (RESOLVED)' },
                          { value: 'REJECTED', label: 'Từ chối (REJECTED)' },
                        ]}
                        onChange={(val) =>
                          updateStatusMutation.mutate({
                            id: report.id,
                            status: val,
                          })
                        }
                      />
                    </td>

                    {/* Internal Notes */}
                    <td className="p-3 max-w-[200px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-mute italic line-clamp-2">
                          {report.internalNotes || 'Chưa có ghi chú'}
                        </span>
                        <button
                          onClick={() => {
                            setEditingNotesReport({ id: report.id, notes: report.internalNotes || '' });
                            setNotesInput(report.internalNotes || '');
                          }}
                          className="text-mute hover:text-ink dark:hover:text-white p-1 shrink-0"
                          title="Chỉnh sửa ghi chú nội bộ"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right space-x-1 whitespace-nowrap">
                      {report.status !== 'RESOLVED' && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setTakedownReport(report)}
                          className="flex-inline items-center gap-1 shadow-sm"
                          title="Gỡ nhanh nội dung vi phạm và tự động đánh dấu đã giải quyết"
                        >
                          <Zap className="w-3 h-3 fill-white" />
                          Gỡ nhanh
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => setDeleteConfirmId(report.id)}
                        title="Xóa báo cáo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </AnimatedTableBody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {(reportsData?.pagination?.totalPages ?? 1) > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-hairline dark:border-hairline-dark text-xs">
          <span className="text-mute font-sans">
            Trang {reportsData?.pagination?.page ?? page} / {reportsData?.pagination?.totalPages ?? 1}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Trước
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={page >= (reportsData?.pagination?.totalPages ?? 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ======================= MODAL: GỠ NỘI DUNG NHANH (QUICK TAKEDOWN) ======================= */}
      <Modal
        open={Boolean(takedownReport)}
        onClose={() => setTakedownReport(null)}
        title="Xác nhận gỡ nhanh nội dung vi phạm"
        icon={<Zap className="w-5 h-5 text-red-500 fill-red-500" />}
        size="md"
        bodyClassName="p-5 sm:p-6 space-y-5"
      >
        {takedownReport && (
          <>
            <ModalSection index={0}>
              <div className="p-3 bg-surface-soft/60 dark:bg-surface-dark-soft/60 rounded-card space-y-1.5 text-xs">
                <div>
                  <span className="text-mute">Đối tượng: </span>
                  <strong className="text-ink dark:text-white">{takedownReport.targetTitle}</strong>
                </div>
                <div>
                  <span className="text-mute">Loại: </span>
                  <span className="font-sans uppercase font-semibold">[{takedownReport.targetType}]</span>
                </div>
                <div>
                  <span className="text-mute">Lý do: </span>
                  <span className="text-ink dark:text-white">{takedownReport.reason}</span>
                </div>
              </div>
            </ModalSection>

            <ModalSection index={1}>
              <p className="text-xs text-mute leading-relaxed">
                Thao tác này sẽ tự động:
                <br />• Ẩn hoặc cấm hiển thị mục tiêu này trên toàn bộ hệ thống ngay lập tức.
                <br />• Cập nhật trạng thái báo cáo thành <strong>RESOLVED (Đã gỡ)</strong>.
                <br />• Ghi nhận thời gian gỡ vào nhật ký nội bộ.
              </p>
            </ModalSection>

            <ModalSection index={2} className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setTakedownReport(null)}
                disabled={quickTakedownMutation.isPending}
              >
                Hủy
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => quickTakedownMutation.mutate(takedownReport.id)}
                disabled={quickTakedownMutation.isPending}
              >
                {quickTakedownMutation.isPending ? 'Đang gỡ...' : 'Gỡ nội dung ngay'}
              </Button>
            </ModalSection>
          </>
        )}
      </Modal>

      {/* ======================= MODAL: SỬA GHI CHÚ NỘI BỘ ======================= */}
      <Modal
        open={Boolean(editingNotesReport)}
        onClose={() => setEditingNotesReport(null)}
        title="Ghi chú nội bộ báo cáo"
        icon={<FileText className="w-4 h-4 text-mute" />}
        size="md"
        bodyClassName="p-5 sm:p-6"
      >
        <form onSubmit={handleSaveNotes} className="space-y-4 text-xs">
          <ModalSection index={0}>
            <label className="block text-mute mb-1 font-medium">Nội dung ghi chú cho Admin/Mod:</label>
            <textarea
              rows={4}
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="Ghi chú về tiến trình xác minh, đối soát bản quyền tác giả hoặc lý do gỡ..."
              className="w-full bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark rounded-card p-2 text-ink dark:text-white focus:outline-none focus:border-ink dark:focus:border-white"
            />
          </ModalSection>

          <ModalSection index={1} className="pt-2 border-t border-hairline dark:border-hairline-dark flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditingNotesReport(null)}
              disabled={isSavingNotes}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSavingNotes}>
              {isSavingNotes ? 'Đang lưu...' : 'Lưu ghi chú'}
            </Button>
          </ModalSection>
        </form>
      </Modal>

      {/* ======================= CONFIRM DELETE REPORT ======================= */}
      <Modal
        open={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        title="Xác nhận xóa báo cáo"
        icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
        size="sm"
        bodyClassName="p-5 sm:p-6 space-y-5"
      >
        <ModalSection index={0}>
          <p className="text-sm text-mute leading-relaxed">
            Bạn có chắc chắn muốn xóa báo cáo này khỏi danh sách quản lý không?
          </p>
        </ModalSection>
        <ModalSection index={1} className="flex justify-end gap-2.5 pt-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDeleteConfirmId(null)}
            disabled={deleteMutation.isPending}
          >
            Hủy
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa báo cáo'}
          </Button>
        </ModalSection>
      </Modal>
    </div>
  );
};
