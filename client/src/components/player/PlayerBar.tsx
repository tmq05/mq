import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  ListMusic,
  Mic2,
  Tv,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/player-store.js';
import { formatDuration } from '../../utils/format.js';
import { SourceBadge } from '../common/Badge.js';

export const PlayerBar: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    isShuffle,
    isLyricsOpen,
    isQueueOpen,
    miniVideoOpen,
    togglePlay,
    next,
    previous,
    seekTo,
    setVolume,
    toggleMute,
    setRepeatMode,
    toggleShuffle,
    toggleLyrics,
    toggleQueue,
    setMiniVideoOpen,
  } = usePlayerStore();

  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  if (!currentTrack) {
    return null;
  }

  const effectiveTime = isSeeking ? seekValue : currentTime;
  const progressPercent = duration > 0 ? (effectiveTime / duration) * 100 : 0;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeekValue(parseFloat(e.target.value));
  };

  const handleSeekMouseDown = () => {
    setIsSeeking(true);
    setSeekValue(currentTime);
  };

  const handleSeekMouseUp = () => {
    setIsSeeking(false);
    seekTo(seekValue);
  };

  const handleRepeatClick = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-canvas/95 dark:bg-canvas-dark/95 backdrop-blur-md border-t border-hairline dark:border-hairline-dark px-4 py-2.5 select-none transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Track Info */}
        <div className="flex items-center gap-3 w-1/4 min-w-[200px]">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-surface-soft shrink-0 border border-hairline dark:border-hairline-dark">
            <img
              src={currentTrack.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&auto=format&fit=crop&q=80'}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
            />
            {isBuffering && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold truncate text-ink dark:text-on-dark">
              {currentTrack.title}
            </span>
            <span className="text-xs text-body dark:text-mute truncate">
              {currentTrack.artists.join(', ')}
            </span>
            <div className="mt-0.5">
              <SourceBadge isFullLength={currentTrack.isFullLength} source={currentTrack.source} />
            </div>
          </div>
        </div>

        {/* Center: Playback Controls & Seekbar */}
        <div className="flex flex-col items-center max-w-xl w-2/4">
          <div className="flex items-center gap-3 mb-1.5">
            {/* Shuffle */}
            <button
              onClick={toggleShuffle}
              className={`p-1.5 rounded-pill transition-colors ${
                isShuffle ? 'text-primary dark:text-white font-bold' : 'text-mute hover:text-ink dark:hover:text-white'
              }`}
              title="Phát ngẫu nhiên"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Previous */}
            <button
              onClick={previous}
              className="p-1.5 text-ink dark:text-on-dark hover:opacity-80 active:scale-95 transition-transform"
              title="Bài trước (Mũi tên trái)"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-pill bg-primary dark:bg-white text-on-primary dark:text-black flex items-center justify-center shadow-md active:scale-95 transition-transform"
              title="Phát/Tạm dừng (Space)"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            {/* Next */}
            <button
              onClick={next}
              className="p-1.5 text-ink dark:text-on-dark hover:opacity-80 active:scale-95 transition-transform"
              title="Bài tiếp theo (Mũi tên phải)"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            {/* Repeat */}
            <button
              onClick={handleRepeatClick}
              className={`p-1.5 rounded-pill transition-colors ${
                repeatMode !== 'off'
                  ? 'text-primary dark:text-white font-bold'
                  : 'text-mute hover:text-ink dark:hover:text-white'
              }`}
              title={`Lặp lại: ${repeatMode}`}
            >
              {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>
          </div>

          {/* Progress Slider */}
          <div className="w-full flex items-center gap-2.5 text-[11px] font-mono text-mute">
            <span>{formatDuration(effectiveTime)}</span>
            <div className="relative flex-1 flex items-center h-4 cursor-pointer group">
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={effectiveTime}
                onChange={handleSeekChange}
                onMouseDown={handleSeekMouseDown}
                onMouseUp={handleSeekMouseUp}
                onTouchStart={handleSeekMouseDown}
                onTouchEnd={handleSeekMouseUp}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                aria-label="Tua bài hát"
              />
              {/* Custom Track Bar */}
              <div className="w-full h-1 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-ink dark:bg-white rounded-full transition-all duration-75"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Right: Actions & Volume */}
        <div className="flex items-center justify-end gap-3 w-1/4">
          {/* Mini video toggle (for YouTube tracks) */}
          {currentTrack.playbackType === 'youtube' && (
            <button
              onClick={() => setMiniVideoOpen(!miniVideoOpen)}
              className={`p-2 rounded-pill transition-colors ${
                miniVideoOpen
                  ? 'bg-neutral-200 dark:bg-neutral-800 text-ink dark:text-white'
                  : 'text-mute hover:text-ink dark:hover:text-white'
              }`}
              title="Bật/Tắt khung xem video"
            >
              <Tv className="w-4 h-4" />
            </button>
          )}

          {/* Lyrics Drawer Toggle */}
          <button
            onClick={toggleLyrics}
            className={`p-2 rounded-pill transition-colors ${
              isLyricsOpen
                ? 'bg-neutral-200 dark:bg-neutral-800 text-ink dark:text-white'
                : 'text-mute hover:text-ink dark:hover:text-white'
            }`}
            title="Lời bài hát (Phím L)"
          >
            <Mic2 className="w-4 h-4" />
          </button>

          {/* Queue Drawer Toggle */}
          <button
            onClick={toggleQueue}
            className={`p-2 rounded-pill transition-colors ${
              isQueueOpen
                ? 'bg-neutral-200 dark:bg-neutral-800 text-ink dark:text-white'
                : 'text-mute hover:text-ink dark:hover:text-white'
            }`}
            title="Hàng đợi phát nhạc"
          >
            <ListMusic className="w-4 h-4" />
          </button>

          {/* Volume Control */}
          <div className="hidden lg:flex items-center gap-2 group">
            <button
              onClick={toggleMute}
              className="text-mute hover:text-ink dark:hover:text-white p-1"
              title="Bật/Tắt âm thanh (Phím M)"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <div className="relative w-20 flex items-center h-4 cursor-pointer">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full h-1 bg-neutral-200 dark:bg-neutral-800 rounded-full appearance-none accent-ink dark:accent-white cursor-pointer"
                aria-label="Âm lượng"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
