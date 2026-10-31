import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#000000',
        'on-primary': '#ffffff',
        'on-dark': '#ffffff',
        ink: {
          DEFAULT: '#0f172a',
          deep: '#020617',
        },
        charcoal: '#475569',
        body: '#64748b',
        mute: '#94a3b8',
        canvas: {
          DEFAULT: '#f8f9fa',
          dark: '#121212',
        },
        surface: {
          soft: '#f1f3f5',
          card: '#ffffff',
          dark: '#1e1e1e',
          'dark-card': '#181818',
          'dark-soft': '#242424',
        },
        hairline: {
          DEFAULT: '#e5e7eb',
          strong: '#d1d5db',
          dark: '#282828',
        },
        traffic: {
          red: '#ff5f56',
          yellow: '#ffbd2e',
          green: '#27c93f',
        },
      },
      fontFamily: {
        display: [
          '"SF Pro Rounded"',
          'Nunito',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
        sans: [
          'ui-sans-serif',
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      borderRadius: {
        pill: '9999px',
        card: '12px',
        chip: '6px',
      },
      spacing: {
        section: '88px',
        'section-tablet': '64px',
        'section-mobile': '48px',
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
} satisfies Config;

