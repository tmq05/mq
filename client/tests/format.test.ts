import { describe, it, expect } from 'vitest';
import { formatDuration, formatMs, formatArtists, formatAlbumArtist } from '../src/utils/format.js';

describe('Client Format Utilities', () => {
  it('should format seconds into mm:ss format', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(59)).toBe('0:59');
    expect(formatDuration(60)).toBe('1:00');
    expect(formatDuration(245)).toBe('4:05');
    expect(formatDuration(3605)).toBe('60:05');
  });

  it('should format milliseconds into mm:ss format', () => {
    expect(formatMs(301000)).toBe('5:01');
    expect(formatMs(198000)).toBe('3:18');
  });

  it('should safely format artists from string array, object, or undefined', () => {
    expect(formatArtists(['Sơn Tùng M-TP', 'Đen Vâu'])).toBe('Sơn Tùng M-TP, Đen Vâu');
    expect(formatArtists(['Vũ.'])).toBe('Vũ.');
    expect(formatArtists([{ name: 'Sơn Tùng M-TP' }])).toBe('Sơn Tùng M-TP');
    expect(formatArtists({ name: 'Châu Đăng Khoa' })).toBe('Châu Đăng Khoa');
    expect(formatArtists('Đen')).toBe('Đen');
    expect(formatArtists(null)).toBe('Nghệ sĩ');
    expect(formatArtists(undefined)).toBe('Nghệ sĩ');
    expect(formatArtists([])).toBe('Nghệ sĩ');
  });

  it('should safely format album artist from string or relation object', () => {
    expect(formatAlbumArtist('Sơn Tùng M-TP')).toBe('Sơn Tùng M-TP');
    expect(formatAlbumArtist({ id: '123', name: 'Vũ.' })).toBe('Vũ.');
    expect(formatAlbumArtist(null)).toBe('Nhiều nghệ sĩ');
    expect(formatAlbumArtist(undefined)).toBe('Nhiều nghệ sĩ');
  });
});

