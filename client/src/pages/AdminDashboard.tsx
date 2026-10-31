import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Music,
  PlayCircle,
  ListMusic,
  Upload,
  Lock,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../api/client.js';
import { Button } from '../components/common/Button.js';
import { useAuthStore } from '../stores/auth-store.js';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'upload' | 'providers'>('stats');

  // Upload Form state
  const [songTitle, setSongTitle] = useState('');
  const [songArtist, setSongArtist] = useState('');
  const [songAlbum, setSongAlbum] = useState('');
  const [songLyrics, setSongLyrics] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // 1. Fetch Stats
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats');
      return res.data;
    },
  });

  // 2. Fetch Providers status
  const { data: providers } = useQuery({
    queryKey: ['admin-providers'],
    queryFn: async () => {
      const res = await api.get('/admin/providers');
      return res.data;
    },
  });

  // 3. Fetch Users
  const { data: usersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return res.data.users as any[];
    },
    enabled: activeTab === 'users',
  });

  // Toggle user lock
  const lockMutation = useMutation({
    mutationFn: async (userId: string) => {
      return api.patch(`/admin/users/${userId}/lock`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  // Change user role
  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return api.patch(`/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  // Handle Song Upload
  const handleSongUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songTitle.trim() || !songArtist.trim() || !audioFile) {
      alert('Vui lòng điền tiêu đề, ca sĩ và chọn tệp âm thanh MP3');
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
      alert('Tải lên bài hát mới thành công!');
      setSongTitle('');
      setSongArtist('');
      setSongAlbum('');
      setSongLyrics('');
      setAudioFile(null);
      setCoverFile(null);
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    } catch (err: any) {
      setUploadProgress(null);
      alert(err.response?.data?.message || 'Lỗi tải lên tệp');
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="py-20 text-center text-mute">
        Quyền truy cập bị từ chối. Trang này chỉ dành cho Quản trị viên (ADMIN).
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline dark:border-hairline-dark pb-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-ink dark:text-white">
            Bảng điều khiển Quản trị mq
          </h1>
          <p className="text-xs text-body dark:text-mute">
            Giám sát vận hành, người dùng, bài hát và trạng thái API bên thứ ba
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-3 py-1.5 rounded-pill text-xs font-medium transition-colors ${
              activeTab === 'stats'
                ? 'bg-ink dark:bg-white text-white dark:text-black font-semibold'
                : 'text-body dark:text-mute hover:text-ink dark:hover:text-white'
            }`}
          >
            Tổng quan
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1.5 rounded-pill text-xs font-medium transition-colors ${
              activeTab === 'upload'
                ? 'bg-ink dark:bg-white text-white dark:text-black font-semibold'
                : 'text-body dark:text-mute hover:text-ink dark:hover:text-white'
            }`}
          >
            Tải lên nhạc
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-pill text-xs font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-ink dark:bg-white text-white dark:text-black font-semibold'
                : 'text-body dark:text-mute hover:text-ink dark:hover:text-white'
            }`}
          >
            Người dùng
          </button>
          <button
            onClick={() => setActiveTab('providers')}
            className={`px-3 py-1.5 rounded-pill text-xs font-medium transition-colors ${
              activeTab === 'providers'
                ? 'bg-ink dark:bg-white text-white dark:text-black font-semibold'
                : 'text-body dark:text-mute hover:text-ink dark:hover:text-white'
            }`}
          >
            Nguồn nhạc & Quota
          </button>
        </div>
      </div>

      {/* Tab: Stats */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-1">
              <div className="flex items-center justify-between text-mute">
                <span className="text-xs font-medium">Người dùng</span>
                <Users className="w-4 h-4" />
              </div>
              <p className="font-display font-bold text-2xl text-ink dark:text-white">
                {stats?.totalUsers || 0}
              </p>
            </div>

            <div className="p-4 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-1">
              <div className="flex items-center justify-between text-mute">
                <span className="text-xs font-medium">Bài hát Local</span>
                <Music className="w-4 h-4" />
              </div>
              <p className="font-display font-bold text-2xl text-ink dark:text-white">
                {stats?.totalSongs || 0}
              </p>
            </div>

            <div className="p-4 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-1">
              <div className="flex items-center justify-between text-mute">
                <span className="text-xs font-medium">Lượt nghe nhạc</span>
                <PlayCircle className="w-4 h-4" />
              </div>
              <p className="font-display font-bold text-2xl text-ink dark:text-white">
                {stats?.totalPlays || 0}
              </p>
            </div>

            <div className="p-4 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-1">
              <div className="flex items-center justify-between text-mute">
                <span className="text-xs font-medium">Playlist tạo</span>
                <ListMusic className="w-4 h-4" />
              </div>
              <p className="font-display font-bold text-2xl text-ink dark:text-white">
                {stats?.totalPlaylists || 0}
              </p>
            </div>
          </div>

          {/* 7-day plays Bar Chart */}
          <div className="p-6 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-ink dark:text-white">
                Lượt phát nhạc 7 ngày qua
              </h3>
              <span className="text-xs font-mono text-mute">mq analytics</span>
            </div>

            <div className="h-48 flex items-end justify-between gap-2 pt-6 px-2">
              {stats?.chartData?.map((item: any) => {
                const maxPlays = Math.max(...stats.chartData.map((d: any) => d.plays), 10);
                const heightPercent = Math.max(12, (item.plays / maxPlays) * 100);
                return (
                  <div key={item.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <span className="text-[10px] font-mono text-mute opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.plays}
                    </span>
                    <div
                      className="w-full max-w-[40px] bg-ink dark:bg-white rounded-t-md transition-all duration-300"
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className="text-[10px] font-mono text-mute truncate w-full text-center">
                      {item.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
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
                className="w-full p-3 rounded-xl bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-xs font-mono text-ink dark:text-white focus:outline-none resize-none"
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

      {/* Tab: Users Management */}
      {activeTab === 'users' && (
        <div className="rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card overflow-hidden">
          <div className="p-4 border-b border-hairline dark:border-hairline-dark">
            <h3 className="font-semibold text-sm text-ink dark:text-white">
              Danh sách tài khoản ({usersData?.length || 0})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-soft dark:bg-surface-dark-soft text-mute uppercase font-mono border-b border-hairline dark:border-hairline-dark">
                <tr>
                  <th className="p-3">Họ và tên</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Vai trò</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline dark:divide-hairline-dark">
                {usersData?.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-soft/50 dark:hover:bg-surface-dark-soft/50">
                    <td className="p-3 font-medium text-ink dark:text-white">{u.name}</td>
                    <td className="p-3 font-mono text-body dark:text-mute">{u.email}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-pill font-mono text-[10px] ${
                          u.role === 'ADMIN'
                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold'
                            : 'bg-surface-soft dark:bg-surface-dark-soft text-mute'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">
                      {u.isLocked ? (
                        <span className="text-red-500 font-medium flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Đã khóa
                        </span>
                      ) : (
                        <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Bình thường
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      {u.id !== user?.id && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              roleMutation.mutate({
                                userId: u.id,
                                role: u.role === 'ADMIN' ? 'USER' : 'ADMIN',
                              })
                            }
                          >
                            Đổi vai trò
                          </Button>
                          <Button
                            size="sm"
                            variant={u.isLocked ? 'secondary' : 'danger'}
                            onClick={() => lockMutation.mutate(u.id)}
                          >
                            {u.isLocked ? 'Mở khóa' : 'Khóa'}
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Providers & Quota */}
      {activeTab === 'providers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providers &&
            Object.entries(providers).map(([key, info]: [string, any]) => (
              <div
                key={key}
                className="p-5 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-mute" />
                    <h4 className="font-semibold text-sm uppercase font-mono text-ink dark:text-white">
                      {key} Provider
                    </h4>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-pill ${
                      info.status === 'operational'
                        ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300'
                        : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {info.status}
                  </span>
                </div>

                <div className="text-xs text-mute space-y-1 font-mono">
                  <p>• Trạng thái kích hoạt: {info.enabled ? 'Đang bật' : 'Đã tắt'}</p>
                  <p>• Yêu cầu API Key: {info.keyRequired ? 'Có' : 'Không (Public)'}</p>
                  {info.keyRequired && (
                    <p>
                      • Khóa API cài đặt: {info.hasKey ? 'Đã cấu hình' : 'Chưa nhập trong .env'}
                    </p>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};
