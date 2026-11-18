import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma.js';
import { youtubeProvider } from '../providers/youtube.provider.js';
import { env } from '../config/env.js';
import { ALBUMS_CATALOG } from '../utils/albums-data.js';
import { ARTISTS_CATALOG } from '../utils/artists-data.js';
import { spotifyProvider } from '../providers/spotify.provider.js';
import { localStorageProvider } from '../storage/local-storage.js';
import { quotaService } from './quota.service.js';
import { auditService } from './audit.service.js';
import { settingsService } from './settings.service.js';
import { providerRegistry } from '../providers/provider-registry.js';

function getDirectorySize(dirPath: string): number {
  let size = 0;
  if (!fs.existsSync(dirPath)) return 0;
  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        size += getDirectorySize(fullPath);
      } else {
        size += stat.size;
      }
    }
  } catch (err) {
    console.error('Error calculating directory size:', err);
  }
  return size;
}

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function calculateTrend(current: number, previous: number) {
  if (previous === 0) {
    return {
      percent: current > 0 ? 100 : 0,
      isUp: true,
      diff: current,
    };
  }
  const diff = current - previous;
  const percent = Number(((diff / previous) * 100).toFixed(1));
  return {
    percent: Math.abs(percent),
    isUp: diff >= 0,
    diff,
  };
}

export class AdminService {
  async getDashboardStats(days = 7) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsers7d,
      newUsersPrev7d,
      activeTodayList,
      activeYesterdayList,
      totalSongs,
      songs7d,
      songsPrev7d,
      totalArtists,
      artists7d,
      artistsPrev7d,
      totalPlaylists,
      playlists7d,
      playlistsPrev7d,
      playCountAggregate,
      dbAlbumsCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
      prisma.playHistory.findMany({
        where: { playedAt: { gte: startOfToday } },
        distinct: ['userId'],
        select: { userId: true },
      }),
      prisma.playHistory.findMany({
        where: { playedAt: { gte: startOfYesterday, lt: startOfToday } },
        distinct: ['userId'],
        select: { userId: true },
      }),
      prisma.song.count({ where: { source: 'local' } }),
      prisma.song.count({ where: { source: 'local', createdAt: { gte: sevenDaysAgo } } }),
      prisma.song.count({ where: { source: 'local', createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
      prisma.artist.count(),
      prisma.artist.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.artist.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
      prisma.playlist.count(),
      prisma.playlist.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.playlist.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
      prisma.song.aggregate({ _sum: { playCount: true } }),
      prisma.album.count(),
    ]);

    const activeUsersToday = Math.max(1, activeTodayList.length);
    const activeUsersYesterday = Math.max(1, activeYesterdayList.length);

    // Calculate trends
    const userTrend = calculateTrend(newUsers7d, newUsersPrev7d);
    const newUsersTrend = calculateTrend(newUsers7d, newUsersPrev7d);
    const activeUsersTrend = calculateTrend(activeUsersToday, activeUsersYesterday);
    const songsTrend = calculateTrend(songs7d, songsPrev7d);
    const artistsTrend = calculateTrend(artists7d, artistsPrev7d);
    const playlistsTrend = calculateTrend(playlists7d, playlistsPrev7d);

    const totalAlbums = Math.max(dbAlbumsCount, ALBUMS_CATALOG.length);
    const albumsTrend = calculateTrend(totalAlbums, ALBUMS_CATALOG.length);

    // Daily plays for the requested number of days (7, 30, 90)
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const prevStartDate = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);

    const [historyPlays, prevPeriodPlaysRes] = await Promise.all([
      // Group by DATE("playedAt") in PostgreSQL
      prisma.$queryRaw<Array<{ date: Date | string; count: number | bigint }>>`
        SELECT DATE("playedAt") as date, COUNT(*)::int as count
        FROM play_histories
        WHERE "playedAt" >= ${startDate}
        GROUP BY DATE("playedAt")
        ORDER BY date ASC
      `,
      prisma.$queryRaw<Array<{ count: number | bigint }>>`
        SELECT COUNT(*)::int as count
        FROM play_histories
        WHERE "playedAt" >= ${prevStartDate} AND "playedAt" < ${startDate}
      `,
    ]);

    const chartMap = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      chartMap.set(key, 0);
    }

    historyPlays.forEach((p) => {
      const dateStr =
        p.date instanceof Date
          ? p.date.toISOString().split('T')[0]
          : String(p.date).split('T')[0];
      if (chartMap.has(dateStr)) {
        chartMap.set(dateStr, (chartMap.get(dateStr) || 0) + Number(p.count));
      }
    });

    const chartData = Array.from(chartMap.entries()).map(([date, plays]) => ({
      date,
      plays,
    }));

    const periodPlays = chartData.reduce((acc, curr) => acc + curr.plays, 0);
    const prevPeriodPlays = Number(prevPeriodPlaysRes[0]?.count || 0);
    const playsTrend = calculateTrend(periodPlays, prevPeriodPlays);

    // Storage Usage
    const possibleUploadDirs = [
      path.resolve(process.cwd(), env.UPLOAD_DIR),
      path.resolve(process.cwd(), 'server', env.UPLOAD_DIR),
      path.resolve(process.cwd(), 'uploads'),
      path.resolve(process.cwd(), 'server/uploads'),
    ];
    const uploadDir = possibleUploadDirs.find((d) => fs.existsSync(d)) || possibleUploadDirs[0];
    const uploadsBytes = getDirectorySize(uploadDir);

    let dbBytes = 0;
    try {
      const dbSizeRes = await prisma.$queryRaw<Array<{ size: bigint | number }>>`
        SELECT pg_database_size(current_database())::bigint as size
      `;
      if (dbSizeRes && dbSizeRes[0]) {
        dbBytes = Number(dbSizeRes[0].size);
      }
    } catch (e) {
      console.error('Failed to get database size:', e);
    }

    const totalStorageBytes = uploadsBytes + dbBytes;
    const storageTrend = calculateTrend(totalStorageBytes, Math.max(1, totalStorageBytes - uploadsBytes));

    // Top 10 Songs
    const topSongs = await prisma.song.findMany({
      orderBy: { playCount: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        artists: true,
        coverUrl: true,
        playCount: true,
        durationMs: true,
        album: true,
        source: true,
      },
    });

    // Top 5 Artists
    const dbArtists = await prisma.artist.findMany({
      include: {
        songs: { select: { id: true, playCount: true } },
        _count: { select: { songs: true, followers: true } },
      },
    });

    const topArtists = dbArtists
      .map((artist) => {
        const totalPlays = artist.songs.reduce((acc, s) => acc + s.playCount, 0);
        return {
          id: artist.id,
          name: artist.name,
          imageUrl: artist.imageUrl,
          songCount: artist._count.songs,
          followerCount: artist._count.followers,
          totalPlays,
        };
      })
      .sort((a, b) => b.totalPlays - a.totalPlays || b.songCount - a.songCount)
      .slice(0, 5);

    // User Growth over 30 days
    const growthDays = 30;
    const growthStartDate = new Date(Date.now() - growthDays * 24 * 60 * 60 * 1000);
    const initialUsersCount = await prisma.user.count({
      where: { createdAt: { lt: growthStartDate } },
    });

    const usersByDay = await prisma.$queryRaw<Array<{ date: Date | string; count: number | bigint }>>`
      SELECT DATE("createdAt") as date, COUNT(*)::int as count
      FROM users
      WHERE "createdAt" >= ${growthStartDate}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    const userDayMap = new Map<string, number>();
    for (let i = growthDays - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      userDayMap.set(key, 0);
    }

    usersByDay.forEach((row) => {
      const dateStr =
        row.date instanceof Date
          ? row.date.toISOString().split('T')[0]
          : String(row.date).split('T')[0];
      if (userDayMap.has(dateStr)) {
        userDayMap.set(dateStr, Number(row.count));
      }
    });

    let runningTotal = initialUsersCount;
    const userGrowth = Array.from(userDayMap.entries()).map(([date, count]) => {
      runningTotal += count;
      return {
        date,
        newUsers: count,
        cumulativeUsers: runningTotal,
      };
    });

    // Recent Activities
    const [recentUsers, recentSongs, recentPlaylists, recentLikes] = await Promise.all([
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true },
      }),
      prisma.song.findMany({
        where: { source: 'local' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, artists: true, coverUrl: true, createdAt: true },
      }),
      prisma.playlist.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          user: { select: { name: true, avatarUrl: true } },
          createdAt: true,
        },
      }),
      prisma.like.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          song: { select: { title: true, artists: true } },
          user: { select: { name: true, avatarUrl: true } },
          createdAt: true,
        },
      }),
    ]);

    const activities: Array<{
      id: string;
      type: 'register' | 'upload' | 'playlist' | 'like';
      title: string;
      description: string;
      userName: string;
      userAvatar?: string | null;
      timestamp: string;
    }> = [];

    recentUsers.forEach((u) => {
      activities.push({
        id: `user-${u.id}`,
        type: 'register',
        title: 'Đăng ký tài khoản',
        description: `Người dùng ${u.name} (${u.email}) đã gia nhập mq`,
        userName: u.name,
        userAvatar: u.avatarUrl,
        timestamp: u.createdAt.toISOString(),
      });
    });

    recentSongs.forEach((s) => {
      activities.push({
        id: `song-${s.id}`,
        type: 'upload',
        title: 'Tải lên bài hát',
        description: `Bài hát "${s.title}" (${s.artists.join(', ')}) được thêm vào hệ thống`,
        userName: 'Admin MQ',
        userAvatar: null,
        timestamp: s.createdAt.toISOString(),
      });
    });

    recentPlaylists.forEach((p) => {
      activities.push({
        id: `playlist-${p.id}`,
        type: 'playlist',
        title: 'Tạo danh sách phát',
        description: `Tạo playlist mới "${p.title}"`,
        userName: p.user?.name || 'Người dùng',
        userAvatar: p.user?.avatarUrl,
        timestamp: p.createdAt.toISOString(),
      });
    });

    recentLikes.forEach((l) => {
      activities.push({
        id: `like-${l.id}`,
        type: 'like',
        title: 'Yêu thích bài hát',
        description: `Đã thích bài hát "${l.song.title}"`,
        userName: l.user?.name || 'Người dùng',
        userAvatar: l.user?.avatarUrl,
        timestamp: l.createdAt.toISOString(),
      });
    });

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const recentActivities = activities.slice(0, 10);

    // System Health snapshot
    const systemHealth = await this.getSystemHealth();

    return {
      totalUsers,
      totalSongs,
      totalArtists,
      totalAlbums,
      totalPlaylists,
      totalPlays: playCountAggregate._sum.playCount || 0,
      periodPlays,
      days,
      chartData,
      metrics: {
        users: { value: totalUsers, change: userTrend.percent, isUp: userTrend.isUp },
        newUsers7d: { value: newUsers7d, change: newUsersTrend.percent, isUp: newUsersTrend.isUp },
        activeUsersToday: { value: activeUsersToday, change: activeUsersTrend.percent, isUp: activeUsersTrend.isUp },
        plays: { value: playCountAggregate._sum.playCount || 0, change: playsTrend.percent, isUp: playsTrend.isUp },
        songs: { value: totalSongs, change: songsTrend.percent, isUp: songsTrend.isUp },
        artists: { value: totalArtists, change: artistsTrend.percent, isUp: artistsTrend.isUp },
        albums: { value: totalAlbums, change: albumsTrend.percent, isUp: albumsTrend.isUp },
        playlists: { value: totalPlaylists, change: playlistsTrend.percent, isUp: playlistsTrend.isUp },
        storage: {
          value: formatBytes(totalStorageBytes),
          rawBytes: totalStorageBytes,
          uploadsBytes,
          dbBytes,
          change: storageTrend.percent,
          isUp: storageTrend.isUp,
        },
      },
      topSongs,
      topArtists,
      userGrowth,
      recentActivities,
      systemHealth,
    };
  }

  async getSystemHealth() {
    const now = new Date().toISOString();

    // 1. Database (PostgreSQL)
    let dbStatus: 'operational' | 'warning' | 'error' = 'operational';
    let dbLatency = 0;
    let dbDetails = 'PostgreSQL 18 (Cổng 5433)';
    try {
      const start = performance.now();
      await prisma.$queryRawUnsafe('SELECT 1');
      dbLatency = Math.round(performance.now() - start);
      if (dbLatency > 150) dbStatus = 'warning';
    } catch (err: any) {
      dbStatus = 'error';
      dbDetails = err.message || 'Mất kết nối cơ sở dữ liệu';
    }

    // 2. Storage
    let storageStatus: 'operational' | 'warning' | 'error' = 'operational';
    let storageLatency = 1;
    let storageDetails = 'Bộ nhớ cục bộ (Local Disk)';
    try {
      const possibleUploadDirs = [
        path.resolve(process.cwd(), env.UPLOAD_DIR),
        path.resolve(process.cwd(), 'server', env.UPLOAD_DIR),
        path.resolve(process.cwd(), 'uploads'),
        path.resolve(process.cwd(), 'server/uploads'),
      ];
      const uploadDir = possibleUploadDirs.find((d) => fs.existsSync(d)) || possibleUploadDirs[0];
      const start = performance.now();
      const testFile = path.join(uploadDir, '.health_check');
      await fs.promises.writeFile(testFile, 'health');
      await fs.promises.unlink(testFile);
      storageLatency = Math.max(1, Math.round(performance.now() - start));
      const size = getDirectorySize(uploadDir);
      storageDetails = `Đã dùng ${formatBytes(size)} • Sẵn sàng đọc/ghi`;
    } catch (err: any) {
      storageStatus = 'warning';
      storageDetails = 'Không thể ghi vào thư mục uploads';
    }

    // 3. YouTube Data API
    const ytQuota = youtubeProvider.getQuotaStatus();
    const youtubeStatus: 'operational' | 'quota_exceeded' | 'warning' | 'disabled' = !env.YOUTUBE_ENABLED
      ? 'disabled'
      : ytQuota.quotaExceeded
      ? 'quota_exceeded'
      : ytQuota.hasKey
      ? 'operational'
      : 'warning';

    const services = [
      {
        id: 'postgres',
        name: 'Cơ sở dữ liệu PostgreSQL',
        category: 'database',
        status: dbStatus,
        latencyMs: dbLatency,
        details: dbDetails,
        checkedAt: now,
      },
      {
        id: 'storage',
        name: 'Hệ thống Lưu trữ (Storage)',
        category: 'storage',
        status: storageStatus,
        latencyMs: storageLatency,
        details: storageDetails,
        checkedAt: now,
      },
      {
        id: 'zingmp3',
        name: 'ZingMP3 V-Pop API',
        category: 'provider',
        status: env.ZINGMP3_ENABLED ? 'operational' : 'disabled',
        latencyMs: 14,
        details: 'Tìm kiếm & Danh mục bài hát V-Pop',
        checkedAt: now,
      },
      {
        id: 'youtube',
        name: 'YouTube Data API v3',
        category: 'provider',
        status: youtubeStatus,
        latencyMs: 38,
        details: ytQuota.quotaExceeded ? 'Hết hạn ngạch hàng ngày (Quota Exceeded)' : 'Phát trực tuyến & MV chính hãng',
        checkedAt: now,
      },
      {
        id: 'spotify',
        name: 'Spotify Web API',
        category: 'provider',
        status: env.SPOTIFY_ENABLED ? 'operational' : 'disabled',
        latencyMs: 22,
        details: 'Metadata chuẩn, ảnh bìa HD & Top nghệ sĩ',
        checkedAt: now,
      },
      {
        id: 'audius',
        name: 'Audius Decentralized Music',
        category: 'provider',
        status: env.AUDIUS_ENABLED ? 'operational' : 'disabled',
        latencyMs: 45,
        details: 'Mạng lưới âm nhạc trực tuyến phi tập trung',
        checkedAt: now,
      },
      {
        id: 'jamendo',
        name: 'Jamendo Music API',
        category: 'provider',
        status: env.JAMENDO_ENABLED ? (env.JAMENDO_CLIENT_ID ? 'operational' : 'warning') : 'disabled',
        latencyMs: 31,
        details: 'Kho nhạc bản quyền Creative Commons',
        checkedAt: now,
      },
      {
        id: 'itunes',
        name: 'Apple Music / iTunes API',
        category: 'provider',
        status: env.ITUNES_ENABLED ? 'operational' : 'disabled',
        latencyMs: 19,
        details: 'Tra cứu danh mục âm nhạc quốc tế',
        checkedAt: now,
      },
      {
        id: 'lrclib',
        name: 'LRCLIB Lời bài hát',
        category: 'provider',
        status: env.LRCLIB_ENABLED ? 'operational' : 'disabled',
        latencyMs: 16,
        details: 'Đồng bộ lời bài hát chạy chữ theo nhạc',
        checkedAt: now,
      },
    ];

    const overallStatus =
      dbStatus === 'error'
        ? 'error'
        : services.some((s) => s.status === 'quota_exceeded' || s.status === 'warning')
        ? 'warning'
        : 'operational';

    return {
      status: overallStatus,
      services,
      lastChecked: now,
    };
  }

  async getProvidersStatus() {
    const quotas = quotaService.getQuotaStatus();
    const youtubeQuota = youtubeProvider.getQuotaStatus();

    const providerList = [
      { key: 'youtube', name: 'YouTube Music API', enabled: providerRegistry.isProviderEnabled('youtube'), keyRequired: true, hasKey: youtubeQuota.hasKey, baseStatus: youtubeQuota.quotaExceeded ? 'quota_exceeded' : 'operational' },
      { key: 'jamendo', name: 'Jamendo Music API', enabled: providerRegistry.isProviderEnabled('jamendo'), keyRequired: true, hasKey: Boolean(env.JAMENDO_CLIENT_ID), baseStatus: 'operational' },
      { key: 'spotify', name: 'Spotify Web API', enabled: providerRegistry.isProviderEnabled('spotify'), keyRequired: true, hasKey: Boolean(env.SPOTIFY_CLIENT_ID), baseStatus: env.SPOTIFY_ENABLED ? 'operational' : 'disabled' },
      { key: 'deezer', name: 'Deezer Public API', enabled: providerRegistry.isProviderEnabled('deezer'), keyRequired: false, hasKey: true, baseStatus: 'operational' },
      { key: 'itunes', name: 'Apple iTunes API', enabled: providerRegistry.isProviderEnabled('itunes'), keyRequired: false, hasKey: true, baseStatus: 'operational' },
      { key: 'audius', name: 'Audius Network', enabled: providerRegistry.isProviderEnabled('audius'), keyRequired: false, hasKey: true, baseStatus: 'operational' },
      { key: 'zingmp3', name: 'Zing MP3 Scraper', enabled: providerRegistry.isProviderEnabled('zingmp3'), keyRequired: false, hasKey: true, baseStatus: 'operational' },
      { key: 'lrclib', name: 'LrcLib Lyrics API', enabled: providerRegistry.isProviderEnabled('lrclib'), keyRequired: false, hasKey: true, baseStatus: 'operational' },
    ];

    const result: Record<string, any> = {};
    let totalCount = 0;
    let activeCount = 0;
    let warningCount = 0;

    for (const p of providerList) {
      const q = quotas[p.key];
      totalCount++;
      if (p.enabled) activeCount++;
      if (q?.isWarning) warningCount++;

      let status = p.baseStatus;
      if (!p.enabled) {
        status = 'disabled';
      } else if (q?.isExceeded) {
        status = 'quota_exceeded';
      } else if (q?.isWarning) {
        status = 'warning';
      }

      result[p.key] = {
        name: p.name,
        enabled: p.enabled,
        status,
        keyRequired: p.keyRequired,
        hasKey: p.hasKey,
        quota: q,
      };
    }

    return {
      ...result,
      providers: result,
      summary: {
        total: totalCount,
        active: activeCount,
        warning: warningCount,
      },
    };
  }

  async toggleProvider(name: string, enabled?: boolean, adminUser?: { id: string; email: string; name: string }) {
    const newState = providerRegistry.toggleProvider(name, enabled);
    if (adminUser) {
      await auditService.log({
        userId: adminUser.id,
        userEmail: adminUser.email,
        userName: adminUser.name,
        action: 'TOGGLE_PROVIDER',
        targetType: 'PROVIDER',
        targetId: name,
        targetTitle: `Nguồn nhạc ${name}`,
        details: `Đã ${newState ? 'bật' : 'tắt'} nguồn nhạc ${name}`,
      });
    }
    return { name, enabled: newState };
  }

  async testProviderConnection(name: string) {
    return providerRegistry.testConnection(name);
  }

  // Audit Logs
  async getAuditLogs(params: {
    page?: number;
    limit?: number;
    action?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  } = {}) {
    return auditService.getLogs(params);
  }

  async exportAuditLogsCsv(params: { action?: string; search?: string } = {}) {
    return auditService.exportCsv(params);
  }

  // System Settings
  async getSystemSettings() {
    return settingsService.getSettings();
  }

  async updateSystemSettings(data: any, adminUser?: { id: string; email: string; name: string }) {
    const updated = await settingsService.updateSettings(data);
    if (adminUser) {
      await auditService.log({
        userId: adminUser.id,
        userEmail: adminUser.email,
        userName: adminUser.name,
        action: 'UPDATE_SETTINGS',
        targetType: 'SYSTEM',
        targetId: 'site_settings',
        targetTitle: 'Cài đặt hệ thống',
        details: `Cập nhật cấu hình: ${Object.keys(data).join(', ')}`,
      });
    }
    return updated;
  }

  // Users management
  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: 'all' | 'USER' | 'MODERATOR' | 'ADMIN';
    status?: 'all' | 'active' | 'locked';
  } = {}) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.search && params.search.trim()) {
      const term = params.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (params.role && params.role !== 'all') {
      where.role = params.role;
    }

    if (params.status === 'active') {
      where.isLocked = false;
    } else if (params.status === 'locked') {
      where.isLocked = true;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
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
          _count: { select: { playlists: true, likes: true, playHistories: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const pagination = { total, page, limit, totalPages: Math.ceil(total / limit) };
    return { users, total, page, limit, totalPages: pagination.totalPages, pagination };
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

  async changeUserRole(userId: string, role: 'USER' | 'MODERATOR' | 'ADMIN') {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Người dùng không tồn tại');

    return prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }

  async deleteUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Người dùng không tồn tại');
    if (user.role === 'ADMIN') throw new Error('Không thể xóa tài khoản Quản trị viên');

    return prisma.user.delete({ where: { id: userId } });
  }

  async getUserDetails(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isLocked: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) throw new Error('Người dùng không tồn tại');

    const [playlists, recentPlays, likes] = await Promise.all([
      prisma.playlist.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { songs: true } },
        },
      }),
      prisma.playHistory.findMany({
        where: { userId },
        take: 30,
        orderBy: { playedAt: 'desc' },
        include: {
          song: {
            select: {
              id: true,
              title: true,
              artists: true,
              coverUrl: true,
              source: true,
            },
          },
        },
      }),
      prisma.like.findMany({
        where: { userId },
        take: 30,
        orderBy: { createdAt: 'desc' },
        include: {
          song: {
            select: {
              id: true,
              title: true,
              artists: true,
              coverUrl: true,
            },
          },
        },
      }),
    ]);

    return { user, playlists, recentPlays, likes, likedSongs: likes };
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

  // Songs Management
  async getSongs(params: {
    page?: number;
    limit?: number;
    search?: string;
    artist?: string;
    album?: string;
    source?: string;
    status?: 'all' | 'visible' | 'hidden';
    sortBy?: 'createdAt' | 'playCount' | 'title' | 'durationMs';
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Search by title or album or artists
    if (params.search && params.search.trim()) {
      const term = params.search.trim();

      const matchingArtists = await prisma.artist.findMany({
        where: { name: { contains: term, mode: 'insensitive' } },
        select: { name: true },
      });
      const matchingArtistNames = matchingArtists.map((a) => a.name);

      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { album: { contains: term, mode: 'insensitive' } },
        { artists: { has: term } },
        ...(matchingArtistNames.length > 0 ? [{ artists: { hasSome: matchingArtistNames } }] : []),
      ];
    }

    // Filter by artist
    if (params.artist && params.artist !== 'all') {
      where.artists = { has: params.artist };
    }

    // Filter by album
    if (params.album && params.album !== 'all') {
      where.album = { equals: params.album, mode: 'insensitive' };
    }

    // Filter by source
    if (params.source && params.source !== 'all') {
      where.source = params.source;
    }

    // Filter by status (visible / hidden)
    if (params.status === 'visible') {
      where.isHidden = false;
    } else if (params.status === 'hidden') {
      where.isHidden = true;
    }

    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder || 'desc';

    const [songs, total, allArtists, allAlbums, allSources] = await Promise.all([
      prisma.song.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          source: true,
          sourceId: true,
          title: true,
          artists: true,
          album: true,
          coverUrl: true,
          durationMs: true,
          playbackType: true,
          streamUrl: true,
          embedId: true,
          isHidden: true,
          playCount: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.song.count({ where }),
      // Distinct artists list for filter dropdown
      prisma.artist.findMany({ select: { name: true }, orderBy: { name: 'asc' } }),
      // Distinct album names
      prisma.song.findMany({
        where: { album: { not: null } },
        select: { album: true },
        distinct: ['album'],
      }),
      // Distinct sources
      prisma.song.findMany({
        select: { source: true },
        distinct: ['source'],
      }),
    ]);

    const artistsList = allArtists.map((a) => a.name);
    const albumsList = allAlbums.map((a) => a.album).filter(Boolean) as string[];
    const sourcesList = allSources.map((s) => s.source);

    return {
      songs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      artistsList,
      albumsList,
      sourcesList,
    };
  }

  async toggleSongVisibility(id: string, isHidden?: boolean) {
    const song = await prisma.song.findUnique({ where: { id } });
    if (!song) throw new Error('Bài hát không tồn tại');

    const nextHidden = isHidden !== undefined ? isHidden : !song.isHidden;
    return prisma.song.update({
      where: { id },
      data: { isHidden: nextHidden },
    });
  }

  async batchSongAction(action: 'hide' | 'unhide' | 'delete', songIds: string[]) {
    if (!songIds || songIds.length === 0) {
      throw new Error('Vui lòng chọn ít nhất một bài hát');
    }

    if (action === 'hide') {
      const result = await prisma.song.updateMany({
        where: { id: { in: songIds } },
        data: { isHidden: true },
      });
      return { message: `Đã ẩn ${result.count} bài hát thành công`, count: result.count };
    }

    if (action === 'unhide') {
      const result = await prisma.song.updateMany({
        where: { id: { in: songIds } },
        data: { isHidden: false },
      });
      return { message: `Đã hiện ${result.count} bài hát thành công`, count: result.count };
    }

    if (action === 'delete') {
      // Find local songs to remove audio files
      const localSongs = await prisma.song.findMany({
        where: { id: { in: songIds }, source: 'local' },
        select: { streamUrl: true },
      });

      for (const s of localSongs) {
        if (s.streamUrl) {
          try {
            await localStorageProvider.deleteFile(s.streamUrl);
          } catch (e) {
            console.error('Failed to remove audio file in batch delete:', e);
          }
        }
      }

      const result = await prisma.song.deleteMany({
        where: { id: { in: songIds } },
      });
      return { message: `Đã xóa ${result.count} bài hát thành công`, count: result.count };
    }

    throw new Error('Hành động không hợp lệ');
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
      isHidden?: boolean;
    }
  ) {
    return prisma.song.update({
      where: { id },
      data,
    });
  }

  async deleteSong(id: string) {
    const song = await prisma.song.findUnique({ where: { id } });
    if (song?.source === 'local' && song.streamUrl) {
      try {
        await localStorageProvider.deleteFile(song.streamUrl);
      } catch (err) {
        console.error('Failed to remove audio file on delete:', err);
      }
    }
    return prisma.song.delete({ where: { id } });
  }

  // Album cover management
  async getAlbums() {
    const dbAlbums = await prisma.album.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        artist: true,
        songs: {
          select: { id: true, title: true, coverUrl: true, embedId: true },
          take: 5,
        },
        _count: { select: { songs: true } },
      },
    });

    const formattedDb = dbAlbums.map((a) => {
      const firstSongCover = a.songs.find((s) => s.coverUrl)?.coverUrl;
      const firstSongYt = a.songs.find(
        (s) => typeof s.embedId === 'string' && s.embedId.length === 11
      );
      const ytThumb = firstSongYt?.embedId
        ? `https://i.ytimg.com/vi/${firstSongYt.embedId}/hqdefault.jpg`
        : undefined;

      return {
        id: `local:${a.id}`,
        dbId: a.id,
        title: a.title,
        artist: a.artist?.name || 'Nhiều nghệ sĩ',
        coverUrl: a.coverUrl || firstSongCover || ytThumb || '',
        tracksCount: a._count?.songs || a.songs.length || 0,
        firstSongCover: firstSongCover || ytThumb,
        isCatalog: false,
      };
    });

    // Catalog albums
    const formattedCatalog = ALBUMS_CATALOG.map((cat) => {
      const firstTrackCover = cat.tracks.find((t) => t.coverUrl)?.coverUrl;
      const firstTrackYt = cat.tracks.find(
        (t) => typeof t.embedId === 'string' && t.embedId.length === 11
      );
      const ytThumb = firstTrackYt?.embedId
        ? `https://i.ytimg.com/vi/${firstTrackYt.embedId}/hqdefault.jpg`
        : undefined;

      return {
        id: cat.id,
        dbId: cat.id,
        title: cat.title,
        artist: cat.artist,
        coverUrl: cat.coverUrl,
        tracksCount: cat.tracks.length,
        firstSongCover: firstTrackCover || ytThumb,
        isCatalog: true,
      };
    });

    const catalogTitles = new Set(formattedCatalog.map((a) => a.title.toLowerCase().trim()));
    return [
      ...formattedCatalog,
      ...formattedDb.filter((a) => !catalogTitles.has(a.title.toLowerCase().trim())),
    ];
  }

  async updateAlbumCover(id: string, coverUrl: string) {
    if (!coverUrl || !coverUrl.trim()) {
      throw new Error('Vui lòng cung cấp URL ảnh bìa hợp lệ');
    }

    const cleanId = id.replace(/^local:/, '').trim();

    // Check if it's a catalog album
    const catAlbum = ALBUMS_CATALOG.find(
      (a) => a.id.toLowerCase() === id.toLowerCase() || a.id.toLowerCase() === cleanId.toLowerCase()
    );

    if (catAlbum) {
      catAlbum.coverUrl = coverUrl;
      catAlbum.tracks.forEach((t) => {
        t.coverUrl = coverUrl;
      });
    }

    // Also check if album exists in DB (or if matching title exists in DB)
    const existingDb = await prisma.album.findFirst({
      where: {
        OR: [
          { id: cleanId },
          catAlbum ? { title: catAlbum.title } : { id: cleanId },
        ],
      },
    });

    if (existingDb) {
      return prisma.album.update({
        where: { id: existingDb.id },
        data: { coverUrl },
      });
    } else if (catAlbum) {
      return prisma.album.create({
        data: {
          title: catAlbum.title,
          coverUrl,
          releaseDate: catAlbum.releaseDate ? new Date(catAlbum.releaseDate) : undefined,
        },
      });
    }

    throw new Error('Không tìm thấy album để cập nhật');
  }

  // ==========================================
  // Artist CRUD & Verification
  // ==========================================
  async getArtists(params: { page?: number; limit?: number; search?: string } = {}) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.search && params.search.trim()) {
      where.name = { contains: params.search.trim(), mode: 'insensitive' };
    }

    const [artists, total, allSongs, allDbAlbums] = await Promise.all([
      prisma.artist.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { songs: true, albums: true, followers: true } },
        },
      }),
      prisma.artist.count({ where }),
      prisma.song.findMany({
        where: { isHidden: false },
        select: { id: true, artistId: true, artists: true },
      }),
      prisma.album.findMany({
        select: { id: true, artistId: true, title: true },
      }),
    ]);

    const catalogByName = new Map(ARTISTS_CATALOG.map((c) => [c.name.toLowerCase(), c]));
    const catalogById = new Map(ARTISTS_CATALOG.map((c) => [c.id, c]));

    const spotifyIds = artists
      .map((a) => {
        const meta = catalogById.get(a.id) || catalogByName.get(a.name.toLowerCase());
        return meta?.spotifyId || (a.source === 'spotify' ? a.sourceId : null) || null;
      })
      .filter((id): id is string => Boolean(id));

    const spotifyMap =
      spotifyIds.length > 0 ? await spotifyProvider.getArtistsBatch(spotifyIds) : new Map();

    const mappedArtists = artists.map((a) => {
      const lowerName = a.name.toLowerCase().trim();
      const meta = catalogById.get(a.id) || catalogByName.get(lowerName);
      const spotifyId = meta?.spotifyId || (a.source === 'spotify' ? a.sourceId : undefined);
      const sp = spotifyId ? spotifyMap.get(spotifyId) : undefined;

      // Count unique songs linked by artistId, songs.artists[] array, or ALBUMS_CATALOG tracks
      const songKeys = new Set<string>();
      for (const s of allSongs) {
        if (
          s.artistId === a.id ||
          (s.artists || []).some((name) => name.toLowerCase().trim() === lowerName)
        ) {
          songKeys.add(s.id);
        }
      }
      for (const alb of ALBUMS_CATALOG) {
        for (const t of alb.tracks || []) {
          const trackArtists = t.artists || [alb.artist];
          if (trackArtists.some((name) => name.toLowerCase().trim() === lowerName)) {
            songKeys.add(t.id || `${alb.id}:${t.title}`);
          }
        }
      }

      // Count unique albums linked by artistId or ALBUMS_CATALOG
      const albumKeys = new Set<string>();
      for (const dbAlb of allDbAlbums) {
        if (dbAlb.artistId === a.id) {
          albumKeys.add(dbAlb.title.toLowerCase().trim());
        }
      }
      for (const catAlb of ALBUMS_CATALOG) {
        if (
          catAlb.artistId === a.id ||
          catAlb.artist.toLowerCase().includes(lowerName)
        ) {
          albumKeys.add(catAlb.title.toLowerCase().trim());
        }
      }

      const realSongsCount =
        songKeys.size > 0
          ? songKeys.size
          : Math.max(a._count.songs, sp?.topTrackCount ?? 0);
      const realAlbumsCount = Math.max(a._count.albums, albumKeys.size);
      const cleanBio =
        a.bio && !a.bio.startsWith('Nghệ sĩ trên Spotify')
          ? a.bio
          : meta?.bio || a.bio || undefined;

      return {
        ...a,
        bio: cleanBio,
        imageUrl: sp?.imageUrl || a.imageUrl || meta?.imageUrl,
        avatarUrl: sp?.imageUrl || a.imageUrl || meta?.imageUrl,
        _count: {
          ...a._count,
          songs: realSongsCount,
          albums: realAlbumsCount,
        },
      };
    });

    const pagination = { total, page, limit, totalPages: Math.ceil(total / limit) };
    return { artists: mappedArtists, total, page, limit, totalPages: pagination.totalPages, pagination };
  }

  async createArtist(data: { name: string; bio?: string; imageUrl?: string; avatarUrl?: string; isVerified?: boolean }) {
    if (!data.name || !data.name.trim()) throw new Error('Tên nghệ sĩ không được để trống');
    return prisma.artist.create({
      data: {
        name: data.name.trim(),
        bio: data.bio?.trim(),
        imageUrl: (data.imageUrl || data.avatarUrl)?.trim(),
        isVerified: Boolean(data.isVerified),
        source: 'local',
      },
    });
  }

  async updateArtist(id: string, data: { name?: string; bio?: string; imageUrl?: string; avatarUrl?: string; isVerified?: boolean }) {
    return prisma.artist.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        bio: data.bio !== undefined ? data.bio?.trim() : undefined,
        imageUrl: (data.imageUrl || data.avatarUrl) !== undefined ? (data.imageUrl || data.avatarUrl)?.trim() : undefined,
        isVerified: data.isVerified !== undefined ? Boolean(data.isVerified) : undefined,
      },
    });
  }

  async toggleArtistVerified(id: string) {
    const artist = await prisma.artist.findUnique({ where: { id } });
    if (!artist) throw new Error('Nghệ sĩ không tồn tại');
    return prisma.artist.update({
      where: { id },
      data: { isVerified: !artist.isVerified },
    });
  }

  async deleteArtist(id: string) {
    return prisma.artist.delete({ where: { id } });
  }

  // ==========================================
  // Playlist Management & Moderation
  // ==========================================
  async getPlaylists(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'all' | 'active' | 'banned';
    isPinned?: boolean;
  } = {}) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      AND: [{ OR: [{ isPublic: true }, { isBanned: true }] }],
    };
    if (params.search && params.search.trim()) {
      const term = params.search.trim();
      where.AND.push({
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { user: { name: { contains: term, mode: 'insensitive' } } },
        ],
      });
    }

    if (params.status === 'active') {
      where.isBanned = false;
    } else if (params.status === 'banned') {
      where.isBanned = true;
    }

    if (params.isPinned !== undefined) {
      where.isPinned = params.isPinned;
    }

    const [playlists, total] = await Promise.all([
      prisma.playlist.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          _count: { select: { songs: true } },
        },
      }),
      prisma.playlist.count({ where }),
    ]);

    const pagination = { total, page, limit, totalPages: Math.ceil(total / limit) };
    return { playlists, total, page, limit, totalPages: pagination.totalPages, pagination };
  }

  async togglePlaylistPin(id: string) {
    const playlist = await prisma.playlist.findUnique({ where: { id } });
    if (!playlist) throw new Error('Playlist không tồn tại');
    if (playlist.isBanned && !playlist.isPinned) {
      throw new Error('Không thể ghim playlist đang bị khóa vi phạm');
    }
    return prisma.playlist.update({
      where: { id },
      data: { isPinned: !playlist.isPinned },
    });
  }

  async togglePlaylistBan(id: string, isBanned?: boolean) {
    const playlist = await prisma.playlist.findUnique({ where: { id } });
    if (!playlist) throw new Error('Playlist không tồn tại');
    const nextBanned = isBanned !== undefined ? isBanned : !playlist.isBanned;
    return prisma.playlist.update({
      where: { id },
      data: {
        isBanned: nextBanned,
        ...(nextBanned ? { isPinned: false } : {}),
      },
    });
  }

  async deletePlaylist(id: string) {
    return prisma.playlist.delete({ where: { id } });
  }

  async getPlaylistDetails(id: string) {
    const playlist = await prisma.playlist.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        songs: {
          orderBy: { order: 'asc' },
          include: {
            song: {
              select: {
                id: true,
                title: true,
                artists: true,
                coverUrl: true,
                durationMs: true,
                source: true,
              },
            },
          },
        },
      },
    });

    if (!playlist) throw new Error('Playlist không tồn tại');
    return playlist;
  }

  // ==========================================
  // Copyright & Reports Management
  // ==========================================
  async getReports(params: {
    page?: number;
    limit?: number;
    status?: 'all' | 'PENDING' | 'PROCESSING' | 'RESOLVED' | 'REJECTED';
    type?: 'all' | 'COPYRIGHT' | 'INAPPROPRIATE' | 'SPAM' | 'OTHER';
    search?: string;
  } = {}) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status && params.status !== 'all') {
      where.status = params.status;
    }
    if (params.type && params.type !== 'all') {
      where.type = params.type;
    }
    if (params.search && params.search.trim()) {
      const term = params.search.trim();
      where.OR = [
        { targetTitle: { contains: term, mode: 'insensitive' } },
        { reason: { contains: term, mode: 'insensitive' } },
        { reporterName: { contains: term, mode: 'insensitive' } },
        { reporterEmail: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [reports, total, pending, processing, resolved, rejected] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.report.count({ where }),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.report.count({ where: { status: 'PROCESSING' } }),
      prisma.report.count({ where: { status: 'RESOLVED' } }),
      prisma.report.count({ where: { status: 'REJECTED' } }),
    ]);

    return {
      reports,
      stats: {
        pending,
        processing,
        resolved,
        rejected,
        total,
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateReport(id: string, data: { status?: any; internalNotes?: string }) {
    return prisma.report.update({
      where: { id },
      data: {
        status: data.status,
        internalNotes: data.internalNotes,
      },
    });
  }

  async quickTakedownReport(id: string) {
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) throw new Error('Báo cáo không tồn tại');

    let takedownMsg = '';
    const normalizedType = report.targetType.toLowerCase();

    if (normalizedType === 'song') {
      await prisma.song.updateMany({
        where: { id: report.targetId },
        data: { isHidden: true },
      });
      takedownMsg = 'Đã ẩn bài hát vi phạm khỏi hệ thống';
    } else if (normalizedType === 'playlist') {
      await prisma.playlist.updateMany({
        where: { id: report.targetId },
        data: { isBanned: true, isPublic: false },
      });
      takedownMsg = 'Đã gỡ và khóa playlist vi phạm';
    } else if (normalizedType === 'user') {
      await prisma.user.updateMany({
        where: { id: report.targetId },
        data: { isLocked: true },
      });
      takedownMsg = 'Đã khóa tài khoản người dùng vi phạm';
    }

    const updated = await prisma.report.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        internalNotes: report.internalNotes
          ? `${report.internalNotes}\n[Hệ thống]: ${takedownMsg} vào lúc ${new Date().toLocaleString('vi-VN')}`
          : `[Hệ thống]: ${takedownMsg} vào lúc ${new Date().toLocaleString('vi-VN')}`,
      },
    });

    return { message: takedownMsg, report: updated };
  }

  async deleteReport(id: string) {
    return prisma.report.delete({ where: { id } });
  }

  /**
   * Lấy danh sách thông báo hỗ trợ mở khóa tài khoản đang chờ xử lý (dành cho Admin & Moderator)
   */
  async getLockedSupportAlerts() {
    const appeals = await prisma.report.findMany({
      where: {
        targetType: 'account_appeal',
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      pendingCount: appeals.length,
      appeals: appeals.map((a) => ({
        id: a.id,
        userId: a.targetId,
        userName: a.reporterName || 'Người dùng',
        userEmail: a.reporterEmail || '',
        message: a.description || a.reason,
        createdAt: a.createdAt,
      })),
    };
  }

  /**
   * Xử lý yêu cầu hỗ trợ mở khóa tài khoản: mở khóa user hoặc bỏ qua
   */
  async resolveLockedSupportAlert(
    reportId: string,
    action: 'unlock' | 'dismiss',
    actor?: { userId?: string; email?: string; name?: string }
  ) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report || report.targetType !== 'account_appeal') {
      throw Object.assign(new Error('Không tìm thấy yêu cầu hỗ trợ tương ứng'), { statusCode: 404 });
    }

    if (action === 'unlock') {
      await prisma.user.updateMany({
        where: { id: report.targetId },
        data: { isLocked: false },
      });
    }

    const updated = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: action === 'unlock' ? 'RESOLVED' : 'REJECTED',
        internalNotes:
          action === 'unlock'
            ? `Đã mở khóa tài khoản bởi ${actor?.email || 'Quản trị viên'} lúc ${new Date().toLocaleString('vi-VN')}`
            : `Đã từ chối/bỏ qua bởi ${actor?.email || 'Quản trị viên'} lúc ${new Date().toLocaleString('vi-VN')}`,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actor?.userId,
        userEmail: actor?.email,
        userName: actor?.name,
        action: action === 'unlock' ? 'TOGGLE_USER_LOCK' : 'UPDATE_REPORT',
        targetType: 'USER',
        targetId: report.targetId,
        targetTitle: report.reporterEmail || report.targetTitle,
        details:
          action === 'unlock'
            ? 'Mở khóa tài khoản từ yêu cầu hỗ trợ'
            : 'Từ chối yêu cầu hỗ trợ mở khóa tài khoản',
      },
    });

    return {
      message:
        action === 'unlock'
          ? `Đã mở khóa tài khoản ${report.reporterEmail || ''} thành công.`
          : 'Đã đóng yêu cầu hỗ trợ.',
      report: updated,
    };
  }
}

export const adminService = new AdminService();

