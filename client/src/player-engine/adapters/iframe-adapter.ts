import { PlayerAdapter, PlayerEvents } from '../player-adapter.interface.js';
import { UnifiedTrack } from '../../types/index.js';

export class IframeAdapter implements PlayerAdapter {
  readonly type: 'zingmp3' | 'spotify';
  private events: PlayerEvents;
  private currentTime = 0;
  private duration = 0;
  private isPlaying = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(type: 'zingmp3' | 'spotify', events: PlayerEvents) {
    this.type = type;
    this.events = events;
  }

  async load(track: UnifiedTrack, autoPlay = true): Promise<void> {
    this.destroy();
    this.currentTime = 0;
    this.duration = track.durationMs ? track.durationMs / 1000 : 210;

    const mount = document.getElementById('iframe-player-mount');
    if (mount) {
      mount.innerHTML = '';
      const iframe = document.createElement('iframe');
      iframe.width = '100%';
      iframe.height = '100%';
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allow', 'autoplay; encrypted-media; fullscreen; picture-in-picture');

      if (this.type === 'zingmp3') {
        iframe.src = `https://zingmp3.vn/embed/song/${track.embedId}?start=true`;
      } else {
        iframe.src = `https://open.spotify.com/embed/track/${track.embedId}?utm_source=generator&theme=0`;
      }

      mount.appendChild(iframe);
    }

    if (autoPlay) {
      await this.play();
    }
  }

  async play(): Promise<void> {
    this.isPlaying = true;
    this.events.onStateChange(true, false);
    this.startTicker();
  }

  pause(): void {
    this.isPlaying = false;
    this.events.onStateChange(false, false);
    this.stopTicker();
  }

  seek(seconds: number): void {
    this.currentTime = Math.max(0, Math.min(seconds, this.duration));
    this.events.onTimeUpdate(this.currentTime, this.duration);
  }

  setVolume(_volume: number): void {
    // IFrame player volume is governed by iframe sandbox/browser
  }

  private startTicker(): void {
    this.stopTicker();
    this.timer = setInterval(() => {
      if (this.isPlaying) {
        this.currentTime += 0.5;
        this.events.onTimeUpdate(this.currentTime, this.duration);
        if (this.currentTime >= this.duration) {
          this.stopTicker();
          this.events.onEnded();
        }
      }
    }, 500);
  }

  private stopTicker(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  destroy(): void {
    this.stopTicker();
    this.isPlaying = false;
    const mount = document.getElementById('iframe-player-mount');
    if (mount) {
      mount.innerHTML = '';
    }
  }
}
