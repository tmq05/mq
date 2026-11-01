import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Heart, MoreHorizontal, Disc3, ListPlus, Radio, Share2, Check } from 'lucide-react';
import { Album, UnifiedTrack } from '../../types/index.js';
import { formatAlbumArtist } from '../../utils/format.js';
import { usePlayerStore } from '../../stores/player-store.js';
import { api } from '../../api/client.js';

interface AlbumCardProps {
  album: Album;
}

export const AlbumCard: React.FC<AlbumCardProps> = ({ album }) => {
  const navigate = useNavigate();
  const { currentTrack, isPlaying, playTrack, togglePlay, addToQueue } = usePlayerStore();

  const [imageError, setImageError] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);

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

  return (
    <div
      onClick={() => navigate(`/albums/${album.id}`)}
      className="group relative flex flex-col p-3 rounded-2xl bg-white dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer motion-reduce:transform-none select-none"
    >
      {/* 1:1 Square Cover Container */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 shadow-inner">
        {/* Fallback Cover on Error */}
        {imageError || !album.coverUrl ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-950 via-neutral-900 to-neutral-950 text-neutral-400 p-4">
            <Disc3 className="w-12 h-12 stroke-1 text-neutral-500 animate-spin-slow" />
            <span className="text-[10px] font-sans font-medium mt-2 text-center text-neutral-400 truncate max-w-full">
              {album.title}
            </span>
          </div>
        ) : (
          <img
            src={album.coverUrl}
            alt={album.title}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300 motion-reduce:transform-none"
          />
        )}

        {/* Top Badges & Actions */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10 pointer-events-none">
          {/* Track count & "MỚI" Badge */}
          <div className="flex items-center gap-1 pointer-events-auto">
            {isNew && (
              <span className="px-2 py-0.5 rounded-pill bg-emerald-500 text-white font-sans font-black text-[10px] shadow-md tracking-wider uppercase">
                MỚI
              </span>
            )}
            <span className="px-2 py-0.5 rounded-pill bg-black/60 backdrop-blur-md text-white font-sans font-semibold text-[10px] shadow-sm tracking-wide">
              {album.tracksCount || (album.tracks ? album.tracks.length : 10)} bài
            </span>
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
              <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
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

        {/* Sub-info: Year • Tracks count */}
        <div className="flex items-center gap-1.5 text-[11px] font-sans font-medium text-neutral-500 dark:text-neutral-400 pt-0.5">
          <span>{album.year || (album.releaseDate ? new Date(album.releaseDate).getFullYear() : 2024)}</span>
          <span>•</span>
          <span className="text-neutral-700 dark:text-neutral-300 font-semibold">
            {album.tracksCount || (album.tracks ? album.tracks.length : 10)} bài hát
          </span>
        </div>
      </div>
    </div>
  );
};
