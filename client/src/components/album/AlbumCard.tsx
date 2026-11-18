import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Heart, MoreHorizontal, ListPlus, Radio, Share2, Check } from 'lucide-react';
import { Album, UnifiedTrack } from '../../types/index.js';
import { formatAlbumArtist } from '../../utils/format.js';
import { usePlayerStore } from '../../stores/player-store.js';
import { useAuthStore } from '../../stores/auth-store.js';
import { useAuthModalStore } from '../../stores/auth-modal-store.js';
import { api } from '../../api/client.js';
import { AlbumPlaceholder } from './AlbumPlaceholder.js';
import { Spinner } from '../common/Loading.js';

interface AlbumCardProps {
  album: Album;
  variant?: 'grid' | 'list';
}

export const AlbumCard: React.FC<AlbumCardProps> = ({ album, variant = 'grid' }) => {
  const navigate = useNavigate();
  const { currentTrack, isPlaying, playTrack, togglePlay, addToQueue } = usePlayerStore();
  const { isAuthenticated } = useAuthStore();
  const { openAuthModal } = useAuthModalStore();

  const [imgSrc, setImgSrc] = useState<string | null>(album.coverUrl || album.fallbackCoverUrl || null);
  const [fallbackLevel, setFallbackLevel] = useState<number>(album.coverUrl ? 0 : album.fallbackCoverUrl ? 1 : 2);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);

  // Sync state if album prop changes
  useEffect(() => {
    const initialUrl = album.coverUrl || album.fallbackCoverUrl || null;
    setImgSrc(initialUrl);
    setFallbackLevel(album.coverUrl ? 0 : album.fallbackCoverUrl ? 1 : 2);
    setIsImageLoaded(false);
  }, [album.id, album.coverUrl, album.fallbackCoverUrl]);

  // Robust fallback chain: 0: coverUrl -> 1: fallbackCoverUrl -> 2: track cover -> 3: yt thumb -> 4: placeholder
  const handleImageError = () => {
    setIsImageLoaded(false);

    if (fallbackLevel === 0 && album.fallbackCoverUrl && album.fallbackCoverUrl !== imgSrc) {
      setFallbackLevel(1);
      setImgSrc(album.fallbackCoverUrl);
      return;
    }

    const firstTrackCover = album.tracks?.find((t) => t.coverUrl && t.coverUrl !== imgSrc)?.coverUrl;
    if (fallbackLevel <= 1 && firstTrackCover) {
      setFallbackLevel(2);
      setImgSrc(firstTrackCover);
      return;
    }

    const ytTrack = album.tracks?.find(
      (t) => typeof t.embedId === 'string' && t.embedId.length === 11
    );
    if (fallbackLevel <= 2 && ytTrack?.embedId) {
      const ytThumb = `https://i.ytimg.com/vi/${ytTrack.embedId}/hqdefault.jpg`;
      if (ytThumb !== imgSrc) {
        setFallbackLevel(3);
        setImgSrc(ytThumb);
        return;
      }
    }

    // Fallback to placeholder
    setFallbackLevel(4);
    setImgSrc(null);
  };

  // Check if current track belongs to this album
  const isThisAlbumPlaying =
    Boolean(currentTrack) &&
    ((currentTrack?.album &&
      currentTrack.album.toLowerCase().trim() === album.title.toLowerCase().trim()) ||
      (currentTrack?.id && album.tracks?.some((t) => t.id === currentTrack.id)));

  // Check if release is within 60 days for "Mới" badge
  const isNew = (() => {
    if (!album.releaseDate) return false;
    const releaseTime = new Date(album.releaseDate).getTime();
    if (isNaN(releaseTime)) return false;
    const now = Date.now();
    const diffDays = (now - releaseTime) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 60;
  })();

  const artistName = formatAlbumArtist(album.artist);
  const trackCount =
    album.tracks && album.tracks.length > 0
      ? album.tracks.length
      : (album.tracksCount ?? 0);
  const artistLink =
    album.artistSlug
      ? `/artists/${album.artistSlug}`
      : album.artistId
      ? `/artists/${album.artistId}`
      : `/search?q=${encodeURIComponent(artistName)}`;

  // Handle Play Album click
  const handlePlayAlbum = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isThisAlbumPlaying) {
      togglePlay();
      return;
    }

    // If album already has tracks in memory
    if (album.tracks && album.tracks.length > 0) {
      playTrack(album.tracks[0], album.tracks);
      return;
    }

    // Otherwise fetch album tracks from API
    try {
      setIsLoadingTracks(true);
      const res = await api.get(`/albums/${album.id}`);
      const tracks = res.data?.tracks as UnifiedTrack[];
      if (tracks && tracks.length > 0) {
        playTrack(tracks[0], tracks);
      }
    } catch (err) {
      console.error('Failed to play album tracks:', err);
    } finally {
      setIsLoadingTracks(false);
    }
  };

  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isAuthenticated) {
      openAuthModal({
        title: 'Lưu album yêu thích',
        message: `Đăng nhập để lưu album "${album.title}" vào thư viện của bạn.`,
        iconType: 'heart',
      });
      return;
    }
    setIsLiked(!isLiked);
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowMenu(!showMenu);
  };

  const handleAddAllToQueue = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowMenu(false);

    try {
      let tracks = album.tracks;
      if (!tracks || tracks.length === 0) {
        const res = await api.get(`/albums/${album.id}`);
        tracks = res.data?.tracks;
      }
      if (tracks && tracks.length > 0) {
        tracks.forEach((t) => addToQueue(t));
      }
    } catch (err) {
      console.error('Failed to add album to queue:', err);
    }
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const url = `${window.location.origin}/albums/${album.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setShowMenu(false);
    }, 1500);
  };

  if (variant === 'list') {
    return (
      <div
        onClick={() => navigate(`/albums/${album.id}`)}
        className="group relative flex items-center gap-3.5 sm:gap-4 p-3 rounded-2xl bg-white dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-surface-soft/50 dark:hover:bg-neutral-800/60 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer select-none"
      >
        {/* Square Thumbnail */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0 shadow-inner">
          {fallbackLevel >= 4 || !imgSrc ? (
            <AlbumPlaceholder title={album.title} artist={artistName} />
          ) : (
            <img
              src={imgSrc}
              alt={`Ảnh bìa album ${album.title} - ${artistName}`}
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
              onLoad={() => setIsImageLoaded(true)}
              onError={handleImageError}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          )}
        </div>

        {/* Center Info */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {isNew && (
              <span className="px-2 py-0.5 rounded-pill bg-emerald-500 text-white font-sans font-black text-[10px] tracking-wider uppercase">
                MỚI
              </span>
            )}
            <h4
              title={album.title}
              className="font-display font-bold text-sm sm:text-base text-neutral-900 dark:text-white truncate group-hover:text-traffic-green transition-colors"
            >
              {album.title}
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-600 dark:text-neutral-400">
            <span
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                navigate(artistLink);
              }}
              className="hover:text-black dark:hover:text-white hover:underline transition-colors truncate max-w-[180px]"
            >
              {artistName}
            </span>
            <span>·</span>
            <span>{album.year || (album.releaseDate ? new Date(album.releaseDate).getFullYear() : 2024)}</span>
            <span>·</span>
            <span className="capitalize">
              {album.genre ? album.genre.replace('-', ' ') : 'Album'}
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0 relative">
          <span className="hidden sm:inline-block px-2.5 py-1 rounded-pill bg-surface-soft dark:bg-neutral-800 border border-hairline dark:border-hairline-dark text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
            {trackCount} bài
          </span>

          <button
            onClick={handleToggleLike}
            className={`p-2 rounded-full transition-all active:scale-90 cursor-pointer ${
              isLiked
                ? 'bg-red-500/15 text-red-500'
                : 'text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            title={isLiked ? 'Đã lưu vào Thư viện' : 'Lưu vào Thư viện'}
            aria-label="Lưu album"
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={handleMenuClick}
            className="p-2 rounded-full text-neutral-400 hover:text-ink dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all active:scale-90 cursor-pointer"
            title="Tùy chọn khác"
            aria-label="Tùy chọn khác"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          <button
            onClick={handlePlayAlbum}
            data-btn-white="true"
            aria-label={isThisAlbumPlaying && isPlaying ? `Tạm dừng ${album.title}` : `Phát album ${album.title}`}
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-95 hover:scale-105 cursor-pointer bg-primary dark:bg-white text-on-primary dark:text-black shrink-0"
          >
            {isLoadingTracks ? (
              <Spinner size="sm" tone="current" label="Đang tải danh sách bài hát" />
            ) : isThisAlbumPlaying && isPlaying ? (
              <div className="flex items-center gap-0.5 h-3.5">
                <span className="w-0.5 bg-current rounded-full animate-pulse h-full" />
                <span className="w-0.5 bg-current rounded-full animate-pulse h-2" style={{ animationDelay: '150ms' }} />
                <span className="w-0.5 bg-current rounded-full animate-pulse h-3.5" style={{ animationDelay: '300ms' }} />
              </div>
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          {showMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute top-12 right-0 z-20 w-44 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-2xl py-1 text-xs font-sans text-neutral-800 dark:text-neutral-200 animate-in fade-in zoom-in-95 duration-150"
            >
              <button
                onClick={handleAddAllToQueue}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/70 text-left transition-colors"
              >
                <ListPlus className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                <span>Thêm vào hàng đợi</span>
              </button>
              <button
                onClick={handlePlayAlbum}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/70 text-left transition-colors"
              >
                <Radio className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                <span>Phát toàn bộ album</span>
              </button>
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/70 text-left transition-colors border-t border-neutral-100 dark:border-neutral-700"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500 font-medium">Đã sao chép</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                    <span>Sao chép liên kết</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => navigate(`/albums/${album.id}`)}
      className="group relative flex flex-col p-3 rounded-2xl bg-white dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer motion-reduce:transform-none select-none"
    >
      {/* Subtle cover-derived ambient glow on hover */}
      {imgSrc && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-3 -bottom-2 h-16 rounded-2xl opacity-0 group-hover:opacity-35 blur-xl transition-opacity duration-300 -z-10 overflow-hidden"
        >
          <img src={imgSrc} alt="" className="w-full h-full object-cover scale-125" />
        </div>
      )}
      {/* 1:1 Square Cover Container */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 shadow-inner select-none">
        {/* Fallback Cover on Error or Missing URL */}
        {fallbackLevel >= 4 || !imgSrc ? (
          <AlbumPlaceholder title={album.title} artist={artistName} />
        ) : (
          <>
            {/* Smooth Skeleton Pulse while loading */}
            <div
              className={`absolute inset-0 bg-neutral-200 dark:bg-neutral-800 animate-pulse transition-opacity duration-300 pointer-events-none ${
                isImageLoaded ? 'opacity-0' : 'opacity-100'
              }`}
            />
            <img
              src={imgSrc}
              alt={`Ảnh bìa album ${album.title} - ${artistName}`}
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
              onLoad={() => setIsImageLoaded(true)}
              onError={handleImageError}
              className={`absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-all duration-300 motion-reduce:transform-none block ${
                isImageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </>
        )}

        {/* Top Badges & Actions */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10 pointer-events-none">
          {/* "MỚI" Badge */}
          <div className="flex items-center gap-1 pointer-events-auto">
            {isNew && (
              <span className="px-2 py-0.5 rounded-pill bg-emerald-500 text-white font-sans font-black text-[10px] shadow-md tracking-wider uppercase">
                MỚI
              </span>
            )}
          </div>

          {/* Top-Right Action Buttons (Heart + More) */}
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 pointer-events-auto">
            <button
              onClick={handleToggleLike}
              className={`p-1.5 rounded-full backdrop-blur-md transition-all shadow-md active:scale-90 ${
                isLiked
                  ? 'bg-red-500 text-white'
                  : 'bg-black/50 hover:bg-black/70 text-white hover:text-red-400'
              }`}
              title={isLiked ? 'Đã lưu vào Thư viện' : 'Lưu vào Thư viện'}
              aria-label="Lưu album"
            >
              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={handleMenuClick}
              className="p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-all shadow-md active:scale-90"
              title="Tùy chọn khác"
              aria-label="Tùy chọn khác"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dropdown Menu */}
        {showMenu && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-10 right-2 z-20 w-44 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-2xl py-1 text-xs font-sans text-neutral-800 dark:text-neutral-200 animate-in fade-in zoom-in-95 duration-150"
          >
            <button
              onClick={handleAddAllToQueue}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/70 text-left transition-colors"
            >
              <ListPlus className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
              <span>Thêm vào hàng đợi</span>
            </button>
            <button
              onClick={handlePlayAlbum}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/70 text-left transition-colors"
            >
              <Radio className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
              <span>Phát toàn bộ album</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/70 text-left transition-colors border-t border-neutral-100 dark:border-neutral-700"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-medium">Đã sao chép</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                  <span>Sao chép liên kết</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Bottom-Left Track Count Pill with high contrast blur background */}
        <div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-none">
          <span className="px-2 py-0.5 rounded-pill bg-black/75 backdrop-blur-md text-white font-sans font-semibold text-[10px] shadow-sm tracking-wide border border-white/10 pointer-events-auto">
            {trackCount} bài
          </span>
        </div>

        {/* Bottom-Right Round Play / Pause Button with Mini Equalizer */}
        <div className="absolute bottom-2.5 right-2.5 z-10">
          <button
            onClick={handlePlayAlbum}
            data-btn-white="true"
            aria-label={isThisAlbumPlaying && isPlaying ? `Tạm dừng ${album.title}` : `Phát album ${album.title}`}
            className={`w-11 h-11 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 active:scale-95 cursor-pointer bg-white dark:bg-white text-black border border-white/20 ${
              isThisAlbumPlaying
                ? 'opacity-100 translate-y-0 scale-100'
                : 'opacity-90 sm:opacity-0 sm:group-hover:opacity-100 sm:translate-y-2 sm:group-hover:translate-y-0 hover:scale-105'
            }`}
          >
            {isLoadingTracks ? (
              <Spinner size="sm" tone="current" label="Đang tải danh sách bài hát" />
            ) : isThisAlbumPlaying && isPlaying ? (
              <div className="flex items-center gap-0.5 h-3.5">
                <span className="w-0.5 bg-black rounded-full animate-pulse h-full" />
                <span className="w-0.5 bg-black rounded-full animate-pulse h-2" style={{ animationDelay: '150ms' }} />
                <span className="w-0.5 bg-black rounded-full animate-pulse h-3.5" style={{ animationDelay: '300ms' }} />
                <span className="w-0.5 bg-black rounded-full animate-pulse h-1.5" style={{ animationDelay: '450ms' }} />
              </div>
            ) : (
              <Play className="w-4 h-4 fill-black text-black ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* Album Info */}
      <div className="pt-3 pb-1 space-y-1">
        {/* Title: max 2 lines with tooltip */}
        <h4
          title={album.title}
          className="font-display font-bold text-sm text-neutral-900 dark:text-white line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
        >
          {album.title}
        </h4>

        {/* Artist: 1 line truncate with link */}
        <div className="truncate">
          <span
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              navigate(artistLink);
            }}
            title={artistName}
            className="text-xs font-sans text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:underline transition-colors"
          >
            {artistName}
          </span>
        </div>

        {/* Sub-info: Year • Genre */}
        <div className="flex items-center gap-1.5 text-[11px] font-sans font-medium text-neutral-500 dark:text-neutral-400 pt-0.5">
          <span>{album.year || (album.releaseDate ? new Date(album.releaseDate).getFullYear() : 2024)}</span>
          <span>•</span>
          <span className="text-neutral-700 dark:text-neutral-300 font-medium capitalize">
            {album.genre ? album.genre.replace('-', ' ') : 'Album'}
          </span>
        </div>
      </div>
    </div>
  );
};
