import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Sun, Moon, User as UserIcon, Shield, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store.js';
import { useThemeStore } from '../../stores/theme-store.js';
import { Button } from '../common/Button.js';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navLinks = [
    { label: 'Khám phá', to: '/' },
    { label: 'Tìm kiếm', to: '/search' },
    { label: 'Thư viện', to: '/library' },
    { label: 'Bản quyền', to: '/credits' },
  ];

  return (
    <header className="sticky top-0 z-40 h-14 bg-canvas/90 dark:bg-canvas-dark/90 backdrop-blur-md border-b border-hairline dark:border-hairline-dark select-none transition-colors">
      <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between gap-4">
        {/* Brand & Nav Links */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="font-display font-bold text-2xl tracking-tight text-ink dark:text-white">
              mq
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-traffic-green" />
          </Link>

          <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`transition-colors py-1 ${
                    isActive
                      ? 'text-ink dark:text-white font-semibold'
                      : 'text-body dark:text-mute hover:text-ink dark:hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Center: Search Pill Input matching DESIGN.md search-pill */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-sm hidden sm:block">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-mute absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm bài hát, nghệ sĩ, album..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-transparent focus:border-hairline-strong dark:focus:border-hairline-dark text-sm text-ink dark:text-on-dark placeholder-mute focus:outline-none transition-all"
            />
          </div>
        </form>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {/* Dark/Light mode toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-pill hover:bg-surface-soft dark:hover:bg-surface-dark-soft text-body dark:text-mute"
            title={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
            aria-label="Đổi theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Admin link */}
          {user?.role === 'ADMIN' && (
            <Link to="/admin">
              <Button variant="secondary" size="sm" icon={<Shield className="w-3.5 h-3.5" />}>
                Admin
              </Button>
            </Link>
          )}

          {/* User Auth or Profile */}
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1 pl-2 rounded-pill border border-hairline dark:border-hairline-dark hover:bg-surface-soft dark:hover:bg-surface-dark-soft transition-colors"
              >
                <span className="text-xs font-medium max-w-[100px] truncate text-ink dark:text-on-dark hidden md:inline">
                  {user.name}
                </span>
                <div className="w-7 h-7 rounded-full overflow-hidden bg-surface-soft shrink-0">
                  <img
                    src={
                      user.avatarUrl ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                    }
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card shadow-xl p-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-2">
                  <Link
                    to="/profile"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-ink dark:text-on-dark hover:bg-surface-soft dark:hover:bg-surface-dark-soft"
                  >
                    <UserIcon className="w-4 h-4" />
                    Hồ sơ cá nhân
                  </Link>
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/auth">
              <Button variant="primary" size="sm">
                Đăng nhập
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
