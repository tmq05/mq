import { create } from 'zustand';
import { User } from '../types/index.js';
import { api, setAuthToken } from '../api/client.js';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  updateUser: (updated: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('mq_access_token'),
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { user, accessToken } = res.data;
    localStorage.setItem('mq_access_token', accessToken);
    setAuthToken(accessToken);
    set({ user, token: accessToken, isAuthenticated: true });
  },

  register: async (email, password, name) => {
    const res = await api.post('/auth/register', { email, password, name });
    const { user, accessToken } = res.data;
    localStorage.setItem('mq_access_token', accessToken);
    setAuthToken(accessToken);
    set({ user, token: accessToken, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    localStorage.removeItem('mq_access_token');
    setAuthToken(null);
    set({ user: null, token: null, isAuthenticated: false });
  },

  fetchMe: async () => {
    const savedToken = localStorage.getItem('mq_access_token');
    if (!savedToken) {
      set({ isLoading: false, isAuthenticated: false, user: null });
      return;
    }

    setAuthToken(savedToken);
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data, token: savedToken, isAuthenticated: true, isLoading: false });
    } catch {
      // Try refresh
      try {
        const refreshRes = await api.post('/auth/refresh');
        const newToken = refreshRes.data.accessToken;
        localStorage.setItem('mq_access_token', newToken);
        setAuthToken(newToken);
        set({
          user: refreshRes.data.user,
          token: newToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        localStorage.removeItem('mq_access_token');
        setAuthToken(null);
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      }
    }
  },

  updateUser: (updated) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updated } : null,
    })),
}));

