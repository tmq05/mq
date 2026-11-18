import { describe, expect, it } from 'vitest';
import { assertNoProfanity, containsProfanity } from '../src/utils/profanity-filter.js';

describe('Profanity Filter', () => {
  it('chặn các từ tục tĩu tiếng Việt có dấu và cụm từ phản cảm', () => {
    expect(containsProfanity('lồn trâu')).toBe(true);
    expect(containsProfanity('Địt mẹ mày')).toBe(true);
    expect(containsProfanity('Cái cặc gì thế')).toBe(true);
    expect(containsProfanity('Đéo hiểu nổi')).toBe(true);
    expect(containsProfanity('Óc chó')).toBe(true);
  });

  it('chặn các biến thể lách luật (không dấu, lặp ký tự, chèn dấu chấm/gạch, tiếng Anh)', () => {
    expect(containsProfanity('l.ồ.n')).toBe(true);
    expect(containsProfanity('lồnnnn')).toBe(true);
    expect(containsProfanity('lon trau')).toBe(true);
    expect(containsProfanity('dit me')).toBe(true);
    expect(containsProfanity('f.u.c.k you')).toBe(true);
    expect(containsProfanity('v.c.l')).toBe(true);
  });

  it('KHÔNG chặn nhầm tên bài hát / playlist bình thường', () => {
    expect(containsProfanity('Lớn rồi còn khóc nhè')).toBe(false);
    expect(containsProfanity('Du lịch mùa hè 2026')).toBe(false);
    expect(containsProfanity('EDM Remix Chill')).toBe(false);
    expect(containsProfanity('Đừng làm trái tim anh đau')).toBe(false);
    expect(containsProfanity('Giai điệu mùa thu')).toBe(false);
  });

  it('assertNoProfanity ném lỗi 400 với thông báo rõ ràng khi phát hiện vi phạm', () => {
    expect(() =>
      assertNoProfanity([{ label: 'Tên playlist', value: 'lồn trâu' }])
    ).toThrow(/Tên playlist chứa từ ngữ không phù hợp/);

    expect(() =>
      assertNoProfanity([{ label: 'Tên playlist', value: 'Nhạc Chill Cuối Tuần' }])
    ).not.toThrow();
  });
});
