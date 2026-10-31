import React from 'react';
import { MusicSource } from '../../types/index.js';

interface BadgeProps {
  isFullLength?: boolean;
  source?: MusicSource;
  className?: string;
}

export const SourceBadge: React.FC<BadgeProps> = ({ isFullLength: _isFullLength = true, source, className = '' }) => {
  const sourceLabels: Partial<Record<MusicSource, string>> = {
    spotify: 'Spotify',
    zingmp3: 'Zing MP3',
    youtube: 'YouTube',
    audius: 'Audius',
    jamendo: 'Jamendo',
    itunes: 'Apple Music',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 text-[11px] font-mono select-none ${className}`}>
      {source && sourceLabels[source] && (
        <span className="px-2 py-0.5 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-charcoal dark:text-mute">
          {sourceLabels[source]}
        </span>
      )}
      <span className="px-2 py-0.5 rounded-pill font-sans font-medium flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
        <span className="w-1.5 h-1.5 rounded-full bg-traffic-green" />
        Full
      </span>
    </div>
  );
};
