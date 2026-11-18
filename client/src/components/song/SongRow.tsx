import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Play, Plus, Headphones } from 'lucide-react';
import { AnimatedHeartIcon } from '../common/ActionButtonFX.js';
import { UnifiedTrack } from '../../types/index.js';
import { usePlayerStore } from '../../stores/player-store.js';
import { useAuthStore } from '../../stores/auth-store.js';
import { useAuthModalStore } from '../../stores/auth-modal-store.js';
import { usePlaylistModalStore } from '../../stores/playlist-modal-store.js';
import { useLikesStore } from '../../stores/likes-store.js';
import {
  formatMs,
  formatArtists,
  formatPlays,
  getTrackPlayCount,
  cleanDisplayTitle,
} from '../../utils/format.js';
import { SourceBadge } from '../common/Badge.js';

interface SongRowProps {
  track: UnifiedTrack;
  index?: number;
  queueContext?: UnifiedTrack[];
  isInitiallyLiked?: boolean;
  onAddToPlaylist?: (track: UnifiedTrack) => void;
  hideAlbum?: boolean;
  variant?: 'default' | 'chart';
}

const CHART_SOURCE_LABELS: Record<string, string> = {
  spotify: 'Spotify',
  zingmp3: 'Zing MP3',
  youtube: 'YouTube',
  audius: 'Audius',
  jamendo: 'Jamendo',
  itunes: 'Apple Music',
};

export const SongRow: React.FC<SongRowProps> = ({
  track,
  index,
  queueContext,
  isInitiallyLiked = false,
  onAddToPlaylist,
  hideAlbum = false,
  variant = 'default',
}) => {
  const queryClient = useQueryClient();
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const { isAuthenticated } = useAuthStore();
  const { openAuthModal } = useAuthModalStore();
  const { openModal: openPlaylistModal } = usePlaylistModalStore();
  const isLiked = useLikesStore((s) => s.isTrackLiked(track, isInitiallyLiked));
  const isLiking = useLikesStore((s) => s.isTrackPending(track));
  const toggleLike = useLikesStore((s) => s.toggleLike);

  const isCurrent = currentTrack?.id === track.id;
  const playCount = getTrackPlayCount(track);
  const displayTitle = cleanDisplayTitle(track.title);

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
      openAuthModal({
        title: 'Lưu bài hát yêu thích',
        message: `Đăng nhập để lưu "${displayTitle}" vào danh sách bài hát yêu thích của bạn.`,
        iconType: 'heart',
      });
      return;
    }
    if (isLiking) return;
    await toggleLike(track);
    queryClient.invalidateQueries({ queryKey: ['user-likes'] });
    queryClient.invalidateQueries({ queryKey: ['user-stats'] });
  };

  const handleAddToPlaylistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToPlaylist) {
      onAddToPlaylist(track);
    } else {
      openPlaylistModal(track);
    }
  };

  const isChart = variant === 'chart';
  const rankNumber = index !== undefined ? index + 1 : 0;
  const isTop3 = isChart && rankNumber >= 1 && rankNumber <= 3;
  const rankColorClass =
    rankNumber === 1
      ? 'text-emerald-600 dark:text-traffic-green'
      : rankNumber === 2
        ? 'text-amber-500 dark:text-amber-400'
        : rankNumber === 3
          ? 'text-sky-600 dark:text-sky-400'
          : 'text-neutral-400 dark:text-neutral-500';
  const compactSourceLabel = track.source ? CHART_SOURCE_LABELS[track.source] : undefined;
  const isFullTrack = track.isFullLength !== false;

  return (
    <div
      onClick={handleRowClick}
      className={`group flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors cursor-pointer select-none ${
        isCurrent
          ? 'bg-neutral-100 dark:bg-neutral-800/80 shadow-xs'
          : 'hover:bg-neutral-100/90 dark:hover:bg-neutral-800/50'
      }`}
    >
      {/* Left: Index/Play + Cover + Title/Artist */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Index or Play icon */}
        <div
          className={`${isChart ? 'w-7' : 'w-5'} flex items-center justify-center shrink-0 font-sans tabular-nums ${
            isChart
              ? `${isTop3 ? 'text-lg font-black' : 'text-sm font-bold'} ${rankColorClass}`
              : 'text-xs text-neutral-400 dark:text-neutral-500 font-medium'
          }`}
        >
          {isCurrent && isPlaying ? (
            <div className="flex items-end gap-0.5 h-3.5">
              <span className="w-0.5 h-full bg-primary dark:bg-white animate-pulse" />
              <span className="w-0.5 h-2 bg-primary dark:bg-white animate-pulse delay-75" />
              <span className="w-0.5 h-3 bg-primary dark:bg-white animate-pulse delay-150" />
            </div>
          ) : (
            <>
              <span className="group-hover:hidden">
                {index !== undefined ? (isChart ? String(rankNumber).padStart(2, '0') : rankNumber) : ''}
              </span>
              <Play className="w-4 h-4 hidden group-hover:block fill-current text-ink dark:text-white" />
            </>
          )}
        </div>

        {/* Thumbnail */}
        <div className="w-10 h-10 rounded-md overflow-hidden bg-surface-soft shrink-0 border border-hairline dark:border-hairline-dark">
          <img
            src={
              track.coverUrl ||
              'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&auto=format&fit=crop&q=80'
            }
            alt={displayTitle}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>

        {/* Text */}
        <div className="flex flex-col min-w-0 pr-2">
          <span
            className={`text-sm font-semibold truncate ${
              isCurrent ? 'text-black dark:text-white font-bold' : 'text-neutral-900 dark:text-white'
            }`}
            title={track.title}
          >
            {displayTitle}
          </span>
          <span className="text-xs text-neutral-600 dark:text-neutral-300 truncate flex items-center gap-1.5 font-sans">
            <span>{formatArtists(track.artists)}</span>
            <span className="md:hidden text-neutral-400 dark:text-neutral-500 font-sans text-[11px]">
              · {formatPlays(playCount)} lượt nghe
            </span>
          </span>
        </div>
      </div>

      {/* Middle 1: Album Name (Desktop - only shown when not hideAlbum and album has value) */}
      {!hideAlbum && track.album && track.album !== '—' && (
        <div className="hidden md:block w-1/4 text-xs text-neutral-500 dark:text-neutral-400 truncate px-2 font-sans">
          {track.album}
        </div>
      )}

      {/* Middle 2: Play count (Desktop) */}
      <div
        className="hidden lg:flex items-center gap-1.5 w-20 text-xs text-neutral-500 dark:text-neutral-400 font-sans font-medium tabular-nums px-2 shrink-0"
        title={`${playCount.toLocaleString('vi-VN')} lượt nghe`}
      >
        <Headphones className="w-3.5 h-3.5 opacity-60 shrink-0" />
        <span>{formatPlays(playCount)}</span>
      </div>

      {/* Source Badge */}
      {isChart ? (
        <div className="hidden sm:flex items-center justify-end w-[112px] shrink-0 px-2">
          {compactSourceLabel && (
            <span
              title={`${compactSourceLabel} · ${isFullTrack ? 'Full track' : 'Bản nghe thử (30s)'}`}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-pill text-[10px] font-medium bg-surface-soft dark:bg-neutral-800 border border-hairline dark:border-neutral-700/80 text-neutral-600 dark:text-neutral-300 whitespace-nowrap"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isFullTrack ? 'bg-traffic-green' : 'bg-amber-400'
                }`}
              />
              <span>{compactSourceLabel}</span>
              {!isFullTrack && <span className="text-amber-500">· Preview</span>}
            </span>
          )}
        </div>
      ) : (
        <div className="hidden sm:flex items-center justify-end w-[136px] shrink-0 px-2">
          <SourceBadge isFullLength={track.isFullLength} source={track.source} />
        </div>
      )}

      {/* Right: Like + Duration + Add to Playlist */}
      <div className="flex items-center gap-2.5 shrink-0 pl-2">
        <button
          onClick={handleToggleLike}
          disabled={isLiking}
          className={`p-1.5 rounded-pill transition-transform active:scale-90 ${
            isLiked
              ? 'text-red-500 fill-red-500'
              : 'text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-ink dark:hover:text-white'
          }`}
          title={isLiked ? 'Bỏ thích' : 'Yêu thích bài hát'}
          aria-label="Thích"
        >
          <AnimatedHeartIcon liked={isLiked} className="w-4 h-4" />
        </button>

        <span className="text-xs font-sans font-medium tabular-nums text-neutral-500 dark:text-neutral-400 w-10 text-right">
          {track.durationMs > 0 ? formatMs(track.durationMs) : '—'}
        </span>

        <button
          onClick={handleAddToPlaylistClick}
          className="p-1 rounded-pill text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-black dark:hover:text-white transition-opacity active:scale-90"
          title="Thêm vào playlist"
          aria-label="Thêm vào playlist"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
