import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Users,
  Music,
  PlayCircle,
  ListMusic,
  Upload,
  Activity,
  Disc3,
  Image as ImageIcon,
  Sparkles,
  BarChart3,
  RotateCw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  UserPlus,
  UserCheck,
  HardDrive,
  Mic2,
  Flame,
  Trophy,
  Server,
  Heart,
  Search,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { toast } from '../stores/toast-store.js';
import { Button } from '../components/common/Button.js';
import { useAuthStore } from '../stores/auth-store.js';
import { useSpotifyAuthStore } from '../stores/spotify-auth-store.js';
import { AlbumPlaceholder } from '../components/album/AlbumPlaceholder.js';
import { formatMs } from '../utils/format.js';
import { ArtistPlaylistManager } from '../components/admin/ArtistPlaylistManager.js';
import { UserManager } from '../components/admin/UserManager.js';
import { CopyrightReportManager } from '../components/admin/CopyrightReportManager.js';
import { ProviderQuotaManager } from '../components/admin/ProviderQuotaManager.js';
import { AuditSettingsManager } from '../components/admin/AuditSettingsManager.js';
import { ChatbotManager } from '../components/admin/ChatbotManager.js';
import { SegmentedTabs, SegmentedTabItem } from '../components/layout/SegmentedTabs.js';
import { SEGMENTED_NAV_CONFIG } from '../components/layout/segmented-nav.config.js';
import { SelectDropdown } from '../components/common/SelectDropdown.js';
import { AnimatedTableBody } from '../components/common/AnimatedTableBody.js';
import { Modal, ModalSection } from '../components/common/Modal.js';

type AdminTabId =
  | 'stats'
  | 'songs'
  | 'artists-playlists'
  | 'users'
  | 'reports'
  | 'upload'
  | 'albums'
  | 'providers'
  | 'chatbot'
  | 'audit-settings';

const ADMIN_TABS: Array<SegmentedTabItem & { id: AdminTabId }> = [
  { id: 'stats', label: 'Tổng quan' },
  { id: 'songs', label: 'Quản lý bài hát' },
  { id: 'artists-playlists', label: 'Nghệ sĩ & Playlist' },
  { id: 'users', label: 'Người dùng' },
  { id: 'reports', label: 'Bản quyền & Báo cáo' },
  { id: 'upload', label: 'Tải lên nhạc' },
  { id: 'albums', label: 'Quản lý Album' },
  { id: 'providers', label: 'Nguồn nhạc & Quota' },
  { id: 'chatbot', label: 'Trợ lý AI' },
  { id: 'audit-settings', label: 'Nhật ký & Cài đặt' },
];


const formatTimeAgo = (isoDate: string) => {
  try {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Vừa xong';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 30) return `${diffDays} ngày trước`;
    return new Date(isoDate).toLocaleDateString('vi-VN');
  } catch {
    return isoDate;
  }
};

const TrendBadge: React.FC<{ change?: number; isUp?: boolean; subtitle?: string }> = ({
  change,
  isUp,
  subtitle = 'kỳ trước',
}) => {
  if (change === undefined) return null;
  if (change === 0) {
    return (
      <div className="flex items-center gap-1 text-[11px] font-sans text-mute">
        <Minus className="w-3 h-3 text-mute" />
        <span>0%</span>
        {subtitle && <span className="opacity-70 text-[10px]">vs {subtitle}</span>}
      </div>
    );
  }
  return isUp ? (
    <div className="flex items-center gap-1 text-[11px] font-sans text-emerald-600 dark:text-emerald-400 font-medium">
      <TrendingUp className="w-3 h-3" />
      <span>+{change}%</span>
      {subtitle && <span className="text-mute opacity-70 font-normal text-[10px]">vs {subtitle}</span>}
    </div>
  ) : (
    <div className="flex items-center gap-1 text-[11px] font-sans text-rose-600 dark:text-rose-400 font-medium">
      <TrendingDown className="w-3 h-3" />
      <span>-{change}%</span>
      {subtitle && <span className="text-mute opacity-70 font-normal text-[10px]">vs {subtitle}</span>}
    </div>
  );
};

const UserGrowthChart: React.FC<{
  data?: Array<{ date: string; newUsers: number; cumulativeUsers: number }>;
}> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-36 flex flex-col items-center justify-center text-xs text-mute">
        <Users className="w-7 h-7 opacity-30 mb-2" />
        <span>Chưa có dữ liệu tăng trưởng người dùng</span>
      </div>
    );
  }

  const maxCumulative = Math.max(...data.map((d) => d.cumulativeUsers), 5);
  const totalNew = data.reduce((acc, d) => acc + d.newUsers, 0);

  // SVG dimensions
  const svgWidth = 600;
  const svgHeight = 140;
  const paddingX = 20;
  const paddingBottom = 24;
  const paddingTop = 16;

  const innerWidth = svgWidth - paddingX * 2;
  const innerHeight = svgHeight - paddingTop - paddingBottom;

  const points = data.map((d, i) => {
    const x = paddingX + (i / Math.max(1, data.length - 1)) * innerWidth;
    const y = paddingTop + innerHeight - (d.cumulativeUsers / maxCumulative) * innerHeight;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + innerHeight} L ${points[0].x} ${paddingTop + innerHeight} Z`;

  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : points[points.length - 1];

  return (
    <div className="space-y-3">
      {/* Metrics summary */}
      <div className="flex items-center justify-between text-xs pb-1">
        <div className="flex items-center gap-2">
          <span className="text-mute">Mới 30 ngày qua:</span>
          <span className="font-sans font-bold text-ink dark:text-white bg-surface-soft dark:bg-surface-dark-soft px-2 py-0.5 rounded-pill">
            +{totalNew} người dùng
          </span>
        </div>
        <div className="text-[11px] font-sans text-mute">
          {activePoint && (
            <span>
              {formatChartDate(activePoint.date)}: <strong className="text-ink dark:text-white">{activePoint.cumulativeUsers} tổng</strong> ({activePoint.newUsers > 0 ? `+${activePoint.newUsers} mới` : '0 mới'})
            </span>
          )}
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full h-32 select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id="userGrowthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" className="text-ink dark:text-white" stopOpacity="0.18" />
              <stop offset="100%" stopColor="currentColor" className="text-ink dark:text-white" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Gridline */}
          <line
            x1={paddingX}
            y1={paddingTop + innerHeight}
            x2={svgWidth - paddingX}
            y2={paddingTop + innerHeight}
            stroke="currentColor"
            className="text-hairline dark:text-hairline-dark"
            strokeWidth="1"
          />

          {/* Area fill */}
          <path d={areaD} fill="url(#userGrowthGrad)" />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="currentColor"
            className="text-ink dark:text-white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive invisible hover columns & points */}
          {points.map((p, i) => (
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <rect
                x={p.x - (innerWidth / points.length) / 2}
                y={0}
                width={innerWidth / points.length}
                height={svgHeight}
                fill="transparent"
              />
              {(p.newUsers > 0 || i === points.length - 1 || hoveredIndex === i) && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={hoveredIndex === i ? 5 : 3.5}
                  className="fill-canvas dark:fill-surface-dark-card stroke-ink dark:stroke-white stroke-2 transition-all"
                />
              )}
            </g>
          ))}
        </svg>
      </div>

      {/* X-Axis Dates */}
      <div className="flex justify-between items-center text-[10px] font-sans text-mute pt-1 border-t border-hairline/40 dark:border-hairline-dark/30">
        <span>{formatChartDate(data[0].date)}</span>
        <span>{formatChartDate(data[Math.floor(data.length / 2)].date)}</span>
        <span>{formatChartDate(data[data.length - 1].date)}</span>
      </div>
    </div>
  );
};

const formatChartDate = (dateStr: string) => {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

const formatFullDate = (dateStr: string) => {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const dayName = dayNames[date.getDay()];
      return `${dayName}, ${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

export const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const {
    user: spotifyUser,
    isConnecting: isSpotifyConnecting,
    error: spotifyError,
    connectSpotify,
    disconnectSpotify,
  } = useSpotifyAuthStore();
  const queryClient = useQueryClient();
  const shouldReduceMotion = useReducedMotion();

  const [activeTab, setActiveTab] = useState<AdminTabId>('stats');

  const currentTabIdx = ADMIN_TABS.findIndex((t) => t.id === activeTab);
  const prevTabIdxRef = useRef<number>(currentTabIdx);
  const tabDirection =
    currentTabIdx !== -1 &&
    prevTabIdxRef.current !== -1 &&
    currentTabIdx !== prevTabIdxRef.current
      ? currentTabIdx > prevTabIdxRef.current
        ? 1
        : -1
      : 0;

  useEffect(() => {
    prevTabIdxRef.current = currentTabIdx;
  }, [currentTabIdx]);

  // Songs Management Tab state
  const [songPage, setSongPage] = useState(1);
  const [songLimit, setSongLimit] = useState(20);
  const [songSearch, setSongSearch] = useState('');
  const [songArtistFilter, setSongArtistFilter] = useState('all');
  const [songAlbumFilter, setSongAlbumFilter] = useState('all');
  const [songSourceFilter, setSongSourceFilter] = useState('all');
  const [songStatusFilter, setSongStatusFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [songSortBy, setSongSortBy] = useState<'createdAt' | 'playCount' | 'title' | 'durationMs'>('createdAt');
  const [songSortOrder, setSongSortOrder] = useState<'asc' | 'desc'>('desc');

  // Multi-selection state
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);

  // Edit Metadata Modal state
  const [editingSong, setEditingSong] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtists, setEditArtists] = useState('');
  const [editAlbum, setEditAlbum] = useState('');
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [editIsHidden, setEditIsHidden] = useState(false);
  const [isSavingSong, setIsSavingSong] = useState(false);

  // Quick Cover Change Modal state
  const [coverModalSong, setCoverModalSong] = useState<any | null>(null);
  const [quickCoverUrl, setQuickCoverUrl] = useState('');
  const [quickCoverFile, setQuickCoverFile] = useState<File | null>(null);
  const [isSavingQuickCover, setIsSavingQuickCover] = useState(false);

  // Delete Confirmation Dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    type: 'single' | 'batch';
    song?: any;
    count?: number;
  }>({ isOpen: false, type: 'single' });

  // Upload Form state
  const [songTitle, setSongTitle] = useState('');
  const [songArtist, setSongArtist] = useState('');
  const [songAlbum, setSongAlbum] = useState('');
  const [songLyrics, setSongLyrics] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Album Cover Manager state
  const [selectedAlbum, setSelectedAlbum] = useState<any | null>(null);
  const [coverUrlInput, setCoverUrlInput] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [albumCoverFile, setAlbumCoverFile] = useState<File | null>(null);
  const [isSavingCover, setIsSavingCover] = useState(false);
  const [albumSearch, setAlbumSearch] = useState('');

  // Chart period filter state
  const [chartDays, setChartDays] = useState<7 | 30 | 90>(7);

  // 1. Fetch Stats
  const {
    data: stats,
    isLoading: isLoadingStats,
    isError: isErrorStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['admin-stats', chartDays],
    queryFn: async () => {
      const res = await api.get(`/admin/stats?days=${chartDays}`);
      return res.data;
    },
  });

  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const handleRefreshHealth = async () => {
    setIsCheckingHealth(true);
    try {
      await refetchStats();
    } finally {
      setTimeout(() => setIsCheckingHealth(false), 500);
    }
  };

  // 1.5. Fetch Songs
  const {
    data: songsData,
    isLoading: isLoadingSongs,
    isFetching: isFetchingSongs,
    refetch: refetchSongs,
  } = useQuery({
    queryKey: [
      'admin-songs',
      songPage,
      songLimit,
      songSearch,
      songArtistFilter,
      songAlbumFilter,
      songSourceFilter,
      songStatusFilter,
      songSortBy,
      songSortOrder,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(songPage));
      params.set('limit', String(songLimit));
      if (songSearch.trim()) params.set('search', songSearch.trim());
      if (songArtistFilter !== 'all') params.set('artist', songArtistFilter);
      if (songAlbumFilter !== 'all') params.set('album', songAlbumFilter);
      if (songSourceFilter !== 'all') params.set('source', songSourceFilter);
      if (songStatusFilter !== 'all') params.set('status', songStatusFilter);
      params.set('sortBy', songSortBy);
      params.set('sortOrder', songSortOrder);

      const res = await api.get(`/admin/songs?${params.toString()}`);
      return res.data;
    },
    enabled: activeTab === 'songs',
  });

  // Toggle Song Visibility Mutation
  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, isHidden }: { id: string; isHidden: boolean }) => {
      return api.patch(`/admin/songs/${id}/visibility`, { isHidden });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-songs'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi đổi trạng thái bài hát');
    },
  });

  // Batch Song Action Mutation
  const batchActionMutation = useMutation({
    mutationFn: async ({ action, songIds }: { action: 'hide' | 'unhide' | 'delete'; songIds: string[] }) => {
      return api.post('/admin/songs/batch', { action, songIds });
    },
    onSuccess: (res) => {
      setSelectedSongIds([]);
      setDeleteDialog({ isOpen: false, type: 'batch' });
      queryClient.invalidateQueries({ queryKey: ['admin-songs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success(res.data?.message || 'Thao tác hàng loạt thành công!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi thực hiện thao tác hàng loạt');
    },
  });

  // Delete Single Song Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/admin/songs/${id}`);
    },
    onSuccess: () => {
      setDeleteDialog({ isOpen: false, type: 'single' });
      queryClient.invalidateQueries({ queryKey: ['admin-songs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Đã xóa bài hát thành công!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Có lỗi khi xóa bài hát');
    },
  });

  const handleOpenEdit = (song: any) => {
    setEditingSong(song);
    setEditTitle(song.title);
    setEditArtists(Array.isArray(song.artists) ? song.artists.join(', ') : song.artists || '');
    setEditAlbum(song.album || '');
    setEditCoverUrl(song.coverUrl || '');
    setEditCoverFile(null);
    setEditIsHidden(Boolean(song.isHidden));
  };

  const handleSaveEdit = async () => {
    if (!editingSong || !editTitle.trim()) {
      toast.error('Vui lòng nhập tiêu đề bài hát');
      return;
    }

    setIsSavingSong(true);
    try {
      let finalCoverUrl = editCoverUrl.trim();
      if (editCoverFile) {
        const formData = new FormData();
        formData.append('cover', editCoverFile);
        const uploadRes = await api.post('/admin/upload/cover', formData);
        finalCoverUrl = uploadRes.data.url;
      }

      const artistsArray = editArtists
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      await api.patch(`/admin/songs/${editingSong.id}`, {
        title: editTitle.trim(),
        artists: artistsArray.length > 0 ? artistsArray : ['Nhiều nghệ sĩ'],
        album: editAlbum.trim() || undefined,
        coverUrl: finalCoverUrl || undefined,
        isHidden: editIsHidden,
      });

      toast.success('Đã cập nhật bài hát thành công!');
      setEditingSong(null);
      queryClient.invalidateQueries({ queryKey: ['admin-songs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    } catch (err: any) {
      console.error('Failed to update song:', err);
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu thông tin bài hát');
    } finally {
      setIsSavingSong(false);
    }
  };

  const handleOpenQuickCover = (song: any) => {
    setCoverModalSong(song);
    setQuickCoverUrl(song.coverUrl || '');
    setQuickCoverFile(null);
  };

  const handleSaveQuickCover = async () => {
    if (!coverModalSong) return;

    setIsSavingQuickCover(true);
    try {
      let finalCoverUrl = quickCoverUrl.trim();
      if (quickCoverFile) {
        const formData = new FormData();
        formData.append('cover', quickCoverFile);
        const uploadRes = await api.post('/admin/upload/cover', formData);
        finalCoverUrl = uploadRes.data.url;
      }

      if (!finalCoverUrl) {
        toast.error('Vui lòng dán URL ảnh hoặc chọn tệp tải lên');
        setIsSavingQuickCover(false);
        return;
      }

      await api.patch(`/admin/songs/${coverModalSong.id}`, {
        coverUrl: finalCoverUrl,
      });

      toast.success('Đã thay đổi ảnh bìa bài hát thành công!');
      setCoverModalSong(null);
      queryClient.invalidateQueries({ queryKey: ['admin-songs'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi cập nhật ảnh bìa');
    } finally {
      setIsSavingQuickCover(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedSongIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const allPageIds = (songsData?.songs || []).map((s: any) => s.id);
  const isAllSelected =
    allPageIds.length > 0 && allPageIds.every((id: string) => selectedSongIds.includes(id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedSongIds((prev) => prev.filter((id) => !allPageIds.includes(id)));
    } else {
      setSelectedSongIds((prev) => Array.from(new Set([...prev, ...allPageIds])));
    }
  };




  // Fetch Albums for cover management
  const { data: albumsData, refetch: refetchAlbums, isLoading: isLoadingAlbums } = useQuery({
    queryKey: ['admin-albums'],
    queryFn: async () => {
      const res = await api.get('/admin/albums');
      return (res.data.albums || []) as Array<{
        id: string;
        title: string;
        artist: string;
        coverUrl: string;
        tracksCount: number;
        firstSongCover?: string;
        isCatalog: boolean;
      }>;
    },
    enabled: activeTab === 'albums',
  });

  const handleSelectAlbum = (alb: any) => {
    setSelectedAlbum(alb);
    setCoverUrlInput(alb.coverUrl || '');
    setPreviewUrl(alb.coverUrl || '');
    setAlbumCoverFile(null);
  };

  const handleFillFromFirstSong = () => {
    if (!selectedAlbum) return;
    if (selectedAlbum.firstSongCover) {
      setCoverUrlInput(selectedAlbum.firstSongCover);
      setPreviewUrl(selectedAlbum.firstSongCover);
      setAlbumCoverFile(null);
    } else {
      toast.error('Không tìm thấy ảnh từ bài hát nào trong album này để lấy');
    }
  };

  const handleAlbumCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size <= 2MB
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Dung lượng tệp vượt quá 2MB. Vui lòng chọn tệp nhỏ hơn hoặc bằng 2MB.');
      e.target.value = '';
      return;
    }

    // Check format JPG, PNG, WebP
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Định dạng tệp không hợp lệ. Chỉ chấp nhận tệp JPG, PNG hoặc WebP.');
      e.target.value = '';
      return;
    }

    setAlbumCoverFile(file);
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setCoverUrlInput('');
  };

  const handleSaveAlbumCover = async () => {
    if (!selectedAlbum) {
      toast.error('Vui lòng chọn một album từ danh sách');
      return;
    }

    setIsSavingCover(true);
    try {
      let finalCoverUrl = coverUrlInput.trim();

      // 1. If file uploaded, upload it first
      if (albumCoverFile) {
        const formData = new FormData();
        formData.append('cover', albumCoverFile);
        const uploadRes = await api.post('/admin/upload/cover', formData);
        finalCoverUrl = uploadRes.data.url;
      }

      if (!finalCoverUrl) {
        toast.error('Vui lòng nhập đường dẫn URL ảnh hoặc tải lên tệp ảnh hợp lệ');
        setIsSavingCover(false);
        return;
      }

      // 2. Save album cover
      await api.patch(`/admin/albums/${selectedAlbum.id}/cover`, {
        coverUrl: finalCoverUrl,
      });

      toast.success(`Đã cập nhật ảnh bìa album "${selectedAlbum.title}" thành công!`);
      setSelectedAlbum({ ...selectedAlbum, coverUrl: finalCoverUrl });
      setPreviewUrl(finalCoverUrl);
      setAlbumCoverFile(null);
      refetchAlbums();
      queryClient.invalidateQueries({ queryKey: ['albums'] });
    } catch (err: any) {
      console.error('Failed to update album cover:', err);
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu ảnh bìa album');
    } finally {
      setIsSavingCover(false);
    }
  };

  // Handle Song Upload
  const handleSongUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songTitle.trim() || !songArtist.trim() || !audioFile) {
      toast.error('Vui lòng điền tiêu đề, ca sĩ và chọn tệp âm thanh MP3');
      return;
    }

    setUploadProgress('Đang tải lên tệp âm thanh...');
    try {
      // 1. Upload audio
      const audioFormData = new FormData();
      audioFormData.append('audio', audioFile);
      const audioRes = await api.post('/admin/upload/audio', audioFormData);
      const streamUrl = audioRes.data.url;

      // 2. Upload cover if any
      let coverUrl: string | undefined = undefined;
      if (coverFile) {
        setUploadProgress('Đang tải lên ảnh bìa...');
        const coverFormData = new FormData();
        coverFormData.append('cover', coverFile);
        const coverRes = await api.post('/admin/upload/cover', coverFormData);
        coverUrl = coverRes.data.url;
      }

      // 3. Create song record
      setUploadProgress('Đang khởi tạo bản ghi ca khúc...');
      await api.post('/admin/songs', {
        title: songTitle.trim(),
        artists: [songArtist.trim()],
        album: songAlbum.trim() || undefined,
        lyrics: songLyrics.trim() || undefined,
        durationMs: 210000, // estimated or read from metadata
        streamUrl,
        coverUrl,
      });

      setUploadProgress(null);
      toast.success('Tải lên bài hát mới thành công!');
      setSongTitle('');
      setSongArtist('');
      setSongAlbum('');
      setSongLyrics('');
      setAudioFile(null);
      setCoverFile(null);
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    } catch (err: any) {
      setUploadProgress(null);
      toast.error(err.response?.data?.message || 'Lỗi tải lên tệp');
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source?.toLowerCase()) {
      case 'local':
        return {
          label: 'Local',
          className: 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700',
        };
      case 'youtube':
        return {
          label: 'YouTube',
          className: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
        };
      case 'spotify':
        return {
          label: 'Spotify',
          className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        };
      case 'zingmp3':
        return {
          label: 'ZingMP3',
          className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
        };
      case 'audius':
        return {
          label: 'Audius',
          className: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
        };
      case 'jamendo':
        return {
          label: 'Jamendo',
          className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
        };
      case 'itunes':
        return {
          label: 'iTunes',
          className: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30',
        };
      default:
        return {
          label: source || 'API',
          className: 'bg-surface-soft text-mute border-hairline',
        };
    }
  };

  const isAdminOrMod = Boolean(user && (user.role === 'ADMIN' || user.role === 'MODERATOR'));

  const { data: supportAlertsData } = useQuery({
    queryKey: ['admin-support-alerts'],
    queryFn: async () => {
      const res = await api.get('/admin/support-alerts');
      return res.data as {
        pendingCount: number;
        appeals: Array<{
          id: string;
          userId: string;
          userName: string;
          userEmail: string;
          message: string;
          createdAt: string;
        }>;
      };
    },
    enabled: isAdminOrMod,
    refetchInterval: 30000,
  });

  const resolveSupportMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'unlock' | 'dismiss' }) => {
      return api.post(`/admin/support-alerts/${id}/resolve`, { action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-support-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  if (!isAdminOrMod) {
    return (
      <div className="py-24 text-center space-y-4 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="font-display font-bold text-xl text-ink dark:text-white">
          Quyền truy cập bị từ chối
        </h2>
        <p className="text-xs text-body dark:text-mute leading-relaxed">
          Khu vực quản trị này chỉ dành riêng cho Quản trị viên (ADMIN) và Điều hành viên (MODERATOR). Tài khoản hiện tại của bạn không có đủ thẩm quyền.
        </p>
        <div className="pt-2">
          <Link to="/">
            <Button variant="secondary" size="md">
              Về trang chủ
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 select-none">
      {/* Top Header */}
      <div className="space-y-4 border-b border-hairline dark:border-hairline-dark pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-ink dark:text-white">
              Bảng điều khiển Quản trị mq
            </h1>
            <p className="text-xs text-body dark:text-mute mt-1">
              Giám sát vận hành, người dùng, bài hát và trạng thái API bên thứ ba
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1">
            {spotifyUser ? (
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-medium">
                  Spotify: {spotifyUser.displayName} ({spotifyUser.isPremium ? 'Premium' : 'Free'})
                </span>
                <Button variant="secondary" size="sm" onClick={disconnectSpotify}>
                  Ngắt kết nối
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={connectSpotify}
                disabled={isSpotifyConnecting}
              >
                {isSpotifyConnecting ? 'Đang kết nối Spotify...' : 'Kết nối Spotify Premium'}
              </Button>
            )}
            {spotifyError && (
              <span className="text-[11px] text-red-500">{spotifyError}</span>
            )}
          </div>
        </div>

        {/* iOS Segmented Control Tabs */}
        <div className="w-full overflow-x-auto pb-0.5">
          <SegmentedTabs
            tabs={ADMIN_TABS}
            activeId={activeTab}
            ariaLabel="Điều hướng quản trị"
            onChange={(id) => setActiveTab(id as AdminTabId)}
          />
        </div>
      </div>

      {/* Thông báo yêu cầu hỗ trợ mở khóa tài khoản cho Admin & Moderator */}
      <AnimatePresence initial={false}>
        {supportAlertsData && supportAlertsData.pendingCount > 0 && (
          <motion.div
            key="support-alerts-banner"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.32, 0.72, 0, 1] } }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, transition: { duration: 0.18 } }}
            className="p-4 rounded-card border border-amber-500/35 bg-amber-500/10 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Có {supportAlertsData.pendingCount} yêu cầu hỗ trợ mở khóa tài khoản đang chờ xử lý
                </span>
              </div>
              <span className="text-[11px] text-mute">Thông báo cho Admin &amp; Moderator</span>
            </div>

            <div className="space-y-2">
              {supportAlertsData.appeals.map((appeal) => (
                <div
                  key={appeal.id}
                  className="p-3 rounded-xl bg-canvas/90 dark:bg-surface-dark-card/90 border border-hairline dark:border-hairline-dark flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <strong className="text-ink dark:text-white">{appeal.userName}</strong>
                      <span className="text-mute">({appeal.userEmail})</span>
                      <span className="text-[11px] text-mute">
                        · {formatTimeAgo(appeal.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-body dark:text-mute leading-relaxed">
                      {appeal.message}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={resolveSupportMutation.isPending}
                      onClick={() =>
                        resolveSupportMutation.mutate({ id: appeal.id, action: 'dismiss' })
                      }
                    >
                      Bỏ qua
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={resolveSupportMutation.isPending}
                      onClick={() =>
                        resolveSupportMutation.mutate({ id: appeal.id, action: 'unlock' })
                      }
                    >
                      Mở khóa tài khoản
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Directional Tab Content Transition */}
      <AnimatePresence mode="wait" custom={tabDirection} initial={false}>
        <motion.div
          key={activeTab}
          custom={tabDirection}
          initial={{
            opacity: shouldReduceMotion ? 1 : 0,
            x:
              shouldReduceMotion || tabDirection === 0
                ? 0
                : tabDirection * SEGMENTED_NAV_CONFIG.contentSlidePx,
          }}
          animate={{
            opacity: 1,
            x: 0,
            transition: shouldReduceMotion
              ? { duration: 0 }
              : {
                  duration: SEGMENTED_NAV_CONFIG.durationContentMs / 1000,
                  ease: SEGMENTED_NAV_CONFIG.iosEasing,
                },
          }}
          exit={{
            opacity: shouldReduceMotion ? 1 : 0,
            x:
              shouldReduceMotion || tabDirection === 0
                ? 0
                : -tabDirection * SEGMENTED_NAV_CONFIG.contentSlidePx,
            transition: shouldReduceMotion
              ? { duration: 0 }
              : {
                  duration: 0.14,
                  ease: SEGMENTED_NAV_CONFIG.iosEasing,
                },
          }}
        >
          {/* Tab: Stats */}
          {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* Key Metrics Grid - 8 Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Tổng người dùng */}
            <div className="p-4 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-2">
              <div className="flex items-center justify-between text-mute">
                <span className="text-xs font-medium">Người dùng</span>
                <Users className="w-4 h-4" />
              </div>
              <p className="font-display font-bold text-2xl text-ink dark:text-white">
                {(stats?.metrics?.users?.value ?? stats?.totalUsers ?? 0).toLocaleString('vi-VN')}
              </p>
              <TrendBadge
                change={stats?.metrics?.users?.change}
                isUp={stats?.metrics?.users?.isUp}
                subtitle="7 ngày trước"
              />
            </div>

            {/* 2. Người dùng mới 7 ngày */}
            <div className="p-4 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-2">
              <div className="flex items-center justify-between text-mute">
                <span className="text-xs font-medium">Người dùng mới (7 ngày)</span>
                <UserPlus className="w-4 h-4" />
              </div>
              <p className="font-display font-bold text-2xl text-ink dark:text-white">
                {(stats?.metrics?.newUsers7d?.value ?? 0).toLocaleString('vi-VN')}
              </p>
              <TrendBadge
                change={stats?.metrics?.newUsers7d?.change}
                isUp={stats?.metrics?.newUsers7d?.isUp}
                subtitle="7 ngày trước"
              />
            </div>

            {/* 3. Hoạt động hôm nay */}
            <div className="p-4 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-2">
              <div className="flex items-center justify-between text-mute">
                <span className="text-xs font-medium">Hoạt động hôm nay</span>
                <UserCheck className="w-4 h-4" />
              </div>
              <p className="font-display font-bold text-2xl text-ink dark:text-white">
                {(stats?.metrics?.activeUsersToday?.value ?? 0).toLocaleString('vi-VN')}
              </p>
              <TrendBadge
                change={stats?.metrics?.activeUsersToday?.change}
                isUp={stats?.metrics?.activeUsersToday?.isUp}
                subtitle="hôm qua"
              />
            </div>

            {/* 4. Tổng lượt nghe */}
            <div className="p-4 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-2">
              <div className="flex items-center justify-between text-mute">
                <span className="text-xs font-medium">Tổng lượt nghe nhạc</span>
                <PlayCircle className="w-4 h-4" />
              </div>
              <p className="font-display font-bold text-2xl text-ink dark:text-white">
                {(stats?.metrics?.plays?.value ?? stats?.totalPlays ?? 0).toLocaleString('vi-VN')}
              </p>
              <TrendBadge
                change={stats?.metrics?.plays?.change}
                isUp={stats?.metrics?.plays?.isUp}
                subtitle="kỳ trước"
              />
            </div>

            {/* 5. Bài hát Local */}
            <div className="p-4 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-2">
              <div className="flex items-center justify-between text-mute">
                <span className="text-xs font-medium">Bài hát Local</span>
                <Music className="w-4 h-4" />
              </div>
              <p className="font-display font-bold text-2xl text-ink dark:text-white">
                {(stats?.metrics?.songs?.value ?? stats?.totalSongs ?? 0).toLocaleString('vi-VN')}
              </p>
              <TrendBadge
                change={stats?.metrics?.songs?.change}
                isUp={stats?.metrics?.songs?.isUp}
                subtitle="7 ngày trước"
              />
            </div>

            {/* 6. Tổng nghệ sĩ */}
            <div className="p-4 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-2">
              <div className="flex items-center justify-between text-mute">
                <span className="text-xs font-medium">Tổng nghệ sĩ</span>
                <Mic2 className="w-4 h-4" />
              </div>
              <p className="font-display font-bold text-2xl text-ink dark:text-white">
                {(stats?.metrics?.artists?.value ?? stats?.totalArtists ?? 0).toLocaleString('vi-VN')}
              </p>
              <TrendBadge
                change={stats?.metrics?.artists?.change}
                isUp={stats?.metrics?.artists?.isUp}
                subtitle="7 ngày trước"
              />
            </div>

            {/* 7. Tổng Album */}
            <div className="p-4 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-2">
              <div className="flex items-center justify-between text-mute">
                <span className="text-xs font-medium">Tổng Album</span>
                <Disc3 className="w-4 h-4" />
              </div>
              <p className="font-display font-bold text-2xl text-ink dark:text-white">
                {(stats?.metrics?.albums?.value ?? stats?.totalAlbums ?? 0).toLocaleString('vi-VN')}
              </p>
              <TrendBadge
                change={stats?.metrics?.albums?.change}
                isUp={stats?.metrics?.albums?.isUp}
                subtitle="kỳ trước"
              />
            </div>

            {/* 8. Dung lượng lưu trữ */}
            <div className="p-4 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-2">
              <div className="flex items-center justify-between text-mute">
                <span className="text-xs font-medium">Dung lượng đã dùng</span>
                <HardDrive className="w-4 h-4" />
              </div>
              <p className="font-display font-bold text-2xl text-ink dark:text-white">
                {stats?.metrics?.storage?.value ?? '0 B'}
              </p>
              <div className="flex items-center justify-between text-[11px] font-sans text-mute">
                <span className="text-[10px] opacity-75">Uploads + DB</span>
                <TrendBadge
                  change={stats?.metrics?.storage?.change}
                  isUp={stats?.metrics?.storage?.isUp}
                  subtitle="kỳ trước"
                />
              </div>
            </div>
          </div>

          {/* Daily plays Bar Chart with Y-Axis, Tooltip & 7/30/90 Days Filter */}
          <div className="p-6 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-6">
            {/* Header: Title + Period Summary & Filter Chips */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-base text-ink dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-mute" />
                  <span>Lượt phát nhạc {chartDays} ngày qua</span>
                </h3>
                <p className="text-xs text-mute mt-0.5">
                  {stats?.periodPlays !== undefined ? (
                    <>
                      Tổng <strong className="text-ink dark:text-white font-sans">{stats.periodPlays.toLocaleString('vi-VN')}</strong> lượt nghe trong giai đoạn này
                    </>
                  ) : (
                    'Theo dõi biến động và xu hướng nghe nhạc của người dùng'
                  )}
                </p>
              </div>

              {/* Filter Segmented Control 7d / 30d / 90d */}
              <SegmentedTabs
                tabs={[
                  { id: '7', label: '7 ngày' },
                  { id: '30', label: '30 ngày' },
                  { id: '90', label: '90 ngày' },
                ]}
                activeId={String(chartDays)}
                size="sm"
                ariaLabel="Chọn khoảng thời gian biểu đồ"
                className="self-start sm:self-auto"
                onChange={(id) => setChartDays(Number(id) as 7 | 30 | 90)}
              />
            </div>

            {/* State 1: Loading */}
            {isLoadingStats && (
              <div className="h-60 flex items-end justify-between gap-1.5 sm:gap-2 px-8 animate-pulse">
                {[...Array(chartDays === 7 ? 7 : chartDays === 30 ? 15 : 24)].map((_, idx) => (
                  <div
                    key={idx}
                    className="flex-1 bg-surface-soft dark:bg-surface-dark-soft rounded-t-sm"
                    style={{ height: `${20 + ((idx * 29) % 65)}%` }}
                  />
                ))}
              </div>
            )}

            {/* State 2: Error */}
            {isErrorStats && (
              <div className="h-60 flex flex-col items-center justify-center gap-2 text-center p-6 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/40">
                <AlertCircle className="w-7 h-7 text-red-500 mb-1" />
                <p className="text-sm font-semibold text-ink dark:text-white">
                  Không thể tải dữ liệu thống kê biểu đồ
                </p>
                <p className="text-xs text-mute max-w-sm">
                  Đã có lỗi xảy ra khi truy vấn dữ liệu từ máy chủ. Vui lòng thử lại.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => refetchStats()}
                  className="flex items-center gap-1.5 mt-2"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Thử lại</span>
                </Button>
              </div>
            )}

            {/* State 3: Empty */}
            {!isLoadingStats && !isErrorStats && (!stats?.chartData || stats.chartData.length === 0) && (
              <div className="h-60 flex flex-col items-center justify-center gap-2 text-center p-6 text-mute">
                <BarChart3 className="w-8 h-8 opacity-40 mb-1" />
                <p className="text-sm font-medium text-ink dark:text-white">
                  Chưa có dữ liệu lượt nghe
                </p>
                <p className="text-xs text-mute">
                  Chưa ghi nhận lượt phát nhạc nào trong khoảng thời gian {chartDays} ngày qua.
                </p>
              </div>
            )}

            {/* State 4: Normal Chart Display */}
            {!isLoadingStats && !isErrorStats && stats?.chartData && stats.chartData.length > 0 && (() => {
              const chartData = stats.chartData as Array<{ date: string; plays: number }>;
              const rawMax = Math.max(...chartData.map((d) => d.plays), 0);

              const getYMax = (max: number) => {
                if (max <= 0) return 10;
                if (max <= 10) return 10;
                if (max <= 50) return Math.ceil(max / 5) * 5;
                if (max <= 100) return Math.ceil(max / 10) * 10;
                if (max <= 500) return Math.ceil(max / 50) * 50;
                return Math.ceil(max / 100) * 100;
              };
              const yMax = getYMax(rawMax);
              const yTicks = [
                yMax,
                Math.round(yMax * 0.66),
                Math.round(yMax * 0.33),
                0,
              ];

              return (
                <div className="pt-2">
                  <div className="flex gap-2 sm:gap-4">
                    {/* Trục Y (Y-Axis Labels) */}
                    <div className="w-9 sm:w-11 h-56 flex flex-col justify-between items-end pb-1 select-none">
                      {yTicks.map((tick, i) => (
                        <span key={i} className="text-[10px] font-sans text-mute leading-none">
                          {tick.toLocaleString('vi-VN')}
                        </span>
                      ))}
                    </div>

                    {/* Vùng vẽ biểu đồ (Plot Area) */}
                    <div className="relative flex-1 h-56">
                      {/* Đường dóng ngang (Horizontal Gridlines) */}
                      <div className="absolute inset-x-0 top-0 border-b border-hairline/60 dark:border-hairline-dark/40" />
                      <div className="absolute inset-x-0 top-[33.3%] border-b border-dashed border-hairline/40 dark:border-hairline-dark/30" />
                      <div className="absolute inset-x-0 top-[66.6%] border-b border-dashed border-hairline/40 dark:border-hairline-dark/30" />
                      <div className="absolute inset-x-0 bottom-0 border-b border-hairline dark:border-hairline-dark" />

                      {/* Danh sách các cột (Bars) */}
                      <div
                        className={`absolute inset-0 flex items-end justify-between ${
                          chartDays === 7
                            ? 'gap-2 sm:gap-4 px-2'
                            : chartDays === 30
                            ? 'gap-1 sm:gap-1.5 px-1'
                            : 'gap-[1px] sm:gap-[2px] px-0.5'
                        }`}
                      >
                        {chartData.map((item) => {
                          const heightPercent = yMax > 0 ? (item.plays / yMax) * 88 : 0;
                          const isNonZero = item.plays > 0;

                          return (
                            <div
                              key={item.date}
                              className="relative flex-1 min-w-0 flex items-end justify-center h-full group"
                            >
                              {/* Cột biểu đồ */}
                              <div
                                className={`w-full transition-all duration-300 relative ${
                                  chartDays === 7
                                    ? 'max-w-[42px]'
                                    : chartDays === 30
                                    ? 'max-w-[14px]'
                                    : 'max-w-[7px]'
                                } ${
                                  isNonZero
                                    ? 'bg-ink dark:bg-white rounded-t-sm group-hover:opacity-80'
                                    : 'bg-hairline dark:bg-hairline-dark/70 rounded-full'
                                }`}
                                style={{
                                  height: isNonZero ? `${Math.max(3, heightPercent)}%` : '2px',
                                }}
                              >
                                {/* Tooltip khi hover */}
                                <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                                  <div className="px-3 py-1.5 rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-black border border-neutral-700/60 shadow-xl text-xs space-y-0.5 whitespace-nowrap">
                                    <div className="text-[10px] opacity-75 font-sans flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      <span>{formatFullDate(item.date)}</span>
                                    </div>
                                    <div className="font-sans text-xs font-bold flex items-center gap-1.5">
                                      <TrendingUp className="w-3 h-3 text-green-500 dark:text-green-600" />
                                      <span>{item.plays.toLocaleString('vi-VN')} lượt phát</span>
                                    </div>
                                  </div>
                                  <div className="w-2 h-2 bg-neutral-900 dark:bg-neutral-100 border-r border-b border-neutral-700/60 rotate-45 -mt-1" />
                                </div>

                                {/* Nhãn giá trị trên đầu cột */}
                                <span
                                  className={`absolute bottom-full mb-1 left-1/2 -translate-x-1/2 text-[10px] font-sans font-medium text-mute transition-opacity leading-none pointer-events-none whitespace-nowrap ${
                                    chartDays === 7
                                      ? 'opacity-80 group-hover:opacity-100'
                                      : 'opacity-0 group-hover:opacity-100'
                                  }`}
                                >
                                  {item.plays > 0 ? item.plays : ''}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Trục X Ngày tháng bên dưới căn giữa theo từng cột */}
                  <div className="flex gap-2 sm:gap-4 pt-3">
                    <div className="w-9 sm:w-11 shrink-0" />
                    <div
                      className={`flex-1 flex items-center text-[10px] font-sans text-mute select-none ${
                        chartDays === 7
                          ? 'gap-2 sm:gap-4 px-2'
                          : chartDays === 30
                          ? 'gap-1 sm:gap-1.5 px-1'
                          : 'gap-[1px] sm:gap-[2px] px-0.5'
                      }`}
                    >
                      {chartData.map((item, idx) => {
                        const showLabel =
                          chartDays === 7 ||
                          idx === 0 ||
                          idx === chartData.length - 1 ||
                          (chartDays === 30 && idx % 5 === 0) ||
                          (chartDays === 90 && idx % 15 === 0);
                        const label = showLabel
                          ? `${item.date.slice(8, 10)}/${item.date.slice(5, 7)}`
                          : '';
                        return (
                          <div
                            key={item.date}
                            className="flex-1 min-w-0 flex justify-center"
                          >
                            {label && (
                              <span className="whitespace-nowrap leading-none">
                                {label}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 2-Column Section: Growth & Rankings + Artists & Activities */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (7 cols): User Growth & Top 10 Songs */}
            <div className="lg:col-span-7 space-y-6">
              {/* Card: Biểu đồ tăng trưởng người dùng */}
              <div className="p-6 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-hairline dark:border-hairline-dark">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-mute" />
                    <div>
                      <h3 className="font-semibold text-base text-ink dark:text-white">
                        Tăng trưởng người dùng
                      </h3>
                      <p className="text-xs text-mute">
                        Theo dõi tài khoản mới và lũy kế người dùng trong 30 ngày qua
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-sans font-medium px-2 py-0.5 rounded-pill bg-surface-soft dark:bg-surface-dark-soft text-body dark:text-mute">
                    30 ngày
                  </span>
                </div>

                <UserGrowthChart data={stats?.userGrowth} />
              </div>

              {/* Card: Top 10 Bài hát nghe nhiều nhất */}
              <div className="p-6 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-hairline dark:border-hairline-dark">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <div>
                      <h3 className="font-semibold text-base text-ink dark:text-white">
                        Top 10 bài hát nghe nhiều nhất
                      </h3>
                      <p className="text-xs text-mute">
                        Bảng xếp hạng dựa trên tổng số lượt nghe tích lũy
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-sans text-mute">
                    {stats?.topSongs?.length || 0} bài hát
                  </span>
                </div>

                <div className="space-y-1 divide-y divide-hairline/40 dark:divide-hairline-dark/30">
                  {stats?.topSongs?.map((song: any, index: number) => {
                    const maxPlays = stats.topSongs[0]?.playCount || 1;
                    const progressPercent = Math.min(100, Math.round((song.playCount / maxPlays) * 100));

                    return (
                      <div
                        key={song.id}
                        className="flex items-center gap-3 py-2 px-1 rounded-md hover:bg-surface-soft/60 dark:hover:bg-surface-dark-soft/40 transition-colors group"
                      >
                        {/* Rank Badge */}
                        <span
                          className={`w-6 text-center font-sans font-bold text-xs flex-shrink-0 ${
                            index === 0
                              ? 'text-amber-500 font-extrabold text-sm'
                              : index === 1
                              ? 'text-slate-400 font-bold'
                              : index === 2
                              ? 'text-amber-700 dark:text-amber-500 font-bold'
                              : 'text-mute font-medium'
                          }`}
                        >
                          {index + 1}
                        </span>

                        {/* Thumbnail */}
                        <div className="w-10 h-10 rounded-md overflow-hidden bg-surface-soft dark:bg-surface-dark-soft flex-shrink-0 relative border border-hairline/60 dark:border-hairline-dark/40">
                          {song.coverUrl ? (
                            <img
                              src={song.coverUrl}
                              alt={song.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <AlbumPlaceholder
                              title={song.title}
                              artist={Array.isArray(song.artists) ? song.artists[0] : song.artists}
                              className="w-full h-full"
                            />
                          )}
                        </div>

                        {/* Title & Artists */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink dark:text-white truncate group-hover:text-ink dark:group-hover:text-white">
                            {song.title}
                          </p>
                          <p className="text-xs text-mute truncate">
                            {Array.isArray(song.artists) ? song.artists.join(', ') : song.artists || 'Không rõ nghệ sĩ'}
                          </p>
                        </div>

                        {/* Play Count & Mini Progress */}
                        <div className="w-28 text-right flex-shrink-0 space-y-1">
                          <p className="text-xs font-sans font-semibold text-ink dark:text-white">
                            {song.playCount?.toLocaleString('vi-VN')}{' '}
                            <span className="text-[10px] text-mute font-sans font-normal">lượt</span>
                          </p>
                          <div className="w-full h-1 bg-surface-soft dark:bg-surface-dark-soft rounded-full overflow-hidden">
                            <div
                              className="h-full bg-ink dark:bg-white rounded-full transition-all duration-500"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {(!stats?.topSongs || stats.topSongs.length === 0) && (
                    <div className="py-8 text-center text-xs text-mute">
                      Chưa có dữ liệu bảng xếp hạng bài hát
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): Top 5 Artists & Recent Activities */}
            <div className="lg:col-span-5 space-y-6">
              {/* Card: Top 5 Nghệ sĩ nổi bật */}
              <div className="p-6 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-hairline dark:border-hairline-dark">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <div>
                      <h3 className="font-semibold text-base text-ink dark:text-white">
                        Top 5 nghệ sĩ nổi bật
                      </h3>
                      <p className="text-xs text-mute">
                        Nghệ sĩ có nhiều lượt nghe & bài hát nhất
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-sans text-mute">
                    {stats?.topArtists?.length || 0} nghệ sĩ
                  </span>
                </div>

                <div className="space-y-2">
                  {stats?.topArtists?.map((artist: any, index: number) => (
                    <div
                      key={artist.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-soft/60 dark:hover:bg-surface-dark-soft/40 transition-colors"
                    >
                      <span
                        className={`w-5 text-center font-sans font-bold text-xs flex-shrink-0 ${
                          index === 0 ? 'text-amber-500' : 'text-mute'
                        }`}
                      >
                        {index + 1}
                      </span>

                      <div className="w-11 h-11 rounded-full overflow-hidden bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark flex-shrink-0 relative">
                        {artist.imageUrl ? (
                          <img
                            src={artist.imageUrl}
                            alt={artist.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-mute font-bold text-sm">
                            {artist.name?.[0] || 'A'}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink dark:text-white truncate">
                          {artist.name}
                        </p>
                        <p className="text-xs text-mute">
                          {artist.songCount} bài hát • {artist.totalPlays?.toLocaleString('vi-VN')} lượt nghe
                        </p>
                      </div>
                    </div>
                  ))}

                  {(!stats?.topArtists || stats.topArtists.length === 0) && (
                    <div className="py-6 text-center text-xs text-mute">
                      Chưa có nghệ sĩ nào được ghi nhận
                    </div>
                  )}
                </div>
              </div>

              {/* Card: Hoạt động gần đây */}
              <div className="p-6 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-hairline dark:border-hairline-dark">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-mute" />
                    <div>
                      <h3 className="font-semibold text-base text-ink dark:text-white">
                        Hoạt động gần đây
                      </h3>
                      <p className="text-xs text-mute">
                        Đăng ký mới, tải nhạc, tạo danh sách phát
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-sans text-mute">Mới nhất</span>
                </div>

                <div className="space-y-3">
                  {stats?.recentActivities?.map((act: any) => {
                    const getIcon = () => {
                      switch (act.type) {
                        case 'register':
                          return <UserPlus className="w-3.5 h-3.5 text-blue-500" />;
                        case 'upload':
                          return <Upload className="w-3.5 h-3.5 text-emerald-500" />;
                        case 'playlist':
                          return <ListMusic className="w-3.5 h-3.5 text-purple-500" />;
                        case 'like':
                          return <Heart className="w-3.5 h-3.5 text-rose-500" />;
                        default:
                          return <Activity className="w-3.5 h-3.5 text-mute" />;
                      }
                    };

                    return (
                      <div key={act.id} className="flex items-start gap-3 text-xs">
                        <div className="w-7 h-7 rounded-full bg-surface-soft dark:bg-surface-dark-soft flex items-center justify-center flex-shrink-0 mt-0.5 border border-hairline dark:border-hairline-dark">
                          {getIcon()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-ink dark:text-white text-xs leading-snug">
                            {act.description}
                          </p>
                          <span className="text-[10px] text-mute font-sans">
                            {formatTimeAgo(act.timestamp)}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {(!stats?.recentActivities || stats.recentActivities.length === 0) && (
                    <div className="py-6 text-center text-xs text-mute">
                      Chưa ghi nhận hoạt động nào
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Full-width Section: Trạng thái hệ thống */}
          <div className="p-6 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-hairline dark:border-hairline-dark">
              <div className="flex items-center gap-2.5">
                <Server className="w-5 h-5 text-mute" />
                <div>
                  <h3 className="font-semibold text-base text-ink dark:text-white flex items-center gap-2">
                    <span>Trạng thái hệ thống & Dịch vụ</span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-pill text-[11px] font-sans font-medium ${
                        stats?.systemHealth?.status === 'operational'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          stats?.systemHealth?.status === 'operational' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                      {stats?.systemHealth?.status === 'operational'
                        ? 'Tất cả dịch vụ ổn định'
                        : 'Có cảnh báo dịch vụ'}
                    </span>
                  </h3>
                  <p className="text-xs text-mute mt-0.5">
                    Giám sát cơ sở dữ liệu, bộ nhớ lưu trữ tệp và 7 API nhà cung cấp nội dung
                  </p>
                </div>
              </div>

              {/* Refresh button */}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRefreshHealth}
                disabled={isCheckingHealth}
                className="flex items-center gap-1.5 text-xs self-start sm:self-auto"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
                <span>Kiểm tra lại</span>
              </Button>
            </div>

            {/* Services Grid (3 columns on desktop, 1 on mobile) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats?.systemHealth?.services?.map((svc: any) => {
                const isOk = svc.status === 'operational';
                const isWarn = svc.status === 'warning' || svc.status === 'quota_exceeded';
                const isErr = svc.status === 'error';

                const dotColor = isOk
                  ? 'bg-emerald-500'
                  : isWarn
                  ? 'bg-amber-500'
                  : isErr
                  ? 'bg-rose-500'
                  : 'bg-neutral-500';

                const statusBadge = isOk
                  ? { text: 'Hoạt động', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' }
                  : isWarn
                  ? {
                      text: svc.status === 'quota_exceeded' ? 'Hết quota' : 'Cảnh báo',
                      color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
                    }
                  : isErr
                  ? { text: 'Lỗi', color: 'text-rose-600 dark:text-rose-400 bg-rose-500/10' }
                  : { text: 'Đã tắt', color: 'text-neutral-500 bg-neutral-500/10' };

                return (
                  <div
                    key={svc.id}
                    className="p-3.5 rounded-lg border border-hairline dark:border-hairline-dark bg-surface-soft/40 dark:bg-surface-dark-soft/20 flex flex-col justify-between gap-2.5 transition-all hover:border-hairline/80 dark:hover:border-hairline-dark/80"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          {isOk && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          )}
                          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dotColor}`} />
                        </span>
                        <h4 className="text-xs font-semibold text-ink dark:text-white truncate">
                          {svc.name}
                        </h4>
                      </div>
                      <span
                        className={`text-[10px] font-sans px-2 py-0.5 rounded-pill font-medium whitespace-nowrap ${statusBadge.color}`}
                      >
                        {statusBadge.text}
                      </span>
                    </div>

                    <p className="text-[11px] text-mute line-clamp-1">
                      {svc.details}
                    </p>

                    <div className="flex items-center justify-between text-[10px] font-sans text-mute pt-1 border-t border-hairline/40 dark:border-hairline-dark/30">
                      <span>
                        Độ trễ: <strong className="text-ink dark:text-white font-sans">{svc.latencyMs}ms</strong>
                      </span>
                      <span>{formatTimeAgo(svc.checkedAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Songs Management */}
      {activeTab === 'songs' && (
        <div className="space-y-6">
          {/* Header & Quick Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display font-bold text-xl text-ink dark:text-white flex items-center gap-2">
                <Music className="w-5 h-5 text-mute" />
                <span>Quản lý kho bài hát</span>
                <span className="text-xs font-sans font-normal px-2 py-0.5 rounded-pill bg-surface-soft dark:bg-surface-dark-soft text-mute">
                  {(songsData?.total || 0).toLocaleString('vi-VN')} bài
                </span>
              </h2>
              <p className="text-xs text-mute mt-0.5">
                Tìm kiếm, lọc nguồn, sửa thông tin metadata, thay đổi ảnh bìa, ẩn/hiện hoặc xóa bài hát
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => refetchSongs()}
                disabled={isFetchingSongs}
                className="flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetchingSongs ? 'animate-spin' : ''}`} />
                <span>Làm mới</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setActiveTab('upload')}
                className="flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Tải lên bài mới</span>
              </Button>
            </div>
          </div>

          {/* Search & Filters Card */}
          <div className="p-4 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Search input */}
              <div className="md:col-span-4 relative">
                <Search className="w-4 h-4 text-mute absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Tìm theo tên bài hát, nghệ sĩ, album..."
                  value={songSearch}
                  onChange={(e) => {
                    setSongSearch(e.target.value);
                    setSongPage(1);
                  }}
                  className="w-full h-9 pl-9 pr-8 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-xs text-ink dark:text-white placeholder:text-mute focus:outline-none"
                />
                {songSearch && (
                  <button
                    onClick={() => {
                      setSongSearch('');
                      setSongPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mute hover:text-ink dark:hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Source filter */}
              <div className="md:col-span-2">
                <SelectDropdown
                  value={songSourceFilter}
                  size="md"
                  className="w-full"
                  ariaLabel="Lọc theo nguồn nhạc"
                  options={[
                    { value: 'all', label: 'Tất cả nguồn' },
                    { value: 'local', label: 'Local (Cục bộ)' },
                    { value: 'youtube', label: 'YouTube' },
                    { value: 'spotify', label: 'Spotify' },
                    { value: 'zingmp3', label: 'ZingMP3' },
                    { value: 'audius', label: 'Audius' },
                    { value: 'jamendo', label: 'Jamendo' },
                    { value: 'itunes', label: 'iTunes' },
                  ]}
                  onChange={(val) => {
                    setSongSourceFilter(val);
                    setSongPage(1);
                  }}
                />
              </div>

              {/* Artist filter */}
              <div className="md:col-span-2">
                <SelectDropdown
                  value={songArtistFilter}
                  size="md"
                  className="w-full"
                  ariaLabel="Lọc theo nghệ sĩ"
                  options={[
                    { value: 'all', label: 'Tất cả nghệ sĩ' },
                    ...(songsData?.artistsList || []).map((name: string) => ({
                      value: name,
                      label: name,
                    })),
                  ]}
                  onChange={(val) => {
                    setSongArtistFilter(val);
                    setSongPage(1);
                  }}
                />
              </div>

              {/* Status filter */}
              <div className="md:col-span-2">
                <SelectDropdown
                  value={songStatusFilter}
                  size="md"
                  className="w-full"
                  ariaLabel="Lọc theo trạng thái bài hát"
                  options={[
                    { value: 'all', label: 'Tất cả trạng thái' },
                    { value: 'visible', label: 'Đang hiển thị' },
                    { value: 'hidden', label: 'Đang ẩn' },
                  ]}
                  onChange={(val) => {
                    setSongStatusFilter(val as any);
                    setSongPage(1);
                  }}
                />
              </div>

              {/* Sort By */}
              <div className="md:col-span-2">
                <SelectDropdown
                  value={`${songSortBy}:${songSortOrder}`}
                  size="md"
                  className="w-full"
                  ariaLabel="Sắp xếp bài hát"
                  options={[
                    { value: 'createdAt:desc', label: 'Mới nhất' },
                    { value: 'createdAt:asc', label: 'Cũ nhất' },
                    { value: 'playCount:desc', label: 'Lượt nghe nhiều nhất' },
                    { value: 'title:asc', label: 'Tên bài hát (A-Z)' },
                    { value: 'durationMs:desc', label: 'Thời lượng dài nhất' },
                  ]}
                  onChange={(val) => {
                    const [by, order] = val.split(':');
                    setSongSortBy(by as any);
                    setSongSortOrder(order as any);
                    setSongPage(1);
                  }}
                />
              </div>
            </div>

            {/* Filter tags & Reset */}
            {(songSearch || songSourceFilter !== 'all' || songArtistFilter !== 'all' || songAlbumFilter !== 'all' || songStatusFilter !== 'all') && (
              <div className="flex items-center gap-2 pt-2 border-t border-hairline/40 dark:border-hairline-dark/30 text-xs">
                <span className="text-mute">Đang lọc:</span>
                {songSearch && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-surface-soft dark:bg-surface-dark-soft text-[11px] text-ink dark:text-white">
                    Từ khóa: "{songSearch}"
                    <button onClick={() => setSongSearch('')} className="hover:opacity-75">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {songSourceFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-surface-soft dark:bg-surface-dark-soft text-[11px] text-ink dark:text-white">
                    Nguồn: {songSourceFilter}
                    <button onClick={() => setSongSourceFilter('all')} className="hover:opacity-75">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {songArtistFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-surface-soft dark:bg-surface-dark-soft text-[11px] text-ink dark:text-white">
                    Nghệ sĩ: {songArtistFilter}
                    <button onClick={() => setSongArtistFilter('all')} className="hover:opacity-75">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {songStatusFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-surface-soft dark:bg-surface-dark-soft text-[11px] text-ink dark:text-white">
                    Trạng thái: {songStatusFilter === 'visible' ? 'Hiển thị' : 'Đang ẩn'}
                    <button onClick={() => setSongStatusFilter('all')} className="hover:opacity-75">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setSongSearch('');
                    setSongSourceFilter('all');
                    setSongArtistFilter('all');
                    setSongAlbumFilter('all');
                    setSongStatusFilter('all');
                    setSongPage(1);
                  }}
                  className="text-xs text-rose-500 hover:underline ml-auto font-medium"
                >
                  Xóa tất cả bộ lọc
                </button>
              </div>
            )}
          </div>

          {/* Batch Actions Bar (when selected items > 0) */}
          <AnimatePresence initial={false}>
            {selectedSongIds.length > 0 && (
              <motion.div
                key="batch-actions-bar"
                initial={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { height: 0, opacity: 0, y: -8, scale: 0.985 }
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
                          height: { duration: 0.28, ease: [0.32, 0.72, 0, 1] },
                          opacity: { duration: 0.2, delay: 0.04 },
                          y: { duration: 0.26, ease: [0.32, 0.72, 0, 1] },
                          scale: { duration: 0.26, ease: [0.32, 0.72, 0, 1] },
                        },
                      }
                }
                exit={
                  shouldReduceMotion
                    ? { opacity: 0, transition: { duration: 0.1 } }
                    : {
                        height: 0,
                        opacity: 0,
                        y: -6,
                        scale: 0.985,
                        transition: {
                          height: { duration: 0.22, ease: [0.32, 0.72, 0, 1] },
                          opacity: { duration: 0.14 },
                          y: { duration: 0.18 },
                        },
                      }
                }
                className="overflow-hidden"
              >
                <div className="p-3 rounded-lg bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark flex flex-wrap items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-traffic-green animate-pulse" />
                    <span className="text-xs font-semibold text-ink dark:text-white font-sans tabular-nums">
                      Đã chọn {selectedSongIds.length} bài hát
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        batchActionMutation.mutate({
                          action: 'unhide',
                          songIds: selectedSongIds,
                        })
                      }
                      disabled={batchActionMutation.isPending}
                      className="flex items-center gap-1 text-xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Hiện bài hát</span>
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        batchActionMutation.mutate({
                          action: 'hide',
                          songIds: selectedSongIds,
                        })
                      }
                      disabled={batchActionMutation.isPending}
                      className="flex items-center gap-1 text-xs"
                    >
                      <EyeOff className="w-3.5 h-3.5 text-amber-500" />
                      <span>Ẩn bài hát</span>
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setDeleteDialog({
                          isOpen: true,
                          type: 'batch',
                          count: selectedSongIds.length,
                        })
                      }
                      disabled={batchActionMutation.isPending}
                      className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa đã chọn</span>
                    </Button>

                    <button
                      type="button"
                      onClick={() => setSelectedSongIds([])}
                      className="text-xs text-mute hover:text-ink dark:hover:text-white ml-2 cursor-pointer transition-colors"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Songs Data Table */}
          <div className="rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-hairline dark:border-hairline-dark bg-surface-soft/50 dark:bg-surface-dark-soft/30 text-[11px] font-semibold text-mute uppercase tracking-wider">
                    <th className="py-3 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        className="rounded border-hairline cursor-pointer accent-ink dark:accent-white"
                      />
                    </th>
                    <th className="py-3 px-3 w-12 text-center font-sans">#</th>
                    <th className="py-3 px-4 min-w-[240px]">Bài hát</th>
                    <th className="py-3 px-4 min-w-[140px]">Album</th>
                    <th className="py-3 px-3 w-28 text-center">Nguồn</th>
                    <th className="py-3 px-3 w-24 text-right">Lượt nghe</th>
                    <th className="py-3 px-3 w-20 text-center">Thời lượng</th>
                    <th className="py-3 px-3 w-24 text-center">Trạng thái</th>
                    <th className="py-3 px-4 w-32 text-right">Thao tác</th>
                  </tr>
                </thead>
                <AnimatedTableBody
                  transitionKey={`${songSourceFilter}:${songArtistFilter}:${songStatusFilter}:${songSortBy}:${songSortOrder}:${songPage}:${songSearch}`}
                  className="divide-y divide-hairline/40 dark:divide-hairline-dark/30 text-xs"
                >
                  {/* Loading state */}
                  {isLoadingSongs &&
                    [...Array(6)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-3.5 px-4 text-center">
                          <div className="w-4 h-4 bg-surface-soft dark:bg-surface-dark-soft rounded mx-auto" />
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <div className="w-4 h-3 bg-surface-soft dark:bg-surface-dark-soft rounded mx-auto" />
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-md bg-surface-soft dark:bg-surface-dark-soft flex-shrink-0" />
                            <div className="space-y-1.5 flex-1">
                              <div className="w-3/4 h-3 bg-surface-soft dark:bg-surface-dark-soft rounded" />
                              <div className="w-1/2 h-2.5 bg-surface-soft dark:bg-surface-dark-soft rounded" />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="w-20 h-3 bg-surface-soft dark:bg-surface-dark-soft rounded" />
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <div className="w-14 h-4 bg-surface-soft dark:bg-surface-dark-soft rounded-pill mx-auto" />
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <div className="w-12 h-3 bg-surface-soft dark:bg-surface-dark-soft rounded ml-auto" />
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <div className="w-10 h-3 bg-surface-soft dark:bg-surface-dark-soft rounded mx-auto" />
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <div className="w-14 h-4 bg-surface-soft dark:bg-surface-dark-soft rounded-pill mx-auto" />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="w-20 h-4 bg-surface-soft dark:bg-surface-dark-soft rounded ml-auto" />
                        </td>
                      </tr>
                    ))}

                  {/* Empty state */}
                  {!isLoadingSongs && (!songsData?.songs || songsData.songs.length === 0) && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-mute">
                        <Music className="w-8 h-8 opacity-30 mx-auto mb-2" />
                        <p className="font-medium text-sm text-ink dark:text-white">Không tìm thấy bài hát nào</p>
                        <p className="text-xs text-mute mt-1">
                          Hãy thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh bộ lọc nguồn
                        </p>
                      </td>
                    </tr>
                  )}

                  {/* Songs Rows */}
                  {!isLoadingSongs &&
                    songsData?.songs?.map((song: any, index: number) => {
                      const isSelected = selectedSongIds.includes(song.id);
                      const badge = getSourceBadge(song.source);
                      const rowIndex = (songPage - 1) * songLimit + index + 1;

                      return (
                        <tr
                          key={song.id}
                          className={`hover:bg-surface-soft/60 dark:hover:bg-surface-dark-soft/40 transition-colors ${
                            isSelected ? 'bg-surface-soft/40 dark:bg-surface-dark-soft/30' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(song.id)}
                              className="rounded border-hairline cursor-pointer accent-ink dark:accent-white"
                            />
                          </td>

                          {/* Index */}
                          <td className="py-3 px-3 text-center font-sans text-[11px] text-mute">
                            {rowIndex}
                          </td>

                          {/* Song Info */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                onClick={() => handleOpenQuickCover(song)}
                                className="w-10 h-10 rounded-md overflow-hidden bg-surface-soft dark:bg-surface-dark-soft flex-shrink-0 relative border border-hairline/60 dark:border-hairline-dark/40 cursor-pointer group"
                                title="Bấm để đổi ảnh bìa"
                              >
                                <AlbumPlaceholder
                                  title={song.title}
                                  artist={Array.isArray(song.artists) ? song.artists[0] : song.artists}
                                  className="w-full h-full"
                                />
                                {song.coverUrl && (
                                  <img
                                    src={song.coverUrl}
                                    alt={song.title}
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    loading="lazy"
                                  />
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <ImageIcon className="w-3.5 h-3.5 text-white" />
                                </div>
                              </div>

                              <div className="min-w-0">
                                <p className="font-medium text-sm text-ink dark:text-white truncate">
                                  {song.title}
                                </p>
                                <p className="text-xs text-mute truncate">
                                  {Array.isArray(song.artists) ? song.artists.join(', ') : song.artists || 'Không rõ'}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Album */}
                          <td className="py-3 px-4 text-xs text-mute truncate max-w-[180px]">
                            {song.album || '—'}
                          </td>

                          {/* Source */}
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`text-[10px] font-sans px-2 py-0.5 rounded-pill border font-medium ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </td>

                          {/* Plays */}
                          <td className="py-3 px-3 text-right font-sans text-xs font-semibold text-ink dark:text-white">
                            {song.playCount?.toLocaleString('vi-VN')}
                          </td>

                          {/* Duration */}
                          <td className="py-3 px-3 text-center font-sans text-xs text-mute">
                            {formatMs(song.durationMs)}
                          </td>

                          {/* Visibility Status */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                toggleVisibilityMutation.mutate({
                                  id: song.id,
                                  isHidden: !song.isHidden,
                                })
                              }
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[11px] font-medium transition-colors cursor-pointer ${
                                song.isHidden
                                  ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-neutral-700'
                                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                              }`}
                              title={song.isHidden ? 'Bài hát đang bị ẩn. Bấm để hiển thị' : 'Bài hát đang hiển thị. Bấm để ẩn'}
                            >
                              {song.isHidden ? (
                                <>
                                  <EyeOff className="w-3 h-3" />
                                  <span>Đã ẩn</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3 h-3" />
                                  <span>Hiển thị</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Edit metadata */}
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(song)}
                                className="p-1.5 rounded-md hover:bg-surface-soft dark:hover:bg-surface-dark-soft text-mute hover:text-ink dark:hover:text-white transition-colors"
                                title="Chỉnh sửa metadata bài hát"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Quick change cover */}
                              <button
                                type="button"
                                onClick={() => handleOpenQuickCover(song)}
                                className="p-1.5 rounded-md hover:bg-surface-soft dark:hover:bg-surface-dark-soft text-mute hover:text-ink dark:hover:text-white transition-colors"
                                title="Thay đổi ảnh bìa"
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteDialog({
                                    isOpen: true,
                                    type: 'single',
                                    song,
                                  })
                                }
                                className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 text-mute hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                title="Xóa bài hát"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </AnimatedTableBody>
              </table>
            </div>

            {/* Pagination Controls */}
            {songsData && songsData.total > 0 && (
              <div className="p-3 border-t border-hairline dark:border-hairline-dark flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-mute">
                <div className="flex items-center gap-3">
                  <span>
                    Hiển thị{' '}
                    <strong className="text-ink dark:text-white font-sans">
                      {Math.min(songsData.total, (songPage - 1) * songLimit + 1)} -{' '}
                      {Math.min(songsData.total, songPage * songLimit)}
                    </strong>{' '}
                    trên tổng số{' '}
                    <strong className="text-ink dark:text-white font-sans">
                      {songsData.total.toLocaleString('vi-VN')}
                    </strong>{' '}
                    bài hát
                  </span>

                  {/* Limit selector */}
                  <div className="flex items-center gap-1.5 pl-3 border-l border-hairline dark:border-hairline-dark">
                    <span>Số lượng:</span>
                    <SelectDropdown
                      size="xs"
                      value={songLimit}
                      menuMinWidth={88}
                      ariaLabel="Số lượng bài hát mỗi trang"
                      options={[
                        { value: 10, label: '10' },
                        { value: 20, label: '20' },
                        { value: 50, label: '50' },
                      ]}
                      onChange={(val) => {
                        setSongLimit(Number(val));
                        setSongPage(1);
                      }}
                    />
                  </div>
                </div>

                {/* Page Navigation */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSongPage((p) => Math.max(1, p - 1))}
                    disabled={songPage <= 1}
                    className="p-1.5 h-8"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <span className="px-3 font-sans text-xs">
                    Trang <strong className="text-ink dark:text-white">{songPage}</strong> / {songsData.totalPages || 1}
                  </span>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSongPage((p) => Math.min(songsData.totalPages || 1, p + 1))}
                    disabled={songPage >= (songsData.totalPages || 1)}
                    className="p-1.5 h-8"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Upload Song */}
      {activeTab === 'upload' && (
        <div className="max-w-2xl p-6 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-5">
          <h3 className="font-display font-bold text-lg text-ink dark:text-white">
            Tải lên bài hát mới vào mq Local
          </h3>

          <form onSubmit={handleSongUpload} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-body dark:text-mute mb-1">
                Tiêu đề bài hát *
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Cơn Mưa Ngang Qua"
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
                className="w-full h-10 px-4 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-body dark:text-mute mb-1">
                  Nghệ sĩ trình bày *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Sơn Tùng M-TP"
                  value={songArtist}
                  onChange={(e) => setSongArtist(e.target.value)}
                  className="w-full h-10 px-4 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-body dark:text-mute mb-1">
                  Tên Album (tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Tuyển tập 2026"
                  value={songAlbum}
                  onChange={(e) => setSongAlbum(e.target.value)}
                  className="w-full h-10 px-4 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-body dark:text-mute mb-1">
                  Tệp âm thanh (MP3, FLAC, WAV) *
                </label>
                <input
                  type="file"
                  accept="audio/*,.mp3,.flac,.wav"
                  required
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-mute file:mr-3 file:py-2 file:px-4 file:rounded-pill file:border-0 file:text-xs file:font-semibold file:bg-surface-soft dark:file:bg-surface-dark-soft file:text-ink dark:file:text-white cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-body dark:text-mute mb-1">
                  Ảnh bìa Album (JPG, PNG)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-mute file:mr-3 file:py-2 file:px-4 file:rounded-pill file:border-0 file:text-xs file:font-semibold file:bg-surface-soft dark:file:bg-surface-dark-soft file:text-ink dark:file:text-white cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-body dark:text-mute mb-1">
                Lời bài hát (Hỗ trợ định dạng đồng bộ [mm:ss.xx] LRC)
              </label>
              <textarea
                rows={4}
                placeholder="[00:05.00]Giai điệu bắt đầu ngân vang..."
                value={songLyrics}
                onChange={(e) => setSongLyrics(e.target.value)}
                className="w-full p-3 rounded-xl bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-xs font-sans text-ink dark:text-white focus:outline-none resize-none"
              />
            </div>

            {uploadProgress && (
              <p className="text-xs text-amber-500 font-medium">{uploadProgress}</p>
            )}

            <Button type="submit" size="md" icon={<Upload className="w-4 h-4" />}>
              Tải lên bài hát
            </Button>
          </form>
        </div>
      )}

      {/* Tab: Artists & Playlists Management */}
      {activeTab === 'artists-playlists' && (
        <ArtistPlaylistManager />
      )}

      {/* Tab: Users Management (Upgraded) */}
      {activeTab === 'users' && (
        <UserManager />
      )}

      {/* Tab: Copyright & Reports */}
      {activeTab === 'reports' && (
        <CopyrightReportManager />
      )}


      {/* Tab: Album Management */}
      {activeTab === 'albums' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Albums List */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-4 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Disc3 className="w-4 h-4 text-indigo-500" />
                  <h3 className="font-semibold text-sm text-ink dark:text-white">
                    Danh sách Album ({albumsData?.length || 0})
                  </h3>
                </div>
                <input
                  type="text"
                  placeholder="Tìm album theo tên hoặc ca sĩ..."
                  value={albumSearch}
                  onChange={(e) => setAlbumSearch(e.target.value)}
                  className="w-full sm:w-60 h-8 px-3 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-xs text-ink dark:text-white focus:outline-none"
                />
              </div>

              {isLoadingAlbums ? (
                <div className="py-12 text-center text-xs text-mute animate-pulse">
                  Đang tải danh sách album...
                </div>
              ) : (
                <div className="divide-y divide-hairline dark:divide-hairline-dark max-h-[580px] overflow-y-auto pr-1">
                  {albumsData
                    ?.filter(
                      (alb) =>
                        !albumSearch.trim() ||
                        alb.title.toLowerCase().includes(albumSearch.toLowerCase().trim()) ||
                        alb.artist.toLowerCase().includes(albumSearch.toLowerCase().trim())
                    )
                    .map((alb) => {
                      const isSelected = selectedAlbum?.id === alb.id;
                      return (
                        <div
                          key={alb.id}
                          onClick={() => handleSelectAlbum(alb)}
                          className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 shadow-sm'
                              : 'hover:bg-surface-soft/60 dark:hover:bg-surface-dark-soft/60'
                          }`}
                        >
                          {/* Mini Thumbnail (1:1 square) */}
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-hairline dark:border-hairline-dark bg-neutral-200 dark:bg-neutral-800">
                            {alb.coverUrl ? (
                              <img
                                src={alb.coverUrl}
                                alt={alb.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <AlbumPlaceholder title={alb.title} artist={alb.artist} />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-semibold text-ink dark:text-white truncate">
                              {alb.title}
                            </h4>
                            <p className="text-[11px] text-mute truncate mt-0.5">
                              {alb.artist} • {alb.tracksCount} bài
                            </p>
                          </div>

                          <span
                            className={`text-[10px] font-sans px-2 py-0.5 rounded-pill shrink-0 ${
                              alb.coverUrl
                                ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                                : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            {alb.coverUrl ? 'Có ảnh' : 'Chưa có ảnh'}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Album Cover Editor & Live Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-5 sticky top-4">
              <div className="border-b border-hairline dark:border-hairline-dark pb-3">
                <h3 className="font-semibold text-sm text-ink dark:text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-500" />
                  <span>Quản lý & Chỉnh sửa ảnh bìa</span>
                </h3>
                <p className="text-[11px] text-mute mt-1">
                  {selectedAlbum
                    ? `Đang chọn: "${selectedAlbum.title}" - ${selectedAlbum.artist}`
                    : 'Chọn một album từ danh sách bên trái để chỉnh sửa'}
                </p>
              </div>

              {selectedAlbum ? (
                <div className="space-y-4">
                  {/* Live 1:1 Square Preview Container */}
                  <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark">
                    <p className="text-[11px] font-medium text-mute mb-2">Xem trước ảnh vuông (1:1)</p>
                    <div className="relative aspect-square w-48 rounded-xl overflow-hidden shadow-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={`Xem trước ${selectedAlbum.title}`}
                          className="w-full h-full object-cover block"
                          onError={() => {
                            toast.error('URL ảnh không thể tải được. Vui lòng kiểm tra lại đường dẫn.');
                          }}
                        />
                      ) : (
                        <AlbumPlaceholder title={selectedAlbum.title} artist={selectedAlbum.artist} />
                      )}
                    </div>
                  </div>

                  {/* Autofill Button: Lấy ảnh từ bài hát đầu tiên */}
                  {selectedAlbum.firstSongCover && (
                    <button
                      type="button"
                      onClick={handleFillFromFirstSong}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-pill bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Lấy ảnh từ bài hát đầu tiên trong album</span>
                    </button>
                  )}

                  {/* Input 1: Dán URL */}
                  <div>
                    <label className="block text-xs font-medium text-body dark:text-mute mb-1">
                      Dán đường dẫn ảnh (URL)
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={coverUrlInput}
                      onChange={(e) => {
                        setCoverUrlInput(e.target.value);
                        setPreviewUrl(e.target.value);
                        setAlbumCoverFile(null);
                      }}
                      className="w-full h-9 px-3 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-xs text-ink dark:text-white focus:outline-none"
                    />
                  </div>

                  {/* Input 2: Tải ảnh lên (≤ 2MB, JPG/PNG/WebP, tự cắt vuông) */}
                  <div>
                    <label className="block text-xs font-medium text-body dark:text-mute mb-1">
                      Hoặc tải ảnh lên từ máy tính (JPG, PNG, WebP ≤ 2MB, tự cắt vuông 1:1)
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAlbumCoverFileChange}
                      className="w-full text-xs text-mute file:mr-3 file:py-1.5 file:px-3 file:rounded-pill file:border-0 file:text-xs file:font-semibold file:bg-surface-soft dark:file:bg-surface-dark-soft file:text-ink dark:file:text-white cursor-pointer"
                    />
                    {albumCoverFile && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                        ✓ Đã chọn: {albumCoverFile.name} ({(albumCoverFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>

                  {/* Save Button */}
                  <div className="pt-2">
                    <Button
                      onClick={handleSaveAlbumCover}
                      disabled={isSavingCover}
                      size="md"
                      className="w-full justify-center"
                      icon={isSavingCover ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
                    >
                      {isSavingCover ? 'Đang lưu ảnh bìa...' : 'Lưu ảnh bìa album'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-mute">
                  ← Chọn một album bên trái để bắt đầu chỉnh sửa ảnh bìa
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Providers & Quota */}
      {activeTab === 'providers' && (
        <ProviderQuotaManager />
      )}

      {/* Tab: Chatbot Management */}
      {activeTab === 'chatbot' && (
        <ChatbotManager />
      )}

      {/* Tab: Audit Log & Settings */}
      {activeTab === 'audit-settings' && (
        <AuditSettingsManager />
      )}
        </motion.div>
      </AnimatePresence>

      {/* Modal 1: Edit Song Metadata */}
      <Modal
        open={Boolean(editingSong)}
        onClose={() => setEditingSong(null)}
        title="Chỉnh sửa metadata bài hát"
        icon={<Edit2 className="w-4 h-4 text-mute" />}
        size="lg"
        bodyClassName="p-5 sm:p-6"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditingSong(null)}
              disabled={isSavingSong}
            >
              Hủy bỏ
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveEdit}
              disabled={isSavingSong}
              className="flex items-center gap-1.5"
            >
              {isSavingSong ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu thay đổi</span>
                </>
              )}
            </Button>
          </div>
        }
      >
        {editingSong && (
          <div className="space-y-4 text-xs">
            {/* Title */}
            <ModalSection index={0}>
              <label className="block font-medium text-body dark:text-mute mb-1">
                Tiêu đề bài hát *
              </label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full h-10 px-3.5 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white focus:outline-none"
                placeholder="Nhập tên bài hát"
              />
            </ModalSection>

            {/* Artists & Album */}
            <ModalSection index={1}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-body dark:text-mute mb-1">
                    Nghệ sĩ (cách nhau bằng dấu phẩy) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editArtists}
                    onChange={(e) => setEditArtists(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white focus:outline-none"
                    placeholder="Sơn Tùng M-TP, JustaTee"
                  />
                </div>
                <div>
                  <label className="block font-medium text-body dark:text-mute mb-1">
                    Album (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={editAlbum}
                    onChange={(e) => setEditAlbum(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white focus:outline-none"
                    placeholder="Tên album"
                  />
                </div>
              </div>
            </ModalSection>

            {/* Cover URL & Preview */}
            <ModalSection index={2}>
              <label className="block font-medium text-body dark:text-mute mb-1">
                Ảnh bìa bài hát
              </label>
              <div className="flex gap-3 items-center">
                <div className="w-16 h-16 rounded-md overflow-hidden bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark flex-shrink-0 relative">
                  {editCoverUrl ? (
                    <img
                      src={editCoverUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <AlbumPlaceholder title={editTitle || 'mq'} className="w-full h-full" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={editCoverUrl}
                    onChange={(e) => setEditCoverUrl(e.target.value)}
                    placeholder="Dán đường dẫn URL ảnh (https://...)"
                    className="w-full h-9 px-3 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-xs text-ink dark:text-white focus:outline-none"
                  />
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      id="edit-cover-upload"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setEditCoverFile(file);
                          setEditCoverUrl(URL.createObjectURL(file));
                        }
                      }}
                    />
                    <label
                      htmlFor="edit-cover-upload"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-[11px] font-medium text-ink dark:text-white cursor-pointer hover:bg-surface-soft/80"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Tải ảnh từ máy tính</span>
                    </label>
                    {editCoverFile && (
                      <span className="text-[10px] text-mute ml-2 font-sans">
                        {editCoverFile.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </ModalSection>

            {/* Visibility Checkbox */}
            <ModalSection index={3} className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!editIsHidden}
                  onChange={(e) => setEditIsHidden(!e.target.checked)}
                  className="rounded border-hairline cursor-pointer accent-ink dark:accent-white"
                />
                <span className="text-xs text-ink dark:text-white font-medium">
                  Hiển thị bài hát công khai (Bỏ chọn để ẩn bài hát khỏi người dùng)
                </span>
              </label>
            </ModalSection>
          </div>
        )}
      </Modal>

      {/* Modal 2: Quick Change Cover */}
      <Modal
        open={Boolean(coverModalSong)}
        onClose={() => setCoverModalSong(null)}
        title="Đổi ảnh bìa bài hát"
        icon={<ImageIcon className="w-4 h-4 text-mute" />}
        size="md"
        bodyClassName="p-5 sm:p-6 space-y-4"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCoverModalSong(null)}
              disabled={isSavingQuickCover}
            >
              Hủy bỏ
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveQuickCover}
              disabled={isSavingQuickCover}
              className="flex items-center gap-1.5"
            >
              {isSavingQuickCover ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang cập nhật...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Cập nhật ảnh bìa</span>
                </>
              )}
            </Button>
          </div>
        }
      >
        {coverModalSong && (
          <>
            <ModalSection index={0}>
              <p className="text-xs text-mute">
                Cập nhật hình ảnh đại diện cho ca khúc <strong className="text-ink dark:text-white">"{coverModalSong.title}"</strong>
              </p>
            </ModalSection>

            <ModalSection index={1}>
              <div className="flex justify-center py-2">
                <div className="w-32 h-32 rounded-lg overflow-hidden bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark shadow-sm relative">
                  {quickCoverUrl ? (
                    <img
                      src={quickCoverUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <AlbumPlaceholder title={coverModalSong.title} className="w-full h-full" />
                  )}
                </div>
              </div>
            </ModalSection>

            <ModalSection index={2} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-body dark:text-mute mb-1">
                  Đường dẫn ảnh URL
                </label>
                <input
                  type="text"
                  value={quickCoverUrl}
                  onChange={(e) => setQuickCoverUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full h-9 px-3 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-xs text-ink dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <input
                  type="file"
                  accept="image/*"
                  id="quick-cover-upload"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setQuickCoverFile(file);
                      setQuickCoverUrl(URL.createObjectURL(file));
                    }
                  }}
                />
                <label
                  htmlFor="quick-cover-upload"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-xs font-medium text-ink dark:text-white cursor-pointer hover:bg-surface-soft/80"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Chọn ảnh từ máy tính</span>
                </label>
              </div>
            </ModalSection>
          </>
        )}
      </Modal>

      {/* Modal 3: Confirm Delete Dialog */}
      <Modal
        open={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, type: 'single' })}
        size="sm"
        hideHeader
        bodyClassName="p-6 space-y-4"
      >
        <ModalSection index={0}>
          <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <Trash2 className="w-5 h-5" />
          </div>
        </ModalSection>

        <ModalSection index={1} className="text-center space-y-1">
          <h3 className="font-display font-bold text-base text-ink dark:text-white">
            {deleteDialog.type === 'single'
              ? 'Xác nhận xóa bài hát'
              : `Xác nhận xóa ${deleteDialog.count || selectedSongIds.length} bài hát`}
          </h3>
          <p className="text-xs text-mute">
            {deleteDialog.type === 'single' ? (
              <>
                Bạn có chắc chắn muốn xóa bài hát{' '}
                <strong className="text-ink dark:text-white font-medium">
                  "{deleteDialog.song?.title}"
                </strong>
                ? Hành động này sẽ xóa vĩnh viễn khỏi hệ thống.
              </>
            ) : (
              <>
                Bạn có chắc chắn muốn xóa vĩnh viễn{' '}
                <strong className="text-ink dark:text-white font-medium">
                  {deleteDialog.count || selectedSongIds.length} bài hát đã chọn
                </strong>
                ? Hành động này không thể hoàn tác.
              </>
            )}
          </p>
        </ModalSection>

        <ModalSection index={2} className="flex items-center gap-2 pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDeleteDialog({ isOpen: false, type: 'single' })}
            disabled={deleteMutation.isPending || batchActionMutation.isPending}
            className="flex-1 justify-center"
          >
            Hủy bỏ
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (deleteDialog.type === 'single' && deleteDialog.song) {
                deleteMutation.mutate(deleteDialog.song.id);
              } else if (deleteDialog.type === 'batch') {
                batchActionMutation.mutate({
                  action: 'delete',
                  songIds: selectedSongIds,
                });
              }
            }}
            disabled={deleteMutation.isPending || batchActionMutation.isPending}
            className="flex-1 justify-center bg-rose-600 hover:bg-rose-700 text-white border-transparent"
          >
            {deleteMutation.isPending || batchActionMutation.isPending ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Xác nhận xóa'
            )}
          </Button>
        </ModalSection>
      </Modal>
    </div>
  );
};
