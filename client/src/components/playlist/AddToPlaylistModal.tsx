import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, ListMusic, Music } from 'lucide-react';
import { usePlaylistModalStore } from '../../stores/playlist-modal-store.js';
import { useAuthStore } from '../../stores/auth-store.js';
import { api } from '../../api/client.js';
import { Playlist } from '../../types/index.js';
import { formatArtists } from '../../utils/format.js';
import { Button } from '../common/Button.js';
import { Modal, ModalListItem, ModalSection, ModalStepContent } from '../common/Modal.js';
import { ListSkeleton } from '../common/Loading.js';
import { Link } from 'react-router-dom';

export const AddToPlaylistModal: React.FC = () => {
  const { isOpen, selectedTrack, closeModal } = usePlaylistModalStore();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const [newTitle, setNewTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [successPlaylistId, setSuccessPlaylistId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  // Fetch user playlists
  const { data: playlists, isLoading } = useQuery({
    queryKey: ['user-playlists'],
    queryFn: async () => {
      const res = await api.get('/playlists');
      return (res.data?.playlists || []) as Playlist[];
    },
    enabled: isOpen && isAuthenticated,
  });

  // Add song to playlist mutation
  const addSongMutation = useMutation({
    mutationFn: async ({ playlistId, track }: { playlistId: string; track: any }) => {
      return api.post(`/playlists/${playlistId}/songs`, { track });
    },
    onSuccess: (_, vars) => {
      setSuccessPlaylistId(vars.playlistId);
      queryClient.invalidateQueries({ queryKey: ['user-playlists'] });
      setTimeout(() => {
        setSuccessPlaylistId(null);
        closeModal();
      }, 1200);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Không thể thêm bài hát vào playlist');
      setShakeKey((k) => k + 1);
    },
  });

  // Create playlist and add song mutation
  const createAndAddMutation = useMutation({
    mutationFn: async (title: string) => {
      const createRes = await api.post('/playlists', {
        title,
        description: 'Tạo từ mq web player',
        isPublic: true,
        tracks: selectedTrack ? [selectedTrack] : [],
      });
      return createRes.data;
    },
    onSuccess: (newPlaylist) => {
      setSuccessPlaylistId(newPlaylist.id);
      queryClient.invalidateQueries({ queryKey: ['user-playlists'] });
      setIsCreating(false);
      setNewTitle('');
      setTimeout(() => {
        setSuccessPlaylistId(null);
        closeModal();
      }, 1200);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Lỗi khi tạo playlist');
      setShakeKey((k) => k + 1);
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setErrorMessage('Vui lòng nhập tên playlist');
      setShakeKey((k) => k + 1);
      return;
    }
    setErrorMessage(null);
    createAndAddMutation.mutate(newTitle.trim());
  };

  return (
    <Modal
      open={isOpen && Boolean(selectedTrack)}
      onClose={closeModal}
      title="Thêm vào danh sách phát"
      icon={<ListMusic className="w-5 h-5 text-traffic-green" />}
      size="md"
      shakeKey={shakeKey}
      bodyClassName="p-0"
    >
      {selectedTrack && (
        <>
          {/* Selected Track Preview */}
          <ModalSection index={0}>
            <div className="p-4 bg-surface-soft dark:bg-surface-dark-soft border-b border-hairline dark:border-hairline-dark flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-card shrink-0 border border-hairline dark:border-hairline-dark">
                <img
                  src={
                    selectedTrack.coverUrl ||
                    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&auto=format&fit=crop&q=80'
                  }
                  alt={selectedTrack.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate text-neutral-900 dark:text-white">
                  {selectedTrack.title}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                  {formatArtists(selectedTrack.artists)}
                </p>
              </div>
            </div>
          </ModalSection>

          {/* Content Area */}
          <div className="p-4 space-y-3">
            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                {errorMessage}
              </div>
            )}

            {!isAuthenticated ? (
              <ModalSection index={1} className="text-center py-6 space-y-3">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Vui lòng đăng nhập để lưu bài hát vào danh sách phát cá nhân của bạn.
                </p>
                <Link to="/auth" onClick={closeModal} className="inline-block">
                  <Button size="sm">Đăng nhập ngay</Button>
                </Link>
              </ModalSection>
            ) : (
              <>
                {/* Inline Create New Playlist */}
                <ModalSection index={1}>
                  <ModalStepContent stepKey={isCreating ? 'create' : 'action'}>
                    {isCreating ? (
                      <form
                        onSubmit={handleCreateSubmit}
                        className="p-3 rounded-xl bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark space-y-2.5"
                      >
                        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          Tên playlist mới
                        </label>
                        <input
                          type="text"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="VD: Nhạc chill đêm muộn..."
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                          autoFocus
                        />
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsCreating(false)}
                            className="px-2.5 py-1 text-xs text-neutral-500 hover:text-black dark:hover:text-white"
                          >
                            Hủy
                          </button>
                          <Button
                            size="sm"
                            type="submit"
                            disabled={!newTitle.trim() || createAndAddMutation.isPending}
                          >
                            {createAndAddMutation.isPending ? 'Đang tạo...' : 'Tạo & Thêm'}
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => setIsCreating(true)}
                        className="w-full flex items-center gap-2.5 p-3 rounded-xl border border-dashed border-hairline dark:border-hairline-dark hover:bg-surface-soft dark:hover:bg-surface-dark-soft text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors"
                      >
                        <Plus className="w-4 h-4 text-traffic-green" />
                        <span>Tạo playlist mới</span>
                      </button>
                    )}
                  </ModalStepContent>
                </ModalSection>

                {/* Playlists List */}
                <ModalSection index={2} className="space-y-1.5 pt-2">
                  <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider px-1">
                    Chọn playlist của bạn
                  </p>

                  {isLoading && (
                    <div role="status" aria-busy="true">
                      <span className="sr-only">Đang tải danh sách playlist</span>
                      <ListSkeleton count={4} />
                    </div>
                  )}

                  {!isLoading && playlists?.length === 0 && !isCreating && (
                    <div className="py-6 text-center text-xs text-neutral-400">
                      Bạn chưa có playlist nào. Hãy tạo playlist đầu tiên!
                    </div>
                  )}

                  {playlists?.map((pl, idx) => {
                    const isSuccess = successPlaylistId === pl.id;
                    const isPending =
                      addSongMutation.isPending &&
                      addSongMutation.variables?.playlistId === pl.id;

                    return (
                      <ModalListItem key={pl.id} index={idx}>
                        <button
                          onClick={() =>
                            addSongMutation.mutate({
                              playlistId: pl.id,
                              track: selectedTrack,
                            })
                          }
                          disabled={isPending || isSuccess}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left ${
                            isSuccess
                              ? 'border-traffic-green bg-traffic-green/10 text-traffic-green'
                              : 'border-hairline dark:border-hairline-dark hover:bg-surface-soft dark:hover:bg-surface-dark-soft text-neutral-900 dark:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-surface-soft dark:bg-surface-dark-card flex items-center justify-center shrink-0 border border-hairline dark:border-hairline-dark">
                              {isSuccess ? (
                                <Check className="w-4 h-4 text-traffic-green" />
                              ) : (
                                <Music className="w-4 h-4 text-neutral-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{pl.title}</p>
                              <p className="text-[10px] text-neutral-400 truncate">
                                {pl._count?.songs || 0} bài hát · {pl.isPublic ? 'Công khai' : 'Riêng tư'}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 pl-2">
                            {isSuccess ? (
                              <span className="text-[11px] font-semibold text-traffic-green flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Đã thêm
                              </span>
                            ) : isPending ? (
                              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Plus className="w-4 h-4 text-neutral-400 group-hover:text-black dark:group-hover:text-white" />
                            )}
                          </div>
                        </button>
                      </ModalListItem>
                    );
                  })}
                </ModalSection>
              </>
            )}
          </div>
        </>
      )}
    </Modal>
  );
};
