import { describe, it, expect } from 'vitest';
import {
  createSeededRng,
  fisherYatesShuffle,
  selectDiverseSectionTracks,
} from '../src/services/explore.service.js';
import { EXPLORE_FALLBACK_TRACKS } from '../src/config/explore.config.js';
import { UnifiedTrack } from '../src/providers/music-provider.interface.js';

function makeTrack(
  idx: number,
  artist = `Artist ${idx}`,
  source: UnifiedTrack['source'] = 'zingmp3',
  isFullLength = true
): UnifiedTrack {
  return {
    id: `${source}:track-${idx}`,
    source,
    sourceId: `track-${idx}`,
    title: `Bài hát số ${idx}`,
    artists: [artist],
    coverUrl: `https://example.com/cover-${idx}.jpg`,
    durationMs: 210000,
    playbackType: source === 'zingmp3' ? 'zingmp3' : 'audio',
    isFullLength,
    playCount: 10000 + idx * 500,
  };
}

describe('Explore Service (Ngẫu nhiên có kiểm soát cho Khám phá)', () => {
  it('1. Không trùng bài giữa hai mục và không vượt giới hạn nghệ sĩ (maxPerArtist = 2)', () => {
    // Tạo pool 30 bài với 1 nghệ sĩ xuất hiện nhiều lần
    const pool: UnifiedTrack[] = [
      ...Array.from({ length: 8 }, (_, i) => makeTrack(i + 1, 'Sơn Tùng M-TP', 'zingmp3', true)),
      ...Array.from({ length: 12 }, (_, i) => makeTrack(i + 20, `Nghệ sĩ ${i}`, 'spotify', true)),
      ...Array.from({ length: 10 }, (_, i) => makeTrack(i + 40, `Ca sĩ ${i}`, 'audius', true)),
    ];

    const trending = selectDiverseSectionTracks({
      pool,
      count: 12,
      rng: createSeededRng('seed-test-1:trending'),
      weighted: true,
      maxPerArtist: 2,
      minFullRatio: 0.6,
    });

    const trendingIds = new Set(trending.map((t) => t.id));
    const vietnamese = selectDiverseSectionTracks({
      pool,
      count: 12,
      rng: createSeededRng('seed-test-1:vietnamese'),
      forbiddenIds: trendingIds,
      maxPerArtist: 2,
      minFullRatio: 0.6,
    });

    expect(trending.length).toBe(12);
    expect(vietnamese.length).toBe(12);

    // Kiểm tra không trùng bài giữa 2 mục
    for (const t of vietnamese) {
      expect(trendingIds.has(t.id)).toBe(false);
    }

    // Kiểm tra không quá 2 bài của cùng 1 nghệ sĩ trong 1 mục
    const countSonTungTrending = trending.filter((t) => t.artists[0] === 'Sơn Tùng M-TP').length;
    expect(countSonTungTrending).toBeLessThanOrEqual(2);
  });

  it('2. Tự động bù đủ số lượng từ danh sách dự phòng khi pool nhỏ', () => {
    const tinyPool = [makeTrack(1, 'Vũ.'), makeTrack(2, 'tlinh')];

    const selected = selectDiverseSectionTracks({
      pool: tinyPool,
      count: 6,
      rng: createSeededRng('tiny-seed'),
      fallbackPool: EXPLORE_FALLBACK_TRACKS.vietnamese,
    });

    expect(selected.length).toBe(6);
  });

  it('3. Tôn trọng danh sách loại trừ excludeIds khi pool đủ lớn', () => {
    const pool = Array.from({ length: 24 }, (_, i) => makeTrack(i + 1, `Artist ${i}`));
    const excludeIds = pool.slice(0, 6).map((t) => t.id);

    const selected = selectDiverseSectionTracks({
      pool,
      count: 10,
      rng: createSeededRng('exclude-seed'),
      excludeIds,
    });

    expect(selected.length).toBe(10);
    for (const id of excludeIds) {
      expect(selected.some((t) => t.id === id)).toBe(false);
    }
  });

  it('4. Kết quả giống hệt nhau khi dùng cùng seed và khác nhau khi đổi seed', () => {
    const pool = Array.from({ length: 30 }, (_, i) => makeTrack(i + 1, `Artist ${i}`));

    const runA1 = selectDiverseSectionTracks({
      pool,
      count: 12,
      rng: createSeededRng('reproducible-seed-123'),
    }).map((t) => t.id);

    const runA2 = selectDiverseSectionTracks({
      pool,
      count: 12,
      rng: createSeededRng('reproducible-seed-123'),
    }).map((t) => t.id);

    const runB = selectDiverseSectionTracks({
      pool,
      count: 12,
      rng: createSeededRng('different-seed-999'),
    }).map((t) => t.id);

    expect(runA1).toEqual(runA2);
    expect(runA1).not.toEqual(runB);
  });

  it('5. Fisher-Yates không làm mất phần tử và giữ nguyên mảng gốc', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = fisherYatesShuffle(input, createSeededRng('fy-seed'));
    expect(shuffled.length).toBe(input.length);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
