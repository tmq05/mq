import { describe, it, expect } from 'vitest';
import { formatDuration, formatMs } from '../src/utils/format.js';

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
});

