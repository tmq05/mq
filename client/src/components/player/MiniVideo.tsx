import React from 'react';
import { X, Tv, Music2 } from 'lucide-react';
import { usePlayerStore } from '../../stores/player-store.js';

export const MiniVideo: React.FC = () => {
  const { currentTrack, miniVideoOpen, setMiniVideoOpen } = usePlayerStore();

  const isEmbedActive =
    Boolean(currentTrack?.embedId) ||
    currentTrack?.playbackType === 'youtube' ||
    currentTrack?.source === 'youtube' ||
    currentTrack?.source === 'zingmp3' ||
    currentTrack?.source === 'spotify';

  const isVisible = miniVideoOpen && isEmbedActive;

  const getSourceIconColor = () => {
    if (currentTrack?.playbackType === 'youtube' || currentTrack?.source === 'youtube') return 'text-red-500';
    if (currentTrack?.playbackType === 'zingmp3' || currentTrack?.source === 'zingmp3') return 'text-purple-500';
    if (currentTrack?.playbackType === 'spotify' || currentTrack?.source === 'spotify') return 'text-green-500';
    return 'text-blue-500';
  };

  const getSourceLabel = () => {
    if (currentTrack?.playbackType === 'youtube' || currentTrack?.source === 'youtube') return 'YouTube Player';
    if (currentTrack?.playbackType === 'zingmp3' || currentTrack?.source === 'zingmp3') return 'Zing MP3 Player';
    if (currentTrack?.playbackType === 'spotify' || currentTrack?.source === 'spotify') return 'Spotify Player';
    return 'Media Player';
  };

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
          <span className="ml-2 text-xs font-sans font-medium text-body dark:text-mute truncate max-w-[170px] flex items-center gap-1">
            <Tv className={`w-3 h-3 ${getSourceIconColor()}`} />
            {currentTrack?.title || getSourceLabel()}
          </span>
        </div>
        <button
          onClick={() => setMiniVideoOpen(false)}
          className="p-1 rounded-pill hover:bg-neutral-200 dark:hover:bg-neutral-800 text-body dark:text-mute transition-colors"
          title="Thu nhỏ khung phát (vẫn phát âm thanh)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Video / Embed Viewport Container */}
      <div
        id="youtube-player-container"
        className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden"
      >
        <div
          id="youtube-player-mount"
          className={`w-full h-full ${
            currentTrack?.playbackType === 'youtube' && currentTrack?.source !== 'spotify' ? 'block' : 'hidden'
          }`}
        />
        {isVisible && currentTrack?.playbackType !== 'youtube' && currentTrack?.source === 'zingmp3' && currentTrack?.embedId && (
          <iframe
            src={`https://zingmp3.vn/embed/song/${currentTrack.embedId}?start=true`}
            width="100%"
            height="100%"
            frameBorder="0"
            allow="autoplay; encrypted-media; fullscreen"
            className="w-full h-full"
          />
        )}
        {isVisible && (currentTrack?.source === 'spotify' || currentTrack?.playbackType === 'spotify') && (currentTrack?.embedId || currentTrack?.sourceId) && (
          <iframe
            src={`https://open.spotify.com/embed/track/${currentTrack.embedId || currentTrack.sourceId}?utm_source=generator&theme=0`}
            width="100%"
            height="100%"
            frameBorder="0"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            className="w-full h-full"
          />
        )}
        <div
          id="iframe-player-mount"
          className={`w-full h-full ${
            currentTrack?.playbackType === 'zingmp3' || currentTrack?.playbackType === 'spotify'
              ? 'block'
              : 'hidden'
          }`}
        />
        {!isEmbedActive && (
          <div className="flex flex-col items-center justify-center text-mute gap-2">
            <Music2 className="w-6 h-6 stroke-1" />
            <span className="text-xs">Đang phát âm thanh</span>
          </div>
        )}
      </div>
    </div>
  );
};
