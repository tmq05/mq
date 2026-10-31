import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Plus,
  Mic2,
  Tv,
  ListMusic,
  Headphones,
  Activity,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/player-store.js';
import { useAuthStore } from '../../stores/auth-store.js';
import { usePlaylistModalStore } from '../../stores/playlist-modal-store.js';
import {
  formatDuration,
  formatArtists,
  formatPlays,
  getTrackPlayCount,
  cleanDisplayTitle,
} from '../../utils/format.js';
import { SourceBadge } from '../common/Badge.js';
import { api } from '../../api/client.js';

export const NowPlayingHero: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    repeatMode,
    isShuffle,
    isLyricsOpen,
    isQueueOpen,
    miniVideoOpen,
    togglePlay,
    next,
    previous,
    seekTo,
    setRepeatMode,
    toggleShuffle,
    toggleLyrics,
    toggleQueue,
    setMiniVideoOpen,
  } = usePlayerStore();

  const { isAuthenticated } = useAuthStore();
  const { openModal: openPlaylistModal } = usePlaylistModalStore();

  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  // Sync like state when track changes
  useEffect(() => {
    let isCancelled = false;
    if (isAuthenticated && currentTrack?.id) {
      api
        .get('/users/likes')
        .then((res) => {
          if (isCancelled) return;
          const likes: any[] = res.data?.likes || [];
          const found = likes.some(
            (l) => l.id === currentTrack.id || l.sourceId === currentTrack.sourceId
          );
          setIsLiked(found);
        })
        .catch(() => {});
    } else {
      setIsLiked(false);
    }
    return () => {
      isCancelled = true;
    };
  }, [currentTrack?.id, isAuthenticated]);

  if (!currentTrack) {
    return null;
  }

  const playCount = getTrackPlayCount(currentTrack);
  const displayTitle = cleanDisplayTitle(currentTrack.title);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleToggleLike = async () => {
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để lưu bài hát yêu thích');
      return;
    }
    if (isLiking) return;
    setIsLiking(true);
    try {
      const res = await api.post('/songs/like', { track: currentTrack });
      setIsLiked(res.data?.isLiked ?? !isLiked);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLiking(false);
    }
  };

  const handleRepeatClick = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-hairline dark:border-hairline-dark bg-gradient-to-b from-surface-soft/80 to-surface-soft/20 dark:from-surface-dark-card/90 dark:to-surface-dark-card/30 backdrop-blur-md p-6 sm:p-8 shadow-sm transition-all duration-300">
      {/* Background Accent Glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-traffic-green/10 dark:bg-traffic-green/15 blur-3xl pointer-events-none" />

      {/* Top Header Label */}
      <div className="flex items-center justify-between pb-5 border-b border-hairline dark:border-hairline-dark mb-6">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            {isPlaying && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-traffic-green opacity-75" />
            )}
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-traffic-green" />
          </span>
          <span className="font-display font-bold text-sm tracking-wide uppercase text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-traffic-green" />
            Đang phát
          </span>
        </div>

        <div className="flex items-center gap-2">
          <SourceBadge isFullLength={currentTrack.isFullLength} source={currentTrack.source} />
          <span className="hidden sm:inline-flex items-center gap-1 text-xs font-mono text-neutral-500 dark:text-neutral-400">
            <Headphones className="w-3.5 h-3.5 opacity-60" />
            {formatPlays(playCount)} lượt nghe
          </span>
        </div>
      </div>

      {/* Main Track Row */}
      <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
        {/* Cover Art with Vinyl Visual */}
        <div className="relative group shrink-0">
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden shadow-xl border border-hairline dark:border-hairline-dark bg-surface-soft dark:bg-surface-dark-soft">
            <img
              src={
                currentTrack.coverUrl ||
                'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80'
              }
              alt={displayTitle}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>

          {/* Equalizer animation badge on artwork */}
          {isPlaying && (
            <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2 py-1 rounded-md flex items-end gap-0.5 h-4">
              <span className="w-1 h-full bg-traffic-green rounded-full animate-pulse" />
              <span className="w-1 h-2/3 bg-traffic-green rounded-full animate-pulse delay-75" />
              <span className="w-1 h-full bg-traffic-green rounded-full animate-pulse delay-150" />
            </div>
          )}
        </div>

        {/* Track Info & Controls */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          <div>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-neutral-900 dark:text-white truncate">
              {displayTitle}
            </h2>
            <p className="text-sm sm:text-base font-medium text-neutral-600 dark:text-neutral-300 truncate mt-1">
              {formatArtists(currentTrack.artists)}
              {currentTrack.album && currentTrack.album !== '—' && (
                <span className="text-neutral-400 dark:text-neutral-500 font-normal">
                  {' '}
                  · {currentTrack.album}
                </span>
              )}
            </p>
          </div>

          {/* Progress Slider */}
          <div className="space-y-1.5">
            <div className="relative flex items-center h-4 cursor-pointer group">
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onChange={(e) => seekTo(parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                aria-label="Tua bài hát"
              />
              <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-traffic-green rounded-full transition-all duration-75"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-neutral-500 dark:text-neutral-400">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Controls Bar & Quick Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            {/* Playback Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleShuffle}
                className={`p-2 rounded-pill transition-colors ${
                  isShuffle
                    ? 'text-black dark:text-white font-bold'
                    : 'text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
                title="Phát ngẫu nhiên"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <button
                onClick={previous}
                className="p-2 text-neutral-800 dark:text-white hover:opacity-80 active:scale-95 transition-transform"
                title="Bài trước"
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </button>

              <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-black flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                title="Phát/Tạm dừng"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-current" />
                ) : (
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                )}
              </button>

              <button
                onClick={next}
                className="p-2 text-neutral-800 dark:text-white hover:opacity-80 active:scale-95 transition-transform"
                title="Bài tiếp theo"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>

              <button
                onClick={handleRepeatClick}
                className={`p-2 rounded-pill transition-colors ${
                  repeatMode !== 'off'
                    ? 'text-black dark:text-white font-bold'
                    : 'text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
                title={`Lặp lại: ${repeatMode}`}
              >
                {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
              </button>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleLike}
                disabled={isLiking}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pill border text-xs font-semibold transition-all active:scale-95 ${
                  isLiked
                    ? 'border-red-500/30 bg-red-500/10 text-red-500'
                    : 'border-hairline dark:border-hairline-dark bg-surface-soft dark:bg-surface-dark-soft text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white'
                }`}
                title={isLiked ? 'Bỏ thích' : 'Yêu thích bài hát'}
              >
                <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                <span>{isLiked ? 'Đã thích' : 'Yêu thích'}</span>
              </button>

              <button
                onClick={() => openPlaylistModal(currentTrack)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill border border-hairline dark:border-hairline-dark bg-surface-soft dark:bg-surface-dark-soft hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-all active:scale-95"
                title="Thêm vào danh sách phát"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm vào playlist</span>
              </button>

              <button
                onClick={toggleLyrics}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pill border text-xs font-semibold transition-all active:scale-95 ${
                  isLyricsOpen
                    ? 'border-traffic-green/30 bg-traffic-green/10 text-traffic-green'
                    : 'border-hairline dark:border-hairline-dark bg-surface-soft dark:bg-surface-dark-soft text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white'
                }`}
                title="Mở lời bài hát đồng bộ"
              >
                <Mic2 className="w-3.5 h-3.5" />
                <span>Lời bài hát</span>
              </button>

              {(currentTrack.playbackType === 'youtube' ||
                currentTrack.source === 'youtube' ||
                Boolean(currentTrack.embedId)) && (
                <button
                  onClick={() => setMiniVideoOpen(!miniVideoOpen)}
                  className={`p-2 rounded-pill border transition-all ${
                    miniVideoOpen
                      ? 'border-neutral-400 bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white'
                      : 'border-hairline dark:border-hairline-dark bg-surface-soft dark:bg-surface-dark-soft text-neutral-500 hover:text-black dark:hover:text-white'
                  }`}
                  title="Bật/Tắt video"
                >
                  <Tv className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={toggleQueue}
                className={`p-2 rounded-pill border transition-all ${
                  isQueueOpen
                    ? 'border-neutral-400 bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white'
                    : 'border-hairline dark:border-hairline-dark bg-surface-soft dark:bg-surface-dark-soft text-neutral-500 hover:text-black dark:hover:text-white'
                }`}
                title="Hàng đợi"
              >
                <ListMusic className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
