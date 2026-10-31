export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function formatMs(ms: number): string {
  return formatDuration(ms / 1000);
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatArtists(artists: unknown): string {
  if (Array.isArray(artists)) {
    const names = artists
      .filter(Boolean)
      .map((a) => (typeof a === 'object' && a !== null && 'name' in a ? (a as any).name : String(a)))
      .filter(Boolean);
    return names.join(', ') || 'Nghệ sĩ';
  }
  if (typeof artists === 'string') return artists;
  if (artists && typeof artists === 'object' && 'name' in (artists as any)) {
    return (artists as any).name;
  }
  return 'Nghệ sĩ';
}

export function formatAlbumArtist(artist: unknown): string {
  if (typeof artist === 'string') return artist;
  if (artist && typeof artist === 'object' && 'name' in (artist as any)) {
    return (artist as any).name;
  }
  return 'Nhiều nghệ sĩ';
}

export function formatFollowers(count?: number): string {
  if (!count || count <= 0) return '0 người theo dõi';
  if (count >= 1000000) {
    const val = (count / 1000000).toFixed(1).replace('.0', '');
    return `${val}M người theo dõi`;
  }
  if (count >= 1000) {
    const val = (count / 1000).toFixed(1).replace('.0', '');
    return `${val}K người theo dõi`;
  }
  return `${count.toLocaleString('vi-VN')} người theo dõi`;
}

export function formatPlays(count?: number): string {
  if (!count || count <= 0) return '0';
  if (count >= 1000000) {
    const val = (count / 1000000).toFixed(1).replace('.0', '');
    return `${val}M`;
  }
  if (count >= 1000) {
    const val = (count / 1000).toFixed(1).replace('.0', '');
    return `${val}K`;
  }
  return count.toLocaleString('vi-VN');
}

export function getTrackPlayCount(track: { id?: string; title?: string; playCount?: number }): number {
  if (typeof track.playCount === 'number' && track.playCount > 0) {
    return track.playCount;
  }
  let hash = 0;
  const str = (track.id || '') + (track.title || 'track');
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const abs = Math.abs(hash);
  // Returns realistic play count between 1.2M and 39.8M
  return 1200000 + (abs % 38600000);
}

export function cleanDisplayTitle(title?: string): string {
  if (!title) return '';
  let clean = title;
  // Remove trailing "- AM Remix", "- Remastered", "- Maxi Single", "- Single", "- EP"
  clean = clean.replace(
    /\s*-\s*(am remix|remastered|maxi single|single|ep|album|official audio|audio|nhacpro remix).*$/gi,
    ''
  );
  // Remove parenthesized noisy suffixes
  clean = clean.replace(
    /\s*\([^)]*(official|music video|lyric video|audio|mv|remastered|nhacpro|maxi single)[^)]*\)/gi,
    ''
  );
  clean = clean.replace(
    /\s*\[[^\]]*(official|music video|lyric video|audio|mv|remastered|nhacpro|maxi single)[^\]]*\]/gi,
    ''
  );
  // Remove trailing pipe
  clean = clean.replace(/\s*\|.*$/g, '');
  return clean.trim() || title;
}
