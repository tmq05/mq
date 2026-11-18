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
    <div className={`inline-flex items-center gap-1 text-[10px] font-sans font-medium select-none whitespace-nowrap shrink-0 ${className}`}>
      {source && sourceLabels[source] && (
        <span className="px-1.5 py-0.5 rounded-pill whitespace-nowrap shrink-0 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 text-neutral-700 dark:text-neutral-300">
          {sourceLabels[source]}
        </span>
      )}
      <span className="px-1.5 py-0.5 rounded-pill font-sans font-medium inline-flex items-center gap-1 whitespace-nowrap shrink-0 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 text-neutral-800 dark:text-neutral-200">
        <span className="w-1.5 h-1.5 rounded-full bg-traffic-green shrink-0" />
        Full
      </span>
    </div>
  );
};
