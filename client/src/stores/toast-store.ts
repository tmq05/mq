import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastState {
  toasts: ToastItem[];
  show: (type: ToastType, message: string, durationMs?: number) => void;
  dismiss: (id: string) => void;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  show: (type, message, durationMs = 3400) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({
      toasts: [...state.toasts.slice(-3), { id, type, message }],
    }));

    const timer = setTimeout(() => {
      get().dismiss(id);
    }, durationMs);
    timers.set(id, timer);
  },

  dismiss: (id) => {
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

export const toast = {
  success: (message: string, durationMs?: number) =>
    useToastStore.getState().show('success', message, durationMs),
  error: (message: string, durationMs?: number) =>
    useToastStore.getState().show('error', message, durationMs ?? 4200),
  info: (message: string, durationMs?: number) =>
    useToastStore.getState().show('info', message, durationMs),
};
