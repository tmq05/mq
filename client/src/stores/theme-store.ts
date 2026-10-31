import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => {
  const initialDark =
    localStorage.getItem('mq_theme') === 'dark' ||
    (!localStorage.getItem('mq_theme') &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (initialDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  return {
    isDark: initialDark,
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
  };
});
