import { PlayerAdapter, PlayerEvents } from '../player-adapter.interface.js';
import { UnifiedTrack } from '../../types/index.js';
import { useSpotifyAuthStore } from '../../stores/spotify-auth-store.js';

declare global {
  interface Window {
    Spotify?: any;
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

let sdkLoadPromise: Promise<void> | null = null;

function loadSpotifySdk(): Promise<void> {
  if (window.Spotify?.Player) return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById('spotify-web-playback-sdk');
    window.onSpotifyWebPlaybackSDKReady = () => resolve();

    if (!existing) {
      const script = document.createElement('script');
      script.id = 'spotify-web-playback-sdk';
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      script.onerror = () => reject(new Error('Không thể tải Spotify Web Playback SDK'));
      document.body.appendChild(script);
    }
  });

  return sdkLoadPromise;
}

export class SpotifySdkAdapter implements PlayerAdapter {
  readonly type = 'spotify' as const;
  private events: PlayerEvents;
  private player: any = null;
  private deviceId: string | null = null;
  private readyPromise: Promise<string> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private wasPlaying = false;
  private currentVolume = 0.8;

  constructor(events: PlayerEvents) {
    this.events = events;
  }

  private async ensurePlayer(): Promise<string> {
    if (this.player && this.deviceId) return this.deviceId;
    if (this.readyPromise) return this.readyPromise;

    this.readyPromise = (async () => {
      await loadSpotifySdk();

      return await new Promise<string>((resolve, reject) => {
        const player = new window.Spotify.Player({
          name: 'mq Web Player',
          getOAuthToken: async (cb: (token: string) => void) => {
            const token = await useSpotifyAuthStore.getState().getValidAccessToken();
            if (token) cb(token);
          },
          volume: this.currentVolume,
        });

        this.player = player;

        player.addListener('ready', ({ device_id }: { device_id: string }) => {
          this.deviceId = device_id;
          resolve(device_id);
        });

        player.addListener('not_ready', () => {
          this.deviceId = null;
        });

        player.addListener('initialization_error', ({ message }: { message: string }) => {
          this.events.onError(`Lỗi khởi tạo Spotify SDK: ${message}`);
          reject(new Error(message));
        });

        player.addListener('authentication_error', ({ message }: { message: string }) => {
          this.events.onError(`Lỗi xác thực Spotify: ${message}`);
          reject(new Error(message));
        });

        player.addListener('account_error', ({ message }: { message: string }) => {
          this.events.onError(`Tài khoản Spotify cần gói Premium để phát trực tiếp (${message})`);
          reject(new Error(message));
        });

        player.addListener('playback_error', ({ message }: { message: string }) => {
          this.events.onError(`Lỗi phát Spotify: ${message}`);
        });

        player.addListener('player_state_changed', (state: any) => {
          if (!state) return;
          const isPlaying = !state.paused;
          this.events.onTimeUpdate(state.position / 1000, state.duration / 1000);
          this.events.onStateChange(isPlaying, state.loading || false);

          if (this.wasPlaying && state.paused && state.position === 0) {
            this.wasPlaying = false;
            this.events.onEnded();
          } else {
            this.wasPlaying = isPlaying;
          }
        });

        player.connect().then((connected: boolean) => {
          if (!connected) {
            reject(new Error('Không thể kết nối Spotify Web Playback SDK'));
          }
        });
      });
    })();

    return this.readyPromise;
  }

  private startPolling() {
    this.stopPolling();
    this.pollTimer = setInterval(async () => {
      if (!this.player) return;
      try {
        const state = await this.player.getCurrentState();
        if (state && !state.paused) {
          this.events.onTimeUpdate(state.position / 1000, state.duration / 1000);
        }
      } catch {
        // ignore
      }
    }, 500);
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  async load(track: UnifiedTrack, autoPlay = true): Promise<void> {
    this.events.onStateChange(false, true);
    this.wasPlaying = false;

    const deviceId = await this.ensurePlayer();
    const token = await useSpotifyAuthStore.getState().getValidAccessToken();
    if (!token) {
      this.events.onError('Phiên Spotify đã hết hạn, vui lòng kết nối lại.');
      return;
    }

    const res = await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: [`spotify:track:${track.sourceId}`],
        }),
      }
    );

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const msg = errBody?.error?.message || `Spotify playback failed (${res.status})`;
      this.events.onError(msg);
      return;
    }

    if (!autoPlay && this.player) {
      await this.player.pause().catch(() => {});
    }

    this.startPolling();
  }

  async play(): Promise<void> {
    if (this.player) {
      await this.player.resume();
    }
  }

  pause(): void {
    if (this.player) {
      this.player.pause().catch(() => {});
    }
  }

  seek(seconds: number): void {
    if (this.player) {
      this.player.seek(Math.max(0, Math.round(seconds * 1000))).catch(() => {});
    }
  }

  setVolume(volume: number): void {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (this.player) {
      this.player.setVolume(this.currentVolume).catch(() => {});
    }
  }

  destroy(): void {
    this.stopPolling();
    this.wasPlaying = false;
    if (this.player) {
      this.player.pause().catch(() => {});
    }
  }
}
