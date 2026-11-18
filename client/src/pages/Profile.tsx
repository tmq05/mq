import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  User as UserIcon,
  Music2,
  ShieldCheck,
  KeyRound,
  Camera,
  LayoutGrid,
  Trash2,
  ChevronDown,
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
  Droplets,
  CloudRain,
  Flame,
  VolumeX,
  Edit3,
  Globe,
  CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '../stores/auth-store.js';
import { useThemeStore } from '../stores/theme-store.js';
import { usePlayerStore } from '../stores/player-store.js';
import { Button } from '../components/common/Button.js';
import { SongRow } from '../components/song/SongRow.js';
import { UserAvatar } from '../components/common/UserAvatar.js';
import type { Playlist, UnifiedTrack } from '../types/index.js';
import { AvatarCropModal } from '../components/profile/AvatarCropModal.js';
import { AvatarPickerModal } from '../components/profile/AvatarPickerModal.js';
import type { PresetAvatar } from '../data/presetAvatars.js';
import { ThemeSwitch } from '../components/pinui/ThemeSwitch.js';
import { SegmentedTabs, SegmentedTabContent, useTabDirection } from '../components/layout/SegmentedTabs.js';
import { api } from '../api/client.js';
import { ProfileEnhancementBoundary } from '../components/profile/ProfileEnhancementBoundary.js';
import { useProfileInsights } from '../components/profile/useProfileInsights.js';
import { ProfileHeaderExtras } from '../components/profile/ProfileHeaderExtras.js';
import { ProfileCompletenessCard } from '../components/profile/ProfileCompletenessCard.js';
import { ProfileExtendedStats } from '../components/profile/ProfileExtendedStats.js';
import { ListeningChartPanel } from '../components/profile/ListeningChartPanel.js';
import { PlaylistCreateTrigger, PlaylistCoverCollage } from '../components/profile/PlaylistCreateInline.js';
import { UnfollowArtistButton, UnlikeTrackButton } from '../components/profile/ProfileListActions.js';
import { ProfileInsightPanels } from '../components/profile/ProfileInsightPanels.js';
import { ProfileAchievementsSection } from '../components/profile/ProfileAchievementsSection.js';
import { Modal } from '../components/common/Modal.js';

type TabType = 'personal' | 'music' | 'privacy' | 'security' | 'theme';
type ProfileSectionType =
  | 'playlists'
  | 'likes'
  | 'following'
  | 'listening'
  | 'history'
  | 'streak'
  | 'top-artists'
  | 'top-genres'
  | 'edit';

const PROFILE_SECTION_TABS: Array<{ id: ProfileSectionType }> = [
  { id: 'playlists' },
  { id: 'likes' },
  { id: 'following' },
  { id: 'listening' },
  { id: 'history' },
  { id: 'streak' },
  { id: 'top-artists' },
  { id: 'top-genres' },
  { id: 'edit' },
];

const PROFILE_TABS = [
  { id: 'personal', label: 'Thông tin', icon: <UserIcon className="w-3.5 h-3.5" /> },
  { id: 'music', label: 'Âm nhạc', icon: <Music2 className="w-3.5 h-3.5" /> },
  { id: 'privacy', label: 'Quyền riêng tư', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  { id: 'security', label: 'Bảo mật', icon: <KeyRound className="w-3.5 h-3.5" /> },
  { id: 'theme', label: 'Giao diện & Hiệu ứng', icon: <Sparkles className="w-3.5 h-3.5 text-amber-500" /> },
];
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
  saveListeningHistory?: boolean;
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
  const { isDark, setTheme, effect, setEffect, sound, setSound } = useThemeStore();
  const { autoScrollToNowPlaying, setAutoScrollToNowPlaying } = usePlayerStore();

  const [profileSection, setProfileSection] = useState<ProfileSectionType>('playlists');
  const sectionDirection = useTabDirection(PROFILE_SECTION_TABS, profileSection);
  const {
    data: insights,
    isLoading: isInsightsLoading,
    isError: isInsightsError,
    refetch: refetchInsights,
  } = useProfileInsights(user?.id);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('personal');
  const tabDirection = useTabDirection(PROFILE_TABS, activeTab);
  const shouldReduceMotion = useReducedMotion();
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { data: profilePlaylists, isLoading: isLoadingPlaylists } = useQuery({
    queryKey: ['profile-playlists', user?.id],
    queryFn: async () => {
      const res = await api.get('/users/playlists');
      return (res.data?.playlists || []) as Playlist[];
    },
    enabled: Boolean(user?.id) && profileSection === 'playlists',
  });

  const { data: profileLikes, isLoading: isLoadingLikes } = useQuery({
    queryKey: ['profile-likes', user?.id],
    queryFn: async () => {
      const res = await api.get('/users/likes');
      return (res.data?.likes || []) as UnifiedTrack[];
    },
    enabled: Boolean(user?.id) && profileSection === 'likes',
  });

  const { data: profileFollowing, isLoading: isLoadingFollowing } = useQuery({
    queryKey: ['profile-following', user?.id],
    queryFn: async () => {
      const res = await api.get('/users/following');
      return (res.data?.artists || []) as Array<{
        id: string;
        name: string;
        imageUrl?: string | null;
        isVerified?: boolean;
        followersCount?: number;
      }>;
    },
    enabled: Boolean(user?.id) && profileSection === 'following',
  });

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
  const [saveListeningHistory, setSaveListeningHistory] = useState<boolean>(true);

  // Avatar Upload & Crop State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  const [showAdvancedUrl, setShowAdvancedUrl] = useState(false);
  const [isCheckingUrl, setIsCheckingUrl] = useState(false);
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
    const initialSaveListening = loadedPrefs.saveListeningHistory !== undefined ? loadedPrefs.saveListeningHistory : true;

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
    setSaveListeningHistory(initialSaveListening);

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
      saveListeningHistory: initialSaveListening,
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
            hoursListened: res.data.hoursListened ?? 0,
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
    const handlePlayRecorded = () => {
      fetchStats();
    };
    window.addEventListener('mq:play-recorded', handlePlayRecorded);
    return () => {
      isMounted = false;
      window.removeEventListener('mq:play-recorded', handlePlayRecorded);
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
      saveListeningHistory !== baseline.saveListeningHistory ||
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
    saveListeningHistory,
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

  const handleSavePresetAvatar = async (preset: PresetAvatar) => {
    const res = await api.patch('/auth/avatar', { presetId: preset.id });
    const nextAvatarUrl = res.data?.avatarUrl || preset.url;
    setAvatarUrl(nextAvatarUrl);
    setBaseline((prev: any) => (prev ? { ...prev, avatarUrl: nextAvatarUrl } : prev));
    updateUser({
      ...res.data,
      avatarUrl: nextAvatarUrl,
    });
    setToast({
      type: 'success',
      message: 'Đã cập nhật ảnh đại diện',
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
    const trimmed = customUrlInput.trim();
    if (!trimmed) return;

    const isHttpOrData =
      /^https?:\/\/\S+/i.test(trimmed) || /^data:image\/[a-z0-9.+-]+;base64,/i.test(trimmed);
    if (!isHttpOrData) {
      setToast({
        type: 'error',
        message: 'URL không hợp lệ. Vui lòng dán đường dẫn ảnh bắt đầu bằng https:// hoặc http://.',
      });
      return;
    }

    setIsCheckingUrl(true);
    const probe = new Image();
    probe.referrerPolicy = 'no-referrer';
    probe.onload = () => {
      setIsCheckingUrl(false);
      setAvatarUrl(trimmed);
      setCustomUrlInput('');
      setShowAdvancedUrl(false);
      setToast({
        type: 'success',
        message: 'Đã áp dụng URL ảnh đại diện. Nhấn "Lưu thay đổi" để lưu.',
      });
    };
    probe.onerror = () => {
      setIsCheckingUrl(false);
      setToast({
        type: 'error',
        message: 'Không thể tải ảnh từ URL này. Hãy dùng link trực tiếp tới tệp ảnh (jpg, png, webp...).',
      });
    };
    probe.src = trimmed;
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
        saveListeningHistory,
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
        saveListeningHistory,
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
    setSaveListeningHistory(baseline.saveListeningHistory ?? true);
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
  const handleLogoutAllDevices = () => {
    setConfirmLogoutOpen(true);
  };

  const confirmLogoutAllDevices = async () => {
    setIsLoggingOutAll(true);
    try {
      await api.post('/auth/logout-all');
      setConfirmLogoutOpen(false);
      setToast({
        type: 'success',
        message: 'Đã hủy phiên đăng nhập trên tất cả các thiết bị khác.',
      });
    } catch (err: any) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || 'Lỗi xử lý yêu cầu đăng xuất.',
      });
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-[720px] mx-auto py-8 space-y-6 select-none font-sans">
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
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
              <div className="min-w-0">
                <h2 className="font-display font-bold text-lg text-ink dark:text-white truncate">
                  {name || user.name}
                </h2>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-mute font-sans">
                  <span>{username ? `@${username}` : user.email}</span>
                  <span>·</span>
                  <span className="truncate">{user.email}</span>
                </div>
              </div>

              {/* Role Badge + Chỉnh sửa trang cá nhân */}
              <div className="flex flex-wrap sm:flex-nowrap items-center justify-center sm:justify-end gap-2 shrink-0">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 text-xs font-sans font-medium text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      user.role === 'MODERATOR' ? 'bg-amber-500' : 'bg-traffic-green'
                    }`}
                  />
                  <span>
                    Vai trò:{' '}
                    {user.role === 'ADMIN'
                      ? 'Admin'
                      : user.role === 'MODERATOR'
                        ? 'Moderator'
                        : 'Thành Viên'}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant={isEditModalOpen ? 'primary' : 'secondary'}
                  onClick={() => setIsEditModalOpen(true)}
                  icon={<Edit3 className="w-3.5 h-3.5" />}
                  className="whitespace-nowrap shrink-0"
                >
                  Chỉnh sửa trang cá nhân
                </Button>
              </div>
            </div>

            {(baseline?.bio ?? user.bio ?? '').trim() && (
              <p className="text-xs sm:text-sm text-body dark:text-neutral-300 font-sans leading-relaxed max-w-xl break-words">
                {(baseline?.bio ?? user.bio ?? '').trim()}
              </p>
            )}
            <ProfileEnhancementBoundary>
              <ProfileHeaderExtras
                joinedAt={user.createdAt}
                username={username}
                insights={insights}
                stats={stats}
                onCopied={(message) => setToast({ type: 'success', message })}
                onBadgeClick={(badgeId) => {
                  setSelectedBadgeId(badgeId);
                  document.getElementById('profile-badges-section')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                  });
                }}
              />
            </ProfileEnhancementBoundary>

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
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPresetModalOpen(true)}
                icon={<LayoutGrid className="w-3.5 h-3.5" />}
              >
                Chọn ảnh có sẵn
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
                aria-expanded={showAdvancedUrl}
                onClick={() => setShowAdvancedUrl(!showAdvancedUrl)}
                className="inline-flex items-center gap-1 text-xs text-mute hover:text-ink dark:hover:text-white px-2.5 py-1 rounded-pill hover:bg-surface-soft dark:hover:bg-surface-dark-soft transition-colors active:scale-[0.97] cursor-pointer"
              >
                <span>Nâng cao</span>
                <motion.span
                  aria-hidden="true"
                  animate={{ rotate: showAdvancedUrl ? 180 : 0 }}
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : { duration: 0.25, ease: [0.32, 0.72, 0, 1] }
                  }
                  className="inline-flex items-center"
                >
                  <ChevronDown className="w-3 h-3" />
                </motion.span>
              </button>
            </div>

            {/* Collapsible Advanced URL Input */}
            <AnimatePresence initial={false}>
              {showAdvancedUrl && (
                <motion.div
                  initial={
                    shouldReduceMotion
                      ? { opacity: 0 }
                      : { height: 0, opacity: 0, y: -6 }
                  }
                  animate={
                    shouldReduceMotion
                      ? { opacity: 1, transition: { duration: 0.12 } }
                      : {
                          height: 'auto',
                          opacity: 1,
                          y: 0,
                          transition: {
                            height: { duration: 0.32, ease: [0.32, 0.72, 0, 1] },
                            opacity: { duration: 0.22, delay: 0.05 },
                            y: { duration: 0.28, ease: [0.32, 0.72, 0, 1] },
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
                            height: { duration: 0.24, ease: [0.32, 0.72, 0, 1] },
                            opacity: { duration: 0.14 },
                            y: { duration: 0.18 },
                          },
                        }
                  }
                  className="overflow-hidden"
                >
                  <div className="pt-2 pb-1 px-1 flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="Dán URL ảnh đại diện trực tiếp..."
                      value={customUrlInput}
                      onChange={(e) => setCustomUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplyCustomUrl();
                        }
                      }}
                      className="flex-1 h-8 px-3 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-xs text-ink dark:text-white placeholder-mute focus:outline-none focus:border-ink/60 dark:focus:border-white/70 focus:ring-2 focus:ring-ink/15 dark:focus:ring-white/20 transition-colors font-sans"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleApplyCustomUrl}
                      disabled={isCheckingUrl || !customUrlInput.trim()}
                    >
                      {isCheckingUrl ? 'Đang tải...' : 'Áp dụng'}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Quick Stats Grid (Bấm vào Playlist, Bài đã thích, Nghệ sĩ theo dõi để xem danh sách bên dưới) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-hairline dark:border-hairline-dark">
          <button
            type="button"
            onClick={() => setProfileSection('playlists')}
            className={`p-3 rounded-xl border flex items-center gap-3 text-left transition-all cursor-pointer active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green/35 ${
              profileSection === 'playlists'
                ? 'bg-traffic-green/8 border-traffic-green/70 ring-1 ring-traffic-green/20 shadow-xs'
                : 'bg-surface-soft/60 dark:bg-surface-dark-soft/60 border-hairline/60 dark:border-hairline-dark/60 hover:border-hairline-strong dark:hover:border-white/25'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <ListMusic className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-sans text-mute">Playlist</span>
              <strong className="text-sm font-semibold text-ink dark:text-white">
                {isStatsLoading ? '...' : stats.playlists}
              </strong>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setProfileSection('likes')}
            className={`p-3 rounded-xl border flex items-center gap-3 text-left transition-all cursor-pointer active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green/35 ${
              profileSection === 'likes'
                ? 'bg-traffic-green/8 border-traffic-green/70 ring-1 ring-traffic-green/20 shadow-xs'
                : 'bg-surface-soft/60 dark:bg-surface-dark-soft/60 border-hairline/60 dark:border-hairline-dark/60 hover:border-hairline-strong dark:hover:border-white/25'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Heart className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-sans text-mute">Bài đã thích</span>
              <strong className="text-sm font-semibold text-ink dark:text-white">
                {isStatsLoading ? '...' : stats.likes}
              </strong>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setProfileSection('following')}
            className={`p-3 rounded-xl border flex items-center gap-3 text-left transition-all cursor-pointer active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green/35 ${
              profileSection === 'following'
                ? 'bg-traffic-green/8 border-traffic-green/70 ring-1 ring-traffic-green/20 shadow-xs'
                : 'bg-surface-soft/60 dark:bg-surface-dark-soft/60 border-hairline/60 dark:border-hairline-dark/60 hover:border-hairline-strong dark:hover:border-white/25'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-sans text-mute">Nghệ sĩ theo dõi</span>
              <strong className="text-sm font-semibold text-ink dark:text-white">
                {isStatsLoading ? '...' : stats.following}
              </strong>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setProfileSection('listening')}
            className={`p-3 rounded-xl border flex items-center gap-3 text-left transition-all cursor-pointer active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green/35 ${
              profileSection === 'listening'
                ? 'bg-traffic-green/8 border-traffic-green/70 ring-1 ring-traffic-green/20 shadow-xs'
                : 'bg-surface-soft/60 dark:bg-surface-dark-soft/60 border-hairline/60 dark:border-hairline-dark/60 hover:border-hairline-strong dark:hover:border-white/25'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-sans text-mute">Tổng giờ nghe</span>
              <strong className="text-sm font-semibold text-ink dark:text-white">
                {isStatsLoading ? '...' : `${stats.hoursListened}h`}
              </strong>
            </div>
          </button>
        </div>

        <ProfileEnhancementBoundary>
          <ProfileExtendedStats
            insights={insights}
            isLoading={isInsightsLoading}
            activeSection={profileSection}
            onSelectSection={(sec) => setProfileSection(sec)}
          />
        </ProfileEnhancementBoundary>

        <ProfileEnhancementBoundary>
          <ProfileCompletenessCard
            hasBio={Boolean((baseline?.bio ?? user.bio ?? '').trim())}
            hasAvatar={Boolean(avatarUrl)}
            playlistCount={stats.playlists}
            followingCount={stats.following}
            onActionClick={(step) => {
              if (step === 'bio') {
                setActiveTab('personal');
                setIsEditModalOpen(true);
              } else if (step === 'avatar') {
                fileInputRef.current?.click();
              } else if (step === 'playlist') {
                setProfileSection('playlists');
              } else if (step === 'follow') {
                setProfileSection('following');
              }
            }}
          />
        </ProfileEnhancementBoundary>
      </section>

      {/* Nội dung bên dưới với hiệu ứng chuyển đổi tab mượt mà */}
      <SegmentedTabContent activeKey={profileSection} direction={sectionDirection}>
        {/* ================= SECTION: PLAYLISTS CỦA TÔI ================= */}
        {profileSection === 'playlists' && (
        <section className="p-6 rounded-2xl border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card shadow-subtle space-y-4">
          <div className="flex items-center justify-between border-b border-hairline dark:border-hairline-dark pb-3">
            <h3 className="font-display font-bold text-base text-ink dark:text-white flex items-center gap-2">
              <ListMusic className="w-4 h-4 text-blue-500" />
              Playlist của bạn ({profilePlaylists?.length ?? stats.playlists})
            </h3>
            <div className="flex items-center gap-3">
              <ProfileEnhancementBoundary>
                <PlaylistCreateTrigger
                  userId={user.id}
                  onCreated={() => {
                    setStats((prev) => ({ ...prev, playlists: prev.playlists + 1 }));
                    setToast({ type: 'success', message: 'Đã tạo playlist mới' });
                  }}
                />
              </ProfileEnhancementBoundary>
              <Link to="/library" className="text-xs font-medium text-traffic-green hover:underline">
                Quản lý ở Thư viện →
              </Link>
            </div>
          </div>

          {isLoadingPlaylists ? (
            <div className="py-10 text-center text-xs text-mute">Đang tải playlist...</div>
          ) : !profilePlaylists || profilePlaylists.length === 0 ? (
            <div className="py-12 text-center space-y-2 text-xs text-mute">
              <p>Bạn chưa có playlist nào.</p>
              <Link to="/library" className="inline-block font-semibold text-ink dark:text-white underline">
                Tạo playlist đầu tiên
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {profilePlaylists.map((pl) => (
                <Link
                  key={pl.id}
                  to={`/playlists/${pl.id}`}
                  className="group p-3.5 rounded-xl border border-hairline dark:border-hairline-dark bg-surface-soft/40 dark:bg-surface-dark-soft/40 hover:border-hairline-strong dark:hover:border-white/25 transition-all flex items-center gap-3.5"
                >
                  <div className="w-12 h-12 rounded-lg bg-surface-soft dark:bg-surface-dark-soft overflow-hidden shrink-0 flex items-center justify-center border border-hairline dark:border-hairline-dark">
                    <PlaylistCoverCollage playlist={pl} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-ink dark:text-white truncate group-hover:text-traffic-green transition-colors">
                      {pl.title}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-mute mt-0.5">
                      {pl.isPublic ? (
                        <Globe className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Lock className="w-3 h-3" />
                      )}
                      <span>{pl.isPublic ? 'Công khai' : 'Riêng tư'}</span>
                      <span>·</span>
                      <span>{pl._count?.songs ?? 0} bài hát</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ================= SECTION: BÀI HÁT ĐÃ THÍCH ================= */}
      {profileSection === 'likes' && (
        <section className="p-6 rounded-2xl border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card shadow-subtle space-y-4">
          <div className="flex items-center justify-between border-b border-hairline dark:border-hairline-dark pb-3">
            <h3 className="font-display font-bold text-base text-ink dark:text-white flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500" />
              Bài hát đã thích ({profileLikes?.length ?? stats.likes})
            </h3>
            <Link to="/library" className="text-xs font-medium text-traffic-green hover:underline">
              Mở trong Thư viện →
            </Link>
          </div>

          {isLoadingLikes ? (
            <div className="py-10 text-center text-xs text-mute">Đang tải bài hát đã thích...</div>
          ) : !profileLikes || profileLikes.length === 0 ? (
            <div className="py-12 text-center text-xs text-mute">
              Bạn chưa thích bài hát nào.
            </div>
          ) : (
            <div className="divide-y divide-hairline/40 dark:divide-hairline-dark/40">
              {profileLikes.map((track, idx) => (
                <div key={track.id} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <SongRow
                      track={track}
                      index={idx}
                      queueContext={profileLikes}
                      isInitiallyLiked
                    />
                  </div>
                  <ProfileEnhancementBoundary>
                    <UnlikeTrackButton
                      track={track}
                      userId={user.id}
                      onUnliked={() =>
                        setStats((prev) => ({ ...prev, likes: Math.max(0, prev.likes - 1) }))
                      }
                    />
                  </ProfileEnhancementBoundary>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ================= SECTION: NGHỆ SĨ ĐANG THEO DÕI ================= */}
      {profileSection === 'following' && (
        <section className="p-6 rounded-2xl border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card shadow-subtle space-y-4">
          <div className="flex items-center justify-between border-b border-hairline dark:border-hairline-dark pb-3">
            <h3 className="font-display font-bold text-base text-ink dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              Nghệ sĩ đang theo dõi ({profileFollowing?.length ?? stats.following})
            </h3>
            <Link to="/artists" className="text-xs font-medium text-traffic-green hover:underline">
              Khám phá nghệ sĩ →
            </Link>
          </div>

          {isLoadingFollowing ? (
            <div className="py-10 text-center text-xs text-mute">Đang tải danh sách nghệ sĩ...</div>
          ) : !profileFollowing || profileFollowing.length === 0 ? (
            <div className="py-12 text-center space-y-2 text-xs text-mute">
              <p>Bạn chưa theo dõi nghệ sĩ nào.</p>
              <Link to="/artists" className="inline-block font-semibold text-ink dark:text-white underline">
                Khám phá nghệ sĩ ngay
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {profileFollowing.map((artist) => (
                <Link
                  key={artist.id}
                  to={`/artists/${encodeURIComponent(artist.id)}`}
                  className="group p-4 rounded-xl border border-hairline dark:border-hairline-dark bg-surface-soft/40 dark:bg-surface-dark-soft/40 hover:border-hairline-strong dark:hover:border-white/25 transition-all flex flex-col items-center text-center gap-2.5"
                >
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark shrink-0">
                    {artist.imageUrl ? (
                      <img
                        src={artist.imageUrl}
                        alt={artist.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-lg text-mute">
                        {(artist.name || '?').slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 w-full">
                    <div className="text-sm font-semibold text-ink dark:text-white truncate inline-flex items-center justify-center gap-1 max-w-full group-hover:text-traffic-green transition-colors">
                      <span className="truncate">{artist.name}</span>
                      {artist.isVerified && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-mute mt-0.5">Nghệ sĩ đang theo dõi</p>
                  </div>
                  <ProfileEnhancementBoundary>
                    <UnfollowArtistButton
                      artistId={artist.id}
                      userId={user.id}
                      onUnfollowed={() =>
                        setStats((prev) => ({ ...prev, following: Math.max(0, prev.following - 1) }))
                      }
                    />
                  </ProfileEnhancementBoundary>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ================= SECTION: BIỂU ĐỒ NGHE NHẠC ================= */}
      {profileSection === 'listening' && (
        <ProfileEnhancementBoundary>
          <ListeningChartPanel
            insights={insights}
            totalHours={stats.hoursListened}
            isLoading={isInsightsLoading}
          />
        </ProfileEnhancementBoundary>
      )}

      {/* ================= SECTION: 4 THẺ THỐNG KÊ MỞ RỘNG ================= */}
      {(profileSection === 'history' ||
        profileSection === 'streak' ||
        profileSection === 'top-artists' ||
        profileSection === 'top-genres') && (
        <ProfileEnhancementBoundary>
          <ProfileInsightPanels
            section={profileSection}
            userId={user.id}
            insights={insights}
            isInsightsLoading={isInsightsLoading}
          />
        </ProfileEnhancementBoundary>
      )}

      </SegmentedTabContent>

      {/* ================= MODAL: CHỈNH SỬA TRANG CÁ NHÂN (5 TABS CÀI ĐẶT) ================= */}
      <Modal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Chỉnh sửa trang cá nhân"
        subtitle="Cập nhật thông tin, sở thích âm nhạc, quyền riêng tư và giao diện"
        icon={<Edit3 className="w-4 h-4 text-traffic-green" />}
        size="xl"
        className="!max-w-[780px]"
        bodyClassName="p-6 sm:p-7"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
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

            <div className="flex items-center gap-2 ml-auto">
              {isDirty && (
                <Button variant="secondary" size="sm" onClick={handleCancel} disabled={isSaving}>
                  Hủy
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleSaveProfile()}
                disabled={!isDirty || !isFormValid || isSaving}
                icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              >
                {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </div>
          </div>
        }
      >
        <div id="profile-edit-section" className="space-y-4">
          {/* Tabs Navigation (iOS Segmented Control) */}
          <div className="overflow-x-auto pb-1">
            <SegmentedTabs
              tabs={PROFILE_TABS}
              activeId={activeTab}
              fullWidth
              ariaLabel="Danh mục cài đặt hồ sơ"
              onChange={(id) => setActiveTab(id as TabType)}
            />
          </div>

          {/* Main Tab Panels */}
          <div className="p-6 sm:p-7 rounded-2xl border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card min-h-[420px]">
            <SegmentedTabContent activeKey={activeTab} direction={tabDirection}>
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
                className={`w-full h-10 px-4 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border text-sm text-ink dark:text-white placeholder-mute focus:outline-none focus:ring-2 transition-all ${
                  nameError
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-400/20'
                    : 'border-hairline dark:border-hairline-dark focus:border-ink/40 dark:focus:border-white/45 focus:ring-ink/10 dark:focus:ring-white/15'
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
                  className="w-full h-10 pl-10 pr-4 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white placeholder-mute focus:outline-none focus:border-ink/40 dark:focus:border-white/45 focus:ring-2 focus:ring-ink/10 dark:focus:ring-white/15 transition-all font-sans"
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
                className={`w-full p-3.5 rounded-2xl bg-surface-soft dark:bg-surface-dark-soft border text-sm text-ink dark:text-white placeholder-mute focus:outline-none focus:ring-2 transition-all resize-none font-sans ${
                  bioError
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-400/20'
                    : 'border-hairline dark:border-hairline-dark focus:border-ink/40 dark:focus:border-white/45 focus:ring-ink/10 dark:focus:ring-white/15'
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
                    className="w-full h-10 pl-10 pr-4 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white placeholder-mute focus:outline-none focus:border-ink/40 dark:focus:border-white/45 focus:ring-2 focus:ring-ink/10 dark:focus:ring-white/15 transition-all font-sans"
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
                    className="w-full h-10 pl-10 pr-4 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white placeholder-mute focus:outline-none focus:border-ink/40 dark:focus:border-white/45 focus:ring-2 focus:ring-ink/10 dark:focus:ring-white/15 transition-all font-sans"
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
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/25 dark:focus-visible:ring-white/30 ${
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

            {/* Tự động cuộn tới khung Đang phát */}
            <div className="pt-4 border-t border-hairline dark:border-hairline-dark flex items-center justify-between gap-4">
              <div>
                <strong className="block text-sm font-semibold text-ink dark:text-white">
                  Tự động cuộn tới khung "Đang phát"
                </strong>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 max-w-md">
                  Tự động cuộn mượt tới trình phát chính ở trang Khám phá khi chọn phát bài hát mới.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={autoScrollToNowPlaying}
                onClick={() => setAutoScrollToNowPlaying(!autoScrollToNowPlaying)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/25 dark:focus-visible:ring-white/30 ${
                  autoScrollToNowPlaying
                    ? 'bg-neutral-900 dark:bg-white'
                    : 'bg-neutral-300 dark:bg-neutral-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-md ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                    autoScrollToNowPlaying
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
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/25 dark:focus-visible:ring-white/30 ${
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
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/25 dark:focus-visible:ring-white/30 ${
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
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-hairline dark:border-hairline-dark">
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
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/25 dark:focus-visible:ring-white/30 ${
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

            {/* Toggle 4: Lưu lịch sử nghe */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <strong className="block text-sm font-semibold text-ink dark:text-white">
                  Lưu lịch sử nghe
                </strong>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 max-w-md">
                  Ghi lại các bài hát bạn vừa nghe để hiển thị mục "Tiếp tục nghe" và gợi ý nhạc phù hợp.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={saveListeningHistory}
                onClick={() => setSaveListeningHistory(!saveListeningHistory)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/25 dark:focus-visible:ring-white/30 ${
                  saveListeningHistory ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-300 dark:bg-neutral-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-md ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                    saveListeningHistory
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
                    className="w-full h-10 px-4 pr-10 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white focus:outline-none focus:border-ink/40 dark:focus:border-white/45 focus:ring-2 focus:ring-ink/10 dark:focus:ring-white/15 transition-all font-sans"
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
                    className="w-full h-10 px-4 pr-10 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white focus:outline-none focus:border-ink/40 dark:focus:border-white/45 focus:ring-2 focus:ring-ink/10 dark:focus:ring-white/15 transition-all font-sans"
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
                    className="w-full h-10 px-4 pr-10 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white focus:outline-none focus:border-ink/40 dark:focus:border-white/45 focus:ring-2 focus:ring-ink/10 dark:focus:ring-white/15 transition-all font-sans"
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

        {/* Tab 5: Giao diện & Hiệu ứng chuyển đổi Theme */}
        {activeTab === 'theme' && (
          <div
            id="panel-theme"
            role="tabpanel"
            aria-labelledby="tab-theme"
            className="space-y-6 animate-in fade-in duration-200"
          >
            {/* Box 1: Interactive PinUI Theme Switch Stage */}
            <div className="p-6 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-4">
              <div>
                <h3 className="font-display font-bold text-base text-ink dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Hộp cát trải nghiệm hiệu ứng Theme Switch (PinUI)</span>
                </h3>
                <p className="text-xs text-mute mt-1">
                  Bấm trực tiếp vào nút tròn ở giữa để kích hoạt hiệu ứng chuyển đổi giữa nền Sáng và Tối.
                </p>
              </div>

              {/* Stage Container */}
              <div className="w-full rounded-2xl overflow-hidden border border-hairline dark:border-hairline-dark shadow-sm h-[320px]">
                <ThemeSwitch
                  theme={isDark ? 'dark' : 'light'}
                  onThemeChange={(next) => setTheme(next === 'dark')}
                  defaultEffect={effect}
                  onEffectChange={(newEffect) => setEffect(newEffect)}
                  sound={sound}
                  fill={true}
                />
              </div>
            </div>

            {/* Box 2: Effect Options Selection */}
            <div className="p-6 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-4">
              <div>
                <h3 className="font-display font-bold text-base text-ink dark:text-white">
                  Lựa chọn hiệu ứng mặc định
                </h3>
                <p className="text-xs text-mute mt-1">
                  Hiệu ứng này sẽ được kích hoạt toàn màn hình khi bạn bấm nút Mặt trời/Mặt trăng trên thanh điều hướng Navbar.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'droplet' as const,
                    name: 'Giọt nước',
                    subtitle: 'Droplet Physics',
                    desc: 'Rơi từ đỉnh màn hình trúng nút bấm, tạo xung nảy và sóng lan tỏa tròn mở rộng toàn bộ website.',
                    icon: <Droplets className="w-5 h-5 text-blue-500" />,
                    badge: 'Khuyên dùng',
                  },
                  {
                    id: 'rain' as const,
                    name: 'Cơn mưa',
                    subtitle: 'Rain Shower',
                    desc: 'Cơn mưa hạt rơi xiên theo góc gió, các vũng nước loang dần và hòa trộn phủ kín toàn màn hình.',
                    icon: <CloudRain className="w-5 h-5 text-cyan-500" />,
                    badge: 'Thư giãn',
                  },
                  {
                    id: 'diwali' as const,
                    name: 'Pháo hoa Diwali',
                    subtitle: 'Festival Fireworks',
                    desc: 'Pháo hoa phóng từ nút bấm, phát nổ rực rỡ kèm âm thanh vòm sống động và muôn vàn vì sao phủ kín.',
                    icon: <Flame className="w-5 h-5 text-amber-500" />,
                    badge: 'Sinh động',
                  },
                ].map((item) => {
                  const isSelected = effect === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setEffect(item.id)}
                      className={`p-4 rounded-card border text-left transition-all flex flex-col justify-between space-y-3 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/25 dark:focus-visible:ring-white/30 ${
                        isSelected
                          ? 'border-ink/45 dark:border-white/50 bg-surface-soft/80 dark:bg-surface-dark-soft/80 shadow-xs ring-1 ring-ink/10 dark:ring-white/15'
                          : 'border-hairline dark:border-hairline-dark hover:border-hairline-strong dark:hover:border-hairline-dark/80 bg-canvas dark:bg-surface-dark-card'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="p-2 rounded-lg bg-surface-soft dark:bg-surface-dark-soft">
                            {item.icon}
                          </div>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-ink dark:bg-white text-white dark:text-black flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-xs text-ink dark:text-white flex items-center gap-1.5">
                            {item.name}
                          </h4>
                          <p className="text-[10px] font-sans text-mute">{item.subtitle}</p>
                        </div>
                        <p className="text-[11px] text-body dark:text-mute leading-relaxed">
                          {item.desc}
                        </p>
                      </div>

                      <span className="text-[10px] font-sans px-2 py-0.5 rounded-pill bg-surface-soft dark:bg-surface-dark-soft text-mute self-start">
                        {item.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Box 3: Sound Setting */}
            <div className="p-5 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  {sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-mute" />}
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-ink dark:text-white">
                    Âm thanh pháo hoa (Web Audio API)
                  </h4>
                  <p className="text-[11px] text-mute">
                    Tạo âm thanh tiếng rít tên lửa, tiếng nổ vang và tí tách tự nhiên khi chọn hiệu ứng Diwali
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSound(!sound)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  sound ? 'bg-amber-500' : 'bg-neutral-300 dark:bg-neutral-700'
                }`}
                role="switch"
                aria-checked={sound}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    sound ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        )}
        </SegmentedTabContent>
      </div>
        </div>
      </Modal>

      {/* PHẦN 3: THÀNH TÍCH VÀ HOẠT ĐỘNG */}
      <ProfileEnhancementBoundary>
        <ProfileAchievementsSection
          insights={insights}
          isLoading={isInsightsLoading}
          isError={isInsightsError}
          onRetry={() => refetchInsights()}
          selectedBadgeId={selectedBadgeId}
          onSelectBadge={setSelectedBadgeId}
          onNavigateSection={(section) => {
            setProfileSection(section);
            window.scrollTo({ top: 220, behavior: 'smooth' });
          }}
          stats={stats}
        />
      </ProfileEnhancementBoundary>

      {/* Shared Confirm Modal: Đăng xuất khỏi tất cả thiết bị */}
      <Modal
        open={confirmLogoutOpen}
        onClose={() => !isLoggingOutAll && setConfirmLogoutOpen(false)}
        title="Đăng xuất khỏi tất cả thiết bị?"
        subtitle="Mọi phiên đăng nhập trên các thiết bị khác sẽ bị hủy ngay lập tức."
        icon={<LogOut className="w-5 h-5 text-red-500" />}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmLogoutOpen(false)}
              disabled={isLoggingOutAll}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={confirmLogoutAllDevices}
              disabled={isLoggingOutAll}
              className="bg-red-600 hover:bg-red-700 text-white border-red-600"
              icon={isLoggingOutAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
            >
              {isLoggingOutAll ? 'Đang xử lý...' : 'Xác nhận đăng xuất'}
            </Button>
          </div>
        }
      >
        <p className="text-xs text-body dark:text-neutral-300 leading-relaxed">
          Bạn sẽ cần đăng nhập lại trên các thiết bị khác nếu muốn tiếp tục sử dụng.
        </p>
      </Modal>

      {/* Avatar Crop Modal */}
      <AvatarCropModal
        isOpen={cropModalOpen}
        imageSrc={cropImageSrc}
        onClose={() => setCropModalOpen(false)}
        onApply={handleApplyCroppedAvatar}
      />

      {/* Preset Avatar Picker Modal */}
      <AvatarPickerModal
        open={presetModalOpen}
        onClose={() => setPresetModalOpen(false)}
        currentAvatarUrl={avatarUrl}
        userName={name || user.name}
        onSavePreset={handleSavePresetAvatar}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`!mt-0 fixed top-18 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-xs font-medium animate-in fade-in slide-in-from-top-3 border ${
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
    </div>
  );
};
