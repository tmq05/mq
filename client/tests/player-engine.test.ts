import { describe, it, expect } from 'vitest';
import { usePlayerStore } from '../src/stores/player-store.js';
import { UnifiedTrack } from '../src/types/index.js';

describe('Player Store & State Transitions', () => {
  const sampleTrack1: UnifiedTrack = {
    id: 'local:1',
    source: 'local',
    sourceId: '1',
    title: 'Chúng Ta Của Hiện Tại',
    artists: ['Sơn Tùng M-TP'],
    durationMs: 301000,
    playbackType: 'audio',
    streamUrl: '/api/songs/1/stream',
    isFullLength: true,
  };

  const sampleTrack2: UnifiedTrack = {
    id: 'youtube:abc12345',
    source: 'youtube',
    sourceId: 'abc12345',
    title: 'Bảo Tàng Của Nuối Tiếc',
    artists: ['Vũ.'],
    durationMs: 228000,
    playbackType: 'youtube',
    embedId: 'abc12345',
    isFullLength: true,
  };

  it('should initialize with default audio state', () => {
    const state = usePlayerStore.getState();
    expect(state.isPlaying).toBe(false);
    expect(state.repeatMode).toBe('off');
    expect(state.isShuffle).toBe(false);
  });

  it('should manage queue additions and repeat mode cycling', () => {
    const store = usePlayerStore.getState();
    store.addToQueue(sampleTrack1);
    store.addToQueue(sampleTrack2);

    expect(usePlayerStore.getState().queue.length).toBe(2);

    // Test repeat mode
    store.setRepeatMode('all');
    expect(usePlayerStore.getState().repeatMode).toBe('all');
    store.setRepeatMode('one');
    expect(usePlayerStore.getState().repeatMode).toBe('one');
  });

  it('should toggle shuffle and volume levels safely', () => {
    const store = usePlayerStore.getState();
    store.toggleShuffle();
    expect(usePlayerStore.getState().isShuffle).toBe(true);

    store.setVolume(0.5);
    expect(usePlayerStore.getState().volume).toBe(0.5);

    store.setVolume(1.5); // should clamp to 1
    expect(usePlayerStore.getState().volume).toBe(1);

    store.setVolume(-0.2); // should clamp to 0
    expect(usePlayerStore.getState().volume).toBe(0);
  });
});
