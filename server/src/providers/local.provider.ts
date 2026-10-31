import { prisma } from '../config/prisma.js';
import {
  MusicProvider,
  MusicSource,
  SearchResult,
  StreamInfo,
  UnifiedTrack,
  UnifiedArtist,
  UnifiedAlbum,
  UnifiedPlaylist,
} from './music-provider.interface.js';
import { removeAccents } from '../utils/unaccent.js';
import { resolveExactFullTrack } from '../utils/track-resolver.js';

export class LocalProvider implements MusicProvider {
  readonly name: MusicSource = 'local';
  readonly isEnabled = true;

  private mapSong(song: any): UnifiedTrack {
    return {
      id: song.id.startsWith('local:') ? song.id : `local:${song.id}`,
      source: 'local',
      sourceId: song.sourceId || song.id,
      title: song.title,
      artists: song.artists && song.artists.length > 0
        ? song.artists
        : song.artist?.name
        ? [song.artist.name]
        : ['Nghệ sĩ chưa rõ'],
      album: song.album || song.albumRef?.title || '',
      coverUrl: song.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
      durationMs: song.durationMs || 0,
      playbackType: (song.playbackType as any) || (song.embedId ? 'youtube' : 'audio'),
      embedId: song.embedId || undefined,
      streamUrl: song.streamUrl || `/api/songs/${song.id}/stream`,
      isFullLength: song.isFullLength ?? true,
      lyrics: song.lyrics || undefined,
    };
  }

  async search(
    query: string,
    type: 'track' | 'artist' | 'album' | 'playlist' | 'all' = 'all',
    page = 1
  ): Promise<SearchResult> {
    const result: SearchResult = { tracks: [], artists: [], albums: [], playlists: [] };
    if (!query.trim()) return result;

    const limit = 15;
    const skip = (page - 1) * limit;
    const cleanQuery = removeAccents(query);

    // Search songs: use PostgreSQL unaccent or ILIKE
    if (type === 'track' || type === 'all') {
      try {
        // Query using Prisma with raw unaccent query if available, or fallback to ILIKE
        const songs = await prisma.$queryRaw<any[]>`
          SELECT s.*, a.name as "artistName"
          FROM songs s
          LEFT JOIN artists a ON s."artistId" = a.id
          WHERE s.source = 'local'
            AND (
              unaccent(s.title) ILIKE unaccent(${'%' + cleanQuery + '%'})
              OR EXISTS (
                SELECT 1 FROM unnest(s.artists) artist_name
                WHERE unaccent(artist_name) ILIKE unaccent(${'%' + cleanQuery + '%'})
              )
            )
          ORDER BY s."playCount" DESC
          LIMIT ${limit} OFFSET ${skip};
        `;
        result.tracks = songs.map((s) => this.mapSong(s));
      } catch {
        // Fallback standard Prisma query
        const songs = await prisma.song.findMany({
          where: {
            source: 'local',
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { artists: { hasSome: [query] } },
            ],
          },
          take: limit,
          skip,
        });
        result.tracks = songs.map((s) => this.mapSong(s));
      }
    }

    // Search artists
    if (type === 'artist' || type === 'all') {
      try {
        const artists = await prisma.$queryRaw<any[]>`
          SELECT * FROM artists
          WHERE unaccent(name) ILIKE unaccent(${'%' + cleanQuery + '%'})
          LIMIT 5;
        `;
        result.artists = artists.map((a): UnifiedArtist => ({
          id: `local:${a.id}`,
          source: 'local',
          sourceId: a.id,
          name: a.name,
          imageUrl: a.imageUrl,
          bio: a.bio,
        }));
      } catch {
        const artists = await prisma.artist.findMany({
          where: { name: { contains: query, mode: 'insensitive' } },
          take: 5,
        });
        result.artists = artists.map((a): UnifiedArtist => ({
          id: `local:${a.id}`,
          source: 'local',
          sourceId: a.id,
          name: a.name,
          imageUrl: a.imageUrl || undefined,
          bio: a.bio || undefined,
        }));
      }
    }

    // Search albums
    if (type === 'album' || type === 'all') {
      try {
        const albums = await prisma.$queryRaw<any[]>`
          SELECT al.*, ar.name as "artistName"
          FROM albums al
          LEFT JOIN artists ar ON al."artistId" = ar.id
          WHERE unaccent(al.title) ILIKE unaccent(${'%' + cleanQuery + '%'})
          LIMIT 5;
        `;
        result.albums = albums.map((al): UnifiedAlbum => ({
          id: `local:${al.id}`,
          source: 'local',
          sourceId: al.id,
          title: al.title,
          artist: al.artistName || 'Various Artists',
          coverUrl: al.coverUrl,
          releaseDate: al.releaseDate ? al.releaseDate.toISOString() : undefined,
        }));
      } catch {
        const albums = await prisma.album.findMany({
          where: { title: { contains: query, mode: 'insensitive' } },
          include: { artist: true },
          take: 5,
        });
        result.albums = albums.map((al): UnifiedAlbum => ({
          id: `local:${al.id}`,
          source: 'local',
          sourceId: al.id,
          title: al.title,
          artist: al.artist?.name || 'Various Artists',
          coverUrl: al.coverUrl || undefined,
          releaseDate: al.releaseDate ? al.releaseDate.toISOString() : undefined,
        }));
      }
    }

    // Search playlists
    if (type === 'playlist' || type === 'all') {
      const playlists = await prisma.playlist.findMany({
        where: {
          isPublic: true,
          title: { contains: query, mode: 'insensitive' },
        },
        include: { _count: { select: { songs: true } } },
        take: 5,
      });
      result.playlists = playlists.map((p): UnifiedPlaylist => ({
        id: `local:${p.id}`,
        source: 'local',
        sourceId: p.id,
        title: p.title,
        description: p.description || undefined,
        coverUrl: p.coverUrl || undefined,
        tracksCount: p._count.songs,
      }));
    }

    return result;
  }

  async getTrack(sourceId: string): Promise<UnifiedTrack | null> {
    const cleanId = sourceId.replace(/^local:/, '');
    const song = await prisma.song.findFirst({
      where: {
        OR: [{ id: cleanId }, { sourceId: cleanId }],
      },
      include: { artist: true, albumRef: true },
    });
    if (!song) return null;
    return this.mapSong(song);
  }

  async getTrending(): Promise<UnifiedTrack[]> {
    const songs = await prisma.song.findMany({
      where: { source: 'local' },
      orderBy: { playCount: 'desc' },
      take: 15,
      include: { artist: true, albumRef: true },
    });
    return songs.map((s) => this.mapSong(s));
  }

  async getStreamInfo(sourceId: string): Promise<StreamInfo | null> {
    const track = await this.getTrack(sourceId);
    if (!track) return null;
    if (track.embedId || track.playbackType === 'youtube') {
      return {
        playbackType: 'youtube',
        embedId: track.embedId,
      };
    }
    const vid = await resolveExactFullTrack(track.title, track.artists[0] || '');
    if (vid) {
      return {
        playbackType: 'youtube',
        embedId: vid,
      };
    }
    return {
      streamUrl: track.streamUrl || `/api/songs/${track.id}/stream`,
      playbackType: 'audio',
    };
  }
}

export const localProvider = new LocalProvider();

