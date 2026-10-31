export type PlaybackType = 'audio' | 'youtube' | 'spotify' | 'zingmp3' | 'preview';

export type MusicSource =
  | 'local'
  | 'audius'
  | 'jamendo'
  | 'youtube'
  | 'deezer'
  | 'itunes'
  | 'spotify'
  | 'zingmp3';

export interface UnifiedTrack {
  id: string; // e.g. "audius:12345" or "local:uuid"
  dbId?: string;
  source: MusicSource;
  sourceId: string;
  title: string;
  artists: string[];
  album?: string;
  coverUrl?: string;
  durationMs: number;
  playbackType: PlaybackType;
  streamUrl?: string;
  embedId?: string; // YouTube video ID
  previewUrl?: string;
  isFullLength: boolean;
  lyrics?: string;
}

export interface UnifiedArtist {
  id: string;
  source: MusicSource;
  sourceId: string;
  name: string;
  imageUrl?: string;
  bio?: string;
}

export interface UnifiedAlbum {
  id: string;
  source: MusicSource;
  sourceId: string;
  title: string;
  artist: string;
  coverUrl?: string;
  releaseDate?: string;
}

export interface UnifiedPlaylist {
  id: string;
  source: MusicSource;
  sourceId: string;
  title: string;
  description?: string;
  coverUrl?: string;
  tracksCount?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  avatarUrl?: string;
  isLocked?: boolean;
  createdAt: string;
}

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  isPublic: boolean;
  userId: string;
  tracks?: UnifiedTrack[];
  _count?: { songs: number };
  createdAt: string;
  updatedAt: string;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
  category?: 'vietnam' | 'international' | 'mood';
  categoryLabel?: string;
  gradient?: string;
  color?: string;
  description?: string;
  imageUrl?: string;
  _count?: { songs: number };
}

export interface Album {
  id: string;
  title: string;
  coverUrl?: string;
  releaseDate?: string;
  artist?: string | { id?: string; name: string };
  tracks?: UnifiedTrack[];
}

export interface LyricsLine {
  timeMs: number;
  text: string;
}
