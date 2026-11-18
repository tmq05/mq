import { create } from 'zustand';
import { UnifiedTrack } from '../types/index.js';
import { playerEngine } from '../player-engine/player-engine.js';
import { api } from '../api/client.js';
import { useAuthStore } from './auth-store.js';
import { useListeningHistoryStore } from './listening-history-store.js';
import { getSaveListeningHistorySetting } from '../utils/privacy-preferences.js';

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
  autoScrollToNowPlaying: boolean;
  focusNowPlayingNonce: number;

  // Actions
  playTrack: (track: UnifiedTrack, newQueue?: UnifiedTrack[], startSeconds?: number) => Promise<void>;
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
  setAutoScrollToNowPlaying: (enabled: boolean) => void;
  requestFocusNowPlaying: () => void;

  // Engine callbacks
  syncTime: (currentTime: number, duration: number) => void;
  syncState: (isPlaying: boolean, isBuffering: boolean) => void;
  handleTrackEnd: () => void;
  handleError: (errMsg: string) => void;
}

const getInitialAutoScroll = (): boolean => {
  try {
    const val = localStorage.getItem('mq_auto_scroll_now_playing');
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
};

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
  autoScrollToNowPlaying: getInitialAutoScroll(),
  focusNowPlayingNonce: 0,

  playTrack: async (track, newQueue, startSeconds) => {
    let activeTrack = track;

    // Resolve native stream-info from the track's own provider when needed (no cross-source YouTube hijacking)
    if (
      (activeTrack.source === 'spotify' || activeTrack.source === 'zingmp3') &&
      !activeTrack.streamUrl
    ) {
      try {
        const streamInfoRes = await api.get(`/songs/${activeTrack.source}/${activeTrack.sourceId}/stream-info`);
        const info = streamInfoRes.data;
        if (info && (info.streamUrl || info.previewUrl)) {
          activeTrack = {
            ...activeTrack,
            playbackType: info.playbackType || 'audio',
            streamUrl: info.streamUrl ?? activeTrack.streamUrl,
            previewUrl: info.previewUrl ?? activeTrack.previewUrl,
          };
        }
      } catch {
        // Fall back to original track if stream-info request fails
      }
    }

    const { currentTrack, history, volume, isMuted } = get();

    const updatedHistory =
      currentTrack && currentTrack.id !== activeTrack.id
        ? [currentTrack, ...history.filter((t) => t.id !== currentTrack.id).slice(0, 29)]
        : history;
    const updatedQueue = newQueue || get().queue;

    const resumeSec =
      typeof startSeconds === 'number' && startSeconds > 0 ? Math.floor(startSeconds) : 0;

    set({
      currentTrack: activeTrack,
      isPlaying: true,
      isBuffering: true,
      currentTime: resumeSec,
      duration: activeTrack.durationMs ? activeTrack.durationMs / 1000 : 0,
      history: updatedHistory,
      queue: updatedQueue.length > 0 ? updatedQueue : [activeTrack],
      errorMessage: null,
    });

    try {
      await playerEngine.loadTrack(activeTrack, true);
      playerEngine.setVolume(volume, isMuted);
      if (resumeSec > 0) {
        window.setTimeout(() => {
          if (get().currentTrack?.id === activeTrack.id) {
            playerEngine.seek(resumeSec);
          }
        }, 350);
      }

      const currentUserId = useAuthStore.getState().user?.id;
      if (getSaveListeningHistorySetting(currentUserId)) {
        // Record play to backend (fire & forget)
        api
          .post('/songs/record-play', { track: activeTrack })
          .then(() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('mq:play-recorded'));
            }
          })
          .catch(() => {});
      }
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

    if (isShuffle && queue.length > 1) {
      const candidates = queue
        .map((t, idx) => ({ t, idx }))
        .filter(({ t }) => t.id !== currentTrack?.id);
      if (candidates.length > 0) {
        nextIndex = candidates[Math.floor(Math.random() * candidates.length)].idx;
      }
    }

    if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        // Hết danh sách: tự động lấy bài ngẫu nhiên từ /explore (fallback về queue nếu mất mạng)
        api
          .get('/explore')
          .then((res) => {
            const pool: UnifiedTrack[] = [
              ...(res.data?.trending || []),
              ...(res.data?.vietnamese || []),
            ].filter((t: UnifiedTrack) => t?.id && t.id !== currentTrack?.id);

            if (pool.length > 0) {
              const randomTrack = pool[Math.floor(Math.random() * pool.length)];
              const nextQueue = queue.some((t) => t.id === randomTrack.id)
                ? queue
                : [...queue, randomTrack];
              get().playTrack(randomTrack, nextQueue);
              return;
            }

            if (queue.length > 1) {
              const fallbackCandidates = queue.filter((t) => t.id !== currentTrack?.id);
              const fallbackTrack =
                fallbackCandidates[Math.floor(Math.random() * fallbackCandidates.length)] || queue[0];
              get().playTrack(fallbackTrack);
            } else {
              set({ isPlaying: false });
            }
          })
          .catch(() => {
            if (queue.length > 1) {
              const fallbackCandidates = queue.filter((t) => t.id !== currentTrack?.id);
              const fallbackTrack =
                fallbackCandidates[Math.floor(Math.random() * fallbackCandidates.length)] || queue[0];
              get().playTrack(fallbackTrack);
            } else {
              set({ isPlaying: false });
            }
          });
        return;
      }
    }

    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      get().playTrack(nextTrack);
    }
  },

  previous: () => {
    const { queue, history, currentTrack, currentTime, repeatMode } = get();
    // If played more than 3 seconds, restart current track
    if (currentTime > 3) {
      playerEngine.seek(0);
      set({ currentTime: 0 });
      return;
    }

    // Ưu tiên phát lại đúng bài đã nghe trước đó trong lịch sử phiên phát
    if (history.length > 0) {
      const [prevTrack, ...remainingHistory] = history;
      if (prevTrack) {
        set({ history: remainingHistory, currentTrack: null });
        get().playTrack(prevTrack);
        return;
      }
    }

    if (queue.length === 0) return;
    const currentIndex = queue.findIndex((t) => t.id === currentTrack?.id);

    if (currentIndex > 0) {
      const prevTrack = queue[currentIndex - 1];
      if (prevTrack) {
        get().playTrack(prevTrack);
      }
      return;
    }

    if (repeatMode === 'all' && queue.length > 1) {
      const lastTrack = queue[queue.length - 1];
      if (lastTrack) {
        get().playTrack(lastTrack);
      }
      return;
    }

    playerEngine.seek(0);
    set({ currentTime: 0 });
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

  setAutoScrollToNowPlaying: (enabled) => {
    try {
      localStorage.setItem('mq_auto_scroll_now_playing', String(enabled));
    } catch {
      // ignore
    }
    set({ autoScrollToNowPlaying: enabled });
  },

  requestFocusNowPlaying: () =>
    set((s) => ({ focusNowPlayingNonce: s.focusNowPlayingNonce + 1 })),

  syncTime: (currentTime, duration) => {
    const state = get();
    const resolvedDuration = duration > 0 ? duration : state.duration;
    set({
      currentTime,
      duration: resolvedDuration,
    });
    if (state.isPlaying && state.currentTrack) {
      const currentUserId = useAuthStore.getState().user?.id;
      useListeningHistoryStore
        .getState()
        .handlePlaybackProgress(state.currentTrack, currentTime, resolvedDuration, currentUserId);
    }
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

