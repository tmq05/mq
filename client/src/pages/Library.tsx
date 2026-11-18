import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Heart, ListMusic, History, Plus, Lock, Globe, Search, X, Check } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuthStore } from '../stores/auth-store.js';
import { SongRow } from '../components/song/SongRow.js';
import { Button } from '../components/common/Button.js';
import { Playlist, UnifiedTrack } from '../types/index.js';
import { formatArtists } from '../utils/format.js';
import { SegmentedTabs, SegmentedTabContent, useTabDirection } from '../components/layout/SegmentedTabs.js';
import { Modal, ModalSection } from '../components/common/Modal.js';
import { CardSkeleton, SongRowSkeleton } from '../components/common/Loading.js';

const LIBRARY_TABS = [
  { id: 'likes', label: 'Đã thích', icon: <Heart className="w-3.5 h-3.5" /> },
  { id: 'playlists', label: 'Playlist', icon: <ListMusic className="w-3.5 h-3.5" /> },
  { id: 'history', label: 'Gần đây', icon: <History className="w-3.5 h-3.5" /> },
];

export const LibraryPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'likes' | 'playlists' | 'history'>('likes');
  const tabDirection = useTabDirection(LIBRARY_TABS, activeTab);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [shakeKey, setShakeKey] = useState(0);
  const [selectedTracks, setSelectedTracks] = useState<UnifiedTrack[]>([]);
  const [songQuery, setSongQuery] = useState('');
  const [songResults, setSongResults] = useState<UnifiedTrack[]>([]);
  const [isSearchingSongs, setIsSearchingSongs] = useState(false);

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
  const [createError, setCreateError] = useState<string | null>(null);
  const createMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      isPublic: boolean;
      tracks: UnifiedTrack[];
    }) => {
      return api.post('/playlists', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-playlists'] });
      setCreateError(null);
      setIsModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      setSelectedTracks([]);
      setSongQuery('');
      setSongResults([]);
    },
    onError: (err: any) => {
      setCreateError(
        err?.response?.data?.message || 'Không thể tạo playlist. Vui lòng thử lại.'
      );
      setShakeKey((k) => k + 1);
    },
  });

  const handleSearchSongsForModal = async () => {
    const q = songQuery.trim();
    if (!q) return;
    setIsSearchingSongs(true);
    try {
      const res = await api.get('/search', { params: { q, type: 'track' } });
      setSongResults(res.data?.data?.tracks || []);
    } catch {
      // ignore
    } finally {
      setIsSearchingSongs(false);
    }
  };

  const toggleTrackSelection = (track: UnifiedTrack) => {
    setSelectedTracks((prev) => {
      const exists = prev.some((t) => t.id === track.id);
      if (exists) return prev.filter((t) => t.id !== track.id);
      return [...prev, track];
    });
  };

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!newTitle.trim() || selectedTracks.length < 1) {
      if (selectedTracks.length < 1) {
        setCreateError('Vui lòng chọn ít nhất 1 bài hát để tạo playlist.');
      }
      setShakeKey((k) => k + 1);
      return;
    }
    createMutation.mutate({
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      isPublic,
      tracks: selectedTracks,
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
      {/* Top Header & Segmented Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline dark:border-hairline-dark pb-4">
        <SegmentedTabs
          tabs={LIBRARY_TABS}
          activeId={activeTab}
          ariaLabel="Thư viện âm nhạc"
          onChange={(id) => setActiveTab(id as any)}
        />

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

      <SegmentedTabContent activeKey={activeTab} direction={tabDirection}>
      {/* Tab: Liked Songs */}
      {activeTab === 'likes' && (
        <div>
          {likesLoading ? (
            <div role="status" aria-busy="true">
              <span className="sr-only">Đang tải bài hát yêu thích</span>
              <SongRowSkeleton count={6} />
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
            <div role="status" aria-busy="true">
              <span className="sr-only">Đang tải danh sách playlist</span>
              <CardSkeleton
                count={4}
                columnsClassName="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
              />
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
            <div role="status" aria-busy="true">
              <span className="sr-only">Đang tải lịch sử nghe nhạc</span>
              <SongRowSkeleton count={6} />
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
      </SegmentedTabContent>

      {/* Modal: Create Playlist */}
      <Modal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setCreateError(null);
        }}
        title="Tạo Playlist mới"
        icon={<ListMusic className="w-5 h-5 text-traffic-green" />}
        size="lg"
        shakeKey={shakeKey}
        bodyClassName="p-5 sm:p-6"
      >
        <form onSubmit={handleCreatePlaylist} className="space-y-4">
          {createError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500">
              {createError}
            </div>
          )}
          <ModalSection index={0}>
            <label className="block text-xs font-medium text-body dark:text-mute mb-1.5">
              Tên Playlist *
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Giai điệu mùa thu"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
              autoFocus
              className="w-full h-10 px-4 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white focus:outline-none focus:border-ink/60 dark:focus:border-white/70 focus:ring-2 focus:ring-ink/15 dark:focus:ring-white/20 transition-colors"
            />
          </ModalSection>

          <ModalSection index={1}>
            <label className="block text-xs font-medium text-body dark:text-mute mb-1.5">
              Mô tả (tùy chọn)
            </label>
            <textarea
              placeholder="Mô tả cảm xúc hoặc thể loại..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={2}
              className="w-full p-3 rounded-xl bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white focus:outline-none focus:border-ink/60 dark:focus:border-white/70 focus:ring-2 focus:ring-ink/15 dark:focus:ring-white/20 transition-colors resize-none"
            />
          </ModalSection>

          <ModalSection index={2}>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-xs font-medium text-body dark:text-mute">
                  Chọn bài hát (ít nhất 1 bài) *
                </label>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-pill font-medium ${
                    selectedTracks.length >= 1
                      ? 'bg-traffic-green/15 text-traffic-green'
                      : 'bg-amber-500/15 text-amber-500'
                  }`}
                >
                  Đã chọn {selectedTracks.length}/1 bài
                </span>
              </div>

              {/* Selected tracks chips */}
              {selectedTracks.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedTracks.map((track) => (
                    <span
                      key={track.id}
                      className="inline-flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-xs text-ink dark:text-white max-w-[210px]"
                    >
                      <span className="truncate">{track.title}</span>
                      <button
                        type="button"
                        onClick={() => toggleTrackSelection(track)}
                        aria-label={`Bỏ chọn ${track.title}`}
                        className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-mute hover:text-ink dark:hover:text-white cursor-pointer shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Search songs */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-mute absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm tên bài hát hoặc ca sĩ..."
                    value={songQuery}
                    onChange={(e) => setSongQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchSongsForModal();
                      }
                    }}
                    className="w-full h-9 pl-8 pr-3 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-xs text-ink dark:text-white focus:outline-none focus:border-ink/60 dark:focus:border-white/70 focus:ring-2 focus:ring-ink/15 dark:focus:ring-white/20 transition-colors"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleSearchSongsForModal}
                  disabled={isSearchingSongs || !songQuery.trim()}
                >
                  {isSearchingSongs ? 'Đang tìm...' : 'Tìm'}
                </Button>
              </div>

              {/* Search results or fallback liked songs */}
              {(() => {
                const list = songResults.length > 0 ? songResults : likesData || [];
                if (list.length === 0) return null;
                return (
                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {list.slice(0, 8).map((track) => {
                      const isSelected = selectedTracks.some((t) => t.id === track.id);
                      return (
                        <button
                          key={track.id}
                          type="button"
                          onClick={() => toggleTrackSelection(track)}
                          className={`w-full flex items-center justify-between gap-2.5 p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'border-traffic-green bg-traffic-green/10 dark:bg-traffic-green/15'
                              : 'border-hairline/60 dark:border-hairline-dark/60 hover:bg-surface-soft dark:hover:bg-surface-dark-soft'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {track.coverUrl ? (
                              <img
                                src={track.coverUrl}
                                alt={track.title}
                                className="w-8 h-8 rounded object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded bg-surface-soft dark:bg-surface-dark-soft shrink-0" />
                            )}
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-ink dark:text-white truncate">
                                {track.title}
                              </div>
                              <div className="text-[11px] text-mute truncate">
                                {formatArtists(track.artists)}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-traffic-green text-neutral-950'
                                : 'border border-hairline dark:border-hairline-dark text-mute'
                            }`}
                          >
                            {isSelected ? <Check className="w-3 h-3 stroke-[2.5]" /> : <Plus className="w-3 h-3" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </ModalSection>

          <ModalSection index={3}>
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
          </ModalSection>

          <ModalSection index={4}>
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
                disabled={createMutation.isPending || !newTitle.trim() || selectedTracks.length < 1}
              >
                {createMutation.isPending ? 'Đang tạo...' : 'Tạo'}
              </Button>
            </div>
          </ModalSection>
        </form>
      </Modal>
    </div>
  );
};

