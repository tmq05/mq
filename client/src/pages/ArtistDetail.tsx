import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Play, Heart, Users, Disc3, Check, ArrowLeft, Music2 } from 'lucide-react';
import { api } from '../api/client.js';
import { SongRow } from '../components/song/SongRow.js';
import { Button } from '../components/common/Button.js';
import { usePlayerStore } from '../stores/player-store.js';
import { useAuthStore } from '../stores/auth-store.js';
import { UnifiedTrack } from '../types/index.js';

interface ArtistDetailResponse {
  id: string;
  dbId?: string;
  name: string;
  bio?: string;
  imageUrl?: string;
  followersCount: number;
  isFollowing?: boolean;
  topTracks: UnifiedTrack[];
  albums: Array<{
    id: string;
    title: string;
    coverUrl?: string;
    releaseDate?: string;
  }>;
}

export const ArtistDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { playTrack } = usePlayerStore();
  const { isAuthenticated } = useAuthStore();

  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, [id]);

  const { data: artist, isLoading, error } = useQuery({
    queryKey: ['artist', id],
    queryFn: async () => {
      const res = await api.get(`/artists/${id}`);
      const data = res.data as ArtistDetailResponse;
      setIsFollowing(Boolean(data.isFollowing));
      setFollowerCount(data.followersCount || 0);
      return data;
    },
    enabled: Boolean(id),
  });

  const handlePlayAll = () => {
    if (artist && artist.topTracks.length > 0) {
      playTrack(artist.topTracks[0], artist.topTracks);
    }
  };

  const handleToggleFollow = async () => {
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để theo dõi nghệ sĩ này');
      return;
    }
    try {
      const res = await api.post(`/artists/${id}/follow`);
      const nowFollowing = res.data.isFollowing;
      setIsFollowing(nowFollowing);
      setFollowerCount((prev) => (nowFollowing ? prev + 1 : Math.max(0, prev - 1)));
    } catch (err: any) {
      console.error('Follow error:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <span className="w-8 h-8 border-2 border-ink dark:border-white border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-sans text-mute">Đang tải thông tin nghệ sĩ...</span>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="py-24 text-center space-y-4 max-w-md mx-auto">
        <Music2 className="w-12 h-12 text-mute mx-auto stroke-1" />
        <h2 className="font-display font-bold text-2xl text-ink dark:text-white">
          Không tìm thấy nghệ sĩ
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Nghệ sĩ bạn đang tìm kiếm không tồn tại hoặc đã bị thay đổi liên kết.
        </p>
        <Link to="/artists">
          <Button variant="secondary" icon={<ArrowLeft className="w-4 h-4 mr-1" />}>
            Về danh sách nghệ sĩ
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-16 max-w-7xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          to="/artists"
          className="inline-flex items-center gap-1.5 text-xs font-sans font-medium text-neutral-500 hover:text-ink dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại danh sách nghệ sĩ</span>
        </Link>
      </div>

      {/* Hero Header */}
      <section className="flex flex-col md:flex-row items-center md:items-end gap-8 p-6 sm:p-8 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card shadow-subtle">
        {/* Large Circular Avatar */}
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden shrink-0 border-2 border-hairline dark:border-hairline-dark shadow-md bg-surface-soft dark:bg-surface-dark-soft">
          <img
            src={
              artist.imageUrl ||
              'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80'
            }
            alt={artist.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
            }}
          />
        </div>

        {/* Artist Details */}
        <div className="flex-1 min-w-0 text-center md:text-left space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-xs font-sans font-medium">
            <Check className="w-3 h-3 text-blue-600 dark:text-blue-400 stroke-[3]" />
            <span>Nghệ sĩ chính thức</span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-ink dark:text-white truncate">
            {artist.name}
          </h1>

          <div className="flex items-center justify-center md:justify-start gap-4 text-xs font-sans font-medium text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {followerCount.toLocaleString('vi-VN')} người theo dõi
            </span>
            <span>·</span>
            <span>{artist.topTracks.length} bài hát</span>
          </div>

          {artist.bio && (
            <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-2xl leading-relaxed pt-1">
              {artist.bio}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-3">
            {artist.topTracks.length > 0 && (
              <Button
                size="md"
                onClick={handlePlayAll}
                icon={<Play className="w-4 h-4 fill-current ml-0.5" />}
              >
                Phát tất cả bài hát
              </Button>
            )}

            <Button
              variant={isFollowing ? 'secondary' : 'primary'}
              size="md"
              onClick={handleToggleFollow}
              icon={
                <Heart
                  className={`w-4 h-4 ${
                    isFollowing ? 'fill-red-500 text-red-500' : 'text-neutral-500'
                  }`}
                />
              }
            >
              {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
            </Button>
          </div>
        </div>
      </section>

      {/* Popular Tracks Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-hairline dark:border-hairline-dark pb-3">
          <div className="flex items-center gap-2.5">
            <Play className="w-4 h-4 text-ink dark:text-white" />
            <h2 className="font-display font-bold text-xl text-ink dark:text-white">
              Bài hát nổi bật
            </h2>
          </div>
          {artist.topTracks.length > 0 && (
            <span className="text-xs font-sans font-medium text-neutral-500">
              {artist.topTracks.length} bài hát
            </span>
          )}
        </div>

        {artist.topTracks.length === 0 ? (
          <div className="py-12 text-center text-sm text-mute">
            Chưa có bài hát nào được cập nhật cho nghệ sĩ này.
          </div>
        ) : (
          <div className="space-y-1">
            {artist.topTracks.map((track, idx) => (
              <SongRow
                key={track.id}
                track={track}
                index={idx}
                queueContext={artist.topTracks}
              />
            ))}
          </div>
        )}
      </section>

      {/* Albums Section */}
      {artist.albums && artist.albums.length > 0 && (
        <section className="space-y-4 pt-4">
          <div className="flex items-center justify-between border-b border-hairline dark:border-hairline-dark pb-3">
            <div className="flex items-center gap-2.5">
              <Disc3 className="w-4 h-4 text-ink dark:text-white" />
              <h2 className="font-display font-bold text-xl text-ink dark:text-white">
                Album & Đĩa đơn
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {artist.albums.map((al) => (
              <Link
                key={al.id}
                to={`/albums/${al.id}`}
                className="group flex flex-col p-3 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card hover:bg-surface-soft dark:hover:bg-surface-dark-soft transition-all duration-200 cursor-pointer"
              >
                <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-surface-soft dark:bg-surface-dark-soft mb-3 border border-hairline dark:border-hairline-dark">
                  <img
                    src={
                      al.coverUrl ||
                      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80'
                    }
                    alt={al.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <h4 className="font-semibold text-sm truncate text-neutral-900 dark:text-white group-hover:underline">
                  {al.title}
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {al.releaseDate ? new Date(al.releaseDate).getFullYear() : 'Album'}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
