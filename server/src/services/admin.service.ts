import { prisma } from '../config/prisma.js';
import { youtubeProvider } from '../providers/youtube.provider.js';
import { env } from '../config/env.js';

export class AdminService {
  async getDashboardStats() {
    const [totalUsers, totalSongs, totalArtists, totalPlaylists, playCountAggregate] =
      await Promise.all([
        prisma.user.count(),
        prisma.song.count({ where: { source: 'local' } }),
        prisma.artist.count(),
        prisma.playlist.count(),
        prisma.song.aggregate({ _sum: { playCount: true } }),
      ]);

    // Daily plays for the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentPlays = await prisma.playHistory.groupBy({
      by: ['playedAt'],
      where: { playedAt: { gte: sevenDaysAgo } },
      _count: { _all: true },
    });

    // Group by YYYY-MM-DD
    const chartMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      chartMap.set(key, 0);
    }

    recentPlays.forEach((p) => {
      const key = p.playedAt.toISOString().split('T')[0];
      if (chartMap.has(key)) {
        chartMap.set(key, (chartMap.get(key) || 0) + p._count._all);
      }
    });

    const chartData = Array.from(chartMap.entries()).map(([date, count]) => ({
      date,
      plays: count,
    }));

    return {
      totalUsers,
      totalSongs,
      totalArtists,
      totalPlaylists,
      totalPlays: playCountAggregate._sum.playCount || 0,
      chartData,
    };
  }

  async getProvidersStatus() {
    const youtubeQuota = youtubeProvider.getQuotaStatus();

    return {
      audius: { enabled: env.AUDIUS_ENABLED, status: 'operational', keyRequired: false },
      jamendo: { enabled: env.JAMENDO_ENABLED, status: 'operational', keyRequired: true, hasKey: Boolean(env.JAMENDO_CLIENT_ID) },
      youtube: { enabled: env.YOUTUBE_ENABLED, status: youtubeQuota.quotaExceeded ? 'quota_exceeded' : 'operational', keyRequired: true, hasKey: youtubeQuota.hasKey },
      deezer: { enabled: env.DEEZER_ENABLED, status: 'operational', keyRequired: false },
      itunes: { enabled: env.ITUNES_ENABLED, status: 'operational', keyRequired: false },
      spotify: { enabled: env.SPOTIFY_ENABLED, status: env.SPOTIFY_ENABLED ? 'operational' : 'disabled', keyRequired: true, hasKey: Boolean(env.SPOTIFY_CLIENT_ID) },
      lrclib: { enabled: env.LRCLIB_ENABLED, status: 'operational', keyRequired: false },
    };
  }

  // Users management
  async getUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isLocked: true,
          avatarUrl: true,
          createdAt: true,
          _count: { select: { playlists: true, likes: true } },
        },
      }),
      prisma.user.count(),
    ]);

    return { users, total, page, totalPages: Math.ceil(total / limit) };
  }

  async toggleLockUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Người dùng không tồn tại');
    if (user.role === 'ADMIN') throw new Error('Không thể khóa tài khoản quản trị viên');

    return prisma.user.update({
      where: { id: userId },
      data: { isLocked: !user.isLocked },
    });
  }

  async changeUserRole(userId: string, role: 'USER' | 'ADMIN') {
    return prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }

  // Song CRUD
  async createSong(data: {
    title: string;
    artists: string[];
    artistId?: string;
    album?: string;
    genreId?: string;
    durationMs: number;
    streamUrl: string;
    coverUrl?: string;
    lyrics?: string;
  }) {
    const songId = `local-${Date.now()}`;
    return prisma.song.create({
      data: {
        source: 'local',
        sourceId: songId,
        title: data.title,
        artists: data.artists,
        artistId: data.artistId,
        album: data.album,
        genreId: data.genreId,
        durationMs: data.durationMs,
        streamUrl: data.streamUrl,
        coverUrl: data.coverUrl,
        lyrics: data.lyrics,
        playbackType: 'audio',
        isFullLength: true,
      },
    });
  }

  async updateSong(
    id: string,
    data: {
      title?: string;
      artists?: string[];
      album?: string;
      genreId?: string;
      coverUrl?: string;
      lyrics?: string;
    }
  ) {
    return prisma.song.update({
      where: { id },
      data,
    });
  }

  async deleteSong(id: string) {
    return prisma.song.delete({ where: { id } });
  }
}

export const adminService = new AdminService();

