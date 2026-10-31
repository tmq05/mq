import { prisma } from '../config/prisma.js';
import { UnifiedTrack } from '../providers/music-provider.interface.js';
import { songService } from './song.service.js';

export class PlaylistService {
  async createPlaylist(
    userId: string,
    data: { title: string; description?: string; isPublic?: boolean; coverUrl?: string }
  ) {
    return prisma.playlist.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        isPublic: data.isPublic ?? true,
        coverUrl: data.coverUrl,
      },
    });
  }

  async updatePlaylist(
    userId: string,
    playlistId: string,
    data: { title?: string; description?: string; isPublic?: boolean; coverUrl?: string }
  ) {
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      throw new Error('Playlist không tồn tại');
    }

    if (playlist.userId !== userId) {
      throw new Error('Bạn không có quyền chỉnh sửa playlist này');
    }

    return prisma.playlist.update({
      where: { id: playlistId },
      data: {
        ...(data.title ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.isPublic !== undefined ? { isPublic: data.isPublic } : {}),
        ...(data.coverUrl !== undefined ? { coverUrl: data.coverUrl } : {}),
      },
    });
  }

  async deletePlaylist(userId: string, playlistId: string) {
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      throw new Error('Playlist không tồn tại');
    }

    if (playlist.userId !== userId) {
      throw new Error('Bạn không có quyền xóa playlist này');
    }

    await prisma.playlist.delete({
      where: { id: playlistId },
    });

    return { success: true };
  }

  async addSong(userId: string, playlistId: string, track: UnifiedTrack) {
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      throw new Error('Playlist không tồn tại');
    }

    if (playlist.userId !== userId) {
      throw new Error('Bạn không có quyền thêm bài hát vào playlist này');
    }

    // Upsert song metadata
    const song = await songService.upsertSong(track);

    // Get max order
    const lastItem = await prisma.playlistSong.findFirst({
      where: { playlistId },
      orderBy: { order: 'desc' },
    });
    const order = lastItem ? lastItem.order + 1 : 0;

    return prisma.playlistSong.upsert({
      where: {
        playlistId_songId: {
          playlistId,
          songId: song.id,
        },
      },
      update: {},
      create: {
        playlistId,
        songId: song.id,
        order,
      },
    });
  }

  async removeSong(userId: string, playlistId: string, songId: string) {
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      throw new Error('Playlist không tồn tại');
    }

    if (playlist.userId !== userId) {
      throw new Error('Bạn không có quyền xóa bài khỏi playlist này');
    }

    // Song id may be DB id or prefixed id
    let cleanSongId = songId;
    if (songId.includes(':')) {
      const [source, ...rest] = songId.split(':');
      const sourceId = rest.join(':');
      const song = await prisma.song.findUnique({
        where: { source_sourceId: { source, sourceId } },
      });
      if (song) cleanSongId = song.id;
    }

    await prisma.playlistSong.deleteMany({
      where: {
        playlistId,
        songId: cleanSongId,
      },
    });

    return { success: true };
  }

  async getPlaylist(playlistId: string, currentUserId?: string) {
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        songs: {
          orderBy: { order: 'asc' },
          include: { song: true },
        },
      },
    });

    if (!playlist) {
      throw new Error('Playlist không tồn tại');
    }

    if (!playlist.isPublic && playlist.userId !== currentUserId) {
      throw new Error('Playlist này đang ở chế độ riêng tư');
    }

    return {
      ...playlist,
      tracks: playlist.songs.map((ps) => ({
        id: ps.song.source === 'local' ? `local:${ps.song.id}` : `${ps.song.source}:${ps.song.sourceId}`,
        dbId: ps.song.id,
        source: ps.song.source,
        sourceId: ps.song.sourceId,
        title: ps.song.title,
        artists: ps.song.artists,
        album: ps.song.album,
        coverUrl: ps.song.coverUrl,
        durationMs: ps.song.durationMs,
        playbackType: ps.song.playbackType,
        streamUrl: ps.song.streamUrl,
        embedId: ps.song.embedId,
        previewUrl: ps.song.previewUrl,
        isFullLength: ps.song.isFullLength,
        order: ps.order,
      })),
    };
  }

  async getUserPlaylists(userId: string) {
    return prisma.playlist.findMany({
      where: { userId },
      include: {
        _count: { select: { songs: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}

export const playlistService = new PlaylistService();

