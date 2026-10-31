import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';

import { Navbar } from './components/layout/Navbar.js';
import { Footer } from './components/layout/Footer.js';
import { PlayerBar } from './components/player/PlayerBar.js';
import { MiniVideo } from './components/player/MiniVideo.js';
import { LyricsDrawer } from './components/lyrics/LyricsDrawer.js';
import { QueueDrawer } from './components/player/QueueDrawer.js';

import { Home } from './pages/Home.js';
import { SearchPage } from './pages/Search.js';
import { LibraryPage } from './pages/Library.js';
import { PlaylistDetailPage } from './pages/PlaylistDetail.js';
import { AlbumDetailPage } from './pages/AlbumDetail.js';
import { ArtistsPage } from './pages/Artists.js';
import { ArtistDetailPage } from './pages/ArtistDetail.js';
import { CreditsPage } from './pages/Credits.js';
import { AuthPage } from './pages/Auth.js';
import { ProfilePage } from './pages/Profile.js';
import { AdminDashboard } from './pages/AdminDashboard.js';

import { useAuthStore } from './stores/auth-store.js';
import { usePlayerStore } from './stores/player-store.js';
import { Button } from './components/common/Button.js';
import { ErrorBoundary } from './components/common/ErrorBoundary.js';

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
  const { fetchMe } = useAuthStore();
  const { errorMessage } = usePlayerStore();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
    <div className="min-h-screen flex flex-col bg-canvas dark:bg-canvas-dark text-ink dark:text-on-dark antialiased transition-colors">
      <Navbar />

      {/* Floating Error Toast */}
      {errorMessage && (
        <div className="fixed top-16 right-4 z-50 flex items-center gap-2 p-3 rounded-card bg-red-600 text-white text-xs font-medium shadow-xl animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 pt-6 pb-28">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/artists" element={<ArtistsPage />} />
            <Route path="/artists/:id" element={<ArtistDetailPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
            <Route path="/albums/:id" element={<AlbumDetailPage />} />
            <Route path="/credits" element={<CreditsPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ErrorBoundary>
      </main>

      <Footer />

      {/* Floating Mini Video Window */}
      <MiniVideo />

      {/* Synchronized Lyrics Drawer */}
      <LyricsDrawer />

      {/* Reorderable Queue Drawer */}
      <QueueDrawer />

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
          <AppContent />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

