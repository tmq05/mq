export interface GenreStyle {
  gradient: string;
  color: string;
}

export const GENRE_STYLES_MAP: Record<string, GenreStyle> = {
  'v-pop': {
    gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
    color: '#10b981',
  },
  'nhac-tre': {
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)',
    color: '#06b6d4',
  },
  'indie-viet': {
    gradient: 'linear-gradient(135deg, #6366f1 0%, #0284c7 100%)',
    color: '#6366f1',
  },
  'rap-viet': {
    gradient: 'linear-gradient(135deg, #f97316 0%, #b45309 100%)',
    color: '#f97316',
  },
  'bolero': {
    gradient: 'linear-gradient(135deg, #9f1239 0%, #581c87 100%)',
    color: '#9f1239',
  },
  'nhac-trinh': {
    gradient: 'linear-gradient(135deg, #b45309 0%, #44403c 100%)',
    color: '#b45309',
  },
  'pop': {
    gradient: 'linear-gradient(135deg, #ec4899 0%, #e11d48 100%)',
    color: '#ec4899',
  },
  'hip-hop': {
    gradient: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
    color: '#f97316',
  },
  'rock': {
    gradient: 'linear-gradient(135deg, #dc2626 0%, #1e1e1e 100%)',
    color: '#dc2626',
  },
  'edm': {
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #4f46e5 100%)',
    color: '#8b5cf6',
  },
  'jazz': {
    gradient: 'linear-gradient(135deg, #d97706 0%, #78350f 100%)',
    color: '#d97706',
  },
  'r-and-b': {
    gradient: 'linear-gradient(135deg, #c026d3 0%, #be185d 100%)',
    color: '#c026d3',
  },
  'chill': {
    gradient: 'linear-gradient(135deg, #14b8a6 0%, #059669 100%)',
    color: '#14b8a6',
  },
  'lo-fi': {
    gradient: 'linear-gradient(135deg, #a855f7 0%, #db2777 100%)',
    color: '#a855f7',
  },
  'workout': {
    gradient: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
    color: '#ef4444',
  },
  'study': {
    gradient: 'linear-gradient(135deg, #2563eb 0%, #1e1b4b 100%)',
    color: '#2563eb',
  },
  'driving': {
    gradient: 'linear-gradient(135deg, #0284c7 0%, #0e7490 100%)',
    color: '#0284c7',
  },
  'sleep': {
    gradient: 'linear-gradient(135deg, #475569 0%, #0f172a 100%)',
    color: '#475569',
  },
};

export function getGenreGradient(slug?: string): string {
  if (!slug) return 'linear-gradient(135deg, #10b981 0%, #047857 100%)';
  const match = GENRE_STYLES_MAP[slug.toLowerCase().trim()];
  return match?.gradient || 'linear-gradient(135deg, #10b981 0%, #047857 100%)';
}

export function getGenreColor(slug?: string): string {
  if (!slug) return '#10b981';
  const match = GENRE_STYLES_MAP[slug.toLowerCase().trim()];
  return match?.color || '#10b981';
}
