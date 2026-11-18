import { create } from 'zustand';

const STORAGE_KEY = 'mq_show_inline_lyric';

function readInitialPreference(): boolean {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === 'false') return false;
  } catch {
    // ignore
  }
  return true;
}

interface LyricPrefState {
  showInlineLyric: boolean;
  setShowInlineLyric: (value: boolean) => void;
  toggleInlineLyric: () => void;
}

export const useLyricPrefStore = create<LyricPrefState>((set, get) => ({
  showInlineLyric: readInitialPreference(),

  setShowInlineLyric: (value: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // ignore
    }
    set({ showInlineLyric: value });
  },

  toggleInlineLyric: () => {
    const next = !get().showInlineLyric;
    get().setShowInlineLyric(next);
  },
}));
