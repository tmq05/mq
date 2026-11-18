import { prisma } from '../config/prisma.js';
import { UnifiedTrack } from '../providers/music-provider.interface.js';
import { providerRegistry } from '../providers/provider-registry.js';

export class SongService {
  /**
   * Upsert minimum metadata for external songs when played, liked, or added to playlist.
   * Does NOT download or store external audio files.
   */
  async upsertSong(track: UnifiedTrack) {
    const rawId = track.id || '';
    const colonIdx = rawId.indexOf(':');
    const inferredSource = colonIdx > 0 ? rawId.slice(0, colonIdx) : 'local';
    const inferredSourceId = colonIdx > 0 ? rawId.slice(colonIdx + 1) : rawId;

    const source = track.source || inferredSource;
    const sourceId = track.sourceId || inferredSourceId;
    const artists = Array.isArray(track.artists) ? track.artists : [];
    const durationMs = Number.isFinite(Number(track.durationMs)) ? Number(track.durationMs) : 0;
    const playbackType = track.playbackType || 'stream';
    const isFullLength = track.isFullLength ?? true;

    const isLocal = source === 'local';
    if (isLocal && (track as any).dbId) {
      const existingById = await prisma.song.findUnique({ where: { id: (track as any).dbId } });
      if (existingById) return existingById;
    }
    if (isLocal && sourceId) {
      const existingById = await prisma.song.findUnique({ where: { id: sourceId } });
      if (existingById) return existingById;
    }

    const streamUrlToSave = isLocal ? track.streamUrl : undefined;

    return prisma.song.upsert({
      where: {
        source_sourceId: {
          source,
          sourceId,
        },
      },
      update: {
        title: track.title || 'Không rõ tên bài hát',
        artists,
        album: track.album || undefined,
        coverUrl: track.coverUrl || undefined,
        durationMs,
        playbackType,
        embedId: track.embedId || undefined,
        previewUrl: track.previewUrl || undefined,
        isFullLength,
      },
      create: {
        source,
        sourceId,
        title: track.title || 'Không rõ tên bài hát',
        artists,
        album: track.album || undefined,
        coverUrl: track.coverUrl || undefined,
        durationMs,
        playbackType,
        streamUrl: streamUrlToSave,
        embedId: track.embedId || undefined,
        previewUrl: track.previewUrl || undefined,
        isFullLength,
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

    // Record history if user is logged in (giữ mỗi bài hát chỉ xuất hiện 1 lần ở vị trí mới nhất)
    if (userId) {
      await prisma.playHistory.deleteMany({
        where: {
          userId,
          songId: dbSong.id,
        },
      });
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
      take: 150,
    });

    const seenSongIds = new Set<string>();
    const seenTrackKeys = new Set<string>();
    const uniqueHistories = [];

    for (const h of histories) {
      if (seenSongIds.has(h.songId)) continue;
      const trackKey = `${h.song.title.trim().toLowerCase()}::${(h.song.artists[0] || '').trim().toLowerCase()}`;
      if (seenTrackKeys.has(trackKey)) continue;

      seenSongIds.add(h.songId);
      seenTrackKeys.add(trackKey);
      uniqueHistories.push({
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
      });

      if (uniqueHistories.length >= 50) break;
    }

    return uniqueHistories;
  }
}

export const songService = new SongService();

