import React from 'react';
import { X, Trash2 } from 'lucide-react';
import { usePlayerStore } from '../../stores/player-store.js';
import { SourceBadge } from '../common/Badge.js';
import { formatArtists } from '../../utils/format.js';

export const QueueDrawer: React.FC = () => {
  const {
    queue,
    currentTrack,
    isQueueOpen,
    toggleQueue,
    playTrack,
    removeFromQueue,
    clearQueue,
  } = usePlayerStore();

  if (!isQueueOpen) return null;

  return (
    <div className="fixed bottom-24 right-4 z-40 w-80 md:w-96 max-h-[500px] flex flex-col rounded-card border border-hairline dark:border-hairline-dark bg-canvas/95 dark:bg-surface-dark-card/95 backdrop-blur-md shadow-2xl overflow-hidden select-none animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-hairline dark:border-hairline-dark shrink-0">
        <div>
          <h4 className="font-semibold text-sm text-ink dark:text-white">
            Danh sách phát ({queue.length})
          </h4>
          <span className="text-[11px] text-mute">Nhạc không ngắt quãng</span>
        </div>

        <div className="flex items-center gap-1">
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              className="p-1.5 rounded-pill hover:bg-neutral-100 dark:hover:bg-neutral-800 text-mute hover:text-red-500"
              title="Xóa danh sách"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={toggleQueue}
            className="p-1.5 rounded-pill hover:bg-neutral-100 dark:hover:bg-neutral-800 text-body dark:text-mute"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Queue items */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {queue.length === 0 ? (
          <div className="py-12 text-center text-xs text-mute">
            Chưa có bài hát trong danh sách phát
          </div>
        ) : (
          queue.map((track, idx) => {
            const isCurrent = currentTrack?.id === track.id;
            return (
              <div
                key={`${track.id}-${idx}`}
                onClick={() => playTrack(track)}
                className={`group flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
                  isCurrent
                    ? 'bg-surface-soft dark:bg-surface-dark-soft font-semibold'
                    : 'hover:bg-surface-soft/60 dark:hover:bg-surface-dark-soft/40'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-md overflow-hidden bg-neutral-200 shrink-0">
                    <img
                      src={track.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&auto=format&fit=crop&q=80'}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs truncate text-ink dark:text-white">
                      {track.title}
                    </span>
                    <span className="text-[10px] text-body dark:text-mute truncate">
                      {formatArtists(track.artists)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <SourceBadge isFullLength={track.isFullLength} source={track.source} />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromQueue(idx);
                    }}
                    className="p-1 text-mute hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Xóa khỏi hàng đợi"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
