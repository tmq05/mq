import React, { Suspense, lazy, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AlertCircle } from 'lucide-react';
import { SEGMENTED_NAV_CONFIG, getActiveTabIndex } from './components/layout/segmented-nav.config.js';

import { Navbar } from './components/layout/Navbar.js';
import { Footer } from './components/layout/Footer.js';
import { PlayerBar } from './components/player/PlayerBar.js';
import { MiniVideo } from './components/player/MiniVideo.js';
import { LyricsDrawer } from './components/lyrics/LyricsDrawer.js';
import { QueueDrawer } from './components/player/QueueDrawer.js';
import { AddToPlaylistModal } from './components/playlist/AddToPlaylistModal.js';
import { AuthPromptModal } from './components/common/AuthPromptModal.js';
import { ToastContainer } from './components/common/ToastContainer.js';

import { Home } from './pages/Home.js';
import { SearchPage } from './pages/Search.js';
import { LibraryPage } from './pages/Library.js';
import { PlaylistDetailPage } from './pages/PlaylistDetail.js';
import { AlbumDetailPage } from './pages/AlbumDetail.js';
import { ArtistsPage } from './pages/Artists.js';
import { ArtistDetailPage } from './pages/ArtistDetail.js';
import { GenreDetailPage } from './pages/GenreDetail.js';
import { CreditsPage } from './pages/Credits.js';
import { AuthPage } from './pages/Auth.js';
import { ProfilePage } from './pages/Profile.js';
import { AdminDashboard } from './pages/AdminDashboard.js';
import { SpotifyCallbackPage } from './pages/SpotifyCallbackPage.js';

import { useAuthStore } from './stores/auth-store.js';
import { usePlayerStore } from './stores/player-store.js';
import { useLikesStore } from './stores/likes-store.js';
import { useListeningHistoryStore } from './stores/listening-history-store.js';
import { Button } from './components/common/Button.js';
import { ErrorBoundary } from './components/common/ErrorBoundary.js';
import { ScrollToTop } from './components/common/ScrollToTop.js';
import { TopLoadingBar } from './components/common/Loading.js';

const MusicAssistantWidget = lazy(() => import('./components/chat/MusicAssistantWidget.js'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
    },
  },
});

const NotFoundPage: React.FC = () => (
  <div className="py-24 text-center space-y-4">
    <span className="font-display font-extrabold text-6xl text-mute">404</span>
    <h2 className="font-display font-bold text-2xl text-ink dark:text-white">
      Không tìm thấy trang
    </h2>
    <p className="text-sm text-body dark:text-mute max-w-sm mx-auto">
      Trang bạn đang tìm kiếm có thể đã bị di chuyển hoặc không tồn tại.
    </p>
    <Link to="/">
      <Button size="md">Về trang chủ</Button>
    </Link>
  </div>
);

export const AppContent: React.FC = () => {
  const { fetchMe, isAuthenticated, isLoading: isAuthLoading, user } = useAuthStore();
  const { errorMessage } = usePlayerStore();
  const { fetchLikes, clearLikes } = useLikesStore();
  const loadContinueListening = useListeningHistoryStore((s) => s.loadHistory);
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  const currentTabIdx = getActiveTabIndex(location.pathname);
  const prevTabIdxRef = useRef<number>(currentTabIdx);
  const direction =
    currentTabIdx !== -1 &&
    prevTabIdxRef.current !== -1 &&
    currentTabIdx !== prevTabIdxRef.current
      ? currentTabIdx > prevTabIdxRef.current
        ? 1
        : -1
      : 0;

  useEffect(() => {
    prevTabIdxRef.current = currentTabIdx;
  }, [currentTabIdx]);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchLikes();
    } else {
      clearLikes();
    }
  }, [isAuthenticated, fetchLikes, clearLikes]);

  useEffect(() => {
    if (isAuthLoading) return;
    loadContinueListening(isAuthenticated ? user?.id : null);
  }, [isAuthLoading, isAuthenticated, user?.id, loadContinueListening]);

  const pageTransitionVariants = {
    initial: (dir: number) => ({
      opacity: shouldReduceMotion ? 1 : 0,
      x: shouldReduceMotion || dir === 0 ? 0 : dir * SEGMENTED_NAV_CONFIG.contentSlidePx,
    }),
    animate: {
      opacity: 1,
      x: 0,
      transition: shouldReduceMotion
        ? { duration: 0 }
        : {
            duration: SEGMENTED_NAV_CONFIG.durationContentMs / 1000,
            ease: SEGMENTED_NAV_CONFIG.iosEasing,
          },
    },
    exit: (dir: number) => ({
      opacity: shouldReduceMotion ? 1 : 0,
      x: shouldReduceMotion || dir === 0 ? 0 : -dir * SEGMENTED_NAV_CONFIG.contentSlidePx,
      transition: shouldReduceMotion
        ? { duration: 0 }
        : {
            duration: 0.14,
            ease: SEGMENTED_NAV_CONFIG.iosEasing,
          },
    }),
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas dark:bg-canvas-dark text-ink dark:text-on-dark antialiased transition-colors">
      <Navbar />
      <TopLoadingBar />

      {/* Floating Error Toast */}
      {errorMessage && (
        <div className="fixed top-16 right-4 z-50 flex items-center gap-2 p-3 rounded-card bg-red-600 text-white text-xs font-medium shadow-xl animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Content Area with Directional Tab Transitions */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 pt-6 pb-12 overflow-x-clip">
        <ErrorBoundary>
          <AnimatePresence
            mode="wait"
            custom={direction}
            initial={false}
            onExitComplete={() => {
              window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
              if (document.documentElement) document.documentElement.scrollTop = 0;
              if (document.body) document.body.scrollTop = 0;
            }}
          >
            <motion.div
              key={location.pathname}
              custom={direction}
              variants={pageTransitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Routes location={location}>
                <Route path="/" element={<Home />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/artists" element={<ArtistsPage />} />
                <Route path="/artists/:id" element={<ArtistDetailPage />} />
                <Route path="/genres/:slug" element={<GenreDetailPage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
                <Route path="/albums/:id" element={<AlbumDetailPage />} />
                <Route path="/credits" element={<CreditsPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/spotify-callback" element={<SpotifyCallbackPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
      </main>

      <Footer />

      {/* Floating Mini Video Window */}
      <MiniVideo />

      {/* Synchronized Lyrics Drawer */}
      <LyricsDrawer />

      {/* Reorderable Queue Drawer */}
      <QueueDrawer />

      {/* Global Add to Playlist Modal */}
      <AddToPlaylistModal />

      {/* Global Auth Prompt Modal for Likes & Restricted Actions */}
      <AuthPromptModal />

      {/* Global In-App Toast Notifications */}
      <ToastContainer />

      {/* Lazy-loaded AI Music Assistant Chatbot */}
      <Suspense fallback={null}>
        <MusicAssistantWidget />
      </Suspense>

      {/* Uninterrupted Global Player Bar */}
      <PlayerBar />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ScrollToTop />
          <AppContent />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};
