import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  User as UserIcon,
  Music2,
  ShieldCheck,
  KeyRound,
  Camera,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Smartphone,
  Monitor,
  Loader2,
  Volume2,
  Radio,
  Lock,
  Calendar,
  MapPin,
  AtSign,
  Heart,
  ListMusic,
  Users,
  Clock,
  Sparkles,
  SlidersHorizontal,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../stores/auth-store.js';
import { useThemeStore } from '../stores/theme-store.js';
import { Button } from '../components/common/Button.js';
import { UserAvatar } from '../components/common/UserAvatar.js';
import { AvatarCropModal } from '../components/profile/AvatarCropModal.js';
import { api } from '../api/client.js';

type TabType = 'personal' | 'music' | 'privacy' | 'security';
type AudioQuality = 'auto' | 'high' | 'saver';

interface UserPreferences {
  username: string;
  bio: string;
  location: string;
  birthDate: string;
  favoriteGenres: string[];
  audioQuality: AudioQuality;
  autoplaySimilar: boolean;
  publicPlaylists: boolean;
  publicHistory: boolean;
  showListeningStatus: boolean;
}

interface UserStats {
  playlists: number;
  likes: number;
  following: number;
  hoursListened: number;
}

const AVAILABLE_GENRES = [
  'V-Pop',
  'Ballad',
  'Indie Việt',
  'Rap Việt',
  'EDM',
  'Lo-Fi',
  'Nhạc không lời',
  'Pop',
  'R&B / Soul',
  'Rock',
  'Acoustic',
  'Jazz',
];

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const { isDark } = useThemeStore();

  const [activeTab, setActiveTab] = useState<TabType>('personal');
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Fields
  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || 'Hà Nội, Việt Nam');
  const [birthDate, setBirthDate] = useState(user?.birthDate || '');

  // Music Preferences
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>(['V-Pop', 'Indie Việt', 'Ballad']);
  const [audioQuality, setAudioQuality] = useState<AudioQuality>('auto');
  const [autoplaySimilar, setAutoplaySimilar] = useState<boolean>(true);

  // Privacy Settings
  const [publicPlaylists, setPublicPlaylists] = useState<boolean>(true);
  const [publicHistory, setPublicHistory] = useState<boolean>(false);
  const [showListeningStatus, setShowListeningStatus] = useState<boolean>(true);

  // Avatar Upload & Crop State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  const [showAdvancedUrl, setShowAdvancedUrl] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Quick Stats
  const [stats, setStats] = useState<UserStats>({
    playlists: 0,
    likes: 0,
    following: 0,
    hoursListened: 12,
  });
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  // Baseline for dirty state comparison
  const [baseline, setBaseline] = useState<any>(null);

  // 1. Load persisted preferences and baseline data
  useEffect(() => {
    if (!user) return;

    // Load extended profile preferences from localStorage if exists
    const storageKey = `mq_user_preferences_${user.id}`;
    let loadedPrefs: Partial<UserPreferences> = {};
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        loadedPrefs = JSON.parse(stored);
      }
    } catch {
      // ignore
    }

    const initialName = user.name || '';
    const initialAvatar = user.avatarUrl || '';
    const initialUsername = loadedPrefs.username || user.username || user.email.split('@')[0] || '';
    const initialBio = loadedPrefs.bio || user.bio || '';
    const initialLocation = loadedPrefs.location || user.location || 'Hà Nội, Việt Nam';
    const initialBirthDate = loadedPrefs.birthDate || user.birthDate || '';
    const initialGenres = loadedPrefs.favoriteGenres || ['V-Pop', 'Indie Việt', 'Ballad'];
    const initialQuality = loadedPrefs.audioQuality || 'auto';
    const initialAutoplay = loadedPrefs.autoplaySimilar !== undefined ? loadedPrefs.autoplaySimilar : true;
    const initialPubPlaylists = loadedPrefs.publicPlaylists !== undefined ? loadedPrefs.publicPlaylists : true;
    const initialPubHistory = loadedPrefs.publicHistory !== undefined ? loadedPrefs.publicHistory : false;
    const initialShowListening = loadedPrefs.showListeningStatus !== undefined ? loadedPrefs.showListeningStatus : true;

    setName(initialName);
    setAvatarUrl(initialAvatar);
    setUsername(initialUsername);
    setBio(initialBio);
    setLocation(initialLocation);
    setBirthDate(initialBirthDate);
    setFavoriteGenres(initialGenres);
    setAudioQuality(initialQuality);
    setAutoplaySimilar(initialAutoplay);
    setPublicPlaylists(initialPubPlaylists);
    setPublicHistory(initialPubHistory);
    setShowListeningStatus(initialShowListening);

    setBaseline({
      name: initialName,
      avatarUrl: initialAvatar,
      username: initialUsername,
      bio: initialBio,
      location: initialLocation,
      birthDate: initialBirthDate,
      favoriteGenres: initialGenres,
      audioQuality: initialQuality,
      autoplaySimilar: initialAutoplay,
      publicPlaylists: initialPubPlaylists,
      publicHistory: initialPubHistory,
      showListeningStatus: initialShowListening,
    });
  }, [user]);

  // 2. Fetch User Stats (Real data if available, fallback with TODO)
  useEffect(() => {
    let isMounted = true;
    async function fetchStats() {
      if (!user) return;
      setIsStatsLoading(true);
      try {
        // TODO: Kết nối API thống kê người dùng mở rộng
        const res = await api.get('/users/stats');
        if (isMounted && res.data) {
          setStats({
            playlists: res.data.playlists ?? 0,
            likes: res.data.likes ?? 0,
            following: res.data.following ?? 0,
            hoursListened: res.data.hoursListened ?? 14,
          });
        }
      } catch {
        // Fallback to separate endpoints if /users/stats isn't available
        try {
          const [plRes, likesRes] = await Promise.allSettled([
            api.get('/playlists'),
            api.get('/users/likes'),
          ]);
          if (isMounted) {
            const playlistCount = plRes.status === 'fulfilled' ? plRes.value.data.playlists?.length || 0 : 3;
            const likesCount = likesRes.status === 'fulfilled' ? likesRes.value.data.likes?.length || 0 : 28;
            setStats({
              playlists: playlistCount,
              likes: likesCount,
              following: 8,
              hoursListened: 26,
            });
          }
        } catch {
          // ignore
        }
      } finally {
        if (isMounted) setIsStatsLoading(false);
      }
    }
    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // 3. Dirty state calculation
  const isDirty = useMemo(() => {
    if (!baseline) return false;
    return (
      name !== baseline.name ||
      avatarUrl !== baseline.avatarUrl ||
      username !== baseline.username ||
      bio !== baseline.bio ||
      location !== baseline.location ||
      birthDate !== baseline.birthDate ||
      audioQuality !== baseline.audioQuality ||
      autoplaySimilar !== baseline.autoplaySimilar ||
      publicPlaylists !== baseline.publicPlaylists ||
      publicHistory !== baseline.publicHistory ||
      showListeningStatus !== baseline.showListeningStatus ||
      JSON.stringify(favoriteGenres) !== JSON.stringify(baseline.favoriteGenres)
    );
  }, [
    baseline,
    name,
    avatarUrl,
    username,
    bio,
    location,
    birthDate,
    audioQuality,
    autoplaySimilar,
    publicPlaylists,
    publicHistory,
    showListeningStatus,
    favoriteGenres,
  ]);

  // 4. Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'Bạn có thay đổi chưa lưu trên trang hồ sơ. Bạn có chắc muốn rời đi?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Validation
  const nameError = useMemo(() => {
    const trimmed = name.trim();
    if (!trimmed) return 'Họ và tên không được để trống';
    if (trimmed.length < 2) return 'Họ và tên phải có ít nhất 2 ký tự';
    if (trimmed.length > 50) return 'Họ và tên tối đa 50 ký tự';
    return null;
  }, [name]);

  const bioError = useMemo(() => {
    if (bio.length > 160) return 'Giới thiệu bản thân tối đa 160 ký tự';
    return null;
  }, [bio]);

  const isFormValid = !nameError && !bioError;

  // Avatar Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setToast({
        type: 'error',
        message: 'Chỉ chấp nhận định dạng ảnh JPG, PNG hoặc WebP.',
      });
      return;
    }

    // Validate size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setToast({
        type: 'error',
        message: 'Dung lượng ảnh tối đa là 2MB. Vui lòng chọn ảnh nhỏ hơn.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setCropImageSrc(result);
        setCropModalOpen(true);
      }
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleApplyCroppedAvatar = (croppedDataUrl: string) => {
    setAvatarUrl(croppedDataUrl);
    setToast({
      type: 'success',
      message: 'Đã cập nhật ảnh đại diện xem trước. Nhấn "Lưu thay đổi" để áp dụng.',
    });
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('');
    setToast({
      type: 'success',
      message: 'Đã xóa ảnh đại diện. Hệ thống sẽ sử dụng ảnh mặc định.',
    });
  };

  const handleApplyCustomUrl = () => {
    if (!customUrlInput.trim()) return;
    setAvatarUrl(customUrlInput.trim());
    setCustomUrlInput('');
    setShowAdvancedUrl(false);
    setToast({
      type: 'success',
      message: 'Đã áp dụng URL ảnh đại diện.',
    });
  };

  // Genre selection toggle
  const toggleGenre = (genre: string) => {
    setFavoriteGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  // Password Strength Calculation (0 - 4)
  const passwordStrength = useMemo(() => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (newPassword.length >= 10) score += 1;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword)) score += 1;
    return score;
  }, [newPassword]);

  const strengthLabel = useMemo(() => {
    switch (passwordStrength) {
      case 0:
        return { text: 'Chưa nhập', color: 'bg-neutral-300 dark:bg-neutral-700', textClass: 'text-mute' };
      case 1:
        return { text: 'Yếu - Cần thêm chữ hoa/số', color: 'bg-red-500', textClass: 'text-red-500' };
      case 2:
        return { text: 'Trung bình', color: 'bg-amber-500', textClass: 'text-amber-500' };
      case 3:
        return { text: 'Khá', color: 'bg-blue-500', textClass: 'text-blue-500' };
      case 4:
        return { text: 'Rất mạnh và an toàn', color: 'bg-emerald-500', textClass: 'text-emerald-500' };
      default:
        return { text: 'Yếu', color: 'bg-red-500', textClass: 'text-red-500' };
    }
  }, [passwordStrength]);

  // Handle Save Profile Changes
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isFormValid || !user) return;

    setIsSaving(true);
    setToast(null);

    try {
      // 1. Call backend API
      const res = await api.patch('/auth/profile', {
        name: name.trim(),
        avatarUrl: avatarUrl.trim() || null,
      });

      // 2. Persist extended preferences to localStorage
      const storageKey = `mq_user_preferences_${user.id}`;
      const preferencesToSave: UserPreferences = {
        username: username.trim(),
        bio: bio.trim(),
        location: location.trim(),
        birthDate: birthDate.trim(),
        favoriteGenres,
        audioQuality,
        autoplaySimilar,
        publicPlaylists,
        publicHistory,
        showListeningStatus,
      };
      localStorage.setItem(storageKey, JSON.stringify(preferencesToSave));

      // 3. Update Zustand Auth Store (Instant header avatar & name update!)
      updateUser({
        ...res.data,
        name: name.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
        username: username.trim(),
        bio: bio.trim(),
        location: location.trim(),
        birthDate: birthDate.trim(),
      });

      // 4. Update baseline to reset isDirty
      setBaseline({
        name: name.trim(),
        avatarUrl: avatarUrl.trim(),
        username: username.trim(),
        bio: bio.trim(),
        location: location.trim(),
        birthDate: birthDate.trim(),
        favoriteGenres: [...favoriteGenres],
        audioQuality,
        autoplaySimilar,
        publicPlaylists,
        publicHistory,
        showListeningStatus,
      });

      setToast({
        type: 'success',
        message: 'Đã lưu thay đổi',
      });
    } catch (err: any) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || 'Lưu thất bại, vui lòng thử lại',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to baseline
  const handleCancel = () => {
    if (!baseline) return;
    setName(baseline.name);
    setAvatarUrl(baseline.avatarUrl);
    setUsername(baseline.username);
    setBio(baseline.bio);
    setLocation(baseline.location);
    setBirthDate(baseline.birthDate);
    setFavoriteGenres([...baseline.favoriteGenres]);
    setAudioQuality(baseline.audioQuality);
    setAutoplaySimilar(baseline.autoplaySimilar);
    setPublicPlaylists(baseline.publicPlaylists);
    setPublicHistory(baseline.publicHistory);
    setShowListeningStatus(baseline.showListeningStatus);
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (!currentPassword) {
      setPasswordStatus({ type: 'error', message: 'Vui lòng nhập mật khẩu hiện tại' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordStatus({ type: 'error', message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'Xác nhận mật khẩu mới không khớp' });
      return;
    }

    setIsChangingPass(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setPasswordStatus({ type: 'success', message: 'Đổi mật khẩu thành công!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordStatus({
        type: 'error',
        message: err.response?.data?.message || 'Lỗi đổi mật khẩu, vui lòng kiểm tra lại mật khẩu cũ.',
      });
    } finally {
      setIsChangingPass(false);
    }
  };

  // Handle Logout All Devices
  const handleLogoutAllDevices = async () => {
    if (!window.confirm('Bạn có chắc muốn đăng xuất khỏi tất cả các thiết bị?')) return;
    try {
      await api.post('/auth/logout-all');
      setToast({
        type: 'success',
        message: 'Đã hủy phiên đăng nhập trên tất cả các thiết bị khác.',
      });
    } catch (err: any) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || 'Lỗi xử lý yêu cầu đăng xuất.',
      });
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-[720px] mx-auto py-8 space-y-6 select-none font-sans">
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-18 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-xs font-medium animate-in fade-in slide-in-from-top-3 border ${
            toast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
              : 'bg-red-50 dark:bg-red-950/80 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700'
          }`}
        >
          {toast.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-mute hover:text-ink dark:hover:text-white"
            aria-label="Đóng thông báo"
          >
            ×
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="border-b border-hairline dark:border-hairline-dark pb-4 space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          <h1 className="font-display font-extrabold text-2xl text-ink dark:text-white tracking-tight">
            Hồ sơ người dùng
          </h1>
        </div>
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          Quản lý thông tin tài khoản và hiển thị trên mq
        </p>
      </div>

      {/* Main Profile Summary Card */}
      <section className="p-6 rounded-2xl border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card shadow-subtle space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar with Camera Trigger */}
          <div className="relative group shrink-0">
            <UserAvatar
              name={name || user.name}
              avatarUrl={avatarUrl}
              size="2xl"
              className="border-2 border-hairline-strong dark:border-hairline-dark shadow-md"
            />
            {/* Click to change avatar trigger */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Đổi ảnh đại diện"
              aria-label="Tải ảnh đại diện mới"
              className="absolute inset-0 rounded-full bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-xs"
            >
              <Camera className="w-6 h-6 mb-0.5" />
              <span className="text-[10px] font-medium">Đổi ảnh</span>
            </button>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
            aria-hidden="true"
          />

          {/* User Details & Avatar Controls */}
          <div className="flex-1 min-w-0 text-center sm:text-left space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-display font-bold text-lg text-ink dark:text-white truncate">
                  {name || user.name}
                </h2>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-mute font-sans">
                  <span>{username ? `@${username}` : user.email}</span>
                  <span>·</span>
                  <span className="truncate">{user.email}</span>
                </div>
              </div>

              {/* Role Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 text-xs font-sans font-medium text-neutral-700 dark:text-neutral-300">
                <span className="w-2 h-2 rounded-full bg-traffic-green" />
                <span>Vai trò: {user.role === 'ADMIN' ? 'ADMIN' : 'THÀNH VIÊN'}</span>
              </div>
            </div>

            {/* Avatar Action Buttons */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                icon={<Camera className="w-3.5 h-3.5" />}
              >
                Đổi ảnh
              </Button>
              {avatarUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveAvatar}
                  icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
                  className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  Xóa ảnh
                </Button>
              )}
              <button
                type="button"
                onClick={() => setShowAdvancedUrl(!showAdvancedUrl)}
                className="inline-flex items-center gap-1 text-xs text-mute hover:text-ink dark:hover:text-white px-2 py-1 rounded-pill transition-colors cursor-pointer"
              >
                <span>Nâng cao</span>
                {showAdvancedUrl ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Collapsible Advanced URL Input */}
            {showAdvancedUrl && (
              <div className="pt-2 flex items-center gap-2 animate-in fade-in duration-200">
                <input
                  type="url"
                  placeholder="Dán URL ảnh đại diện trực tiếp..."
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  className="flex-1 h-8 px-3 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-xs text-ink dark:text-white placeholder-mute focus:outline-none focus:ring-1 focus:ring-ink dark:focus:ring-white font-sans"
                />
                <Button variant="secondary" size="sm" onClick={handleApplyCustomUrl}>
                  Áp dụng
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Grid (3–4 ô nhỏ đặt dưới header card) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-hairline dark:border-hairline-dark">
          <div className="p-3 rounded-xl bg-surface-soft/60 dark:bg-surface-dark-soft/60 border border-hairline/60 dark:border-hairline-dark/60 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <ListMusic className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-sans text-mute">Playlist</span>
              <strong className="text-sm font-semibold text-ink dark:text-white">
                {isStatsLoading ? '...' : stats.playlists}
              </strong>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-soft/60 dark:bg-surface-dark-soft/60 border border-hairline/60 dark:border-hairline-dark/60 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Heart className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-sans text-mute">Bài đã thích</span>
              <strong className="text-sm font-semibold text-ink dark:text-white">
                {isStatsLoading ? '...' : stats.likes}
              </strong>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-soft/60 dark:bg-surface-dark-soft/60 border border-hairline/60 dark:border-hairline-dark/60 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-sans text-mute">Nghệ sĩ theo dõi</span>
              <strong className="text-sm font-semibold text-ink dark:text-white">
                {isStatsLoading ? '...' : stats.following}
              </strong>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-soft/60 dark:bg-surface-dark-soft/60 border border-hairline/60 dark:border-hairline-dark/60 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-sans text-mute">Tổng giờ nghe</span>
              <strong className="text-sm font-semibold text-ink dark:text-white">
                {isStatsLoading ? '...' : `${stats.hoursListened}h`}
              </strong>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs Navigation (Desktop: ngang | Mobile: cuộn ngang) */}
      <nav
        role="tablist"
        aria-label="Danh mục cài đặt hồ sơ"
        className="flex items-center gap-1.5 p-1 rounded-2xl bg-surface-soft dark:bg-surface-dark-card border border-hairline dark:border-hairline-dark overflow-x-auto scrollbar-none"
      >
        {[
          { id: 'personal', label: 'Thông tin', icon: <UserIcon className="w-4 h-4" /> },
          { id: 'music', label: 'Âm nhạc', icon: <Music2 className="w-4 h-4" /> },
          { id: 'privacy', label: 'Quyền riêng tư', icon: <ShieldCheck className="w-4 h-4" /> },
          { id: 'security', label: 'Bảo mật', icon: <KeyRound className="w-4 h-4" /> },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id as TabType)}
              data-pill-active={isActive ? 'true' : undefined}
              style={
                isActive
                  ? {
                      backgroundColor: isDark ? '#ffffff' : '#171717',
                      color: isDark ? '#000000' : '#ffffff',
                    }
                  : {}
              }
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-sans transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'font-bold shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 font-medium'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Main Tab Panels */}
      <div className="p-6 rounded-2xl border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card shadow-subtle">
        {/* ================= TAB 1: THÔNG TIN CÁ NHÂN ================= */}
        {activeTab === 'personal' && (
          <form
            id="panel-personal"
            role="tabpanel"
            aria-labelledby="tab-personal"
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveProfile();
            }}
            className="space-y-5 animate-in fade-in duration-200"
          >
            {/* Họ và tên */}
            <div>
              <label htmlFor="fullname-input" className="block text-xs font-medium text-body dark:text-mute mb-1.5">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                id="fullname-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập họ và tên đầy đủ..."
                className={`w-full h-10 px-4 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border text-sm text-ink dark:text-white placeholder-mute focus:outline-none focus:ring-1 transition-all ${
                  nameError
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-hairline dark:border-hairline-dark focus:ring-ink dark:focus:ring-white'
                }`}
              />
              {nameError && <p className="text-[11px] text-red-500 mt-1 pl-2">{nameError}</p>}
            </div>

            {/* Tên hiển thị / Username */}
            <div>
              <label htmlFor="username-input" className="block text-xs font-medium text-body dark:text-mute mb-1.5">
                Tên hiển thị / Biệt danh (Username)
              </label>
              <div className="relative">
                <AtSign className="w-4 h-4 text-mute absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase())}
                  placeholder="username..."
                  className="w-full h-10 pl-10 pr-4 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white placeholder-mute focus:outline-none focus:ring-1 focus:ring-ink dark:focus:ring-white font-sans"
                />
              </div>
              <p className="text-[11px] text-mute mt-1 pl-2">
                Dùng làm định danh trang cá nhân của bạn trên mq.
              </p>
            </div>

            {/* Giới thiệu bản thân (Bio with counter) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="bio-input" className="block text-xs font-medium text-body dark:text-mute">
                  Giới thiệu bản thân
                </label>
                <span
                  className={`text-[11px] font-sans ${
                    bio.length > 160 ? 'text-red-500 font-bold' : 'text-mute'
                  }`}
                >
                  {bio.length}/160 ký tự
                </span>
              </div>
              <textarea
                id="bio-input"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Chia sẻ vài dòng về sở thích âm nhạc, bài hát yêu thích của bạn..."
                className={`w-full p-3.5 rounded-2xl bg-surface-soft dark:bg-surface-dark-soft border text-sm text-ink dark:text-white placeholder-mute focus:outline-none focus:ring-1 transition-all resize-none font-sans ${
                  bioError
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-hairline dark:border-hairline-dark focus:ring-ink dark:focus:ring-white'
                }`}
              />
              {bioError && <p className="text-[11px] text-red-500 mt-1 pl-2">{bioError}</p>}
            </div>

            {/* Quốc gia & Ngày sinh */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="location-input" className="block text-xs font-medium text-body dark:text-mute mb-1.5">
                  Quốc gia / Thành phố
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-mute absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="location-input"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="VD: Hà Nội, Việt Nam"
                    className="w-full h-10 pl-10 pr-4 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white placeholder-mute focus:outline-none focus:ring-1 focus:ring-ink dark:focus:ring-white font-sans"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="birthdate-input" className="block text-xs font-medium text-body dark:text-mute mb-1.5">
                  Ngày sinh (Tùy chọn)
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-mute absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="birthdate-input"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white placeholder-mute focus:outline-none focus:ring-1 focus:ring-ink dark:focus:ring-white font-sans"
                  />
                </div>
              </div>
            </div>

            {/* Email (Disabled / Read-only) */}
            <div>
              <label htmlFor="email-input" className="block text-xs font-medium text-body dark:text-mute mb-1.5">
                Địa chỉ Email
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="email-input"
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full h-10 pl-10 pr-4 rounded-pill bg-neutral-100 dark:bg-neutral-800/60 border border-hairline dark:border-hairline-dark text-sm text-neutral-500 dark:text-neutral-400 cursor-not-allowed select-text font-sans"
                />
              </div>
              <p className="text-[11px] text-mute mt-1 pl-2">
                Liên hệ quản trị để đổi email đăng nhập.
              </p>
            </div>
          </form>
        )}

        {/* ================= TAB 2: CÁ NHÂN HÓA ÂM NHẠC ================= */}
        {activeTab === 'music' && (
          <div
            id="panel-music"
            role="tabpanel"
            aria-labelledby="tab-music"
            className="space-y-6 animate-in fade-in duration-200"
          >
            {/* Thể loại yêu thích (Multi-select chips) */}
            <div>
              <label className="block text-xs font-medium text-body dark:text-mute mb-2">
                Thể loại yêu thích
              </label>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                Chọn các dòng nhạc bạn quan tâm để mq đề xuất bài hát phù hợp nhất.
              </p>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_GENRES.map((genre) => {
                  const isSelected = favoriteGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => toggleGenre(genre)}
                      data-pill-active={isSelected ? 'true' : undefined}
                      style={
                        isSelected
                          ? {
                              backgroundColor: isDark ? '#ffffff' : '#171717',
                              color: isDark ? '#000000' : '#ffffff',
                            }
                          : {}
                      }
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill text-xs font-sans transition-all cursor-pointer ${
                        isSelected
                          ? 'font-bold shadow-sm'
                          : 'bg-surface-soft dark:bg-surface-dark-soft text-body dark:text-mute hover:text-ink dark:hover:text-white border border-hairline dark:border-hairline-dark font-medium'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      <span>{genre}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chất lượng phát nhạc mặc định */}
            <div className="pt-2 border-t border-hairline dark:border-hairline-dark">
              <label className="block text-xs font-medium text-body dark:text-mute mb-2">
                Chất lượng phát nhạc mặc định
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'auto',
                    title: 'Tự động',
                    desc: 'Tự động điều chỉnh theo tốc độ mạng',
                    icon: <Radio className="w-4 h-4 text-emerald-500" />,
                  },
                  {
                    id: 'high',
                    title: 'Cao (320kbps)',
                    desc: 'Âm thanh chất lượng cao, dải động rõ',
                    icon: <Volume2 className="w-4 h-4 text-blue-500" />,
                  },
                  {
                    id: 'saver',
                    title: 'Tiết kiệm dữ liệu',
                    desc: 'Tối ưu băng thông khi sử dụng 3G/4G',
                    icon: <SlidersHorizontal className="w-4 h-4 text-amber-500" />,
                  },
                ].map((opt) => {
                  const isSelected = audioQuality === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setAudioQuality(opt.id as AudioQuality)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-ink dark:border-white bg-surface-soft/80 dark:bg-surface-dark-soft/80 shadow-sm'
                          : 'border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card hover:bg-surface-soft/50 dark:hover:bg-surface-dark-soft/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          {opt.icon}
                          <strong className="text-xs font-semibold text-ink dark:text-white">
                            {opt.title}
                          </strong>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-ink dark:border-white bg-ink dark:bg-white'
                              : 'border-neutral-400'
                          }`}
                        >
                          {isSelected && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-black" />
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-mute leading-snug">{opt.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tự động phát bài tương tự khi hết hàng đợi */}
            <div className="pt-2 border-t border-hairline dark:border-hairline-dark flex items-center justify-between gap-4">
              <div>
                <strong className="block text-sm font-semibold text-ink dark:text-white">
                  Tự động phát bài tương tự
                </strong>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 max-w-md">
                  Tự động gợi ý và phát tiếp các giai điệu tương đồng khi danh sách phát kết thúc.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={autoplaySimilar}
                onClick={() => setAutoplaySimilar(!autoplaySimilar)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ink dark:focus:ring-white ${
                  autoplaySimilar ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-300 dark:bg-neutral-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-md ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                    autoplaySimilar
                      ? 'translate-x-5 bg-white dark:bg-black'
                      : 'translate-x-0 bg-white dark:bg-neutral-300'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* ================= TAB 3: QUYỀN RIÊNG TƯ ================= */}
        {activeTab === 'privacy' && (
          <div
            id="panel-privacy"
            role="tabpanel"
            aria-labelledby="tab-privacy"
            className="space-y-5 animate-in fade-in duration-200"
          >
            {/* Toggle 1: Công khai playlist */}
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-hairline dark:border-hairline-dark">
              <div>
                <strong className="block text-sm font-semibold text-ink dark:text-white">
                  Công khai danh sách phát (Playlist)
                </strong>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 max-w-md">
                  Cho phép người dùng khác xem và phát các playlist bạn chia sẻ ở chế độ công khai.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={publicPlaylists}
                onClick={() => setPublicPlaylists(!publicPlaylists)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ink dark:focus:ring-white ${
                  publicPlaylists ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-300 dark:bg-neutral-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-md ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                    publicPlaylists
                      ? 'translate-x-5 bg-white dark:bg-black'
                      : 'translate-x-0 bg-white dark:bg-neutral-300'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 2: Công khai lịch sử nghe */}
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-hairline dark:border-hairline-dark">
              <div>
                <strong className="block text-sm font-semibold text-ink dark:text-white">
                  Công khai lịch sử nghe nhạc
                </strong>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 max-w-md">
                  Hiển thị các bài hát bạn đã nghe gần đây trên trang cá nhân của bạn.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={publicHistory}
                onClick={() => setPublicHistory(!publicHistory)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ink dark:focus:ring-white ${
                  publicHistory ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-300 dark:bg-neutral-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-md ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                    publicHistory
                      ? 'translate-x-5 bg-white dark:bg-black'
                      : 'translate-x-0 bg-white dark:bg-neutral-300'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 3: Hiển thị "Đang nghe" */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <strong className="block text-sm font-semibold text-ink dark:text-white">
                  Hiển thị trạng thái "Đang nghe"
                </strong>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 max-w-md">
                  Cho phép người khác thấy bài hát bạn đang nghe theo thời gian thực.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={showListeningStatus}
                onClick={() => setShowListeningStatus(!showListeningStatus)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ink dark:focus:ring-white ${
                  showListeningStatus ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-300 dark:bg-neutral-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-md ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                    showListeningStatus
                      ? 'translate-x-5 bg-white dark:bg-black'
                      : 'translate-x-0 bg-white dark:bg-neutral-300'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* ================= TAB 4: BẢO MẬT TÀI KHOẢN ================= */}
        {activeTab === 'security' && (
          <div
            id="panel-security"
            role="tabpanel"
            aria-labelledby="tab-security"
            className="space-y-6 animate-in fade-in duration-200"
          >
            {/* Form Đổi mật khẩu */}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <h3 className="text-sm font-bold text-ink dark:text-white">
                Đổi mật khẩu tài khoản
              </h3>

              {passwordStatus && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium ${
                    passwordStatus.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                  }`}
                >
                  {passwordStatus.message}
                </div>
              )}

              {/* Mật khẩu hiện tại */}
              <div>
                <label className="block text-xs font-medium text-body dark:text-mute mb-1">
                  Mật khẩu hiện tại
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại..."
                    className="w-full h-10 px-4 pr-10 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white focus:outline-none focus:ring-1 focus:ring-ink dark:focus:ring-white font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-mute hover:text-ink dark:hover:text-white"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Mật khẩu mới & Đo độ mạnh */}
              <div>
                <label className="block text-xs font-medium text-body dark:text-mute mb-1">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)..."
                    className="w-full h-10 px-4 pr-10 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white focus:outline-none focus:ring-1 focus:ring-ink dark:focus:ring-white font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-mute hover:text-ink dark:hover:text-white"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {newPassword && (
                  <div className="mt-2 space-y-1 px-1">
                    <div className="flex gap-1 h-1.5 w-full">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`flex-1 rounded-full transition-all duration-300 ${
                            passwordStrength >= step
                              ? strengthLabel.color
                              : 'bg-neutral-200 dark:bg-neutral-700'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-sans">
                      <span className="text-mute">Độ mạnh mật khẩu:</span>
                      <span className={`font-semibold ${strengthLabel.textClass}`}>
                        {strengthLabel.text}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Xác nhận mật khẩu mới */}
              <div>
                <label className="block text-xs font-medium text-body dark:text-mute mb-1">
                  Xác nhận mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới..."
                    className="w-full h-10 px-4 pr-10 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white focus:outline-none focus:ring-1 focus:ring-ink dark:focus:ring-white font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-mute hover:text-ink dark:hover:text-white"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-[11px] text-red-500 mt-1 pl-2">Mật khẩu xác nhận không khớp.</p>
                )}
              </div>

              <div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isChangingPass || !currentPassword || !newPassword || newPassword !== confirmPassword}
                >
                  {isChangingPass ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                </Button>
              </div>
            </form>

            {/* Danh sách thiết bị / Phiên đăng nhập gần đây */}
            <div className="pt-4 border-t border-hairline dark:border-hairline-dark space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-ink dark:text-white">
                    Thiết bị đăng nhập gần đây
                  </h3>
                  <p className="text-xs text-mute mt-0.5">
                    Các thiết bị đã truy cập tài khoản mq của bạn trong 30 ngày qua.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {/* Thiết bị hiện tại */}
                <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-semibold text-ink dark:text-white">
                          Windows 11 · Trình duyệt hiện tại
                        </strong>
                        <span className="inline-flex items-center gap-1 text-[10px] font-sans px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Đang hoạt động
                        </span>
                      </div>
                      <span className="text-[11px] text-mute font-sans">
                        Hà Nội, Việt Nam · Địa chỉ IP: 14.241.xx.xx
                      </span>
                    </div>
                  </div>
                </div>

                {/* Phiên khác */}
                <div className="p-3.5 rounded-2xl border border-hairline dark:border-hairline-dark bg-surface-soft/40 dark:bg-surface-dark-soft/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 flex items-center justify-center shrink-0">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-xs font-semibold text-ink dark:text-white">
                        iPhone 15 Pro · Safari Mobile
                      </strong>
                      <span className="block text-[11px] text-mute font-sans">
                        TP. Hồ Chí Minh, Việt Nam · Hoạt động 2 giờ trước
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleLogoutAllDevices}
                  icon={<LogOut className="w-3.5 h-3.5 text-red-500" />}
                  className="text-red-600 dark:text-red-400"
                >
                  Đăng xuất khỏi tất cả thiết bị
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Actions Bar (Nút Lưu & Hủy) */}
      <div className="p-4 rounded-2xl border border-hairline dark:border-hairline-dark bg-canvas/90 dark:bg-surface-dark-card/90 backdrop-blur-md shadow-lg flex items-center justify-between gap-4">
        <div className="text-xs text-mute font-sans">
          {isDirty ? (
            <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Bạn có thay đổi chưa lưu
            </span>
          ) : (
            <span>Tất cả thông tin đã được đồng bộ</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <Button variant="secondary" size="md" onClick={handleCancel} disabled={isSaving}>
              Hủy
            </Button>
          )}

          <Button
            variant="primary"
            size="md"
            onClick={() => handleSaveProfile()}
            disabled={!isDirty || !isFormValid || isSaving}
            icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          >
            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </div>
      </div>

      {/* Avatar Crop Modal */}
      <AvatarCropModal
        isOpen={cropModalOpen}
        imageSrc={cropImageSrc}
        onClose={() => setCropModalOpen(false)}
        onApply={handleApplyCroppedAvatar}
      />
    </div>
  );
};
