import { create } from 'zustand';
import { api } from '../api/client.js';

export interface SpotifyUserProfile {
  id: string;
  displayName: string;
  product: string;
  isPremium: boolean;
  avatarUrl?: string | null;
}

interface StoredSpotifyAuth {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number;
  user: SpotifyUserProfile | null;
}

const STORAGE_KEY = 'mq_spotify_auth';

function loadStored(): StoredSpotifyAuth {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { accessToken: null, refreshToken: null, expiresAt: 0, user: null };
}

function saveStored(data: StoredSpotifyAuth) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

interface SpotifyAuthState extends StoredSpotifyAuth {
  isConnecting: boolean;
  error: string | null;
  connectSpotify: () => Promise<void>;
  exchangeCode: (code: string) => Promise<boolean>;
  getValidAccessToken: () => Promise<string | null>;
  disconnectSpotify: () => void;
}

const initial = loadStored();

export const useSpotifyAuthStore = create<SpotifyAuthState>((set, get) => ({
  ...initial,
  isConnecting: false,
  error: null,

  connectSpotify: async () => {
    set({ isConnecting: true, error: null });
    try {
      const redirectUri = `${window.location.origin}/spotify-callback`;
      const res = await api.get('/spotify-auth/authorize-url', {
        params: { redirectUri },
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        set({ isConnecting: false, error: 'Không lấy được đường dẫn đăng nhập Spotify.' });
      }
    } catch (err: any) {
      set({
        isConnecting: false,
        error: err.response?.data?.message || 'Không thể khởi tạo kết nối Spotify.',
      });
    }
  },

  exchangeCode: async (code: string) => {
    set({ isConnecting: true, error: null });
    try {
      const redirectUri = `${window.location.origin}/spotify-callback`;
      const res = await api.post('/spotify-auth/exchange', { code, redirectUri });
      const { accessToken, refreshToken, expiresIn, user } = res.data;
      const next: StoredSpotifyAuth = {
        accessToken,
        refreshToken,
        expiresAt: Date.now() + (expiresIn || 3600) * 1000,
        user,
      };
      saveStored(next);
      set({ ...next, isConnecting: false, error: null });
      return true;
    } catch (err: any) {
      set({
        isConnecting: false,
        error: err.response?.data?.message || 'Kết nối Spotify thất bại.',
      });
      return false;
    }
  },

  getValidAccessToken: async () => {
    const { accessToken, refreshToken, expiresAt, user } = get();
    if (!accessToken) return null;
    if (Date.now() < expiresAt - 60000) {
      return accessToken;
    }
    if (!refreshToken) return null;

    try {
      const res = await api.post('/spotify-auth/refresh', { refreshToken });
      const next: StoredSpotifyAuth = {
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken || refreshToken,
        expiresAt: Date.now() + (res.data.expiresIn || 3600) * 1000,
        user,
      };
      saveStored(next);
      set(next);
      return next.accessToken;
    } catch {
      get().disconnectSpotify();
      return null;
    }
  },

  disconnectSpotify: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({
      accessToken: null,
      refreshToken: null,
      expiresAt: 0,
      user: null,
      isConnecting: false,
      error: null,
    });
  },
}));
