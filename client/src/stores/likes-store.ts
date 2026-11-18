import { create } from 'zustand';
import { api } from '../api/client.js';
import { UnifiedTrack } from '../types/index.js';

function getTrackKeys(track: Partial<UnifiedTrack> | null | undefined): string[] {
  if (!track) return [];
  const keys: string[] = [];
  if (track.id) keys.push(track.id);
  if (track.source && track.sourceId) {
    keys.push(`${track.source}:${track.sourceId}`);
  }
  if (track.sourceId) {
    keys.push(`sid:${track.sourceId}`);
  }
  return keys;
}

interface LikesState {
  likedKeys: Set<string>;
  pendingKeys: Set<string>;
  isLoaded: boolean;
  isFetching: boolean;
  fetchLikes: (force?: boolean) => Promise<void>;
  clearLikes: () => void;
  isTrackLiked: (track: Partial<UnifiedTrack> | null | undefined, fallback?: boolean) => boolean;
  isTrackPending: (track: Partial<UnifiedTrack> | null | undefined) => boolean;
  toggleLike: (track: UnifiedTrack) => Promise<boolean | null>;
}

export const useLikesStore = create<LikesState>((set, get) => ({
  likedKeys: new Set<string>(),
  pendingKeys: new Set<string>(),
  isLoaded: false,
  isFetching: false,

  fetchLikes: async (force = false) => {
    const state = get();
    if (state.isFetching || (state.isLoaded && !force)) return;
    set({ isFetching: true });
    try {
      const res = await api.get('/users/likes');
      const likes: UnifiedTrack[] = res.data?.likes || [];
      const next = new Set<string>();
      for (const item of likes) {
        for (const key of getTrackKeys(item)) {
          next.add(key);
        }
      }
      set({ likedKeys: next, isLoaded: true, isFetching: false });
    } catch {
      set({ isFetching: false });
    }
  },

  clearLikes: () => {
    set({ likedKeys: new Set<string>(), pendingKeys: new Set<string>(), isLoaded: false, isFetching: false });
  },

  isTrackLiked: (track, fallback = false) => {
    const state = get();
    if (!state.isLoaded) return fallback;
    const keys = getTrackKeys(track);
    return keys.some((k) => state.likedKeys.has(k));
  },

  isTrackPending: (track) => {
    const state = get();
    const keys = getTrackKeys(track);
    return keys.some((k) => state.pendingKeys.has(k));
  },

  toggleLike: async (track) => {
    const keys = getTrackKeys(track);
    if (keys.length === 0) return null;

    const primaryKey = keys[0];
    if (get().pendingKeys.has(primaryKey)) return null;

    const wasLiked = get().isTrackLiked(track);

    // Optimistic update
    const nextLiked = new Set(get().likedKeys);
    const nextPending = new Set(get().pendingKeys);
    keys.forEach((k) => {
      nextPending.add(k);
      if (wasLiked) nextLiked.delete(k);
      else nextLiked.add(k);
    });
    set({ likedKeys: nextLiked, pendingKeys: nextPending });

    try {
      const res = await api.post('/songs/like', { track });
      const serverIsLiked: boolean = res.data?.isLiked ?? !wasLiked;

      const confirmedLiked = new Set(get().likedKeys);
      const confirmedPending = new Set(get().pendingKeys);
      keys.forEach((k) => {
        confirmedPending.delete(k);
        if (serverIsLiked) confirmedLiked.add(k);
        else confirmedLiked.delete(k);
      });
      set({ likedKeys: confirmedLiked, pendingKeys: confirmedPending, isLoaded: true });
      return serverIsLiked;
    } catch (err) {
      // Revert on error
      const revertedLiked = new Set(get().likedKeys);
      const revertedPending = new Set(get().pendingKeys);
      keys.forEach((k) => {
        revertedPending.delete(k);
        if (wasLiked) revertedLiked.add(k);
        else revertedLiked.delete(k);
      });
      set({ likedKeys: revertedLiked, pendingKeys: revertedPending });
      console.error('Toggle like failed:', err);
      return null;
    }
  },
}));
