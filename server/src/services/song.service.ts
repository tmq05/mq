import { prisma } from '../config/prisma.js';
import { UnifiedTrack } from '../providers/music-provider.interface.js';
import { providerRegistry } from '../providers/provider-registry.js';

export class SongService {
  /**
   * Upsert minimum metadata for external songs when played, liked, or added to playlist.
   * Does NOT download or store external audio files.
   */
  async upsertSong(track: UnifiedTrack) {
    const isLocal = track.source === 'local';
    const streamUrlToSave = isLocal ? track.streamUrl : undefined;

    return prisma.song.upsert({
      where: {
        source_sourceId: {
          source: track.source,
          sourceId: track.sourceId,
        },
      },
      update: {
        title: track.title,
        artists: track.artists,
        album: track.album || undefined,
        coverUrl: track.coverUrl || undefined,
        durationMs: track.durationMs,
        playbackType: track.playbackType,
        embedId: track.embedId || undefined,
        previewUrl: track.previewUrl || undefined,
        isFullLength: track.isFullLength,
      },
      create: {
        source: track.source,
        sourceId: track.sourceId,
        title: track.title,
        artists: track.artists,
        album: track.album || undefined,
        coverUrl: track.coverUrl || undefined,
        durationMs: track.durationMs,
        playbackType: track.playbackType,
        streamUrl: streamUrlToSave,
        embedId: track.embedId || undefined,
        previewUrl: track.previewUrl || undefined,
        isFullLength: track.isFullLength,
      },
    });
  }

  async getSong(idOrSource: string): Promise<UnifiedTrack | null> {
    // Check if it's source:sourceId format
    if (idOrSource.includes(':')) {
      const [source, ...rest] = idOrSource.split(':');
      const sourceId = rest.join(':');

      if (source === 'local') {
        return providerRegistry.get('local')?.getTrack(sourceId) || null;
      }

      const provider = providerRegistry.get(source as any);
      if (provider) {
        return provider.getTrack(sourceId);
      }
    }

    // Try finding in DB
    const song = await prisma.song.findUnique({
      where: { id: idOrSource },
      include: { artist: true },
    });

    if (song) {
      return {
        id: song.source === 'local' ? `local:${song.id}` : `${song.source}:${song.sourceId}`,
        source: song.source as any,
        sourceId: song.sourceId,
        title: song.title,
        artists: song.artists,
        album: song.album || undefined,
        coverUrl: song.coverUrl || undefined,
        durationMs: song.durationMs,
        playbackType: song.playbackType as any,
        streamUrl: song.streamUrl || undefined,
        embedId: song.embedId || undefined,
        previewUrl: song.previewUrl || undefined,
        isFullLength: song.isFullLength,
        lyrics: song.lyrics || undefined,
      };
    }

    return null;
  }

  async getStreamInfo(source: string, sourceId: string) {
    const provider = providerRegistry.get(source as any);
    if (!provider) {
      throw new Error(`Nguồn phát '${source}' không được hỗ trợ`);
    }
    return provider.getStreamInfo(sourceId);
  }

  async toggleLike(userId: string, track: UnifiedTrack) {
    const dbSong = await this.upsertSong(track);

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_songId: {
          userId,
          songId: dbSong.id,
        },
      },
    });

    if (existingLike) {
      await prisma.like.delete({
        where: { id: existingLike.id },
      });
      return { isLiked: false, songId: dbSong.id };
    } else {
      await prisma.like.create({
        data: {
          userId,
          songId: dbSong.id,
        },
      });
      return { isLiked: true, songId: dbSong.id };
    }
  }

  async recordPlay(userId?: string, track?: UnifiedTrack) {
    if (!track) return;
    const dbSong = await this.upsertSong(track);

    // Increment play count
    await prisma.song.update({
      where: { id: dbSong.id },
      data: { playCount: { increment: 1 } },
    });

    // Record history if user is logged in
    if (userId) {
      await prisma.playHistory.create({
        data: {
          userId,
          songId: dbSong.id,
        },
      });
    }
  }

  async getUserLikes(userId: string) {
    const likes = await prisma.like.findMany({
      where: { userId },
      include: { song: true },
      orderBy: { createdAt: 'desc' },
    });

    return likes.map((l) => ({
      id: l.song.source === 'local' ? `local:${l.song.id}` : `${l.song.source}:${l.song.sourceId}`,
      dbId: l.song.id,
      source: l.song.source,
      sourceId: l.song.sourceId,
      title: l.song.title,
      artists: l.song.artists,
      album: l.song.album,
      coverUrl: l.song.coverUrl,
      durationMs: l.song.durationMs,
      playbackType: l.song.playbackType,
      streamUrl: l.song.streamUrl,
      embedId: l.song.embedId,
      previewUrl: l.song.previewUrl,
      isFullLength: l.song.isFullLength,
      likedAt: l.createdAt,
    }));
  }

  async getUserHistory(userId: string) {
    const histories = await prisma.playHistory.findMany({
      where: { userId },
      include: { song: true },
      orderBy: { playedAt: 'desc' },
      take: 50,
    });

    return histories.map((h) => ({
      id: h.song.source === 'local' ? `local:${h.song.id}` : `${h.song.source}:${h.song.sourceId}`,
      dbId: h.song.id,
      source: h.song.source,
      sourceId: h.song.sourceId,
      title: h.song.title,
      artists: h.song.artists,
      album: h.song.album,
      coverUrl: h.song.coverUrl,
      durationMs: h.song.durationMs,
      playbackType: h.song.playbackType,
      streamUrl: h.song.streamUrl,
      embedId: h.song.embedId,
      previewUrl: h.song.previewUrl,
      isFullLength: h.song.isFullLength,
      playedAt: h.playedAt,
    }));
  }
}

export const songService = new SongService();

