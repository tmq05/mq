import { UnifiedTrack } from '../types/index.js';

export interface PlayerEvents {
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onStateChange: (isPlaying: boolean, isBuffering: boolean) => void;
  onEnded: () => void;
  onError: (error: string) => void;
}

export interface PlayerAdapter {
  readonly type: 'audio' | 'youtube' | 'spotify' | 'zingmp3' | 'preview';
  load(track: UnifiedTrack, autoPlay: boolean): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  seek(seconds: number): void;
  setVolume(volume: number): void; // 0 to 1
  destroy(): void;
}

