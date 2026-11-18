import { PlayerAdapter, PlayerEvents } from '../player-adapter.interface.js';
import { UnifiedTrack } from '../../types/index.js';

export class HtmlAudioAdapter implements PlayerAdapter {
  readonly type = 'audio' as const;
  private audio: HTMLAudioElement | null = null;
  private events: PlayerEvents;

  constructor(events: PlayerEvents) {
    this.events = events;
  }

  async load(track: UnifiedTrack, autoPlay = true): Promise<void> {
    this.destroy();

    // Determine audio source URL
    let streamSrc = track.streamUrl || track.previewUrl;
    if (!streamSrc && track.source === 'local') {
      streamSrc = `/api/songs/${track.id}/stream`;
    }

    if (!streamSrc) {
      this.events.onError('Không tìm thấy đường dẫn phát âm thanh');
      return;
    }

    this.audio = new Audio();
    this.audio.preload = 'metadata';
    this.audio.src = streamSrc;

    // Attach listeners
    this.audio.addEventListener('timeupdate', () => {
      if (this.audio) {
        this.events.onTimeUpdate(this.audio.currentTime, this.audio.duration || 0);
      }
    });

    this.audio.addEventListener('loadedmetadata', () => {
      if (this.audio) {
        this.events.onTimeUpdate(this.audio.currentTime, this.audio.duration || 0);
      }
    });

    this.audio.addEventListener('playing', () => {
      this.events.onStateChange(true, false);
    });

    this.audio.addEventListener('pause', () => {
      this.events.onStateChange(false, false);
    });

    this.audio.addEventListener('waiting', () => {
      this.events.onStateChange(false, true);
    });

    this.audio.addEventListener('ended', () => {
      this.events.onEnded();
    });

    this.audio.addEventListener('error', () => {
      const err = this.audio?.error;
      const msg =
        err?.code === 4 && track.source === 'spotify'
          ? 'Spotify không cung cấp luồng âm thanh cho bài hát này (code 4)'
          : err
            ? `Lỗi tải tệp âm thanh (code ${err.code})`
            : 'Lỗi không xác định khi phát';
      this.events.onError(msg);
    });

    if (autoPlay) {
      await this.play().catch((err) => {
        // Autoplay may be blocked by browser policy until user interacts
        console.warn('Autoplay prevented by browser:', err);
        this.events.onStateChange(false, false);
      });
    }
  }

  async play(): Promise<void> {
    if (!this.audio) return;
    try {
      await this.audio.play();
      this.events.onStateChange(true, false);
    } catch (err: any) {
      this.events.onStateChange(false, false);
      throw err;
    }
  }

  pause(): void {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
      this.events.onStateChange(false, false);
    }
  }

  seek(seconds: number): void {
    if (this.audio && Number.isFinite(seconds)) {
      this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration || seconds));
    }
  }

  setVolume(volume: number): void {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  destroy(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
      this.audio = null;
    }
  }
}

