import React, { useState } from 'react';
import { Play, Pause, Headphones, Heart, Plus } from 'lucide-react';
import { UnifiedTrack } from '../../types/index.js';
import { usePlayerStore } from '../../stores/player-store.js';
import { useAuthStore } from '../../stores/auth-store.js';
import { usePlaylistModalStore } from '../../stores/playlist-modal-store.js';
import { SourceBadge } from '../common/Badge.js';
import { formatArtists, formatPlays, getTrackPlayCount, cleanDisplayTitle } from '../../utils/format.js';
import { api } from '../../api/client.js';

interface SongCardProps {
  track: UnifiedTrack;
  queueContext?: UnifiedTrack[];
}

export const SongCard: React.FC<SongCardProps> = ({ track, queueContext }) => {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const { isAuthenticated } = useAuthStore();
  const { openModal: openPlaylistModal } = usePlaylistModalStore();

  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  const isCurrent = currentTrack?.id === track.id;
  const playCount = getTrackPlayCount(track);
  const displayTitle = cleanDisplayTitle(track.title);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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
      setIsLiked(res.data?.isLiked ?? !isLiked);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLiking(false);
    }
  };

  const handleAddToPlaylist = (e: React.MouseEvent) => {
    e.stopPropagation();
    openPlaylistModal(track);
  };

  return (
    <div
      onClick={handlePlayClick}
      className="group relative flex flex-col p-3 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card hover:bg-surface-soft dark:hover:bg-surface-dark-soft transition-all duration-200 cursor-pointer"
    >
      {/* Cover Image Container */}
      <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-surface-soft dark:bg-surface-dark-soft mb-3">
        <img
          src={
            track.coverUrl ||
            'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80'
          }
          alt={displayTitle}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80';
          }}
        />

        {/* Top-Right Quick Action Icons (Like & Add to Playlist) */}
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={handleToggleLike}
            disabled={isLiking}
            className={`w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center transition-transform active:scale-90 ${
              isLiked ? 'text-red-500 fill-red-500' : 'text-white hover:text-red-400'
            }`}
            title={isLiked ? 'Bỏ thích' : 'Yêu thích bài hát'}
            aria-label="Thích"
          >
            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={handleAddToPlaylist}
            className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:text-traffic-green transition-transform active:scale-90"
            title="Thêm vào playlist"
            aria-label="Thêm vào playlist"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Play Overlay Button */}
        <button
          onClick={handlePlayClick}
          aria-label={isCurrent && isPlaying ? 'Tạm dừng' : 'Phát'}
          className={`absolute bottom-2.5 right-2.5 w-10 h-10 rounded-pill bg-primary dark:bg-white text-on-primary dark:text-black flex items-center justify-center shadow-md transition-all duration-200 ${
            isCurrent
              ? 'opacity-100 scale-100'
              : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
          }`}
        >
          {isCurrent && isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>
      </div>

      {/* Info */}
      <div className="flex flex-col min-w-0">
        <h4
          className={`font-semibold text-sm truncate mb-0.5 ${
            isCurrent ? 'text-black dark:text-white font-bold' : 'text-neutral-900 dark:text-white'
          }`}
          title={track.title}
        >
          {displayTitle}
        </h4>
        <p className="text-xs text-neutral-600 dark:text-neutral-300 truncate mb-2">
          {formatArtists(track.artists)}
        </p>

        <div className="mt-auto flex items-center justify-between gap-1 pt-1">
          <SourceBadge isFullLength={track.isFullLength} source={track.source} />
          <span
            className="inline-flex items-center gap-1 text-[11px] font-sans font-medium tabular-nums text-neutral-500 dark:text-neutral-400"
            title={`${playCount.toLocaleString('vi-VN')} lượt nghe`}
          >
            <Headphones className="w-3 h-3 opacity-60" />
            <span>{formatPlays(playCount)}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
