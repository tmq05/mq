import { create } from 'zustand';
import type { EffectName } from '../components/pinui/theme-switch-engine.js';

interface ThemeState {
  isDark: boolean;
  effect: EffectName;
  sound: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
  setEffect: (effect: EffectName) => void;
  setSound: (sound: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => {
  const initialDark =
    localStorage.getItem('mq_theme') === 'dark' ||
    (!localStorage.getItem('mq_theme') &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const savedEffect = localStorage.getItem('mq_theme_effect') as EffectName | null;
  const initialEffect: EffectName =
    savedEffect === 'rain' || savedEffect === 'diwali' || savedEffect === 'droplet'
      ? savedEffect
      : 'droplet';

  const initialSound = localStorage.getItem('mq_theme_sound') !== 'false';

  if (initialDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  return {
    isDark: initialDark,
    effect: initialEffect,
    sound: initialSound,
    toggleTheme: () =>
      set((state) => {
        const next = !state.isDark;
        if (next) {
          document.documentElement.classList.add('dark');
          localStorage.setItem('mq_theme', 'dark');
        } else {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('mq_theme', 'light');
        }
        return { isDark: next };
      }),
    setTheme: (isDark: boolean) => {
      if (isDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('mq_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('mq_theme', 'light');
      }
      set({ isDark });
    },
    setEffect: (effect: EffectName) => {
      localStorage.setItem('mq_theme_effect', effect);
      set({ effect });
    },
    setSound: (sound: boolean) => {
      localStorage.setItem('mq_theme_sound', String(sound));
      set({ sound });
    },
  };
});

