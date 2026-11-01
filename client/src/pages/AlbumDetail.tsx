import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Play, Disc3, Calendar } from 'lucide-react';
import { api } from '../api/client.js';
import { usePlayerStore } from '../stores/player-store.js';
import { SongRow } from '../components/song/SongRow.js';
import { Button } from '../components/common/Button.js';
import { formatDate, formatAlbumArtist } from '../utils/format.js';
import { Album, UnifiedTrack } from '../types/index.js';

export const AlbumDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { playTrack } = usePlayerStore();

  const { data: album, isLoading } = useQuery({
    queryKey: ['album', id],
    queryFn: async () => {
      const res = await api.get(`/albums/${id}`);
      return res.data as Album & { tracks: UnifiedTrack[] };
    },
    enabled: Boolean(id),
  });

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, [id, album]);

  if (isLoading) {
    return (
      <div className="py-20 text-center text-mute space-y-3">
        <span className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
        <p className="text-sm">Đang tải album...</p>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="py-20 text-center text-mute space-y-3">
        <p className="text-base font-semibold">Không tìm thấy album.</p>
        <Button size="sm" onClick={() => navigate('/')}>
          Về trang chủ
        </Button>
      </div>
    );
  }

  const trackCount = album.tracks?.length ?? album.tracksCount ?? 0;

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 rounded-card border border-hairline dark:border-hairline-dark bg-surface-soft dark:bg-surface-dark-soft">
        <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 shadow-md shrink-0 flex items-center justify-center">
          {album.coverUrl ? (
            <img
              src={album.coverUrl}
              alt={album.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <Disc3 className="w-16 h-16 text-mute stroke-1" />
          )}
        </div>

        <div className="flex flex-col gap-2 min-w-0 flex-1 text-center sm:text-left">
          <span className="text-xs font-sans font-semibold uppercase tracking-wider text-body dark:text-mute">
            Album phát hành
          </span>
          <h1 className="font-display font-black text-2xl sm:text-4xl text-ink dark:text-white truncate">
            {album.title}
          </h1>
          <p className="text-sm font-medium text-body dark:text-mute">
            {formatAlbumArtist(album.artist)}
          </p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-neutral-500 dark:text-neutral-400 font-sans font-medium mt-1">
            {album.releaseDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDate(album.releaseDate)}</span>
              </div>
            )}
            <span>·</span>
            <span className="font-semibold text-neutral-900 dark:text-white">
              {trackCount} bài hát
            </span>
            <span>·</span>
            <span>100% full track</span>
          </div>

          {album.tracks && album.tracks.length > 0 && (
            <div className="pt-3">
              <Button
                size="md"
                onClick={() => playTrack(album.tracks![0], album.tracks)}
                icon={<Play className="w-4 h-4 fill-current ml-0.5" />}
              >
                Phát toàn bộ album
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Track list */}
      <div className="space-y-2">
        <h3 className="font-display font-bold text-lg text-ink dark:text-white border-b border-hairline dark:border-hairline-dark pb-2">
          Danh sách ca khúc ({trackCount})
        </h3>

        {album.tracks && album.tracks.length > 0 ? (
          album.tracks.map((track, idx) => (
            <SongRow key={track.id} track={track} index={idx} queueContext={album.tracks} />
          ))
        ) : (
          <div className="py-12 text-center text-xs text-mute">
            Chưa có bài hát trong album này.
          </div>
        )}
      </div>
    </div>
  );
};

