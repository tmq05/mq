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
  id: string; // e.g. "audius:12345" or "deezer:67890" or "local:uuid"
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
  previewUrl?: string; // 30s preview URL
  isFullLength: boolean;
  lyrics?: string;
  playCount?: number;
}

export interface UnifiedArtist {
  id: string;
  source: MusicSource;
  sourceId: string;
  name: string;
  imageUrl?: string;
  bio?: string;
  topTracks?: UnifiedTrack[];
  followersCount?: number;
}

export interface UnifiedAlbum {
  id: string;
  source: MusicSource;
  sourceId: string;
  title: string;
  artist: string;
  coverUrl?: string;
  releaseDate?: string;
  tracks?: UnifiedTrack[];
}

export interface UnifiedPlaylist {
  id: string;
  source: MusicSource;
  sourceId: string;
  title: string;
  description?: string;
  coverUrl?: string;
  tracksCount?: number;
  tracks?: UnifiedTrack[];
}

export interface SearchResult {
  tracks: UnifiedTrack[];
  artists: UnifiedArtist[];
  albums: UnifiedAlbum[];
  playlists: UnifiedPlaylist[];
}

export interface StreamInfo {
  streamUrl?: string;
  embedId?: string;
  previewUrl?: string;
  playbackType: PlaybackType;
  expiresAt?: number;
}

export interface MusicProvider {
  readonly name: MusicSource;
  readonly isEnabled: boolean;

  search(
    query: string,
    type: 'track' | 'artist' | 'album' | 'playlist' | 'all',
    page?: number
  ): Promise<SearchResult>;

  getTrack(sourceId: string): Promise<UnifiedTrack | null>;
  getArtist?(sourceId: string): Promise<UnifiedArtist | null>;
  getAlbum?(sourceId: string): Promise<UnifiedAlbum | null>;
  getTrending?(): Promise<UnifiedTrack[]>;
  getStreamInfo(sourceId: string): Promise<StreamInfo | null>;
}

