import { create } from 'zustand';
import { UnifiedTrack } from '../types/index.js';
import { playerEngine } from '../player-engine/player-engine.js';
import { api } from '../api/client.js';

export type RepeatMode = 'off' | 'all' | 'one';

interface PlayerState {
  currentTrack: UnifiedTrack | null;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  queue: UnifiedTrack[];
  history: UnifiedTrack[];
  isLyricsOpen: boolean;
  isQueueOpen: boolean;
  miniVideoOpen: boolean;
  errorMessage: string | null;

  // Actions
  playTrack: (track: UnifiedTrack, newQueue?: UnifiedTrack[]) => Promise<void>;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  toggleShuffle: () => void;
  addToQueue: (track: UnifiedTrack) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (newQueue: UnifiedTrack[]) => void;
  clearQueue: () => void;
  toggleLyrics: () => void;
  toggleQueue: () => void;
  setMiniVideoOpen: (open: boolean) => void;

  // Engine callbacks
  syncTime: (currentTime: number, duration: number) => void;
  syncState: (isPlaying: boolean, isBuffering: boolean) => void;
  handleTrackEnd: () => void;
  handleError: (errMsg: string) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  isBuffering: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  isMuted: false,
  repeatMode: 'off',
  isShuffle: false,
  queue: [],
  history: [],
  isLyricsOpen: false,
  isQueueOpen: false,
  miniVideoOpen: false,
  errorMessage: null,

  playTrack: async (track, newQueue) => {
    const { currentTrack, history, volume, isMuted } = get();

    const updatedHistory = currentTrack ? [currentTrack, ...history.slice(0, 30)] : history;
    const updatedQueue = newQueue || get().queue;

    set({
      currentTrack: track,
      isPlaying: true,
      isBuffering: true,
      currentTime: 0,
      duration: track.durationMs ? track.durationMs / 1000 : 0,
      history: updatedHistory,
      queue: updatedQueue.length > 0 ? updatedQueue : [track],
      errorMessage: null,
    });

    try {
      await playerEngine.loadTrack(track, true);
      playerEngine.setVolume(volume, isMuted);

      // Record play to backend (fire & forget)
      api.post('/songs/record-play', { track }).catch(() => {});
    } catch (err: any) {
      get().handleError(err.message || 'Lỗi phát bài hát');
    }
  },

  togglePlay: () => {
    const { isPlaying, currentTrack } = get();
    if (!currentTrack) return;

    if (isPlaying) {
      playerEngine.pause();
      set({ isPlaying: false });
    } else {
      playerEngine.play();
      set({ isPlaying: true });
    }
  },

  next: () => {
    const { queue, currentTrack, isShuffle, repeatMode } = get();
    if (queue.length === 0) return;

    if (repeatMode === 'one' && currentTrack) {
      playerEngine.seek(0);
      playerEngine.play();
      return;
    }

    const currentIndex = queue.findIndex((t) => t.id === currentTrack?.id);
    let nextIndex = currentIndex + 1;

    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    }

    if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        set({ isPlaying: false });
        return;
      }
    }

    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      get().playTrack(nextTrack);
    }
  },

  previous: () => {
    const { queue, currentTrack, currentTime } = get();
    // If played more than 3 seconds, restart current track
    if (currentTime > 3) {
      playerEngine.seek(0);
      return;
    }

    if (queue.length === 0) return;
    const currentIndex = queue.findIndex((t) => t.id === currentTrack?.id);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;

    const prevTrack = queue[prevIndex];
    if (prevTrack) {
      get().playTrack(prevTrack);
    }
  },

  seekTo: (seconds) => {
    playerEngine.seek(seconds);
    set({ currentTime: Math.max(0, seconds) });
  },

  setVolume: (val) => {
    const volume = Math.max(0, Math.min(1, val));
    playerEngine.setVolume(volume, get().isMuted);
    set({ volume, isMuted: false });
  },

  toggleMute: () => {
    const nextMuted = !get().isMuted;
    playerEngine.setVolume(get().volume, nextMuted);
    set({ isMuted: nextMuted });
  },

  setRepeatMode: (mode) => set({ repeatMode: mode }),

  toggleShuffle: () => set((s) => ({ isShuffle: !s.isShuffle })),

  addToQueue: (track) =>
    set((s) => ({
      queue: s.queue.some((t) => t.id === track.id) ? s.queue : [...s.queue, track],
    })),

  removeFromQueue: (index) =>
    set((s) => ({
      queue: s.queue.filter((_, i) => i !== index),
    })),

  reorderQueue: (newQueue) => set({ queue: newQueue }),

  clearQueue: () => set({ queue: [] }),

  toggleLyrics: () => set((s) => ({ isLyricsOpen: !s.isLyricsOpen })),

  toggleQueue: () => set((s) => ({ isQueueOpen: !s.isQueueOpen })),

  setMiniVideoOpen: (open) => set({ miniVideoOpen: open }),

  syncTime: (currentTime, duration) => {
    set((s) => ({
      currentTime,
      duration: duration > 0 ? duration : s.duration,
    }));
  },

  syncState: (isPlaying, isBuffering) => {
    set({ isPlaying, isBuffering });
  },

  handleTrackEnd: () => {
    const { repeatMode } = get();
    if (repeatMode === 'one') {
      playerEngine.seek(0);
      playerEngine.play();
    } else {
      get().next();
    }
  },

  handleError: (errMsg) => {
    set({ errorMessage: errMsg, isPlaying: false, isBuffering: false });
    // Try auto fallback to next track after 2 seconds
    setTimeout(() => {
      const { queue, currentTrack } = get();
      if (queue.length > 1 && currentTrack) {
        get().next();
      }
    }, 2000);
  },
}));

