import React, { useState } from 'react';
import { Play, Heart, Plus } from 'lucide-react';
import { UnifiedTrack } from '../../types/index.js';
import { usePlayerStore } from '../../stores/player-store.js';
import { useAuthStore } from '../../stores/auth-store.js';
import { formatMs } from '../../utils/format.js';
import { SourceBadge } from '../common/Badge.js';
import { api } from '../../api/client.js';

interface SongRowProps {
  track: UnifiedTrack;
  index?: number;
  queueContext?: UnifiedTrack[];
  isInitiallyLiked?: boolean;
  onAddToPlaylist?: (track: UnifiedTrack) => void;
}

export const SongRow: React.FC<SongRowProps> = ({
  track,
  index,
  queueContext,
  isInitiallyLiked = false,
  onAddToPlaylist,
}) => {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const { isAuthenticated } = useAuthStore();
  const [isLiked, setIsLiked] = useState(isInitiallyLiked);
  const [isLiking, setIsLiking] = useState(false);

  const isCurrent = currentTrack?.id === track.id;

  const handleRowClick = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, queueContext);
    }
  };

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để lưu bài hát yêu thích');
      return;
    }
    if (isLiking) return;
    setIsLiking(true);
    try {
      const res = await api.post('/songs/like', { track });
      setIsLiked(res.data.isLiked);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div
      onClick={handleRowClick}
      className={`group flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer select-none ${
        isCurrent
          ? 'bg-surface-soft dark:bg-surface-dark-soft'
          : 'hover:bg-surface-soft/80 dark:hover:bg-surface-dark-soft/60'
      }`}
    >
      {/* Left: Index/Play + Cover + Title/Artist */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Index or Play icon */}
        <div className="w-5 flex items-center justify-center shrink-0 text-xs text-mute font-mono">
          {isCurrent && isPlaying ? (
            <div className="flex items-end gap-0.5 h-3.5">
              <span className="w-0.5 h-full bg-primary dark:bg-white animate-pulse" />
              <span className="w-0.5 h-2 bg-primary dark:bg-white animate-pulse delay-75" />
              <span className="w-0.5 h-3 bg-primary dark:bg-white animate-pulse delay-150" />
            </div>
          ) : (
            <>
              <span className="group-hover:hidden">{index !== undefined ? index + 1 : ''}</span>
              <Play className="w-3.5 h-3.5 hidden group-hover:block fill-current text-ink dark:text-white" />
            </>
          )}
        </div>

        {/* Thumbnail */}
        <div className="w-10 h-10 rounded-md overflow-hidden bg-surface-soft shrink-0 border border-hairline dark:border-hairline-dark">
          <img
            src={track.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&auto=format&fit=crop&q=80'}
            alt={track.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>

        {/* Text */}
        <div className="flex flex-col min-w-0 pr-2">
          <span
            className={`text-sm font-medium truncate ${
              isCurrent ? 'text-primary dark:text-white font-semibold' : 'text-ink dark:text-on-dark'
            }`}
          >
            {track.title}
          </span>
          <span className="text-xs text-body dark:text-mute truncate">
            {track.artists.join(', ')}
          </span>
        </div>
      </div>

      {/* Middle: Album Name (Desktop) */}
      <div className="hidden md:block w-1/4 text-xs text-body dark:text-mute truncate px-2">
        {track.album || '—'}
      </div>

      {/* Source Badge */}
      <div className="hidden sm:block shrink-0 px-2">
        <SourceBadge isFullLength={track.isFullLength} source={track.source} />
      </div>

      {/* Right: Like + Duration + More */}
      <div className="flex items-center gap-3 shrink-0 pl-2">
        <button
          onClick={handleToggleLike}
          disabled={isLiking}
          className={`p-1.5 rounded-pill transition-transform active:scale-90 ${
            isLiked
              ? 'text-red-500 fill-red-500'
              : 'text-mute opacity-0 group-hover:opacity-100 hover:text-ink dark:hover:text-white'
          }`}
          aria-label="Thích"
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
        </button>

        <span className="text-xs font-mono text-mute w-10 text-right">
          {track.durationMs > 0 ? formatMs(track.durationMs) : '—'}
        </span>

        {onAddToPlaylist && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToPlaylist(track);
            }}
            className="p-1 rounded-pill text-mute opacity-0 group-hover:opacity-100 hover:text-ink dark:hover:text-white"
            title="Thêm vào playlist"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
