import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon, Youtube, Music, User, AlertCircle } from 'lucide-react';
import { api } from '../api/client.js';
import { SongRow } from '../components/song/SongRow.js';
import { UnifiedTrack, UnifiedArtist } from '../types/index.js';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [activeSource, setActiveSource] = useState<string>('all');
  const [includeYouTube, setIncludeYouTube] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tookMs, setTookMs] = useState<number | null>(null);

  const [tracks, setTracks] = useState<UnifiedTrack[]>([]);
  const [artists, setArtists] = useState<UnifiedArtist[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce search effect (300ms)
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setTracks([]);
      setArtists([]);
      setTookMs(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const timer = setTimeout(() => {
      // Abort previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const sourcesParam = activeSource === 'all' ? undefined : activeSource;

      api
        .get('/search', {
          params: {
            q: trimmed,
            type: 'all',
            sources: sourcesParam,
            includeYouTube: includeYouTube || activeSource === 'youtube',
          },
          signal: abortControllerRef.current.signal,
        })
        .then((res) => {
          const data = res.data.data;
          setTracks(data.tracks || []);
          setArtists(data.artists || []);
          setTookMs(res.data.tookMs);
        })
        .catch((err) => {
          if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
            console.error('Search error:', err);
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [query, activeSource, includeYouTube]);

  const sourcesList = [
    { id: 'all', label: 'Tất cả nguồn' },
    { id: 'spotify', label: 'Spotify' },
    { id: 'zingmp3', label: 'Zing MP3' },
    { id: 'youtube', label: 'YouTube' },
    { id: 'audius', label: 'Audius' },
    { id: 'jamendo', label: 'Jamendo' },
    { id: 'itunes', label: 'Apple Music' },
  ];

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      {/* Search Input Box */}
      <div className="pt-4 max-w-2xl mx-auto space-y-4">
        <div className="relative flex items-center">
          <SearchIcon className="w-5 h-5 text-mute absolute left-4 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm kiếm bài hát, ca sĩ, album hoặc thể loại..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchParams({ q: e.target.value });
            }}
            autoFocus
            className="w-full h-12 pl-12 pr-4 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-base text-ink dark:text-on-dark placeholder-mute focus:outline-none focus:ring-2 focus:ring-ink dark:focus:ring-white transition-all shadow-subtle"
          />
        </div>

        {/* Source Filter Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {sourcesList.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setActiveSource(s.id);
                if (s.id === 'youtube') setIncludeYouTube(true);
              }}
              className={`px-3.5 py-1.5 rounded-pill text-xs font-sans transition-all cursor-pointer ${
                activeSource === s.id
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-black font-semibold shadow-sm'
                  : 'bg-white dark:bg-neutral-800/90 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 font-medium'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Query stats & YouTube expand CTA */}
      {query.trim() && (
        <div className="flex flex-wrap items-center justify-between text-xs text-mute border-b border-hairline dark:border-hairline-dark pb-3">
          <span>
            {isLoading
              ? 'Đang tìm kiếm trên các nền tảng...'
              : `Tìm thấy ${tracks.length} bài hát${tookMs !== null ? ` trong ${tookMs}ms` : ''}`}
          </span>

          {!includeYouTube && activeSource !== 'youtube' && (
            <button
              onClick={() => setIncludeYouTube(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
            >
              <Youtube className="w-3.5 h-3.5" />
              Tìm thêm kết quả trên YouTube
            </button>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && query.trim() && tracks.length === 0 && artists.length === 0 && (
        <div className="py-20 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-mute mx-auto stroke-1" />
          <h3 className="font-semibold text-base text-ink dark:text-white">
            Không tìm thấy kết quả phù hợp
          </h3>
          <p className="text-xs text-mute max-w-sm mx-auto">
            Hãy thử tìm bằng từ khóa khác hoặc bấm nút "Tìm thêm trên YouTube" để mở rộng tìm kiếm.
          </p>
        </div>
      )}

      {/* Tracks Results */}
      {tracks.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-ink dark:text-white" />
            <h3 className="font-display font-bold text-lg text-ink dark:text-white">Bài hát</h3>
          </div>
          <div className="space-y-1">
            {tracks.map((track, idx) => (
              <SongRow
                key={`${track.id}-${idx}`}
                track={track}
                index={idx}
                queueContext={tracks}
              />
            ))}
          </div>
        </section>
      )}

      {/* Artists Results */}
      {artists.length > 0 && (
        <section className="space-y-3 pt-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-ink dark:text-white" />
            <h3 className="font-display font-bold text-lg text-ink dark:text-white">Nghệ sĩ</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {artists.map((artist) => (
              <Link
                key={artist.id}
                to={`/artists/${artist.id}`}
                className="group flex flex-col items-center text-center p-3 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card hover:bg-surface-soft dark:hover:bg-surface-dark-soft transition-all duration-200 cursor-pointer"
              >
                <div className="w-20 h-20 rounded-full overflow-hidden bg-surface-soft mb-2.5 border border-hairline dark:border-hairline-dark group-hover:scale-105 transition-transform duration-300">
                  <img
                    src={artist.imageUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=80'}
                    alt={artist.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <span className="font-semibold text-sm truncate text-ink dark:text-white w-full group-hover:underline">
                  {artist.name}
                </span>
                <span className="text-[11px] text-mute">Nghệ sĩ</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
