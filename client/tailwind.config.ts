import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#000000',
        'on-primary': '#ffffff',
        ink: {
          DEFAULT: '#000000',
          deep: '#090909',
        },
        charcoal: '#525252',
        body: '#737373',
        mute: '#a3a3a3',
        canvas: {
          DEFAULT: '#ffffff',
          dark: '#0a0a0a',
        },
        surface: {
          soft: '#fafafa',
          card: '#ffffff',
          dark: '#171717',
          'dark-card': '#121212',
          'dark-soft': '#1c1c1c',
        },
        hairline: {
          DEFAULT: '#e5e5e5',
          strong: '#d4d4d4',
          dark: '#262626',
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
