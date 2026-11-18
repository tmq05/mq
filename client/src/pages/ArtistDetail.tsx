import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Play, Heart, Users, Disc3, Check, ArrowLeft } from 'lucide-react';
import { api } from '../api/client.js';
import { SongRow } from '../components/song/SongRow.js';
import { Button } from '../components/common/Button.js';
import {
  ArtistSkeleton,
  BlurUpImage,
  LoadingRegion,
  LoadingStaggerItem,
} from '../components/common/Loading.js';
import { usePlayerStore } from '../stores/player-store.js';
import { useAuthStore } from '../stores/auth-store.js';
import { useAuthModalStore } from '../stores/auth-modal-store.js';
import { UnifiedTrack } from '../types/index.js';

interface ArtistDetailResponse {
  id: string;
  dbId?: string;
  name: string;
  bio?: string;
  imageUrl?: string;
  isVerified?: boolean;
  verified?: boolean;
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
  const queryClient = useQueryClient();
  const { playTrack } = usePlayerStore();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const { openAuthModal } = useAuthModalStore();

  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, [id]);

  const { data: artist, isLoading, error, refetch } = useQuery({
    queryKey: ['artist', id, user?.id || 'guest'],
    queryFn: async () => {
      const res = await api.get(`/artists/${id}`);
      const data = res.data as ArtistDetailResponse;
      setIsFollowing(Boolean(data.isFollowing));
      setFollowerCount(data.followersCount || 0);
      return data;
    },
    enabled: Boolean(id) && !isAuthLoading,
  });

  const handlePlayAll = () => {
    if (artist && artist.topTracks.length > 0) {
      playTrack(artist.topTracks[0], artist.topTracks);
    }
  };

  const handleToggleFollow = async () => {
    if (!isAuthenticated) {
      openAuthModal({
        title: 'Theo dõi nghệ sĩ',
        message: artist?.name
          ? `Đăng nhập để theo dõi ${artist.name} và nhận các cập nhật bài hát mới nhất.`
          : 'Đăng nhập để theo dõi nghệ sĩ và nhận các bản phát hành mới.',
        iconType: 'user',
      });
      return;
    }
    try {
      const res = await api.post(`/artists/${id}/follow`);
      const nowFollowing = res.data.isFollowing;
      setIsFollowing(nowFollowing);
      setFollowerCount((prev) => (nowFollowing ? prev + 1 : Math.max(0, prev - 1)));
      queryClient.invalidateQueries({ queryKey: ['artist', id] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    } catch (err: any) {
      console.error('Follow error:', err);
    }
  };

  return (
    <LoadingRegion
      isLoading={isLoading}
      isError={Boolean(error || (!isLoading && !artist))}
      onRetry={() => refetch()}
      skeleton={<ArtistSkeleton />}
      loadingLabel="Đang tải thông tin nghệ sĩ"
      errorTitle="Không tải được thông tin nghệ sĩ"
      errorDescription="Nghệ sĩ bạn đang tìm kiếm không tồn tại hoặc kết nối tạm thời gián đoạn."
      className="max-w-7xl mx-auto"
    >
      {artist && (
        <div className="space-y-12 pb-16">
          {/* Back button */}
          <LoadingStaggerItem index={0}>
            <Link
              to="/artists"
              className="inline-flex items-center gap-1.5 text-xs font-sans font-medium text-neutral-500 hover:text-ink dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại danh sách nghệ sĩ</span>
            </Link>
          </LoadingStaggerItem>

          {/* Hero Header */}
          <LoadingStaggerItem index={1}>
            <section className="flex flex-col md:flex-row items-center md:items-end gap-8 p-6 sm:p-8 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card shadow-subtle">
              {/* Large Circular Avatar */}
              <BlurUpImage
                src={
                  artist.imageUrl ||
                  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80'
                }
                alt={artist.name}
                wrapperClassName="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full shrink-0 border-2 border-hairline dark:border-hairline-dark shadow-md"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
                }}
              />

              {/* Artist Details */}
              <div className="flex-1 min-w-0 text-center md:text-left space-y-3">
                {(artist.isVerified ?? artist.verified) && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-xs font-sans font-medium">
                    <Check className="w-3 h-3 text-blue-600 dark:text-blue-400 stroke-[3]" />
                    <span>Nghệ sĩ chính thức</span>
                  </div>
                )}

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
      </LoadingStaggerItem>

      {/* Popular Tracks Section */}
      <LoadingStaggerItem index={2}>
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
      </LoadingStaggerItem>

      {/* Albums Section */}
      {artist.albums && artist.albums.length > 0 && (
        <LoadingStaggerItem index={3}>
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
                <BlurUpImage
                  src={
                    al.coverUrl ||
                    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80'
                  }
                  alt={al.title}
                  loading="lazy"
                  wrapperClassName="relative aspect-square w-full rounded-lg mb-3 border border-hairline dark:border-hairline-dark"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
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
        </LoadingStaggerItem>
      )}
        </div>
      )}
    </LoadingRegion>
  );
};
