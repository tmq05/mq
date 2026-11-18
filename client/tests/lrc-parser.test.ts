import { describe, it, expect } from 'vitest';
import { parseLrc, findCurrentLyricIndex } from '../src/utils/lrc-parser.js';

describe('lrc-parser', () => {
  it('parses LRC timestamps, multi-timestamps, meta tags, and offset', () => {
    const lrc = [
      '[ar:Test Artist]',
      '[ti:Test Song]',
      '[offset:500]',
      '[00:05.00]Dòng đầu tiên',
      '[00:10.250][00:20.50]Điệp khúc lặp lại',
      '[00:15.00]',
    ].join('\n');

    const parsed = parseLrc(lrc);
    expect(parsed).toHaveLength(4);
    expect(parsed[0]).toEqual({ timeMs: 5500, text: 'Dòng đầu tiên' });
    expect(parsed[1]).toEqual({ timeMs: 10750, text: 'Điệp khúc lặp lại' });
    expect(parsed[2]).toEqual({ timeMs: 15500, text: '' });
    expect(parsed[3]).toEqual({ timeMs: 21000, text: 'Điệp khúc lặp lại' });
  });

  it('binary searches current lyric index accurately', () => {
    const lines = [
      { timeMs: 5000, text: 'Line 1' },
      { timeMs: 10000, text: 'Line 2' },
      { timeMs: 15000, text: 'Line 3' },
    ];

    expect(findCurrentLyricIndex(lines, 2000)).toBe(-1);
    expect(findCurrentLyricIndex(lines, 5000)).toBe(0);
    expect(findCurrentLyricIndex(lines, 9999)).toBe(0);
    expect(findCurrentLyricIndex(lines, 10000)).toBe(1);
    expect(findCurrentLyricIndex(lines, 25000)).toBe(2);
  });
});
