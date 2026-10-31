import { PlayerAdapter, PlayerEvents } from '../player-adapter.interface.js';
import { UnifiedTrack } from '../../types/index.js';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export class YouTubeAdapter implements PlayerAdapter {
  readonly type = 'youtube' as const;
  private player: any = null;
  private events: PlayerEvents;
  private timeTicker: number | null = null;
  private isReady = false;

  constructor(events: PlayerEvents) {
    this.events = events;
  }

  private static apiPromise: Promise<void> | null = null;

  private static loadIframeAPI(): Promise<void> {
    if (this.apiPromise) return this.apiPromise;
    if (window.YT && window.YT.Player) {
      return Promise.resolve();
    }

    this.apiPromise = new Promise((resolve) => {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

      const prevReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevReady) prevReady();
        resolve();
      };
    });

    return this.apiPromise;
  }

  async load(track: UnifiedTrack, autoPlay = true): Promise<void> {
    const videoId = track.embedId || track.sourceId;
    if (!videoId) {
      this.events.onError('Không tìm thấy YouTube video ID');
      return;
    }

    await YouTubeAdapter.loadIframeAPI();

    return new Promise((resolve) => {
      let mountEl = document.getElementById('youtube-player-mount');
      if (!mountEl) {
        mountEl = document.createElement('div');
        mountEl.id = 'youtube-player-mount';
        const container = document.getElementById('youtube-player-container');
        if (container) {
          container.appendChild(mountEl);
        } else {
          document.body.appendChild(mountEl);
        }
      }

      if (this.player && this.isReady) {
        if (autoPlay) {
          this.player.loadVideoById(videoId);
        } else {
          this.player.cueVideoById(videoId);
        }
        resolve();
        return;
      }

      this.player = new window.YT.Player('youtube-player-mount', {
        height: '100%',
        width: '100%',
        videoId,
        playerVars: {
          autoplay: autoPlay ? 1 : 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            this.isReady = true;
            if (autoPlay) {
              event.target.playVideo();
            }
            resolve();
          },
          onStateChange: (event: any) => {
            this.handleStateChange(event.data);
          },
          onError: (event: any) => {
            const code = event.data;
            let msg = 'Lỗi phát video YouTube';
            if (code === 101 || code === 150) {
              msg = 'Video này bị chặn nhúng bởi chủ sở hữu bản quyền';
            } else if (code === 100) {
              msg = 'Không tìm thấy video YouTube';
            }
            this.events.onError(msg);
          },
        },
      });
    });
  }

  private handleStateChange(state: number): void {
    const YTState = window.YT?.PlayerState;
    if (!YTState) return;

    if (state === YTState.PLAYING) {
      this.events.onStateChange(true, false);
      this.startTimeTicker();
    } else if (state === YTState.PAUSED) {
      this.events.onStateChange(false, false);
      this.stopTimeTicker();
    } else if (state === YTState.BUFFERING) {
      this.events.onStateChange(false, true);
    } else if (state === YTState.ENDED) {
      this.stopTimeTicker();
      this.events.onEnded();
    }
  }

  private startTimeTicker(): void {
    this.stopTimeTicker();
    this.timeTicker = window.setInterval(() => {
      if (this.player && typeof this.player.getCurrentTime === 'function') {
        const currentTime = this.player.getCurrentTime() || 0;
        const duration = this.player.getDuration() || 0;
        this.events.onTimeUpdate(currentTime, duration);
      }
    }, 250);
  }

  private stopTimeTicker(): void {
    if (this.timeTicker) {
      clearInterval(this.timeTicker);
      this.timeTicker = null;
    }
  }

  async play(): Promise<void> {
    if (this.player && typeof this.player.playVideo === 'function') {
      this.player.playVideo();
    }
  }

  pause(): void {
    if (this.player && typeof this.player.pauseVideo === 'function') {
      this.player.pauseVideo();
    }
  }

  seek(seconds: number): void {
    if (this.player && typeof this.player.seekTo === 'function') {
      this.player.seekTo(seconds, true);
    }
  }

  setVolume(volume: number): void {
    if (this.player && typeof this.player.setVolume === 'function') {
      this.player.setVolume(Math.round(volume * 100));
    }
  }

  destroy(): void {
    this.stopTimeTicker();
    if (this.player && typeof this.player.pauseVideo === 'function') {
      try {
        this.player.pauseVideo();
      } catch {
        // ignore
      }
    }
  }
}
