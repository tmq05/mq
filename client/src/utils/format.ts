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


