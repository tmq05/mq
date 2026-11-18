import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { NowPlayingHero } from '../components/player/NowPlayingHero.js';
import { usePlayerStore } from '../stores/player-store.js';
import { UnifiedTrack, Genre, Album } from '../types/index.js';
import { useTabDirection } from '../components/layout/SegmentedTabs.js';
import { HeroSpotlight } from '../components/home/HeroSpotlight.js';
import { ContinueListeningSection } from '../components/home/ContinueListeningSection.js';
import { MoodRecommendSection } from '../components/home/MoodRecommendSection.js';
import { ForYouSection } from '../components/home/ForYouSection.js';
import { SectionNav } from '../components/home/SectionNav.js';
import { TrendingCarousel } from '../components/home/TrendingCarousel.js';
import { ChartList } from '../components/home/ChartList.js';
import { ArtistStrip, HomeArtistItem } from '../components/home/ArtistStrip.js';
import { GenreBento } from '../components/home/GenreBento.js';
import { AlbumGrid } from '../components/home/AlbumGrid.js';
import { BackToTopButton } from '../components/home/BackToTopButton.js';

const RECENT_EXPLORE_IDS_KEY = 'mq_explore_recent_ids_v1';

interface ExploreSectionsState {
  trending: UnifiedTrack[];
  vietnamese: UnifiedTrack[];
  fromFallback?: boolean;
}

/** Giữ ổn định danh sách trong cùng 1 phiên chuyển tab SPA; chỉ xáo mới khi reload thật (F5) hoặc bấm Làm mới */
let sessionExploreCache: ExploreSectionsState | null = null;

function readRecentExcludeIds(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_EXPLORE_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(-8) : [];
  } catch {
    return [];
  }
}

function saveRecentIds(trending: UnifiedTrack[], vietnamese: UnifiedTrack[]) {
  try {
    const ids = [...trending.slice(0, 4), ...vietnamese.slice(0, 4)].map((t) => t.id);
    window.localStorage.setItem(RECENT_EXPLORE_IDS_KEY, JSON.stringify(ids.slice(0, 8)));
  } catch {
    // ignore storage quota
  }
}

const GENRE_FILTER_TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'vietnam', label: 'Việt Nam' },
  { id: 'international', label: 'Quốc tế' },
  { id: 'mood', label: 'Tâm trạng & Hoạt động' },
];

const ALBUM_FILTER_TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'newest', label: 'Mới nhất' },
  { id: 'popular', label: 'Thịnh hành' },
  { id: 'v-pop', label: 'V-Pop' },
  { id: 'indie-viet', label: 'Indie Việt' },
  { id: 'rap-viet', label: 'Rap Việt' },
  { id: 'international', label: 'Quốc tế' },
];

export const Home: React.FC = () => {
  const { playTrack, togglePlay, isPlaying, currentTrack } = usePlayerStore();

  const [genreCategory, setGenreCategory] = useState<'all' | 'vietnam' | 'international' | 'mood'>('all');
  const [genreSearch, setGenreSearch] = useState('');
  const [showAllGenres, setShowAllGenres] = useState(false);

  const [albumFilter, setAlbumFilter] = useState<'all' | 'newest' | 'popular' | 'v-pop' | 'indie-viet' | 'rap-viet' | 'international'>('all');
  const [showAllAlbums, setShowAllAlbums] = useState(false);

  const [exploreState, setExploreState] = useState<ExploreSectionsState | null>(sessionExploreCache);
  const [exploreLoading, setExploreLoading] = useState(!sessionExploreCache);
  const [shufflingSection, setShufflingSection] = useState<'trending' | 'vietnamese' | null>(null);
  const [trendingVersion, setTrendingVersion] = useState(0);
  const [vietnameseVersion, setVietnameseVersion] = useState(0);

  const genreBtnRef = useRef<HTMLButtonElement>(null);
  const albumBtnRef = useRef<HTMLButtonElement>(null);

  const genreDirection = useTabDirection(GENRE_FILTER_TABS, genreCategory);
  const albumDirection = useTabDirection(ALBUM_FILTER_TABS, albumFilter);

  const handleToggleCollapse = (
    currentlyExpanded: boolean,
    setExpanded: (v: boolean) => void,
    btnRef: React.RefObject<HTMLButtonElement>
  ) => {
    const next = !currentlyExpanded;
    setExpanded(next);
    if (!next) {
      setTimeout(() => {
        btnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 220);
    }
  };

  // 1 & 2. Khám phá ("Thịnh hành hôm nay" cố định theo ngày + lượt nghe thực tế, "Giai điệu Nhạc Việt" đa dạng)
  useEffect(() => {
    let cancelled = false;
    setExploreLoading(true);
    const excludeIds = readRecentExcludeIds();

    api
      .get('/explore', {
        params: excludeIds.length > 0 ? { excludeIds: excludeIds.join(',') } : undefined,
        headers: { 'Cache-Control': 'no-store' },
      })
      .then((res) => {
        if (cancelled) return;
        const payload: ExploreSectionsState = {
          trending: res.data?.trending || [],
          vietnamese: res.data?.vietnamese || [],
          fromFallback: Boolean(res.data?.fromFallback),
        };
        sessionExploreCache = payload;
        setExploreState(payload);
        saveRecentIds(payload.trending, payload.vietnamese);
      })
      .catch(() => {
        if (!cancelled && sessionExploreCache) {
          setExploreState(sessionExploreCache);
        }
      })
      .finally(() => {
        if (!cancelled) setExploreLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const trendingData = exploreState?.trending;
  const vpopData = exploreState?.vietnamese;
  const trendingLoading = exploreLoading;

  const handleShuffleSection = async (section: 'trending' | 'vietnamese') => {
    if (shufflingSection) return;
    setShufflingSection(section);
    try {
      const currentList = section === 'trending' ? trendingData || [] : vpopData || [];
      const isPlayingInSection = currentTrack && currentList.some((t) => t.id === currentTrack.id);
      const excludeIds = currentList
        .map((t) => t.id)
        .filter((id) => id !== currentTrack?.id);

      const res = await api.post('/explore/shuffle', {
        section,
        excludeIds,
        keepTrack: isPlayingInSection ? currentTrack : null,
      });

      const nextState: ExploreSectionsState = {
        trending:
          section === 'trending' ? res.data?.trending || [] : exploreState?.trending || [],
        vietnamese:
          section === 'vietnamese' ? res.data?.vietnamese || [] : exploreState?.vietnamese || [],
        fromFallback: Boolean(res.data?.fromFallback),
      };

      sessionExploreCache = nextState;
      setExploreState(nextState);
      saveRecentIds(nextState.trending, nextState.vietnamese);

      if (section === 'trending') setTrendingVersion((v) => v + 1);
      else setVietnameseVersion((v) => v + 1);
    } catch {
      // ignore
    } finally {
      setShufflingSection(null);
    }
  };

  // 3. Genres
  const { data: genresData, isLoading: genresLoading } = useQuery({
    queryKey: ['genres'],
    queryFn: async () => {
      const res = await api.get('/genres');
      return res.data.genres as Genre[];
    },
  });

  // 4. Albums
  const { data: albumsData, isLoading: albumsLoading } = useQuery({
    queryKey: ['albums'],
    queryFn: async () => {
      const res = await api.get('/albums');
      return res.data.albums as Album[];
    },
  });

  // 5. Artists
  const { data: artistsData, isLoading: artistsLoading } = useQuery({
    queryKey: ['featured-artists'],
    queryFn: async () => {
      const res = await api.get('/artists');
      return (res.data?.artists || []) as HomeArtistItem[];
    },
  });

  const handlePlayAllTrending = () => {
    if (trendingData && trendingData.length > 0) {
      playTrack(trendingData[0], trendingData);
    }
  };

  const featuredSpotlightTrack = trendingData?.[0];
  const isSpotlightPlaying = Boolean(
    featuredSpotlightTrack && currentTrack?.id === featuredSpotlightTrack.id && isPlaying
  );

  const handlePlaySpotlight = (track: UnifiedTrack) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(track, trendingData);
    }
  };

  return (
    <div className="space-y-10 sm:space-y-12 pb-20">
      {/* 1. Compact 2-Column Hero + Featured Spotlight */}
      <HeroSpotlight
        featuredTrack={featuredSpotlightTrack}
        isLoading={trendingLoading}
        isPlayingCurrentTrack={isSpotlightPlaying}
        onPlayAllTrending={handlePlayAllTrending}
        onPlaySpotlight={handlePlaySpotlight}
      />

      {/* Now Playing Banner (Section cho bài hát đang phát, tự mở rộng height 0 -> auto) */}
      <NowPlayingHero />

      {/* 2. Lời chào theo giờ + Tiếp tục nghe (tự ẩn nếu chưa có lịch sử) */}
      <ContinueListeningSection />

      {/* 3. Gợi ý theo tâm trạng bằng AI */}
      <MoodRecommendSection />

      {/* 4. Dành cho bạn (Gợi ý cá nhân hóa) */}
      <ForYouSection />

      {/* Quick Anchor Navigation Bar */}
      <SectionNav />

      {/* 2. Trending Carousel (Bento #1 + 5 compact cards + Scroll-Snap) */}
      <TrendingCarousel
        tracks={trendingData}
        isLoading={trendingLoading}
        isShuffling={shufflingSection === 'trending'}
        fromFallback={exploreState?.fromFallback}
        version={trendingVersion}
        onShuffle={() => handleShuffleSection('trending')}
        onPlayAll={handlePlayAllTrending}
      />

      {/* 3 & 4. 2-Column Desktop Discovery Block: Vietnamese Chart (~65%) + Featured Artists (~35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 min-w-0">
          <ChartList
            tracks={vpopData}
            isLoading={trendingLoading}
            isShuffling={shufflingSection === 'vietnamese'}
            version={vietnameseVersion}
            onShuffle={() => handleShuffleSection('vietnamese')}
          />
        </div>
        <div className="lg:col-span-4 min-w-0">
          <ArtistStrip artists={artistsData} isLoading={artistsLoading} />
        </div>
      </div>

      {/* 5. Genres Bento Grid with Sticky Filter + Search Bar */}
      <GenreBento
        genres={genresData}
        isLoading={genresLoading}
        genreCategory={genreCategory}
        genreSearch={genreSearch}
        showAllGenres={showAllGenres}
        genreDirection={genreDirection}
        filterTabs={GENRE_FILTER_TABS}
        buttonRef={genreBtnRef}
        onCategoryChange={setGenreCategory}
        onSearchChange={setGenreSearch}
        onToggleExpand={() =>
          handleToggleCollapse(showAllGenres, setShowAllGenres, genreBtnRef)
        }
      />

      {/* 6. Curated Albums with Sticky Filter Tabs + Client Grid/List Toggle */}
      <AlbumGrid
        albums={albumsData}
        isLoading={albumsLoading}
        albumFilter={albumFilter}
        showAllAlbums={showAllAlbums}
        albumDirection={albumDirection}
        filterTabs={ALBUM_FILTER_TABS}
        buttonRef={albumBtnRef}
        onFilterChange={setAlbumFilter}
        onToggleExpand={() =>
          handleToggleCollapse(showAllAlbums, setShowAllAlbums, albumBtnRef)
        }
      />

      {/* Floating Back to Top Button */}
      <BackToTopButton />
    </div>
  );
};
