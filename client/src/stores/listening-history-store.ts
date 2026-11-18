import { create } from 'zustand';
import { UnifiedTrack } from '../types/index.js';
import { api } from '../api/client.js';
import { getSaveListeningHistorySetting } from '../utils/privacy-preferences.js';

export const GUEST_HISTORY_STORAGE_KEY = 'mq_continue_listening_guest_v1';
const MAX_CONTINUE_ITEMS = 30;

export interface ContinueListeningItem {
  track: UnifiedTrack;
  progressSeconds: number;
  playedAt: string;
}

interface ListeningHistoryState {
  items: ContinueListeningItem[];
  isLoading: boolean;
  hasLoadedOnce: boolean;
  error: string | null;
  loadedForUserId: string | null;

  loadHistory: (userId?: string | null) => Promise<void>;
  handlePlaybackProgress: (
    track: UnifiedTrack | null,
    currentTime: number,
    duration: number,
    userId?: string | null
  ) => void;
  removeItem: (trackId: string, userId?: string | null) => Promise<void>;
  clearAll: (userId?: string | null) => Promise<void>;
}

function readGuestHistory(): ContinueListeningItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(GUEST_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item?.track?.id && item?.track?.title)
      .slice(0, MAX_CONTINUE_ITEMS);
  } catch {
    return [];
  }
}

function writeGuestHistory(items: ContinueListeningItem[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      GUEST_HISTORY_STORAGE_KEY,
      JSON.stringify(items.slice(0, MAX_CONTINUE_ITEMS))
    );
  } catch {
    // ignore storage quota errors
  }
}

function clearGuestHistory() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(GUEST_HISTORY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

// Track last persisted timestamp & progress per trackId in memory so we don't spam backend
const lastSyncedProgressMap = new Map<string, { syncedAt: number; progress: number }>();

export const useListeningHistoryStore = create<ListeningHistoryState>((set, get) => ({
  items: readGuestHistory(),
  isLoading: false,
  hasLoadedOnce: false,
  error: null,
  loadedForUserId: null,

  loadHistory: async (userId) => {
    const normalizedUserId = userId || null;

    if (!normalizedUserId) {
      const guestItems = readGuestHistory();
      set({
        items: guestItems,
        isLoading: false,
        hasLoadedOnce: true,
        error: null,
        loadedForUserId: null,
      });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const guestItems = readGuestHistory();
      if (guestItems.length > 0) {
        const res = await api.post('/users/continue-listening/merge', {
          items: guestItems,
        });
        clearGuestHistory();
        set({
          items: (res.data?.items || []) as ContinueListeningItem[],
          isLoading: false,
          hasLoadedOnce: true,
          error: null,
          loadedForUserId: normalizedUserId,
        });
      } else {
        const res = await api.get('/users/continue-listening');
        set({
          items: (res.data?.items || []) as ContinueListeningItem[],
          isLoading: false,
          hasLoadedOnce: true,
          error: null,
          loadedForUserId: normalizedUserId,
        });
      }
    } catch {
      set({
        isLoading: false,
        hasLoadedOnce: true,
        error: 'Không thể tải danh sách tiếp tục nghe.',
        loadedForUserId: normalizedUserId,
      });
    }
  },

  handlePlaybackProgress: (track, currentTime, duration, userId) => {
    if (!track || !track.id) return;
    if (!getSaveListeningHistorySetting(userId || undefined)) return;

    const totalSec = duration > 0 ? duration : track.durationMs ? track.durationMs / 1000 : 0;
    const progress = Math.max(0, Math.round(currentTime));

    // Ghi khi nghe >= 30 giây, hoặc >= 50% nếu bài ngắn hơn 60 giây
    const qualifies =
      progress >= 30 ||
      (totalSec > 0 && totalSec < 60 && progress >= Math.max(3, Math.floor(totalSec * 0.5)));
    if (!qualifies) return;

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const currentItems = get().items;
    const isAlreadyTop = currentItems[0]?.track?.id === track.id;

    // Tránh cập nhật liên tục từng giây nếu bài đã ở đầu danh sách
    const lastSync = lastSyncedProgressMap.get(track.id);
    if (
      isAlreadyTop &&
      lastSync &&
      nowMs - lastSync.syncedAt < 6000 &&
      Math.abs(progress - lastSync.progress) < 5
    ) {
      return;
    }

    lastSyncedProgressMap.set(track.id, { syncedAt: nowMs, progress });

    const nextItem: ContinueListeningItem = {
      track,
      progressSeconds: progress,
      playedAt: nowIso,
    };

    // Không ghi trùng: nếu bài đã có thì đưa lên đầu và cập nhật tiến độ
    const filtered = currentItems.filter((item) => item.track.id !== track.id);
    const updatedItems = [nextItem, ...filtered].slice(0, MAX_CONTINUE_ITEMS);

    set({ items: updatedItems });

    if (userId) {
      api
        .post('/users/continue-listening', {
          track,
          progressSeconds: progress,
          playedAt: nowIso,
        })
        .catch(() => {});
    } else {
      writeGuestHistory(updatedItems);
    }
  },

  removeItem: async (trackId, userId) => {
    const previous = get().items;
    const nextItems = previous.filter((item) => item.track.id !== trackId);
    lastSyncedProgressMap.delete(trackId);
    set({ items: nextItems });

    if (userId) {
      try {
        await api.delete(`/users/continue-listening/${encodeURIComponent(trackId)}`);
      } catch {
        set({ items: previous });
      }
    } else {
      writeGuestHistory(nextItems);
    }
  },

  clearAll: async (userId) => {
    const previous = get().items;
    lastSyncedProgressMap.clear();
    set({ items: [] });

    if (userId) {
      try {
        await api.delete('/users/continue-listening');
      } catch {
        set({ items: previous });
      }
    } else {
      clearGuestHistory();
    }
  },
}));
