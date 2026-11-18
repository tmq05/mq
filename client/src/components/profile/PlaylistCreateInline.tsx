import React, { useState } from 'react';
import { ListMusic, Loader2, Plus, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { Button } from '../common/Button.js';
import { PROFILE_ENHANCEMENTS_CONFIG } from '../../config/profile-enhancements.config.js';
import type { Playlist } from '../../types/index.js';

interface PlaylistCreateTriggerProps {
  userId?: string;
  onCreated?: () => void;
}

export const PlaylistCreateTrigger: React.FC<PlaylistCreateTriggerProps> = ({
  userId,
  onCreated,
}) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!PROFILE_ENHANCEMENTS_CONFIG.enabled || !PROFILE_ENHANCEMENTS_CONFIG.playlistCreateAndCollage) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Vui lòng nhập tên playlist');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await api.post('/playlists', { title: trimmed, isPublic });
      setTitle('');
      setOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile-playlists', userId] }),
        queryClient.invalidateQueries({ queryKey: ['profile-insights', userId] }),
      ]);
      onCreated?.();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tạo playlist');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setOpen((prev) => !prev)}
        icon={open ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
      >
        {open ? 'Đóng' : 'Tạo playlist'}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md p-5 rounded-2xl border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-base text-ink dark:text-white">
                Tạo playlist mới
              </h4>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-full text-mute hover:text-ink dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-body dark:text-mute mb-1.5">
                Tên playlist
              </label>
              <input
                type="text"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Nhạc chill cuối tuần..."
                className="w-full h-10 px-4 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white placeholder-mute focus:outline-none focus:border-ink/40 dark:focus:border-white/45 focus:ring-2 focus:ring-ink/10 dark:focus:ring-white/15"
              />
              {error && <p className="text-[11px] text-red-500 mt-1 pl-2">{error}</p>}
            </div>

            <label className="flex items-center gap-2 text-xs text-body dark:text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded border-hairline accent-traffic-green"
              />
              <span>Công khai playlist này</span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
                Hủy
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
                icon={isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              >
                {isSubmitting ? 'Đang tạo...' : 'Tạo ngay'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

interface PlaylistWithSongs extends Playlist {
  songs?: Array<{ song?: { coverUrl?: string | null } }>;
}

export const PlaylistCoverCollage: React.FC<{ playlist: PlaylistWithSongs }> = ({ playlist }) => {
  if (playlist.coverUrl) {
    return <img src={playlist.coverUrl} alt={playlist.title} className="w-full h-full object-cover" />;
  }

  const covers =
    PROFILE_ENHANCEMENTS_CONFIG.enabled && PROFILE_ENHANCEMENTS_CONFIG.playlistCreateAndCollage
      ? (playlist.songs || [])
          .map((item) => item.song?.coverUrl)
          .filter((url): url is string => Boolean(url))
          .slice(0, 4)
      : [];

  if (covers.length >= 2) {
    return (
      <div className="w-full h-full grid grid-cols-2 grid-rows-2">
        {[0, 1, 2, 3].map((idx) =>
          covers[idx] ? (
            <img
              key={idx}
              src={covers[idx]}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div key={idx} className="w-full h-full bg-surface-soft dark:bg-surface-dark-soft" />
          )
        )}
      </div>
    );
  }

  if (covers.length === 1) {
    return <img src={covers[0]} alt={playlist.title} className="w-full h-full object-cover" />;
  }

  return <ListMusic className="w-5 h-5 text-mute" />;
};
