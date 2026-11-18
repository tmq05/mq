import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  Lock,
  Unlock,
  CheckCircle2,
  Trash2,
  Eye,
  AlertTriangle,
  Shield,
  ChevronLeft,
  ChevronRight,
  Clock,
  ListMusic,
  Heart,
  Music,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { toast } from '../../stores/toast-store.js';
import { Button } from '../common/Button.js';
import { SelectDropdown } from '../common/SelectDropdown.js';
import { AnimatedTableBody } from '../common/AnimatedTableBody.js';
import { useAuthStore } from '../../stores/auth-store.js';
import { formatMs } from '../../utils/format.js';
import { Modal, ModalSection, ModalStepContent } from '../common/Modal.js';
import { ListSkeleton } from '../common/Loading.js';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  isLocked: boolean;
  avatarUrl?: string | null;
  createdAt: string;
  _count: {
    playlists: number;
    likes: number;
    playHistories?: number;
  };
}

interface UserDetailResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    isLocked: boolean;
    avatarUrl?: string | null;
    createdAt: string;
    _count: {
      playlists: number;
      likes: number;
      playHistories: number;
    };
  };
  playlists: Array<{
    id: string;
    title: string;
    isPublic: boolean;
    isPinned: boolean;
    isBanned: boolean;
    createdAt: string;
    _count: { songs: number };
  }>;
  recentPlays: Array<{
    id: string;
    playedAt: string;
    song: {
      id: string;
      title: string;
      artists: string[];
      durationMs: number;
      source: string;
      coverUrl?: string | null;
    };
  }>;
  likedSongs: Array<{
    id: string;
    createdAt: string;
    song: {
      id: string;
      title: string;
      artists: string[];
      durationMs: number;
      source: string;
      coverUrl?: string | null;
    };
  }>;
}

export const UserManager: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();

  // Filter state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'USER' | 'MODERATOR' | 'ADMIN'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'locked'>('all');
  const [page, setPage] = useState(1);

  // Detail Modal state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailSubTab, setDetailSubTab] = useState<'history' | 'playlists' | 'likes'>('history');

  // Delete Confirm state
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);

  // Role Change Confirm state
  const [roleConfirmTarget, setRoleConfirmTarget] = useState<{
    user: User;
    newRole: User['role'];
  } | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  // Query: Users list
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['admin-users-list', page, search, roleFilter, statusFilter],
    queryFn: async () => {
      const res = await api.get('/admin/users', {
        params: {
          page,
          limit: 15,
          search: search.trim() || undefined,
          role: roleFilter,
          status: statusFilter,
        },
      });
      return res.data as {
        users: User[];
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
        pagination?: { total: number; page: number; limit: number; totalPages: number };
      };
    },
  });

  // Query: User details (when modal is open)
  const { data: userDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['admin-user-details', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return null;
      const res = await api.get(`/admin/users/${selectedUserId}/details`);
      return res.data as UserDetailResponse;
    },
    enabled: !!selectedUserId,
  });

  // Mutation: Toggle Lock
  const lockMutation = useMutation({
    mutationFn: async (userId: string) => {
      return api.patch(`/admin/users/${userId}/lock`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      if (selectedUserId) {
        queryClient.invalidateQueries({ queryKey: ['admin-user-details', selectedUserId] });
      }
    },
  });

  // Mutation: Change Role
  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return api.patch(`/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      setRoleError(null);
      setRoleConfirmTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      if (selectedUserId) {
        queryClient.invalidateQueries({ queryKey: ['admin-user-details', selectedUserId] });
      }
    },
    onError: (err: any) => {
      setRoleError(err.response?.data?.message || 'Không thể thay đổi vai trò tài khoản');
    },
  });

  // Mutation: Delete User
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      return api.delete(`/admin/users/${userId}`);
    },
    onSuccess: () => {
      setDeleteConfirmUser(null);
      if (selectedUserId === deleteConfirmUser?.id) {
        setSelectedUserId(null);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Không thể xóa người dùng');
    },
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-soft/40 dark:bg-surface-dark-soft/40 p-3 rounded-card border border-hairline dark:border-hairline-dark">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-canvas dark:bg-surface-dark-card border border-hairline dark:border-hairline-dark rounded-pill pl-9 pr-3 py-1.5 text-xs text-ink dark:text-white placeholder-mute focus:outline-none focus:border-ink dark:focus:border-white"
            />
          </div>

          {/* Role Filter */}
          <SelectDropdown
            value={roleFilter}
            ariaLabel="Lọc vai trò người dùng"
            options={[
              { value: 'all', label: 'Tất cả vai trò' },
              { value: 'USER', label: 'Thành viên (USER)' },
              { value: 'MODERATOR', label: 'Kiểm duyệt (MODERATOR)' },
              { value: 'ADMIN', label: 'Quản trị (ADMIN)' },
            ]}
            onChange={(val) => {
              setRoleFilter(val as any);
              setPage(1);
            }}
          />

          {/* Status Filter */}
          <SelectDropdown
            value={statusFilter}
            ariaLabel="Lọc trạng thái người dùng"
            options={[
              { value: 'all', label: 'Tất cả trạng thái' },
              { value: 'active', label: 'Đang hoạt động' },
              { value: 'locked', label: 'Bị khóa' },
            ]}
            onChange={(val) => {
              setStatusFilter(val as any);
              setPage(1);
            }}
          />
        </div>

        <div className="text-xs text-mute font-sans">
          Tổng cộng {usersData?.pagination?.total ?? usersData?.total ?? 0} người dùng
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-soft dark:bg-surface-dark-soft text-mute uppercase font-sans border-b border-hairline dark:border-hairline-dark">
              <tr>
                <th className="p-3">Người dùng</th>
                <th className="p-3">Email</th>
                <th className="p-3">Vai trò</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Dữ liệu</th>
                <th className="p-3">Ngày tham gia</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <AnimatedTableBody
              transitionKey={`${roleFilter}:${statusFilter}:${page}:${search}`}
              className="divide-y divide-hairline dark:divide-hairline-dark"
            >
              {isLoadingUsers ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-mute">
                    Đang tải danh sách người dùng...
                  </td>
                </tr>
              ) : !usersData?.users || usersData.users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-mute">
                    Không tìm thấy người dùng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                usersData.users.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-surface-soft/50 dark:hover:bg-surface-dark-soft/50 transition-colors ${
                        u.isLocked ? 'bg-red-500/5' : ''
                      }`}
                    >
                      {/* Name & Avatar */}
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-surface-soft dark:bg-surface-dark-soft flex items-center justify-center text-xs font-bold text-ink dark:text-white shrink-0 overflow-hidden border border-hairline dark:border-hairline-dark">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                            ) : (
                              (u.name || '?').slice(0, 1).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-medium text-ink dark:text-white flex items-center gap-1">
                              {u.name}
                              {isCurrent && (
                                <span className="text-[10px] text-mute font-sans">(Bạn)</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="p-3 font-sans text-body dark:text-mute">
                        {u.email}
                      </td>

                      {/* Role selection dropdown */}
                      <td className="p-3">
                        {isCurrent ? (
                          <span className="px-2 py-0.5 rounded-pill font-sans text-[10px] font-semibold bg-neutral-900 text-white dark:bg-white dark:text-black">
                            {u.role}
                          </span>
                        ) : (
                          <SelectDropdown
                            size="xs"
                            value={u.role}
                            ariaLabel={`Phân quyền cho ${u.name}`}
                            options={[
                              { value: 'USER', label: 'USER' },
                              { value: 'MODERATOR', label: 'MODERATOR' },
                              { value: 'ADMIN', label: 'ADMIN' },
                            ]}
                            onChange={(newRole) => {
                              if (newRole === u.role) return;
                              setRoleError(null);
                              setRoleConfirmTarget({ user: u, newRole: newRole as User['role'] });
                            }}
                          />
                        )}
                      </td>

                      {/* Status (cố định bề rộng để Đã khóa / Hoạt động không làm lệch cột) */}
                      <td className="p-3 w-[112px]">
                        {u.isLocked ? (
                          <span className="w-[90px] justify-center px-2 py-0.5 rounded-pill text-[10px] font-sans bg-red-500/15 text-red-500 inline-flex items-center gap-1 whitespace-nowrap">
                            <Lock className="w-3 h-3 shrink-0" /> Đã khóa
                          </span>
                        ) : (
                          <span className="w-[90px] justify-center px-2 py-0.5 rounded-pill text-[10px] font-sans bg-green-500/15 text-green-600 dark:text-green-400 inline-flex items-center gap-1 whitespace-nowrap">
                            <CheckCircle2 className="w-3 h-3 shrink-0" /> Hoạt động
                          </span>
                        )}
                      </td>

                      {/* Counts */}
                      <td className="p-3 font-sans text-mute text-[11px]">
                        <span className="mr-2">{u._count?.playlists ?? 0} playlist</span>
                        <span>{u._count?.likes ?? 0} thích</span>
                      </td>

                      {/* Created At */}
                      <td className="p-3 font-sans text-mute text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                      </td>

                      {/* Actions (cố định bề rộng nút Khóa / Mở khóa để không làm lệch nút Chi tiết) */}
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedUserId(u.id);
                              setDetailSubTab('history');
                            }}
                            title="Xem chi tiết tài khoản, lịch sử nghe & playlist"
                          >
                            <Eye className="w-3 h-3 mr-1" /> Chi tiết
                          </Button>

                          {!isCurrent && (
                            <>
                              <Button
                                size="sm"
                                variant={u.isLocked ? 'secondary' : 'danger'}
                                className="w-[94px] justify-center whitespace-nowrap"
                                onClick={() => lockMutation.mutate(u.id)}
                                title={u.isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                              >
                                {u.isLocked ? (
                                  <>
                                    <Unlock className="w-3 h-3 mr-1 shrink-0" /> Mở khóa
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3 h-3 mr-1 shrink-0" /> Khóa
                                  </>
                                )}
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                onClick={() => setDeleteConfirmUser(u)}
                                title="Xóa tài khoản vĩnh viễn"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </AnimatedTableBody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {(usersData?.pagination?.totalPages ?? usersData?.totalPages ?? 1) > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-hairline dark:border-hairline-dark text-xs">
          <span className="text-mute font-sans">
            Trang {usersData?.pagination?.page ?? usersData?.page ?? page} / {usersData?.pagination?.totalPages ?? usersData?.totalPages ?? 1}
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
              disabled={page >= (usersData?.pagination?.totalPages ?? usersData?.totalPages ?? 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ======================= MODAL: CHI TIẾT NGƯỜI DÙNG ======================= */}
      <Modal
        open={Boolean(selectedUserId)}
        onClose={() => setSelectedUserId(null)}
        title="Hồ sơ hoạt động người dùng"
        icon={<Users className="w-4 h-4 text-mute" />}
        size="xl"
        bodyClassName="p-5 sm:p-6"
        footer={
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setSelectedUserId(null)}>
              Đóng
            </Button>
          </div>
        }
      >
        {isLoadingDetails ? (
          <div role="status" aria-busy="true">
            <span className="sr-only">Đang tải chi tiết người dùng</span>
            <ListSkeleton count={5} />
          </div>
        ) : !userDetails ? (
          <div className="py-12 text-center text-mute text-xs">Không tìm thấy thông tin tài khoản.</div>
        ) : (
          <div className="space-y-4">
            {/* Profile Overview Card */}
            <ModalSection index={0}>
              <div className="flex items-start gap-4 p-4 bg-surface-soft/40 dark:bg-surface-dark-soft/40 rounded-card border border-hairline dark:border-hairline-dark">
                <div className="w-14 h-14 rounded-full bg-surface-soft dark:bg-surface-dark-soft flex items-center justify-center text-lg font-bold text-ink dark:text-white shrink-0 overflow-hidden border border-hairline dark:border-hairline-dark">
                  {userDetails.user.avatarUrl ? (
                    <img
                      src={userDetails.user.avatarUrl}
                      alt={userDetails.user.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (userDetails.user.name || '?').slice(0, 1).toUpperCase()
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-base text-ink dark:text-white truncate">
                      {userDetails.user.name}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-pill font-sans text-[10px] font-semibold bg-neutral-900 text-white dark:bg-white dark:text-black">
                        {userDetails.user.role}
                      </span>
                      {userDetails.user.isLocked ? (
                        <span className="px-2 py-0.5 rounded-pill text-[10px] font-sans bg-red-500/15 text-red-500">
                          Đã khóa
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-pill text-[10px] font-sans bg-green-500/15 text-green-600 dark:text-green-400">
                          Hoạt động
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs font-sans text-mute mt-0.5">{userDetails.user.email}</p>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-hairline dark:border-hairline-dark text-center font-sans">
                    <div className="p-2 rounded bg-surface-soft/60 dark:bg-surface-dark-soft/60">
                      <div className="text-[10px] text-mute uppercase">Playlist tạo</div>
                      <div className="text-sm font-bold text-ink dark:text-white">
                        {userDetails.user._count?.playlists ?? 0}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-surface-soft/60 dark:bg-surface-dark-soft/60">
                      <div className="text-[10px] text-mute uppercase">Bài yêu thích</div>
                      <div className="text-sm font-bold text-ink dark:text-white">
                        {userDetails.user._count?.likes ?? 0}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-surface-soft/60 dark:bg-surface-dark-soft/60">
                      <div className="text-[10px] text-mute uppercase">Lượt nghe nhạc</div>
                      <div className="text-sm font-bold text-ink dark:text-white">
                        {userDetails.user._count?.playHistories ?? 0}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ModalSection>

            {/* Sub-tab pills */}
            <ModalSection index={1}>
              <div className="flex items-center gap-2 border-b border-hairline dark:border-hairline-dark pb-2">
                <button
                  onClick={() => setDetailSubTab('history')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-medium transition-colors ${
                    detailSubTab === 'history'
                      ? 'bg-ink dark:bg-white text-white dark:text-black font-semibold'
                      : 'text-mute hover:text-ink dark:hover:text-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Lịch sử nghe gần đây ({userDetails.recentPlays?.length ?? 0})
                </button>
                <button
                  onClick={() => setDetailSubTab('playlists')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-medium transition-colors ${
                    detailSubTab === 'playlists'
                      ? 'bg-ink dark:bg-white text-white dark:text-black font-semibold'
                      : 'text-mute hover:text-ink dark:hover:text-white'
                  }`}
                >
                  <ListMusic className="w-3.5 h-3.5" />
                  Playlist của người dùng ({userDetails.playlists?.length ?? 0})
                </button>
                <button
                  onClick={() => setDetailSubTab('likes')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-medium transition-colors ${
                    detailSubTab === 'likes'
                      ? 'bg-ink dark:bg-white text-white dark:text-black font-semibold'
                      : 'text-mute hover:text-ink dark:hover:text-white'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5" />
                  Bài hát yêu thích ({(userDetails.likedSongs || (userDetails as any).likes)?.length ?? 0})
                </button>
              </div>
            </ModalSection>

            <ModalSection index={2}>
              <ModalStepContent stepKey={detailSubTab}>
                {/* Content: History */}
                {detailSubTab === 'history' && (
                  <div className="border border-hairline dark:border-hairline-dark rounded-card overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-soft dark:bg-surface-dark-soft text-mute uppercase font-sans border-b border-hairline dark:border-hairline-dark">
                        <tr>
                          <th className="p-2.5">Bài hát</th>
                          <th className="p-2.5">Nghệ sĩ</th>
                          <th className="p-2.5">Nguồn</th>
                          <th className="p-2.5 text-right">Thời gian nghe</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline dark:divide-hairline-dark">
                        {userDetails.recentPlays.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-mute">
                              Chưa có lịch sử phát nhạc nào.
                            </td>
                          </tr>
                        ) : (
                          userDetails.recentPlays.map((item) => (
                            <tr key={item.id} className="hover:bg-surface-soft/40 dark:hover:bg-surface-dark-soft/40">
                              <td className="p-2.5 font-medium text-ink dark:text-white flex items-center gap-2">
                                <Music className="w-3 h-3 text-mute shrink-0" />
                                <span className="truncate">{item.song.title}</span>
                              </td>
                              <td className="p-2.5 text-mute truncate max-w-xs">
                                {item.song.artists.join(', ')}
                              </td>
                              <td className="p-2.5">
                                <span className="font-sans text-[10px] uppercase px-1.5 py-0.5 rounded-pill bg-surface-soft dark:bg-surface-dark-soft text-mute">
                                  {item.song.source}
                                </span>
                              </td>
                              <td className="p-2.5 text-right font-sans text-mute text-[11px]">
                                {new Date(item.playedAt).toLocaleString('vi-VN')}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Content: Playlists */}
                {detailSubTab === 'playlists' && (
                  <div className="border border-hairline dark:border-hairline-dark rounded-card overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-soft dark:bg-surface-dark-soft text-mute uppercase font-sans border-b border-hairline dark:border-hairline-dark">
                        <tr>
                          <th className="p-2.5">Tên Playlist</th>
                          <th className="p-2.5">Chế độ</th>
                          <th className="p-2.5">Số bài</th>
                          <th className="p-2.5">Trạng thái</th>
                          <th className="p-2.5 text-right">Ngày tạo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline dark:divide-hairline-dark">
                        {userDetails.playlists.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-mute">
                              Người dùng chưa tạo playlist nào.
                            </td>
                          </tr>
                        ) : (
                          userDetails.playlists.map((pl) => (
                            <tr key={pl.id} className="hover:bg-surface-soft/40 dark:hover:bg-surface-dark-soft/40">
                              <td className="p-2.5 font-medium text-ink dark:text-white">
                                {pl.title}
                              </td>
                              <td className="p-2.5 font-sans text-[11px] text-mute">
                                {pl.isPublic ? 'Công khai' : 'Riêng tư'}
                              </td>
                              <td className="p-2.5 font-sans text-mute">
                                {pl._count?.songs ?? 0} bài
                              </td>
                              <td className="p-2.5">
                                {pl.isBanned ? (
                                  <span className="text-red-500 font-sans text-[10px]">Đã gỡ vi phạm</span>
                                ) : (
                                  <span className="text-green-500 font-sans text-[10px]">Bình thường</span>
                                )}
                              </td>
                              <td className="p-2.5 text-right font-sans text-mute text-[11px]">
                                {new Date(pl.createdAt).toLocaleDateString('vi-VN')}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Content: Likes */}
                {detailSubTab === 'likes' && (
                  <div className="border border-hairline dark:border-hairline-dark rounded-card overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-soft dark:bg-surface-dark-soft text-mute uppercase font-sans border-b border-hairline dark:border-hairline-dark">
                        <tr>
                          <th className="p-2.5">Bài hát</th>
                          <th className="p-2.5">Nghệ sĩ</th>
                          <th className="p-2.5">Thời lượng</th>
                          <th className="p-2.5 text-right">Thời gian thích</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline dark:divide-hairline-dark">
                        {userDetails.likedSongs.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-mute">
                              Chưa có bài hát yêu thích nào.
                            </td>
                          </tr>
                        ) : (
                          userDetails.likedSongs.map((item) => (
                            <tr key={item.id} className="hover:bg-surface-soft/40 dark:hover:bg-surface-dark-soft/40">
                              <td className="p-2.5 font-medium text-ink dark:text-white flex items-center gap-2">
                                <Heart className="w-3 h-3 text-red-500 fill-red-500 shrink-0" />
                                <span className="truncate">{item.song.title}</span>
                              </td>
                              <td className="p-2.5 text-mute truncate max-w-xs">
                                {item.song.artists.join(', ')}
                              </td>
                              <td className="p-2.5 font-sans text-mute">
                                {formatMs(item.song.durationMs)}
                              </td>
                              <td className="p-2.5 text-right font-sans text-mute text-[11px]">
                                {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </ModalStepContent>
            </ModalSection>
          </div>
        )}
      </Modal>

      {/* ======================= CONFIRM DELETE USER ======================= */}
      <Modal
        open={Boolean(deleteConfirmUser)}
        onClose={() => setDeleteConfirmUser(null)}
        title="Xác nhận xóa tài khoản"
        icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
        size="sm"
        bodyClassName="p-5 sm:p-6 space-y-5"
      >
        {deleteConfirmUser && (
          <>
            <ModalSection index={0}>
              <p className="text-sm text-mute leading-relaxed">
                Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản{' '}
                <strong className="text-ink dark:text-white">{deleteConfirmUser.name}</strong> (
                {deleteConfirmUser.email})? Toàn bộ playlist và dữ liệu nghe nhạc sẽ bị xóa.
              </p>
            </ModalSection>
            <ModalSection index={1} className="flex justify-end gap-2.5 pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeleteConfirmUser(null)}
                disabled={deleteMutation.isPending}
              >
                Hủy
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => deleteMutation.mutate(deleteConfirmUser.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </Button>
            </ModalSection>
          </>
        )}
      </Modal>

      {/* ======================= CONFIRM CHANGE ROLE ======================= */}
      <Modal
        open={Boolean(roleConfirmTarget)}
        onClose={() => {
          if (roleMutation.isPending) return;
          setRoleConfirmTarget(null);
          setRoleError(null);
        }}
        title="Xác nhận đổi vai trò"
        icon={<Shield className="w-5 h-5 text-ink dark:text-white" />}
        size="sm"
        bodyClassName="p-5 sm:p-6 space-y-5"
      >
        {roleConfirmTarget && (
          <>
            <ModalSection index={0}>
              <p className="text-sm text-mute leading-relaxed">
                Bạn có chắc chắn muốn đổi vai trò của người dùng{' '}
                <strong className="text-ink dark:text-white">{roleConfirmTarget.user.name}</strong>{' '}
                từ{' '}
                <span className="font-semibold text-ink dark:text-white">
                  {roleConfirmTarget.user.role}
                </span>{' '}
                thành{' '}
                <span className="font-semibold text-ink dark:text-white">
                  {roleConfirmTarget.newRole}
                </span>
                ?
              </p>
              {roleError && (
                <p className="mt-3 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {roleError}
                </p>
              )}
            </ModalSection>
            <ModalSection index={1} className="flex justify-end gap-2.5 pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setRoleConfirmTarget(null);
                  setRoleError(null);
                }}
                disabled={roleMutation.isPending}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  roleMutation.mutate({
                    userId: roleConfirmTarget.user.id,
                    role: roleConfirmTarget.newRole,
                  })
                }
                disabled={roleMutation.isPending}
              >
                {roleMutation.isPending ? 'Đang cập nhật...' : 'Xác nhận'}
              </Button>
            </ModalSection>
          </>
        )}
      </Modal>
    </div>
  );
};
