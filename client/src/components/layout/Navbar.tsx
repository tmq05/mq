import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Sun, Moon, User as UserIcon, Shield, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store.js';
import { useThemeStore } from '../../stores/theme-store.js';
import { Button } from '../common/Button.js';
import { UserAvatar } from '../common/UserAvatar.js';
import { createThemeSwitch } from '../pinui/theme-switch-engine.js';
import { ThemeSwitchModal } from '../pinui/ThemeSwitchModal.js';
import { SearchCard } from '../pinui/SearchCard.js';
import { SegmentedNavbarTabs } from './SegmentedNavbarTabs.js';
import { BrandLogo } from './BrandLogo.js';
import '../pinui/theme-switch.css';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { isDark, setTheme, effect, sound } = useThemeStore();

  const [searchOpen, setSearchOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const userDropdownRef = useRef<HTMLDivElement>(null);
  const themeBtnRef = useRef<HTMLButtonElement>(null);
  const transitionRootRef = useRef<HTMLDivElement>(null);
  const transitionFxRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ReturnType<typeof createThemeSwitch> | null>(null);

  const effectRef = useRef(effect);
  const soundRef = useRef(sound);
  useEffect(() => {
    effectRef.current = effect;
    soundRef.current = sound;
  }, [effect, sound]);

  useEffect(() => {
    const root = transitionRootRef.current;
    const button = themeBtnRef.current;
    const fx = transitionFxRef.current;
    if (!root || !button || !fx) return;

    const engine = createThemeSwitch({
      root,
      button,
      fx,
      effect: () => effectRef.current,
      sound: () => soundRef.current,
      onCommit: (nextTheme) => {
        setTheme(nextTheme === 'dark');
      },
    });
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [setTheme]);

  useEffect(() => {
    const root = transitionRootRef.current;
    if (!root || engineRef.current?.busy()) return;
    root.dataset.theme = isDark ? 'dark' : 'light';
  }, [isDark]);

  // Đóng menu hồ sơ cá nhân khi click ra ngoài hoặc nhấn Esc
  useEffect(() => {
    if (!userDropdownOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserDropdownOpen(false);
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [userDropdownOpen]);

  return (
    <>
      <header className={`sticky top-0 ${searchOpen ? 'z-50' : 'z-40'} min-h-14 bg-canvas/90 dark:bg-canvas-dark/90 backdrop-blur-md border-b border-hairline dark:border-hairline-dark select-none transition-colors`}>
        <div className="max-w-7xl mx-auto h-14 px-4 flex items-center justify-between gap-4">
        {/* Brand & Segmented Control Tabs */}
        <div className="flex items-center gap-3.5 md:gap-4 shrink-0">
          <BrandLogo variant="balanced" />

          <span className="mq-logo-divider hidden md:block" aria-hidden="true" />

          <SegmentedNavbarTabs className="hidden md:inline-flex" />
        </div>

        {/* Center: Search Card with PinUI Morphing Effect */}
        <div className="flex-1 min-w-0 max-w-sm hidden sm:flex items-center justify-center">
          <SearchCard
            mode="navbar"
            theme={isDark ? 'dark' : 'light'}
            onOpenChange={setSearchOpen}
          />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center justify-end gap-2.5 shrink-0">
          {/* Admin / Moderator link (giữ cố định slot trên desktop để không làm lệch thanh Light/Dark mode và Search) */}
          <div className="w-auto sm:w-[116px] flex items-center justify-end shrink-0">
            {(user?.role === 'ADMIN' || user?.role === 'MODERATOR') && (
              <Link to="/admin" className="inline-flex items-center shrink-0">
                <Button variant="secondary" size="sm" className="h-9" icon={<Shield className="w-3.5 h-3.5" />}>
                  {user.role === 'ADMIN' ? 'Admin' : 'Moderator'}
                </Button>
              </Link>
            )}
          </div>

          {/* Dark/Light mode toggle with PinUI Physics & FX */}
          <div className="h-9 flex items-center rounded-pill bg-surface-soft/80 dark:bg-surface-dark-soft/80 px-1 border border-hairline/80 dark:border-hairline-dark/80 shadow-xs shrink-0">
            {/* Main Animated Physics Button */}
            <button
              ref={themeBtnRef}
              type="button"
              onContextMenu={(e) => {
                e.preventDefault();
                setThemeModalOpen(true);
              }}
              className="p-1.5 rounded-pill hover:bg-surface-soft dark:hover:bg-surface-dark-soft text-body dark:text-mute transition-colors cursor-pointer group"
              title={
                isDark
                  ? 'Chuyển sang giao diện Sáng (Chuột phải để đổi hiệu ứng)'
                  : 'Chuyển sang giao diện Tối (Chuột phải để đổi hiệu ứng)'
              }
              aria-label={`Chuyển sang giao diện ${isDark ? 'Sáng' : 'Tối'}`}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 transition-transform group-hover:rotate-45 duration-300" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400 transition-transform group-hover:-rotate-12 duration-300" />
              )}
            </button>

            {/* Quick Effect Settings Trigger */}
            <button
              type="button"
              onClick={() => setThemeModalOpen(true)}
              className="px-1.5 py-0.5 rounded-pill hover:bg-surface-soft dark:hover:bg-surface-dark-soft text-mute hover:text-ink dark:hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
              title={`Hiệu ứng: ${
                effect === 'droplet' ? 'Giọt nước' : effect === 'rain' ? 'Cơn mưa' : 'Pháo hoa Diwali'
              } (Bấm để tùy chỉnh)`}
              aria-label="Cài đặt hiệu ứng chuyển đổi theme"
            >
              <span className="text-xs">
                {effect === 'droplet' ? '💧' : effect === 'rain' ? '🌧️' : '🎆'}
              </span>
            </button>
          </div>

          {/* User Auth or Profile (cố định độ rộng trên desktop để giữ nguyên vị trí thanh Light/Dark mode) */}
          <div className="sm:w-[144px] flex items-center justify-end shrink-0">
            {isAuthenticated && user ? (
              <div ref={userDropdownRef} className="relative inline-flex items-center shrink-0">
                <button
                  type="button"
                  aria-expanded={userDropdownOpen}
                  aria-haspopup="menu"
                  onClick={() => setUserDropdownOpen((v) => !v)}
                  className={`h-9 flex items-center gap-2 px-1.5 pl-2.5 rounded-pill border transition-all active:scale-[0.97] ${
                    userDropdownOpen
                      ? 'border-ink/30 dark:border-white/30 bg-surface-soft dark:bg-surface-dark-soft'
                      : 'border-hairline dark:border-hairline-dark hover:bg-surface-soft dark:hover:bg-surface-dark-soft'
                  }`}
                >
                  <span className="text-xs font-medium max-w-[88px] truncate text-ink dark:text-on-dark hidden md:inline">
                    {user.name}
                  </span>
                  <UserAvatar
                    name={user.name}
                    avatarUrl={user.avatarUrl}
                    size="sm"
                    className="!w-7 !h-7 !text-[11px] font-semibold"
                  />
                </button>

                <AnimatePresence>
                  {userDropdownOpen && (
                    <motion.div
                      role="menu"
                      style={{ transformOrigin: 'top right' }}
                      initial={
                        shouldReduceMotion
                          ? { opacity: 0 }
                          : { opacity: 0, y: -8, scale: 0.96 }
                      }
                      animate={
                        shouldReduceMotion
                          ? { opacity: 1, transition: { duration: 0.1 } }
                          : {
                              opacity: 1,
                              y: 0,
                              scale: 1,
                              transition: {
                                duration: 0.22,
                                ease: [0.32, 0.72, 0, 1],
                              },
                            }
                      }
                      exit={
                        shouldReduceMotion
                          ? { opacity: 0, transition: { duration: 0.1 } }
                          : {
                              opacity: 0,
                              y: -6,
                              scale: 0.96,
                              transition: {
                                duration: 0.15,
                                ease: [0.32, 0.72, 0, 1],
                              },
                            }
                      }
                      className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-hairline dark:border-hairline-dark bg-canvas/95 dark:bg-surface-dark-card/95 backdrop-blur-md shadow-xl p-1.5 z-50 text-xs"
                    >
                      <motion.div
                        initial={shouldReduceMotion ? false : { opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18, delay: shouldReduceMotion ? 0 : 0.03, ease: [0.32, 0.72, 0, 1] }}
                      >
                        <Link
                          to="/profile"
                          role="menuitem"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-ink dark:text-on-dark hover:bg-surface-soft dark:hover:bg-surface-dark-soft transition-colors active:scale-[0.98]"
                        >
                          <UserIcon className="w-4 h-4" />
                          Hồ sơ cá nhân
                        </Link>
                      </motion.div>
                      <motion.div
                        initial={shouldReduceMotion ? false : { opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18, delay: shouldReduceMotion ? 0 : 0.06, ease: [0.32, 0.72, 0, 1] }}
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setUserDropdownOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 text-left transition-colors active:scale-[0.98]"
                        >
                          <LogOut className="w-4 h-4" />
                          Đăng xuất
                        </button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link to="/auth" className="inline-flex items-center shrink-0">
                <Button variant="primary" size="sm" className="h-9 px-4">
                  Đăng nhập
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile horizontal scrollable segmented control */}
      <div className="md:hidden px-3 pb-2.5 flex justify-center">
        <SegmentedNavbarTabs />
      </div>
    </header>

      {/* Fullscreen Theme Transition Canvas & FX Layer */}
      <div
        ref={transitionRootRef}
        className="pts fixed inset-0 pointer-events-none z-[99999] overflow-hidden !bg-transparent !h-screen !w-screen !rounded-none"
        data-theme={isDark ? 'dark' : 'light'}
        data-effect={effect}
        data-fill="true"
        aria-hidden="true"
      >
        <div ref={transitionFxRef} className="pts__fx" aria-hidden="true" />
      </div>

      {/* Theme Switch Configuration Modal */}
      <ThemeSwitchModal
        isOpen={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
      />
    </>
  );
};

