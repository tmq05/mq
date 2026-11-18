import React, { useState } from 'react';
import { HeartOff, UserMinus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { useLikesStore } from '../../stores/likes-store.js';
import { PROFILE_ENHANCEMENTS_CONFIG } from '../../config/profile-enhancements.config.js';
import type { UnifiedTrack } from '../../types/index.js';

export const UnfollowArtistButton: React.FC<{
  artistId: string;
  userId?: string;
  onUnfollowed?: () => void;
}> = ({ artistId, userId, onUnfollowed }) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  if (!PROFILE_ENHANCEMENTS_CONFIG.enabled || !PROFILE_ENHANCEMENTS_CONFIG.unlikeAndUnfollowButtons) {
    return null;
  }

  const handleUnfollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      await api.post(`/artists/${encodeURIComponent(artistId)}/follow`);
      await queryClient.invalidateQueries({ queryKey: ['profile-following', userId] });
      onUnfollowed?.();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleUnfollow}
      disabled={loading}
      title="Bỏ theo dõi nghệ sĩ"
      className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-pill text-[11px] font-medium border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card text-mute hover:text-red-500 hover:border-red-400/60 transition-colors cursor-pointer disabled:opacity-50 focus:outline-none"
    >
      <UserMinus className="w-3 h-3" />
      <span>{loading ? 'Đang xử lý...' : 'Bỏ theo dõi'}</span>
    </button>
  );
};

export const UnlikeTrackButton: React.FC<{
  track: UnifiedTrack;
  userId?: string;
  onUnliked?: () => void;
}> = ({ track, userId, onUnliked }) => {
  const queryClient = useQueryClient();
  const toggleLike = useLikesStore((s) => s.toggleLike);
  const [loading, setLoading] = useState(false);

  if (!PROFILE_ENHANCEMENTS_CONFIG.enabled || !PROFILE_ENHANCEMENTS_CONFIG.unlikeAndUnfollowButtons) {
    return null;
  }

  const handleUnlike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      await toggleLike(track);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile-likes', userId] }),
        queryClient.invalidateQueries({ queryKey: ['user-likes'] }),
        queryClient.invalidateQueries({ queryKey: ['user-stats'] }),
      ]);
      onUnliked?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleUnlike}
      disabled={loading}
      title="Bỏ thích bài hát"
      className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-pill text-[11px] font-medium border border-hairline dark:border-hairline-dark text-mute hover:text-rose-500 hover:border-rose-400/60 transition-colors cursor-pointer disabled:opacity-50 focus:outline-none"
    >
      <HeartOff className="w-3 h-3" />
      <span className="hidden sm:inline">{loading ? '...' : 'Bỏ thích'}</span>
    </button>
  );
};
