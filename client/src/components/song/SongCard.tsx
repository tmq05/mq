import React from 'react';
import { Play, Pause } from 'lucide-react';
import { UnifiedTrack } from '../../types/index.js';
import { usePlayerStore } from '../../stores/player-store.js';
import { SourceBadge } from '../common/Badge.js';

interface SongCardProps {
  track: UnifiedTrack;
  queueContext?: UnifiedTrack[];
}

export const SongCard: React.FC<SongCardProps> = ({ track, queueContext }) => {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const isCurrent = currentTrack?.id === track.id;

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, queueContext);
    }
  };

  return (
    <div
      onClick={handlePlayClick}
      className="group relative flex flex-col p-3 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card hover:bg-surface-soft dark:hover:bg-surface-dark-soft transition-all duration-200 cursor-pointer"
    >
      {/* Cover Image Container */}
      <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-surface-soft dark:bg-surface-dark-soft mb-3">
        <img
          src={track.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80'}
          alt={track.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80';
          }}
        />

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
            isCurrent ? 'text-primary dark:text-white font-bold' : 'text-ink dark:text-on-dark'
          }`}
        >
          {track.title}
        </h4>
        <p className="text-xs text-body dark:text-mute truncate mb-2">
          {track.artists.join(', ')}
        </p>

        <div className="mt-auto">
          <SourceBadge isFullLength={track.isFullLength} source={track.source} />
        </div>
      </div>
    </div>
  );
};
