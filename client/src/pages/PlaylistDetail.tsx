import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Trash2, ListMusic, Plus } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuthStore } from '../stores/auth-store.js';
import { usePlayerStore } from '../stores/player-store.js';
import { SongRow } from '../components/song/SongRow.js';
import { Button } from '../components/common/Button.js';
import { Playlist, UnifiedTrack } from '../types/index.js';
import { formatArtists } from '../utils/format.js';

export const PlaylistDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { playTrack } = usePlayerStore();

  const [searchSongQuery, setSearchSongQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UnifiedTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { data: playlist, isLoading } = useQuery({
    queryKey: ['playlist', id],
    queryFn: async () => {
      const res = await api.get(`/playlists/${id}`);
      return res.data as Playlist & { tracks: UnifiedTrack[] };
    },
    enabled: Boolean(id),
  });

  const isOwner = user?.id === playlist?.userId;

  // Delete Playlist
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return api.delete(`/playlists/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-playlists'] });
      navigate('/library');
    },
  });

  // Remove Song from Playlist
  const removeSongMutation = useMutation({
    mutationFn: async (songId: string) => {
      return api.delete(`/playlists/${id}/songs/${songId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', id] });
    },
  });

  // Add Song to Playlist
  const addSongMutation = useMutation({
    mutationFn: async (track: UnifiedTrack) => {
      return api.post(`/playlists/${id}/songs`, { track });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', id] });
      setSearchSongQuery('');
      setSearchResults([]);
    },
  });

  const handleSearchSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchSongQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await api.get('/search', { params: { q: searchSongQuery.trim(), type: 'track' } });
      setSearchResults(res.data.data.tracks || []);
    } catch {
      // ignore
    } finally {
      setIsSearching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-mute space-y-3">
        <span className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
        <p className="text-sm">Đang tải playlist...</p>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="py-20 text-center text-mute space-y-3">
        <p className="text-base font-semibold">Không tìm thấy playlist hoặc playlist này ở chế độ riêng tư.</p>
        <Button size="sm" onClick={() => navigate('/library')}>
          Quay lại thư viện
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      {/* Playlist Banner Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 rounded-card border border-hairline dark:border-hairline-dark bg-surface-soft dark:bg-surface-dark-soft">
        <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 shadow-md shrink-0 flex items-center justify-center">
          {playlist.coverUrl ? (
            <img src={playlist.coverUrl} alt={playlist.title} className="w-full h-full object-cover" />
          ) : (
            <ListMusic className="w-16 h-16 text-mute stroke-1" />
          )}
        </div>

        <div className="flex flex-col gap-2 min-w-0 flex-1 text-center sm:text-left">
          <span className="text-xs font-sans font-semibold uppercase tracking-wider text-body dark:text-mute">
            {playlist.isPublic ? 'Playlist công khai' : 'Playlist riêng tư'}
          </span>
          <h1 className="font-display font-black text-2xl sm:text-4xl text-ink dark:text-white truncate">
            {playlist.title}
          </h1>
          {playlist.description && (
            <p className="text-sm text-body dark:text-mute">{playlist.description}</p>
          )}
          <span className="text-xs text-mute mt-1">
            {playlist.tracks?.length || 0} bài hát · mq
          </span>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-3">
            {playlist.tracks && playlist.tracks.length > 0 && (
              <Button
                size="md"
                onClick={() => playTrack(playlist.tracks![0], playlist.tracks)}
                icon={<Play className="w-4 h-4 fill-current ml-0.5" />}
              >
                Phát playlist
              </Button>
            )}

            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm('Bạn có chắc muốn xóa playlist này?')) {
                    deleteMutation.mutate();
                  }
                }}
                className="text-red-500 hover:text-red-600"
                icon={<Trash2 className="w-4 h-4" />}
              >
                Xóa playlist
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Track List */}
      <div className="space-y-2">
        <h3 className="font-display font-bold text-lg text-ink dark:text-white border-b border-hairline dark:border-hairline-dark pb-2">
          Danh sách bài hát
        </h3>

        {playlist.tracks && playlist.tracks.length > 0 ? (
          playlist.tracks.map((track, idx) => (
            <div key={`${track.id}-${idx}`} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <SongRow track={track} index={idx} queueContext={playlist.tracks} />
              </div>
              {isOwner && (
                <button
                  onClick={() => removeSongMutation.mutate(track.id)}
                  className="p-2 text-mute hover:text-red-500"
                  title="Xóa khỏi playlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-xs text-mute">
            Chưa có bài hát nào trong playlist này.
          </div>
        )}
      </div>

      {/* Add Songs Search (Owner only) */}
      {isOwner && (
        <div className="p-6 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-4">
          <h4 className="font-semibold text-sm text-ink dark:text-white">
            Tìm và thêm bài hát vào playlist
          </h4>

          <form onSubmit={handleSearchSong} className="flex gap-2 max-w-lg">
            <input
              type="text"
              placeholder="Nhập tên bài hát hoặc ca sĩ..."
              value={searchSongQuery}
              onChange={(e) => setSearchSongQuery(e.target.value)}
              className="flex-1 h-9 px-4 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white focus:outline-none"
            />
            <Button type="submit" size="sm" disabled={isSearching || !searchSongQuery.trim()}>
              {isSearching ? 'Tìm...' : 'Tìm kiếm'}
            </Button>
          </form>

          {searchResults.length > 0 && (
            <div className="space-y-1 pt-2">
              {searchResults.slice(0, 5).map((track) => (
                <div
                  key={track.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-surface-soft dark:bg-surface-dark-soft"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={track.coverUrl} alt={track.title} className="w-8 h-8 rounded object-cover" />
                    <div className="truncate">
                      <p className="text-xs font-medium text-ink dark:text-white truncate">{track.title}</p>
                      <p className="text-[10px] text-mute truncate">{formatArtists(track.artists)}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => addSongMutation.mutate(track)}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Thêm
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
