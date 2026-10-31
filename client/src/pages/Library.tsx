import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Heart, ListMusic, History, Plus, Lock, Globe } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuthStore } from '../stores/auth-store.js';
import { SongRow } from '../components/song/SongRow.js';
import { Button } from '../components/common/Button.js';
import { Playlist, UnifiedTrack } from '../types/index.js';

export const LibraryPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'likes' | 'playlists' | 'history'>('likes');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  // 1. Fetch Likes
  const { data: likesData, isLoading: likesLoading } = useQuery({
    queryKey: ['user-likes'],
    queryFn: async () => {
      const res = await api.get('/users/likes');
      return res.data.likes as UnifiedTrack[];
    },
    enabled: isAuthenticated && activeTab === 'likes',
  });

  // 2. Fetch Playlists
  const { data: playlistsData, isLoading: playlistsLoading } = useQuery({
    queryKey: ['user-playlists'],
    queryFn: async () => {
      const res = await api.get('/playlists');
      return res.data.playlists as Playlist[];
    },
    enabled: isAuthenticated && activeTab === 'playlists',
  });

  // 3. Fetch History
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['user-history'],
    queryFn: async () => {
      const res = await api.get('/users/history');
      return res.data.history as UnifiedTrack[];
    },
    enabled: isAuthenticated && activeTab === 'history',
  });

  // Create Playlist mutation
  const createMutation = useMutation({
    mutationFn: async (data: { title: string; description?: string; isPublic: boolean }) => {
      return api.post('/playlists', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-playlists'] });
      setIsModalOpen(false);
      setNewTitle('');
      setNewDesc('');
    },
  });

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createMutation.mutate({
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      isPublic,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="py-24 text-center max-w-md mx-auto space-y-4">
        <div className="w-12 h-12 rounded-full bg-surface-soft dark:bg-surface-dark-soft flex items-center justify-center mx-auto text-mute">
          <ListMusic className="w-6 h-6 stroke-1" />
        </div>
        <h2 className="font-display font-bold text-2xl text-ink dark:text-white">
          Thư viện của bạn
        </h2>
        <p className="text-sm text-body dark:text-mute">
          Đăng nhập để xem danh sách bài hát yêu thích, tạo playlist riêng và xem lịch sử nghe nhạc.
        </p>
        <Link to="/auth">
          <Button size="lg" className="mt-2">
            Đăng nhập ngay
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline dark:border-hairline-dark pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('likes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-pill text-sm font-medium transition-colors ${
              activeTab === 'likes'
                ? 'bg-ink dark:bg-white text-white dark:text-black'
                : 'text-body dark:text-mute hover:text-ink dark:hover:text-white'
            }`}
          >
            <Heart className="w-4 h-4" />
            Đã thích
          </button>

          <button
            onClick={() => setActiveTab('playlists')}
            className={`flex items-center gap-2 px-4 py-2 rounded-pill text-sm font-medium transition-colors ${
              activeTab === 'playlists'
                ? 'bg-ink dark:bg-white text-white dark:text-black'
                : 'text-body dark:text-mute hover:text-ink dark:hover:text-white'
            }`}
          >
            <ListMusic className="w-4 h-4" />
            Playlist
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-pill text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-ink dark:bg-white text-white dark:text-black'
                : 'text-body dark:text-mute hover:text-ink dark:hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            Gần đây
          </button>
        </div>

        {activeTab === 'playlists' && (
          <Button
            size="sm"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Tạo playlist
          </Button>
        )}
      </div>

      {/* Tab: Liked Songs */}
      {activeTab === 'likes' && (
        <div>
          {likesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 rounded-lg bg-surface-soft dark:bg-surface-dark-soft animate-pulse"
                />
              ))}
            </div>
          ) : likesData && likesData.length > 0 ? (
            <div className="space-y-1">
              {likesData.map((track, idx) => (
                <SongRow
                  key={track.id}
                  track={track}
                  index={idx}
                  queueContext={likesData}
                  isInitiallyLiked={true}
                />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-mute space-y-2">
              <Heart className="w-8 h-8 stroke-1 mx-auto" />
              <p className="text-sm">Bạn chưa thích bài hát nào</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Playlists */}
      {activeTab === 'playlists' && (
        <div>
          {playlistsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-card bg-surface-soft dark:bg-surface-dark-soft animate-pulse"
                />
              ))}
            </div>
          ) : playlistsData && playlistsData.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {playlistsData.map((p) => (
                <Link
                  key={p.id}
                  to={`/playlists/${p.id}`}
                  className="group p-3 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card hover:bg-surface-soft dark:hover:bg-surface-dark-soft transition-all"
                >
                  <div className="aspect-square w-full rounded-lg overflow-hidden bg-surface-soft dark:bg-surface-dark-soft mb-3 flex items-center justify-center">
                    {p.coverUrl ? (
                      <img
                        src={p.coverUrl}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <ListMusic className="w-12 h-12 text-mute stroke-1" />
                    )}
                  </div>
                  <h4 className="font-semibold text-sm truncate text-ink dark:text-white">
                    {p.title}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-mute mt-1">
                    {p.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    <span>{p._count?.songs || 0} bài hát</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-mute space-y-3">
              <ListMusic className="w-8 h-8 stroke-1 mx-auto" />
              <p className="text-sm">Bạn chưa tạo playlist nào</p>
              <Button size="sm" onClick={() => setIsModalOpen(true)}>
                Tạo playlist đầu tiên
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Tab: History */}
      {activeTab === 'history' && (
        <div>
          {historyLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 rounded-lg bg-surface-soft dark:bg-surface-dark-soft animate-pulse"
                />
              ))}
            </div>
          ) : historyData && historyData.length > 0 ? (
            <div className="space-y-1">
              {historyData.map((track, idx) => (
                <SongRow
                  key={`${track.id}-${idx}`}
                  track={track}
                  index={idx}
                  queueContext={historyData}
                />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-mute space-y-2">
              <History className="w-8 h-8 stroke-1 mx-auto" />
              <p className="text-sm">Chưa có lịch sử phát gần đây</p>
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Playlist */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-display font-bold text-lg text-ink dark:text-white">
              Tạo Playlist mới
            </h3>

            <form onSubmit={handleCreatePlaylist} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-body dark:text-mute mb-1">
                  Tên Playlist *
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Giai điệu mùa thu"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  autoFocus
                  className="w-full h-10 px-4 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white focus:outline-none focus:ring-1 focus:ring-ink dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-body dark:text-mute mb-1">
                  Mô tả (tùy chọn)
                </label>
                <textarea
                  placeholder="Mô tả cảm xúc hoặc thể loại..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  className="w-full p-3 rounded-xl bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white focus:outline-none focus:ring-1 focus:ring-ink dark:focus:ring-white resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="public-check"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="rounded border-hairline text-ink focus:ring-0"
                />
                <label htmlFor="public-check" className="text-xs text-ink dark:text-white">
                  Công khai playlist để mọi người cùng thưởng thức
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-hairline dark:border-hairline-dark">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createMutation.isPending || !newTitle.trim()}
                >
                  {createMutation.isPending ? 'Đang tạo...' : 'Tạo'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
