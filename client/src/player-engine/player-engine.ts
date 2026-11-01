import { PlayerAdapter } from './player-adapter.interface.js';
import { HtmlAudioAdapter } from './adapters/html-audio-adapter.js';
import { YouTubeAdapter } from './adapters/youtube-adapter.js';
import { UnifiedTrack } from '../types/index.js';
import { usePlayerStore } from '../stores/player-store.js';

export class PlayerEngine {
  private currentAdapter: PlayerAdapter | null = null;

  constructor() {
    this.setupShortcuts();
  }

  private createAdapter(type: 'audio' | 'youtube' | 'spotify' | 'zingmp3' | 'preview'): PlayerAdapter {
    const events = {
      onTimeUpdate: (currentTime: number, duration: number) => {
        usePlayerStore.getState().syncTime(currentTime, duration);
      },
      onStateChange: (isPlaying: boolean, isBuffering: boolean) => {
        usePlayerStore.getState().syncState(isPlaying, isBuffering);
      },
      onEnded: () => {
        usePlayerStore.getState().handleTrackEnd();
      },
      onError: (errMsg: string) => {
        console.error('Player engine error:', errMsg);
        usePlayerStore.getState().handleError(errMsg);
      },
    };

    if (type === 'youtube') {
      return new YouTubeAdapter(events);
    }

    return new HtmlAudioAdapter(events);
  }

  async loadTrack(track: UnifiedTrack, autoPlay = true): Promise<void> {
    let targetType: 'audio' | 'youtube' | 'spotify' | 'zingmp3' = 'audio';
    if (track.source === 'spotify' || track.playbackType === 'spotify') {
      targetType = 'audio';
    } else if (track.playbackType === 'youtube' || (track.embedId && track.embedId.length === 11)) {
      targetType = 'youtube';
    } else {
      targetType = 'audio';
    }

    // If adapter type changed, clean up previous adapter completely
    if (!this.currentAdapter || this.currentAdapter.type !== targetType) {
      if (this.currentAdapter) {
        this.currentAdapter.destroy();
        this.currentAdapter = null;
      }
      this.currentAdapter = this.createAdapter(targetType);
    }

    const store = usePlayerStore.getState();

    // Set initial volume
    this.currentAdapter.setVolume(store.isMuted ? 0 : store.volume);

    // Update Media Session API
    this.updateMediaSession(track);

    await this.currentAdapter.load(track, autoPlay);
  }

  async play(): Promise<void> {
    if (this.currentAdapter) {
      await this.currentAdapter.play();
    }
  }

  pause(): void {
    if (this.currentAdapter) {
      this.currentAdapter.pause();
    }
  }

  seek(seconds: number): void {
    if (this.currentAdapter) {
      this.currentAdapter.seek(seconds);
    }
  }

  setVolume(volume: number, isMuted = false): void {
    if (this.currentAdapter) {
      this.currentAdapter.setVolume(isMuted ? 0 : volume);
    }
  }

  private updateMediaSession(track: UnifiedTrack): void {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: Array.isArray(track.artists) ? track.artists.join(', ') : (track.artists || 'Nghệ sĩ'),
      album: track.album || 'mq Music',
      artwork: track.coverUrl
        ? [
            { src: track.coverUrl, sizes: '96x96', type: 'image/jpeg' },
            { src: track.coverUrl, sizes: '256x256', type: 'image/jpeg' },
            { src: track.coverUrl, sizes: '512x512', type: 'image/jpeg' },
          ]
        : [],
    });

    navigator.mediaSession.setActionHandler('play', () => {
      usePlayerStore.getState().togglePlay();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      usePlayerStore.getState().togglePlay();
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      usePlayerStore.getState().previous();
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      usePlayerStore.getState().next();
    });
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        usePlayerStore.getState().seekTo(details.seekTime);
      }
    });
  }

  private setupShortcuts(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', (e) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const store = usePlayerStore.getState();

      if (e.code === 'Space') {
        e.preventDefault();
        store.togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        store.seekTo(store.currentTime + 5);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        store.seekTo(store.currentTime - 5);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        store.setVolume(Math.min(1, store.volume + 0.05));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        store.setVolume(Math.max(0, store.volume - 0.05));
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        store.toggleMute();
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        store.toggleLyrics();
      }
    });
  }

  destroy(): void {
    if (this.currentAdapter) {
      this.currentAdapter.destroy();
      this.currentAdapter = null;
    }
  }
}

export const playerEngine = new PlayerEngine();
