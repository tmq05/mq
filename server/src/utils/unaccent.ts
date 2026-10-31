/**
 * Normalize and strip Vietnamese accents from a string for search and deduplication.
 * Handles composite Unicode characters as well.
 */
export function removeAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'))
    .toLowerCase()
    .trim();
}

/**
 * Strips common music suffixes like (Official MV), [Audio], (Lyric Video), etc.
 */
export function cleanMusicTitle(title: string): string {
  return removeAccents(title)
    .replace(/\(.*?(mv|video|audio|lyric|official|remix|cover|live|prod).*?\)/gi, '')
    .replace(/\[.*?(mv|video|audio|lyric|official|remix|cover|live|prod).*?\]/gi, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates string similarity ratio (0 to 1) for deduplication between providers.
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = cleanMusicTitle(str1);
  const s2 = cleanMusicTitle(str2);

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  if (s1.includes(s2) || s2.includes(s1)) {
    const minLen = Math.min(s1.length, s2.length);
    const maxLen = Math.max(s1.length, s2.length);
    return minLen / maxLen;
  }

  // Token overlap coefficient
  const words1 = new Set(s1.split(' '));
  const words2 = new Set(s2.split(' '));
  let intersection = 0;
  for (const w of words1) {
    if (words2.has(w)) intersection++;
  }
  const union = new Set([...words1, ...words2]).size;
  return union > 0 ? intersection / union : 0.0;
}
