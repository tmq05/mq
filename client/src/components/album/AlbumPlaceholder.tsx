import React from 'react';
import { Disc3 } from 'lucide-react';

interface AlbumPlaceholderProps {
  title: string;
  artist?: string;
  className?: string;
}

// 12 curated harmonious gradients with high contrast in both light & dark mode
const PALETTES = [
  {
    bg: 'from-violet-900 via-indigo-900 to-slate-950',
    ring: 'rgba(167, 139, 250, 0.25)',
    accent: '#a78bfa',
    badge: 'bg-violet-500/20 text-violet-200 border-violet-400/30',
  },
  {
    bg: 'from-rose-900 via-pink-900 to-neutral-950',
    ring: 'rgba(251, 113, 133, 0.25)',
    accent: '#fb7185',
    badge: 'bg-rose-500/20 text-rose-200 border-rose-400/30',
  },
  {
    bg: 'from-emerald-900 via-teal-900 to-slate-950',
    ring: 'rgba(52, 211, 153, 0.25)',
    accent: '#34d399',
    badge: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30',
  },
  {
    bg: 'from-amber-900 via-orange-950 to-stone-950',
    ring: 'rgba(251, 191, 36, 0.25)',
    accent: '#fbbf24',
    badge: 'bg-amber-500/20 text-amber-200 border-amber-400/30',
  },
  {
    bg: 'from-blue-900 via-indigo-950 to-slate-950',
    ring: 'rgba(96, 165, 250, 0.25)',
    accent: '#60a5fa',
    badge: 'bg-blue-500/20 text-blue-200 border-blue-400/30',
  },
  {
    bg: 'from-fuchsia-900 via-purple-950 to-neutral-950',
    ring: 'rgba(232, 121, 249, 0.25)',
    accent: '#e879f9',
    badge: 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/30',
  },
  {
    bg: 'from-cyan-900 via-teal-950 to-slate-950',
    ring: 'rgba(34, 211, 238, 0.25)',
    accent: '#22d3ee',
    badge: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/30',
  },
  {
    bg: 'from-red-950 via-rose-950 to-neutral-950',
    ring: 'rgba(248, 113, 113, 0.25)',
    accent: '#f87171',
    badge: 'bg-red-500/20 text-red-200 border-red-400/30',
  },
  {
    bg: 'from-teal-900 via-emerald-950 to-neutral-950',
    ring: 'rgba(45, 212, 191, 0.25)',
    accent: '#2dd4bf',
    badge: 'bg-teal-500/20 text-teal-200 border-teal-400/30',
  },
  {
    bg: 'from-indigo-900 via-blue-950 to-slate-950',
    ring: 'rgba(129, 140, 248, 0.25)',
    accent: '#818cf8',
    badge: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30',
  },
  {
    bg: 'from-stone-900 via-neutral-900 to-black',
    ring: 'rgba(214, 211, 209, 0.25)',
    accent: '#d6d3d1',
    badge: 'bg-stone-500/20 text-stone-200 border-stone-400/30',
  },
  {
    bg: 'from-purple-950 via-slate-900 to-neutral-950',
    ring: 'rgba(192, 132, 252, 0.25)',
    accent: '#c084fc',
    badge: 'bg-purple-500/20 text-purple-200 border-purple-400/30',
  },
];

function hashTitle(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getInitials(title: string): string {
  const clean = title.replace(/[^\p{L}\p{N}\s]/gu, '').trim();
  if (!clean) return 'MQ';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

export const AlbumPlaceholder: React.FC<AlbumPlaceholderProps> = ({
  title,
  artist,
  className = '',
}) => {
  const hash = hashTitle(title || 'mq');
  const palette = PALETTES[hash % PALETTES.length];
  const initials = getInitials(title);

  return (
    <div
      className={`relative w-full h-full bg-gradient-to-br ${palette.bg} flex flex-col justify-between p-3.5 select-none overflow-hidden ${className}`}
    >
      {/* Vinyl concentric groove lines (SVG decorative background) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="0.75" />
        <circle cx="100" cy="100" r="75" fill="none" stroke="currentColor" strokeWidth="0.75" />
        <circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" strokeWidth="0.75" />
        <circle cx="100" cy="100" r="45" fill="none" stroke="currentColor" strokeWidth="0.75" />
        <circle cx="100" cy="100" r="30" fill="none" stroke="currentColor" strokeWidth="0.75" />
      </svg>

      {/* Top row: Subtle initial monogram pill */}
      <div className="relative z-10 flex items-center justify-between">
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-bold tracking-wider uppercase border backdrop-blur-md shadow-sm ${palette.badge}`}
        >
          {initials}
        </span>
      </div>

      {/* Center: Stylized vinyl disc with spinning icon */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto">
        <div className="relative w-14 h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
          <Disc3
            className="w-8 h-8 stroke-1 text-white/90 animate-spin-slow"
            style={{ color: palette.accent }}
          />
          {/* Spindle hole */}
          <div className="absolute w-2 h-2 rounded-full bg-neutral-900 border border-white/40" />
        </div>
      </div>

      {/* Bottom info: Album title + Artist */}
      <div className="relative z-10 pt-2 text-center">
        <p
          className="text-xs font-display font-bold text-white drop-shadow-md truncate max-w-full leading-tight"
          title={title}
        >
          {title}
        </p>
        {artist && (
          <p className="text-[10px] font-sans text-white/70 truncate mt-0.5" title={artist}>
            {artist}
          </p>
        )}
      </div>
    </div>
  );
};

