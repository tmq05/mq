import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { usePlayerStore } from '../../stores/player-store.js';

export const MiniVideo: React.FC = () => {
  const { currentTrack, miniVideoOpen, setMiniVideoOpen } = usePlayerStore();
  const mountRef = useRef<HTMLDivElement>(null);

  // Position YouTube iframe container inside mini video mount when open
  useEffect(() => {
    const ytEl = document.getElementById('youtube-player-mount');
    if (!ytEl) return;

    if (miniVideoOpen && mountRef.current) {
      mountRef.current.appendChild(ytEl);
      ytEl.style.display = 'block';
      ytEl.style.width = '100%';
      ytEl.style.height = '100%';
    } else {
      // Put in hidden body container
      let hiddenContainer = document.getElementById('yt-hidden-sink');
      if (!hiddenContainer) {
        hiddenContainer = document.createElement('div');
        hiddenContainer.id = 'yt-hidden-sink';
        hiddenContainer.style.position = 'fixed';
        hiddenContainer.style.top = '-9999px';
        hiddenContainer.style.left = '-9999px';
        hiddenContainer.style.opacity = '0';
        hiddenContainer.style.pointerEvents = 'none';
        document.body.appendChild(hiddenContainer);
      }
      hiddenContainer.appendChild(ytEl);
    }
  }, [miniVideoOpen, currentTrack]);

  if (!miniVideoOpen || currentTrack?.playbackType !== 'youtube') {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-6 z-50 w-80 md:w-96 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card shadow-2xl overflow-hidden transition-all duration-200">
      {/* Header with traffic lights matching DESIGN.md terminal-traffic-lights */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface-soft dark:bg-surface-dark-soft border-b border-hairline dark:border-hairline-dark select-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-traffic-red" />
          <span className="w-2.5 h-2.5 rounded-full bg-traffic-yellow" />
          <span className="w-2.5 h-2.5 rounded-full bg-traffic-green" />
          <span className="ml-2 text-xs font-mono font-medium text-body dark:text-mute truncate max-w-[160px]">
            {currentTrack.title}
          </span>
        </div>
        <button
          onClick={() => setMiniVideoOpen(false)}
          className="p-1 rounded-pill hover:bg-neutral-200 dark:hover:bg-neutral-800 text-body dark:text-mute"
          title="Đóng cửa sổ video"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Video Viewport */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center">
        <div ref={mountRef} className="w-full h-full" />
      </div>
    </div>
  );
};
