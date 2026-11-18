import React from 'react';
import { Link } from 'react-router-dom';
import { usePlayerStore } from '../../stores/player-store.js';

export const Footer: React.FC = () => {
  const hasPlayerBar = usePlayerStore((s) => Boolean(s.currentTrack));

  return (
    <footer
      className={`w-full bg-canvas dark:bg-canvas-dark border-t border-hairline dark:border-hairline-dark py-6 px-6 text-xs text-body dark:text-mute select-none transition-all ${
        hasPlayerBar ? 'mb-24' : 'mb-0'
      }`}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link to="/" className="hover:text-ink dark:hover:text-white transition-colors">
            Khám phá
          </Link>
          <Link to="/search" className="hover:text-ink dark:hover:text-white transition-colors">
            Tìm kiếm
          </Link>
          <Link to="/library" className="hover:text-ink dark:hover:text-white transition-colors">
            Thư viện cá nhân
          </Link>
          <Link to="/credits" className="hover:text-ink dark:hover:text-white transition-colors">
            Nguồn nhạc & Bản quyền API
          </Link>
          <a
            href="https://lrclib.net"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ink dark:hover:text-white transition-colors"
          >
            LRCLIB Synced Lyrics
          </a>
        </div>

        <div className="flex items-center gap-2 text-mute">
          <span>mq</span>
          <span>·</span>
          <span>© 2026 mq. Trải nghiệm âm nhạc tối giản & liền mạch.</span>
        </div>
      </div>
    </footer>
  );
};

