import React from 'react';
import { X, Tv } from 'lucide-react';
import { usePlayerStore } from '../../stores/player-store.js';

export const MiniVideo: React.FC = () => {
  const { currentTrack, miniVideoOpen, setMiniVideoOpen } = usePlayerStore();

  const isYouTubeActive = currentTrack?.playbackType === 'youtube';
  const isVisible = miniVideoOpen && isYouTubeActive;

  return (
    <div
      className={`fixed z-50 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card shadow-2xl overflow-hidden transition-all duration-300 ${
        isVisible
          ? 'bottom-24 right-6 w-80 md:w-96 opacity-100 pointer-events-auto scale-100'
          : 'pointer-events-none opacity-0 -bottom-96 right-6 w-80 h-48 scale-95'
      }`}
    >
      {/* Header with traffic lights matching DESIGN.md terminal-traffic-lights */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface-soft dark:bg-surface-dark-soft border-b border-hairline dark:border-hairline-dark select-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-traffic-red" />
          <span className="w-2.5 h-2.5 rounded-full bg-traffic-yellow" />
          <span className="w-2.5 h-2.5 rounded-full bg-traffic-green" />
          <span className="ml-2 text-xs font-mono font-medium text-body dark:text-mute truncate max-w-[160px] flex items-center gap-1">
            <Tv className="w-3 h-3 text-red-500" />
            {currentTrack?.title || 'YouTube Player'}
          </span>
        </div>
        <button
          onClick={() => setMiniVideoOpen(false)}
          className="p-1 rounded-pill hover:bg-neutral-200 dark:hover:bg-neutral-800 text-body dark:text-mute transition-colors"
          title="Thu nhỏ video (vẫn phát âm thanh)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Video Viewport Container */}
      <div
        id="youtube-player-container"
        className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden"
      >
        <div id="youtube-player-mount" className="w-full h-full" />
      </div>
    </div>
  );
};
