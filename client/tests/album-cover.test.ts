import { describe, it, expect } from 'vitest';

describe('Album Cover & Fallback Logic', () => {
  it('should generate consistent hash for same album title', () => {
    function hashTitle(str: string): number {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash);
    }

    const title = 'Bảo Tàng Của Nuối Tiếc';
    const hash1 = hashTitle(title);
    const hash2 = hashTitle(title);
    expect(hash1).toBe(hash2);
    expect(hash1 % 12).toBeGreaterThanOrEqual(0);
    expect(hash1 % 12).toBeLessThan(12);
  });

  it('should extract correct initials for Vietnamese titles', () => {
    function getInitials(title: string): string {
      const clean = title.replace(/[^\p{L}\p{N}\s]/gu, '').trim();
      if (!clean) return 'MQ';
      const words = clean.split(/\s+/).filter(Boolean);
      if (words.length === 1) {
        return words[0].slice(0, 2).toUpperCase();
      }
      return (words[0][0] + words[1][0]).toUpperCase();
    }

    expect(getInitials('Bảo Tàng Của Nuối Tiếc')).toBe('BT');
    expect(getInitials('99%')).toBe('99');
    expect(getInitials('22')).toBe('22');
    expect(getInitials('FLVR: BẬT NÓC NHÀ')).toBe('FB');
    expect(getInitials('Chúng Ta Của Hiện Tại')).toBe('CT');
  });

  it('should resolve fallback cover URL when primary is null or empty', () => {
    const mockAlbum = {
      title: 'Album Test',
      coverUrl: '',
      fallbackCoverUrl: 'https://example.com/fallback.jpg',
      tracks: [
        { coverUrl: 'https://example.com/track1.jpg' }
      ]
    };

    const resolved = mockAlbum.coverUrl || mockAlbum.fallbackCoverUrl || mockAlbum.tracks[0].coverUrl;
    expect(resolved).toBe('https://example.com/fallback.jpg');
  });
});

