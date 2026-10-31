import { describe, it, expect } from 'vitest';
import { searchService } from '../src/services/search.service.js';
import { UnifiedTrack } from '../src/providers/music-provider.interface.js';
import { removeAccents, stringSimilarity } from '../src/utils/unaccent.js';

describe('Search & Deduplication Utilities', () => {
  it('should remove accents and normalize Vietnamese text correctly', () => {
    expect(removeAccents('Sơn Tùng M-TP')).toBe('son tung m-tp');
    expect(removeAccents('Đen Vâu')).toBe('den vau');
    expect(removeAccents('Chúng Ta Của Hiện Tại')).toBe('chung ta cua hien tai');
    expect(removeAccents('  Hà Nội Phố  ')).toBe('ha noi pho');
  });

  it('should calculate string similarity correctly', () => {
    expect(stringSimilarity('Chúng Ta Của Hiện Tại', 'Chung Ta Cua Hien Tai')).toBe(1.0);
    expect(stringSimilarity('Nấu Ăn Cho Em', 'Nấu Ăn Cho Em (Official MV)')).toBeGreaterThan(0.7);
    expect(stringSimilarity('Lạc Trôi', 'Bước Qua Mùa Cô Đơn')).toBe(0.0);
  });

  it('should deduplicate tracks favoring full-length or local tracks over previews', () => {
    const tracks: UnifiedTrack[] = [
      {
        id: 'deezer:123',
        source: 'deezer',
        sourceId: '123',
        title: 'Chúng Ta Của Hiện Tại',
        artists: ['Sơn Tùng M-TP'],
        durationMs: 301000,
        playbackType: 'preview',
        isFullLength: false,
        previewUrl: 'https://cdn.example.com/preview.mp3',
      },
      {
        id: 'local:song-1',
        source: 'local',
        sourceId: 'song-1',
        title: 'Chúng Ta Của Hiện Tại',
        artists: ['Sơn Tùng M-TP'],
        durationMs: 301000,
        playbackType: 'audio',
        isFullLength: true,
        streamUrl: '/api/songs/song-1/stream',
      },
    ];

    const deduplicated = searchService.deduplicateTracks(tracks);
    expect(deduplicated.length).toBe(1);
    expect(deduplicated[0].source).toBe('local');
    expect(deduplicated[0].isFullLength).toBe(true);
  });

  it('should rank Zing MP3 full track higher than a preview track in deduplication', () => {
    const tracks: UnifiedTrack[] = [
      {
        id: 'itunes:999',
        source: 'itunes',
        sourceId: '999',
        title: 'Lạc Trôi',
        artists: ['Sơn Tùng M-TP'],
        durationMs: 232000,
        playbackType: 'preview',
        isFullLength: false,
      },
      {
        id: 'zingmp3:ZW78DIEO',
        source: 'zingmp3',
        sourceId: 'ZW78DIEO',
        title: 'Lạc Trôi',
        artists: ['Sơn Tùng M-TP'],
        durationMs: 233000,
        playbackType: 'zingmp3',
        isFullLength: true,
      },
    ];

    const deduplicated = searchService.deduplicateTracks(tracks);
    expect(deduplicated.length).toBe(1);
    expect(deduplicated[0].source).toBe('zingmp3');
    expect(deduplicated[0].isFullLength).toBe(true);
  });
});

