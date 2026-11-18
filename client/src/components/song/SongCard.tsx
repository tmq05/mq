import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Play, Pause, Headphones, Plus } from 'lucide-react';
import { AnimatedHeartIcon } from '../common/ActionButtonFX.js';
import { UnifiedTrack } from '../../types/index.js';
import { usePlayerStore } from '../../stores/player-store.js';
import { useAuthStore } from '../../stores/auth-store.js';
import { useAuthModalStore } from '../../stores/auth-modal-store.js';
import { usePlaylistModalStore } from '../../stores/playlist-modal-store.js';
import { useLikesStore } from '../../stores/likes-store.js';
import { SourceBadge } from '../common/Badge.js';
import { formatArtists, formatPlays, getTrackPlayCount, cleanDisplayTitle } from '../../utils/format.js';

interface SongCardProps {
  track: UnifiedTrack;
  queueContext?: UnifiedTrack[];
  variant?: 'default' | 'bento' | 'compact';
  compactBadges?: boolean;
  highlightBadge?: string;
}

const SOURCE_LABELS_COMPACT: Record<string, string> = {
  spotify: 'Spotify',
  zingmp3: 'Zing MP3',
  youtube: 'YouTube',
  audius: 'Audius',
  jamendo: 'Jamendo',
  itunes: 'Apple Music',
};

export const SongCard: React.FC<SongCardProps> = ({
  track,
  queueContext,
  variant = 'default',
  compactBadges = false,
  highlightBadge,
}) => {
  const queryClient = useQueryClient();
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const { isAuthenticated } = useAuthStore();
  const { openAuthModal } = useAuthModalStore();
  const { openModal: openPlaylistModal } = usePlaylistModalStore();

  const isLiked = useLikesStore((s) => s.isTrackLiked(track));
  const isLiking = useLikesStore((s) => s.isTrackPending(track));
  const toggleLike = useLikesStore((s) => s.toggleLike);

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

  const handleAddToPlaylist = (e: React.MouseEvent) => {
    e.stopPropagation();
    openPlaylistModal(track);
  };

  const sourceLabel = track.source ? SOURCE_LABELS_COMPACT[track.source] : undefined;
  const isFullTrack = track.isFullLength !== false;
  const badgeTooltip = [sourceLabel, isFullTrack ? 'Full track' : 'Bản nghe thử (30s)']
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      onClick={handlePlayClick}
      className={`group relative h-full flex ${
        variant === 'bento' ? 'flex-col sm:flex-row sm:items-stretch gap-3.5 p-3.5' : 'flex-col p-3'
      } rounded-card border transition-all duration-200 cursor-pointer ${
        isCurrent
          ? 'border-traffic-green/70 bg-traffic-green/5 dark:bg-traffic-green/10 shadow-sm'
          : 'border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card hover:bg-surface-soft dark:hover:bg-surface-dark-soft hover:border-hairline-strong dark:hover:border-white/20'
      }`}
    >
      {/* Cover Image Container */}
      <div
        className={`relative overflow-hidden bg-surface-soft dark:bg-surface-dark-soft shrink-0 ${
          variant === 'bento'
            ? 'aspect-square w-full sm:w-44 sm:h-44 rounded-xl mb-0'
            : 'aspect-square w-full rounded-lg mb-3'
        }`}
      >
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

        {/* Compact Top-Left Source / Rank Badge */}
        {(compactBadges || highlightBadge) && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1 max-w-[calc(100%-4.5rem)]">
            {highlightBadge && (
              <span className="px-2 py-0.5 rounded-pill bg-traffic-green text-black font-sans font-bold text-[10px] tracking-wide shadow-sm whitespace-nowrap">
                {highlightBadge}
              </span>
            )}
            {compactBadges && sourceLabel && (
              <span
                title={badgeTooltip}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-black/65 backdrop-blur-md text-white border border-white/15 text-[10px] font-medium whitespace-nowrap"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isFullTrack ? 'bg-traffic-green' : 'bg-amber-400'
                  }`}
                />
                <span>{sourceLabel}</span>
                {!isFullTrack && <span className="text-amber-300">· Preview</span>}
              </span>
            )}
          </div>
        )}

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
            <AnimatedHeartIcon liked={isLiked} className="w-3.5 h-3.5" />
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
      <div className="flex flex-col flex-1 min-w-0 justify-between">
        <div>
          {variant === 'bento' && (
            <span className="hidden sm:inline-block text-[10px] font-semibold uppercase tracking-wider text-traffic-green mb-1">
              Nổi bật hôm nay
            </span>
          )}
          <h4
            className={`font-semibold truncate mb-0.5 ${
              variant === 'bento' ? 'text-base sm:text-lg leading-snug' : 'text-sm'
            } ${
              isCurrent ? 'text-black dark:text-white font-bold' : 'text-neutral-900 dark:text-white'
            }`}
            title={track.title}
          >
            {displayTitle}
          </h4>
          <p
            className={`text-neutral-600 dark:text-neutral-300 truncate ${
              variant === 'bento' ? 'text-xs sm:text-sm mb-3' : 'text-xs mb-2'
            }`}
          >
            {formatArtists(track.artists)}
          </p>
          {variant === 'bento' && track.album && track.album !== '—' && (
            <p className="hidden sm:block text-xs text-mute truncate">
              Album: {track.album}
            </p>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1 min-w-0">
          {!compactBadges ? (
            <SourceBadge isFullLength={track.isFullLength} source={track.source} />
          ) : (
            <span className="text-[11px] font-medium text-traffic-green opacity-0 group-hover:opacity-100 transition-opacity">
              {isCurrent && isPlaying ? 'Đang phát' : 'Nhấn để phát'}
            </span>
          )}
          <span
            className="inline-flex items-center gap-1 text-[10px] font-sans font-medium tabular-nums text-neutral-500 dark:text-neutral-400 whitespace-nowrap shrink-0"
            title={`${playCount.toLocaleString('vi-VN')} lượt nghe`}
          >
            <Headphones className="w-3 h-3 opacity-60 shrink-0" />
            <span>{formatPlays(playCount)}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
