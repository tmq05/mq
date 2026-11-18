import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mic2,
  ListMusic,
  Search,
  Plus,
  CheckCircle2,
  Trash2,
  Edit2,
  Pin,
  PinOff,
  AlertTriangle,
  Eye,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  Music,
  Disc3,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { toast } from '../../stores/toast-store.js';
import { Button } from '../common/Button.js';
import { SelectDropdown } from '../common/SelectDropdown.js';
import { AlbumPlaceholder } from '../album/AlbumPlaceholder.js';
import { formatMs } from '../../utils/format.js';
import { SegmentedTabs, SegmentedTabContent, useTabDirection } from '../layout/SegmentedTabs.js';
import { Modal, ModalSection } from '../common/Modal.js';
import { ListSkeleton } from '../common/Loading.js';

interface Artist {
  id: string;
  name: string;
  avatarUrl?: string | null;
  bio?: string | null;
  isVerified: boolean;
  createdAt: string;
  _count: {
    songs: number;
    albums: number;
  };
}

interface Playlist {
  id: string;
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  isPublic: boolean;
  isPinned: boolean;
  isBanned: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  _count: {
    songs: number;
  };
}

export const ArtistPlaylistManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState<'artists' | 'playlists'>('artists');

  // --- Artist State ---
  const [artistSearch, setArtistSearch] = useState('');
  const [artistPage, setArtistPage] = useState(1);
  const [isArtistModalOpen, setIsArtistModalOpen] = useState(false);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
  const [artistName, setArtistName] = useState('');
  const [artistBio, setArtistBio] = useState('');
  const [artistAvatarUrl, setArtistAvatarUrl] = useState('');
  const [artistAvatarFile, setArtistAvatarFile] = useState<File | null>(null);
  const [artistIsVerified, setArtistIsVerified] = useState(false);
  const [isSavingArtist, setIsSavingArtist] = useState(false);
  const [artistDeleteConfirmId, setArtistDeleteConfirmId] = useState<string | null>(null);

  // --- Playlist State ---
  const [playlistSearch, setPlaylistSearch] = useState('');
  const [playlistStatus, setPlaylistStatus] = useState<'all' | 'active' | 'banned'>('all');
  const [playlistPinned, setPlaylistPinned] = useState<'all' | 'pinned'>('all');
  const [playlistPage, setPlaylistPage] = useState(1);
  const [viewingPlaylistId, setViewingPlaylistId] = useState<string | null>(null);
  const [playlistDeleteConfirmId, setPlaylistDeleteConfirmId] = useState<string | null>(null);

  // ===================== ARTIST QUERIES & MUTATIONS =====================
  const { data: artistsData, isLoading: isLoadingArtists } = useQuery({
    queryKey: ['admin-artists', artistPage, artistSearch],
    queryFn: async () => {
      const res = await api.get('/admin/artists', {
        params: { page: artistPage, limit: 12, search: artistSearch },
      });
      return res.data as {
        artists: Artist[];
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
        pagination?: { total: number; page: number; limit: number; totalPages: number };
      };
    },
    enabled: subTab === 'artists',
  });

  const toggleArtistVerifyMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.patch(`/admin/artists/${id}/verify`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-artists'] });
      queryClient.invalidateQueries({ queryKey: ['artists'] });
      queryClient.invalidateQueries({ queryKey: ['featured-artists'] });
      queryClient.invalidateQueries({ queryKey: ['artist'] });
    },
  });

  const deleteArtistMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/admin/artists/${id}`);
    },
    onSuccess: () => {
      setArtistDeleteConfirmId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-artists'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['artists'] });
      queryClient.invalidateQueries({ queryKey: ['featured-artists'] });
      queryClient.invalidateQueries({ queryKey: ['artist'] });
    },
  });

  const openCreateArtistModal = () => {
    setEditingArtist(null);
    setArtistName('');
    setArtistBio('');
    setArtistAvatarUrl('');
    setArtistAvatarFile(null);
    setArtistIsVerified(false);
    setIsArtistModalOpen(true);
  };

  const openEditArtistModal = (artist: Artist) => {
    setEditingArtist(artist);
    setArtistName(artist.name);
    setArtistBio(artist.bio || '');
    setArtistAvatarUrl(artist.avatarUrl || '');
    setArtistAvatarFile(null);
    setArtistIsVerified(artist.isVerified);
    setIsArtistModalOpen(true);
  };

  const handleSaveArtist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artistName.trim()) {
      toast.error('Vui lòng nhập tên nghệ sĩ');
      return;
    }

    setIsSavingArtist(true);
    try {
      let finalAvatarUrl = artistAvatarUrl.trim() || undefined;

      // Upload file avatar if selected
      if (artistAvatarFile) {
        const formData = new FormData();
        formData.append('cover', artistAvatarFile);
        const res = await api.post('/admin/upload/cover', formData);
        finalAvatarUrl = res.data.url;
      }

      if (editingArtist) {
        // Update
        await api.patch(`/admin/artists/${editingArtist.id}`, {
          name: artistName.trim(),
          bio: artistBio.trim() || undefined,
          avatarUrl: finalAvatarUrl,
          isVerified: artistIsVerified,
        });
      } else {
        // Create
        await api.post('/admin/artists', {
          name: artistName.trim(),
          bio: artistBio.trim() || undefined,
          avatarUrl: finalAvatarUrl,
          isVerified: artistIsVerified,
        });
      }

      setIsArtistModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-artists'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['artists'] });
      queryClient.invalidateQueries({ queryKey: ['featured-artists'] });
      queryClient.invalidateQueries({ queryKey: ['artist'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể lưu thông tin nghệ sĩ');
    } finally {
      setIsSavingArtist(false);
    }
  };

  // ===================== PLAYLIST QUERIES & MUTATIONS =====================
  const { data: playlistsData, isLoading: isLoadingPlaylists } = useQuery({
    queryKey: ['admin-playlists', playlistPage, playlistSearch, playlistStatus, playlistPinned],
    queryFn: async () => {
      const res = await api.get('/admin/playlists', {
        params: {
          page: playlistPage,
          limit: 12,
          search: playlistSearch,
          status: playlistStatus,
          isPinned: playlistPinned,
        },
      });
      return res.data as {
        playlists: Playlist[];
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
        pagination?: { total: number; page: number; limit: number; totalPages: number };
      };
    },
  });

  // Fetch single playlist detail for viewing
  const { data: playlistDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['admin-playlist-detail', viewingPlaylistId],
    queryFn: async () => {
      if (!viewingPlaylistId) return null;
      const res = await api.get(`/admin/playlists/${viewingPlaylistId}`);
      return res.data as Playlist & {
        songs: Array<{
          id: string;
          songId: string;
          addedAt: string;
          song: {
            id: string;
            title: string;
            artists: string[];
            durationMs: number;
            coverUrl?: string | null;
            source: string;
          };
        }>;
      };
    },
    enabled: !!viewingPlaylistId,
  });

  const togglePinMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.patch(`/admin/playlists/${id}/pin`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-playlists'] });
    },
  });

  const toggleBanMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.patch(`/admin/playlists/${id}/ban`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-playlists'] });
    },
  });

  const deletePlaylistMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/admin/playlists/${id}`);
    },
    onSuccess: () => {
      setPlaylistDeleteConfirmId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-playlists'] });
    },
  });

  const subTabs = [
    {
      id: 'artists',
      label: `Nghệ sĩ (${artistsData?.pagination?.total ?? artistsData?.total ?? 0})`,
      icon: <Mic2 className="w-3.5 h-3.5" />,
    },
    {
      id: 'playlists',
      label: `Playlist công khai (${playlistsData?.pagination?.total ?? playlistsData?.total ?? 0})`,
      icon: <ListMusic className="w-3.5 h-3.5" />,
    },
  ];
  const subTabDirection = useTabDirection(subTabs, subTab);

  return (
    <div className="space-y-6">
      {/* Sub-tab Segmented Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline dark:border-hairline-dark pb-3">
        <SegmentedTabs
          tabs={subTabs}
          activeId={subTab}
          ariaLabel="Chuyển mục Nghệ sĩ và Playlist công khai"
          onChange={(id) => setSubTab(id as 'artists' | 'playlists')}
        />

        {subTab === 'artists' && (
          <Button size="sm" onClick={openCreateArtistModal} className="flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Thêm nghệ sĩ mới
          </Button>
        )}
      </div>

      <SegmentedTabContent activeKey={subTab} direction={subTabDirection}>
      {/* ======================= TAB: NGHỆ SĨ ======================= */}
      {subTab === 'artists' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-soft/40 dark:bg-surface-dark-soft/40 p-3 rounded-card border border-hairline dark:border-hairline-dark">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
              <input
                type="text"
                placeholder="Tìm nghệ sĩ theo tên..."
                value={artistSearch}
                onChange={(e) => {
                  setArtistSearch(e.target.value);
                  setArtistPage(1);
                }}
                className="w-full bg-canvas dark:bg-surface-dark-card border border-hairline dark:border-hairline-dark rounded-pill pl-9 pr-3 py-1.5 text-xs text-ink dark:text-white placeholder-mute focus:outline-none focus:border-ink dark:focus:border-white"
              />
            </div>
            <div className="text-xs text-mute font-sans">
              Tổng cộng {artistsData?.pagination?.total ?? artistsData?.total ?? 0} nghệ sĩ
            </div>
          </div>

          {/* Artists Grid */}
          {isLoadingArtists ? (
            <div className="py-20 text-center text-mute text-xs">Đang tải danh sách nghệ sĩ...</div>
          ) : !artistsData?.artists || artistsData.artists.length === 0 ? (
            <div className="py-16 text-center text-mute text-xs bg-surface-soft/30 dark:bg-surface-dark-soft/30 rounded-card border border-hairline dark:border-hairline-dark">
              Không tìm thấy nghệ sĩ nào phù hợp.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {artistsData.artists.map((artist) => (
                <div
                  key={artist.id}
                  className="p-4 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card hover:border-ink/20 dark:hover:border-white/20 transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative w-14 h-14 rounded-full overflow-hidden shrink-0 border border-hairline dark:border-hairline-dark bg-surface-soft dark:bg-surface-dark-soft">
                      {artist.avatarUrl ? (
                        <img
                          src={artist.avatarUrl}
                          alt={artist.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-mute font-bold text-lg">
                          {(artist.name || '?').slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-semibold text-sm text-ink dark:text-white truncate">
                          {artist.name}
                        </h4>
                        {artist.isVerified && (
                          <span
                            title="Nghệ sĩ đã xác minh"
                            className="text-blue-500 inline-flex items-center"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 fill-blue-500 text-white dark:text-black" />
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-mute line-clamp-2 mt-1">
                        {artist.bio || 'Chưa có thông tin tiểu sử.'}
                      </p>

                      <div className="flex items-center gap-3 mt-2 text-[11px] font-sans text-mute">
                        <span className="flex items-center gap-1">
                          <Music className="w-3 h-3" />
                          {artist._count?.songs ?? 0} bài
                        </span>
                        <span className="flex items-center gap-1">
                          <Disc3 className="w-3 h-3" />
                          {artist._count?.albums ?? 0} album
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-hairline dark:border-hairline-dark flex items-center justify-between">
                    <button
                      onClick={() => toggleArtistVerifyMutation.mutate(artist.id)}
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-pill flex items-center gap-1 transition-colors ${
                        artist.isVerified
                          ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20'
                          : 'bg-surface-soft dark:bg-surface-dark-soft text-mute hover:text-ink dark:hover:text-white'
                      }`}
                      title={artist.isVerified ? 'Hủy đánh dấu xác minh' : 'Đánh dấu xác minh'}
                    >
                      {artist.isVerified ? (
                        <>
                          <ShieldCheck className="w-3 h-3" /> Đã xác minh
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-3 h-3" /> Chưa xác minh
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditArtistModal(artist)}
                        title="Chỉnh sửa nghệ sĩ"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => setArtistDeleteConfirmId(artist.id)}
                        title="Xóa nghệ sĩ"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {(artistsData?.pagination?.totalPages ?? artistsData?.totalPages ?? 1) > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-hairline dark:border-hairline-dark text-xs">
              <span className="text-mute font-sans">
                Trang {artistsData?.pagination?.page ?? artistsData?.page ?? artistPage} / {artistsData?.pagination?.totalPages ?? artistsData?.totalPages ?? 1}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={artistPage <= 1}
                  onClick={() => setArtistPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Trước
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={artistPage >= (artistsData?.pagination?.totalPages ?? artistsData?.totalPages ?? 1)}
                  onClick={() => setArtistPage((p) => p + 1)}
                >
                  Sau <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================= TAB: PLAYLIST CÔNG KHAI ======================= */}
      {subTab === 'playlists' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-soft/40 dark:bg-surface-dark-soft/40 p-3 rounded-card border border-hairline dark:border-hairline-dark">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
                <input
                  type="text"
                  placeholder="Tìm playlist theo tên, người tạo..."
                  value={playlistSearch}
                  onChange={(e) => {
                    setPlaylistSearch(e.target.value);
                    setPlaylistPage(1);
                  }}
                  className="w-full bg-canvas dark:bg-surface-dark-card border border-hairline dark:border-hairline-dark rounded-pill pl-9 pr-3 py-1.5 text-xs text-ink dark:text-white placeholder-mute focus:outline-none focus:border-ink dark:focus:border-white"
                />
              </div>

              {/* Status Filter */}
              <SelectDropdown
                value={playlistStatus}
                ariaLabel="Lọc trạng thái playlist"
                options={[
                  { value: 'all', label: 'Tất cả trạng thái' },
                  { value: 'active', label: 'Bình thường (Đang hiện)' },
                  { value: 'banned', label: 'Đã gỡ vi phạm' },
                ]}
                onChange={(val) => {
                  setPlaylistStatus(val as any);
                  setPlaylistPage(1);
                }}
              />

              {/* Pin Filter */}
              <SelectDropdown
                value={playlistPinned}
                ariaLabel="Lọc đề xuất playlist"
                options={[
                  { value: 'all', label: 'Tất cả đề xuất' },
                  { value: 'pinned', label: 'Đã ghim trang Khám phá' },
                ]}
                onChange={(val) => {
                  setPlaylistPinned(val as any);
                  setPlaylistPage(1);
                }}
              />
            </div>

            <div className="text-xs text-mute font-sans">
              Tổng cộng {playlistsData?.pagination?.total ?? playlistsData?.total ?? 0} playlist
            </div>
          </div>

          {/* Playlists Table */}
          <div className="rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-soft dark:bg-surface-dark-soft text-mute uppercase font-sans border-b border-hairline dark:border-hairline-dark">
                  <tr>
                    <th className="p-3">Danh sách phát</th>
                    <th className="p-3">Người tạo</th>
                    <th className="p-3">Số bài</th>
                    <th className="p-3">Ghim đề xuất</th>
                    <th className="p-3">Kiểm duyệt</th>
                    <th className="p-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline dark:divide-hairline-dark">
                  {isLoadingPlaylists ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-mute">
                        Đang tải danh sách playlist...
                      </td>
                    </tr>
                  ) : !playlistsData?.playlists || playlistsData.playlists.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-mute">
                        Không tìm thấy playlist công khai nào.
                      </td>
                    </tr>
                  ) : (
                    playlistsData.playlists.map((playlist) => (
                      <tr
                        key={playlist.id}
                        className={`hover:bg-surface-soft/50 dark:hover:bg-surface-dark-soft/50 transition-colors ${
                          playlist.isBanned ? 'bg-red-500/5' : ''
                        }`}
                      >
                        {/* Cover + Title */}
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded-card overflow-hidden shrink-0 border border-hairline dark:border-hairline-dark bg-surface-soft dark:bg-surface-dark-soft">
                              {playlist.coverUrl ? (
                                <img
                                  src={playlist.coverUrl}
                                  alt={playlist.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <AlbumPlaceholder title={playlist.title} className="w-full h-full" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-medium text-ink dark:text-white truncate">
                                {playlist.title}
                              </h5>
                              <p className="text-[11px] text-mute truncate max-w-xs">
                                {playlist.description || 'Không có mô tả'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Creator */}
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-surface-soft dark:bg-surface-dark-soft flex items-center justify-center text-[10px] font-bold text-ink dark:text-white shrink-0 overflow-hidden">
                              {playlist.user?.avatarUrl ? (
                                <img
                                  src={playlist.user.avatarUrl}
                                  alt={playlist.user?.name || 'User'}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                (playlist.user?.name || 'U').slice(0, 1).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs text-ink dark:text-white block truncate">
                                {playlist.user?.name || 'Người dùng ẩn danh'}
                              </span>
                              <span className="text-[10px] text-mute font-sans block truncate">
                                {playlist.user?.email || ''}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Song count */}
                        <td className="p-3 font-sans text-mute">
                          {playlist._count?.songs ?? 0} bài
                        </td>

                        {/* Pin status */}
                        <td className="p-3">
                          <button
                            onClick={() => togglePinMutation.mutate(playlist.id)}
                            className={`px-2 py-0.5 rounded-pill text-[10px] font-sans flex items-center gap-1 transition-colors ${
                              playlist.isPinned
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold'
                                : 'bg-surface-soft dark:bg-surface-dark-soft text-mute hover:text-ink dark:hover:text-white'
                            }`}
                            title={playlist.isPinned ? 'Bỏ ghim khỏi Khám phá' : 'Ghim lên trang Khám phá'}
                          >
                            {playlist.isPinned ? (
                              <>
                                <Pin className="w-3 h-3 fill-amber-500 text-amber-500" /> Đã ghim
                              </>
                            ) : (
                              <>
                                <PinOff className="w-3 h-3" /> Chưa ghim
                              </>
                            )}
                          </button>
                        </td>

                        {/* Banned status */}
                        <td className="p-3">
                          {playlist.isBanned ? (
                            <span className="px-2 py-0.5 rounded-pill text-[10px] font-sans bg-red-500/15 text-red-500 flex items-center gap-1 w-fit">
                              <AlertTriangle className="w-3 h-3" /> Đã gỡ vi phạm
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-pill text-[10px] font-sans bg-green-500/15 text-green-600 dark:text-green-400 flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" /> Đang hiển thị
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-right space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setViewingPlaylistId(playlist.id)}
                            title="Xem chi tiết các bài hát trong playlist"
                          >
                            <Eye className="w-3 h-3 mr-1" /> Xem
                          </Button>

                          <Button
                            size="sm"
                            variant={playlist.isBanned ? 'secondary' : 'danger'}
                            onClick={() => toggleBanMutation.mutate(playlist.id)}
                            title={playlist.isBanned ? 'Khôi phục hiển thị playlist' : 'Gỡ playlist do vi phạm tiêu chuẩn'}
                          >
                            {playlist.isBanned ? 'Khôi phục' : 'Gỡ vi phạm'}
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => setPlaylistDeleteConfirmId(playlist.id)}
                            title="Xóa playlist vĩnh viễn"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {(playlistsData?.pagination?.totalPages ?? playlistsData?.totalPages ?? 1) > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-hairline dark:border-hairline-dark text-xs">
              <span className="text-mute font-sans">
                Trang {playlistsData?.pagination?.page ?? playlistsData?.page ?? playlistPage} / {playlistsData?.pagination?.totalPages ?? playlistsData?.totalPages ?? 1}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={playlistPage <= 1}
                  onClick={() => setPlaylistPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Trước
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={playlistPage >= (playlistsData?.pagination?.totalPages ?? playlistsData?.totalPages ?? 1)}
                  onClick={() => setPlaylistPage((p) => p + 1)}
                >
                  Sau <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      </SegmentedTabContent>

      {/* ======================= MODAL: THÊM / SỬA NGHỆ SĨ ======================= */}
      <Modal
        open={isArtistModalOpen}
        onClose={() => setIsArtistModalOpen(false)}
        title={editingArtist ? 'Chỉnh sửa thông tin nghệ sĩ' : 'Thêm nghệ sĩ mới'}
        icon={<Mic2 className="w-4 h-4 text-mute" />}
        size="lg"
        bodyClassName="p-5 sm:p-6"
      >
        <form onSubmit={handleSaveArtist} className="space-y-4 text-xs">
          <ModalSection index={0}>
            <label className="block text-mute mb-1 font-medium">Tên nghệ sĩ *</label>
            <input
              type="text"
              required
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              placeholder="Ví dụ: Sơn Tùng M-TP, Đen Vâu, Vũ..."
              className="w-full bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark rounded-card p-2 text-ink dark:text-white focus:outline-none focus:border-ink dark:focus:border-white"
            />
          </ModalSection>

          <ModalSection index={1}>
            <label className="block text-mute mb-1 font-medium">Ảnh đại diện nghệ sĩ</label>
            <div className="space-y-2">
              <input
                type="url"
                value={artistAvatarUrl}
                onChange={(e) => setArtistAvatarUrl(e.target.value)}
                placeholder="URL ảnh trực tiếp (https://...)"
                className="w-full bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark rounded-card p-2 text-ink dark:text-white focus:outline-none focus:border-ink dark:focus:border-white"
              />
              <div className="text-center text-mute text-[10px]">— hoặc tải tệp lên từ máy —</div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setArtistAvatarFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-mute file:mr-2 file:py-1 file:px-3 file:rounded-pill file:border-0 file:text-xs file:bg-surface-soft dark:file:bg-surface-dark-soft file:text-ink dark:file:text-white hover:file:opacity-80"
              />
            </div>
          </ModalSection>

          <ModalSection index={2}>
            <label className="block text-mute mb-1 font-medium">Tiểu sử tóm tắt</label>
            <textarea
              rows={3}
              value={artistBio}
              onChange={(e) => setArtistBio(e.target.value)}
              placeholder="Mô tả tóm tắt sự nghiệp, quê quán, dòng nhạc..."
              className="w-full bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark rounded-card p-2 text-ink dark:text-white focus:outline-none focus:border-ink dark:focus:border-white"
            />
          </ModalSection>

          <ModalSection index={3}>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="artistVerifiedCheck"
                checked={artistIsVerified}
                onChange={(e) => setArtistIsVerified(e.target.checked)}
                className="rounded border-hairline dark:border-hairline-dark accent-blue-500 w-4 h-4 cursor-pointer"
              />
              <label
                htmlFor="artistVerifiedCheck"
                className="text-xs text-ink dark:text-white font-medium cursor-pointer flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                Đánh dấu là nghệ sĩ chính thức đã xác minh (Verified)
              </label>
            </div>
          </ModalSection>

          <ModalSection index={4} className="pt-3 border-t border-hairline dark:border-hairline-dark flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsArtistModalOpen(false)}
              disabled={isSavingArtist}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSavingArtist}>
              {isSavingArtist ? 'Đang lưu...' : 'Lưu thông tin'}
            </Button>
          </ModalSection>
        </form>
      </Modal>

      {/* ======================= MODAL: CHI TIẾT PLAYLIST ======================= */}
      <Modal
        open={Boolean(viewingPlaylistId)}
        onClose={() => setViewingPlaylistId(null)}
        title={`Chi tiết playlist: ${playlistDetail?.title || 'Đang tải...'}`}
        icon={<ListMusic className="w-4 h-4 text-mute" />}
        size="xl"
        bodyClassName="p-5 sm:p-6 space-y-4"
        footer={
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setViewingPlaylistId(null)}>
              Đóng
            </Button>
          </div>
        }
      >
        {isLoadingDetail ? (
          <div role="status" aria-busy="true">
            <span className="sr-only">Đang tải danh sách bài hát</span>
            <ListSkeleton count={5} />
          </div>
        ) : !playlistDetail ? (
          <div className="py-12 text-center text-mute text-xs">Không tìm thấy thông tin playlist.</div>
        ) : (
          <div className="space-y-4">
            {/* Header summary */}
            <ModalSection index={0}>
              <div className="flex items-start gap-4 p-3 bg-surface-soft/40 dark:bg-surface-dark-soft/40 rounded-card border border-hairline dark:border-hairline-dark">
                <div className="relative w-16 h-16 rounded-card overflow-hidden shrink-0 border border-hairline dark:border-hairline-dark">
                  {playlistDetail.coverUrl ? (
                    <img
                      src={playlistDetail.coverUrl}
                      alt={playlistDetail.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <AlbumPlaceholder title={playlistDetail.title} className="w-full h-full" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-sm text-ink dark:text-white">
                    {playlistDetail.title}
                  </h4>
                  <p className="text-xs text-mute mt-0.5">
                    {playlistDetail.description || 'Không có mô tả'}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] font-sans text-mute">
                    <span>Người tạo: <strong className="text-ink dark:text-white">{playlistDetail.user.name}</strong></span>
                    <span>Tổng: <strong className="text-ink dark:text-white">{playlistDetail.songs?.length || 0} bài hát</strong></span>
                  </div>
                </div>
              </div>
            </ModalSection>

            {/* Song list table */}
            <ModalSection index={1}>
              <div className="border border-hairline dark:border-hairline-dark rounded-card overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-soft dark:bg-surface-dark-soft text-mute uppercase font-sans border-b border-hairline dark:border-hairline-dark">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">Bài hát</th>
                      <th className="p-2.5">Nghệ sĩ</th>
                      <th className="p-2.5">Nguồn</th>
                      <th className="p-2.5 text-right">Thời lượng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline dark:divide-hairline-dark">
                    {playlistDetail.songs?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-mute">
                          Playlist này chưa có bài hát nào.
                        </td>
                      </tr>
                    ) : (
                      playlistDetail.songs?.map((item, index) => (
                        <tr key={item.id} className="hover:bg-surface-soft/40 dark:hover:bg-surface-dark-soft/40">
                          <td className="p-2.5 font-sans text-mute">{index + 1}</td>
                          <td className="p-2.5 font-medium text-ink dark:text-white">
                            {item.song.title}
                          </td>
                          <td className="p-2.5 text-mute">
                            {item.song.artists.join(', ')}
                          </td>
                          <td className="p-2.5">
                            <span className="font-sans text-[10px] uppercase px-1.5 py-0.5 rounded-pill bg-surface-soft dark:bg-surface-dark-soft text-mute">
                              {item.song.source}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-sans text-mute">
                            {formatMs(item.song.durationMs)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </ModalSection>
          </div>
        )}
      </Modal>

      {/* ======================= CONFIRM DELETE ARTIST ======================= */}
      <Modal
        open={Boolean(artistDeleteConfirmId)}
        onClose={() => setArtistDeleteConfirmId(null)}
        title="Xác nhận xóa nghệ sĩ"
        icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
        size="sm"
        bodyClassName="p-5 sm:p-6 space-y-5"
      >
        <ModalSection index={0}>
          <p className="text-sm text-mute leading-relaxed">
            Bạn có chắc chắn muốn xóa nghệ sĩ này không? Thao tác này không thể hoàn tác.
          </p>
        </ModalSection>
        <ModalSection index={1} className="flex justify-end gap-2.5 pt-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setArtistDeleteConfirmId(null)}
            disabled={deleteArtistMutation.isPending}
          >
            Hủy
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => artistDeleteConfirmId && deleteArtistMutation.mutate(artistDeleteConfirmId)}
            disabled={deleteArtistMutation.isPending}
          >
            {deleteArtistMutation.isPending ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
          </Button>
        </ModalSection>
      </Modal>

      {/* ======================= CONFIRM DELETE PLAYLIST ======================= */}
      <Modal
        open={Boolean(playlistDeleteConfirmId)}
        onClose={() => setPlaylistDeleteConfirmId(null)}
        title="Xác nhận xóa playlist"
        icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
        size="sm"
        bodyClassName="p-5 sm:p-6 space-y-5"
      >
        <ModalSection index={0}>
          <p className="text-sm text-mute leading-relaxed">
            Bạn có chắc chắn muốn xóa toàn bộ playlist công khai này không? Thao tác này sẽ gỡ bỏ playlist khỏi hệ thống.
          </p>
        </ModalSection>
        <ModalSection index={1} className="flex justify-end gap-2.5 pt-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPlaylistDeleteConfirmId(null)}
            disabled={deletePlaylistMutation.isPending}
          >
            Hủy
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => playlistDeleteConfirmId && deletePlaylistMutation.mutate(playlistDeleteConfirmId)}
            disabled={deletePlaylistMutation.isPending}
          >
            {deletePlaylistMutation.isPending ? 'Đang xóa...' : 'Xóa playlist'}
          </Button>
        </ModalSection>
      </Modal>
    </div>
  );
};
