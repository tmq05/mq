import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { songService } from '../services/song.service.js';
import { playlistService } from '../services/playlist.service.js';

export class UserController {
  async getLikes(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Vui lòng đăng nhập' });
        return;
      }
      const likes = await songService.getUserLikes(req.user.userId);
      res.json({ likes });
    } catch (err) {
      next(err);
    }
  }

  async getHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Vui lòng đăng nhập' });
        return;
      }
      const history = await songService.getUserHistory(req.user.userId);
      res.json({ history });
    } catch (err) {
      next(err);
    }
  }

  async getPlaylists(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Vui lòng đăng nhập' });
        return;
      }
      const playlists = await playlistService.getUserPlaylists(req.user.userId);
      res.json({ playlists });
    } catch (err) {
      next(err);
    }
  }

  async getFollowing(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Vui lòng đăng nhập' });
        return;
      }
      const { prisma } = await import('../config/prisma.js');
      const follows = await prisma.follow.findMany({
        where: { userId: req.user.userId },
        include: {
          artist: {
            include: { _count: { select: { followers: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const artists = follows.map((f) => ({
        id:
          f.artist.source === 'spotify' && f.artist.sourceId
            ? `spotify:${f.artist.sourceId}`
            : f.artist.source === 'itunes' && f.artist.sourceId
            ? `itunes:${f.artist.sourceId}`
            : f.artist.id,
        dbId: f.artist.id,
        name: f.artist.name,
        imageUrl: f.artist.imageUrl,
        bio: f.artist.bio,
        isVerified: f.artist.isVerified,
        followersCount: f.artist._count.followers,
        followedAt: f.createdAt,
      }));

      res.json({ artists });
    } catch (err) {
      next(err);
    }
  }

  async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Vui lòng đăng nhập' });
        return;
      }
      const userId = req.user.userId;
      const { prisma } = await import('../config/prisma.js');
      const [playlistCount, likesCount, followsCount, playHistories] = await Promise.all([
        prisma.playlist.count({ where: { userId } }),
        prisma.like.count({ where: { userId } }),
        prisma.follow.count({ where: { userId } }),
        prisma.playHistory.findMany({
          where: { userId },
          select: { song: { select: { durationMs: true } } },
        }),
      ]);
      const totalMinutes = playHistories.reduce((sum, h) => {
        const mins =
          h.song.durationMs > 0 ? Math.min(15, Math.max(0.5, h.song.durationMs / 60000)) : 3.5;
        return sum + mins;
      }, 0);
      const hoursListened =
        playHistories.length === 0 ? 0 : Number((totalMinutes / 60).toFixed(1));
      res.json({
        playlists: playlistCount,
        likes: likesCount,
        following: followsCount,
        hoursListened,
      });
    } catch (err) {
      next(err);
    }
  }

  async getInsights(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Vui lòng đăng nhập' });
        return;
      }
      const userId = req.user.userId;
      const { prisma } = await import('../config/prisma.js');

      const [userRecord, totalPlays, histories, recentLikes, recentPlaylists, recentFollows] =
        await Promise.all([
          prisma.user.findUnique({
            where: { id: userId },
            select: { createdAt: true },
          }),
          prisma.playHistory.count({ where: { userId } }),
          prisma.playHistory.findMany({
            where: { userId },
            orderBy: { playedAt: 'desc' },
            take: 2000,
            include: {
              song: {
                select: {
                  id: true,
                  title: true,
                  artists: true,
                  coverUrl: true,
                  durationMs: true,
                  genre: { select: { name: true } },
                },
              },
            },
          }),
          prisma.like.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
              song: { select: { id: true, title: true, artists: true } },
            },
          }),
          prisma.playlist.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 15,
            select: { id: true, title: true, createdAt: true },
          }),
          prisma.follow.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 15,
            include: {
              artist: { select: { id: true, name: true } },
            },
          }),
        ]);

      const artistCounts = new Map<string, number>();
      const genreCounts = new Map<string, number>();
      const dayKeys = new Set<string>();
      const dayPlayCounts = new Map<string, number>();

      const now = new Date();
      const toDayKey = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const inferGenre = (title: string, artists: string[]): string | null => {
        const text = `${title} ${artists.join(' ')}`.toLowerCase();
        if (/(lofi|lo-fi|chill|study|rain)/.test(text)) return 'Lo-Fi';
        if (/(rap|hiphop|hip-hop|den vau|đen vâu|karik|binz|mck|tlinh|low g)/.test(text)) return 'Rap Việt';
        if (/(indie|vu\.|vũ\.|ngot|ngọt|ca hoi hoang|cá hồi hoang|thinh suy|thịnh suy|trang|madihu)/.test(text)) return 'Indie Việt';
        if (/(edm|remix|dj|house|techno|vinahouse)/.test(text)) return 'EDM';
        if (/(acoustic|guitar|piano|unplugged)/.test(text)) return 'Acoustic';
        if (/(ballad|buon|buồn|mua|mưa|yeu|yêu|nho|nhớ|ha anh tuan|hà anh tuấn|bui anh tuan|bùi anh tuấn)/.test(text)) return 'Ballad';
        if (artists.length > 0) return 'V-Pop';
        return null;
      };

      const weeklyMap = new Map<string, number>();
      const weeklyBuckets: Array<{ key: string; label: string }> = [];
      const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = toDayKey(d);
        weeklyBuckets.push({ key, label: i === 0 ? 'Hôm nay' : dayNames[d.getDay()] });
        weeklyMap.set(key, 0);
      }

      const monthlyBuckets = [
        { label: '4 tuần trước', minutes: 0 },
        { label: '3 tuần trước', minutes: 0 },
        { label: 'Tuần trước', minutes: 0 },
        { label: 'Tuần này', minutes: 0 },
      ];

      for (const h of histories) {
        const playedAt = new Date(h.playedAt);
        const dayKey = toDayKey(playedAt);
        dayKeys.add(dayKey);
        dayPlayCounts.set(dayKey, (dayPlayCounts.get(dayKey) || 0) + 1);

        const mins = h.song.durationMs > 0 ? Math.min(12, Math.max(1, h.song.durationMs / 60000)) : 3.5;
        if (weeklyMap.has(dayKey)) {
          weeklyMap.set(dayKey, (weeklyMap.get(dayKey) || 0) + mins);
        }

        const diffDays = Math.floor((now.getTime() - playedAt.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 28) {
          const weekIndex = 3 - Math.floor(diffDays / 7);
          if (weekIndex >= 0 && weekIndex < 4) {
            monthlyBuckets[weekIndex].minutes += mins;
          }
        }

        for (const artistName of h.song.artists || []) {
          const trimmed = artistName.trim();
          if (trimmed) {
            artistCounts.set(trimmed, (artistCounts.get(trimmed) || 0) + 1);
          }
        }

        const genreName = h.song.genre?.name || inferGenre(h.song.title, h.song.artists || []);
        if (genreName) {
          genreCounts.set(genreName, (genreCounts.get(genreName) || 0) + 1);
        }
      }

      // Compute consecutive streak ending today or yesterday
      let streakDays = 0;
      const cursor = new Date(now);
      if (!dayKeys.has(toDayKey(cursor))) {
        cursor.setDate(cursor.getDate() - 1);
      }
      while (dayKeys.has(toDayKey(cursor))) {
        streakDays += 1;
        cursor.setDate(cursor.getDate() - 1);
      }

      const sortedArtists = Array.from(artistCounts.entries()).sort((a, b) => b[1] - a[1]);
      const sortedGenres = Array.from(genreCounts.entries()).sort((a, b) => b[1] - a[1]);

      // Monthly highlights (current month)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlySongCounts = new Map<
        string,
        { id: string; title: string; artists: string[]; coverUrl?: string | null; count: number }
      >();
      const monthlyArtistCounts = new Map<string, number>();

      for (const h of histories) {
        const playedAt = new Date(h.playedAt);
        if (playedAt < monthStart) continue;

        const existingSong = monthlySongCounts.get(h.song.id);
        if (existingSong) {
          existingSong.count += 1;
        } else {
          monthlySongCounts.set(h.song.id, {
            id: h.song.id,
            title: h.song.title,
            artists: h.song.artists || [],
            coverUrl: h.song.coverUrl,
            count: 1,
          });
        }

        for (const a of h.song.artists || []) {
          const trimmed = a.trim();
          if (trimmed) {
            monthlyArtistCounts.set(trimmed, (monthlyArtistCounts.get(trimmed) || 0) + 1);
          }
        }
      }

      const monthlyHighlights = {
        monthLabel: `Tháng ${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
        topSongs: Array.from(monthlySongCounts.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        topArtists: Array.from(monthlyArtistCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count })),
      };

      const recentActivities = [
        ...recentLikes.map((l) => ({
          id: `like-${l.id}`,
          type: 'like' as const,
          title: `Đã thích bài ${l.song.title}`,
          subtitle: l.song.artists?.join(', ') || undefined,
          timestamp: l.createdAt.toISOString(),
        })),
        ...recentPlaylists.map((p) => ({
          id: `playlist-${p.id}`,
          type: 'playlist' as const,
          title: `Tạo playlist ${p.title}`,
          timestamp: p.createdAt.toISOString(),
        })),
        ...recentFollows.map((f) => ({
          id: `follow-${f.id}`,
          type: 'follow' as const,
          title: `Theo dõi nghệ sĩ ${f.artist.name}`,
          timestamp: f.createdAt.toISOString(),
        })),
        ...histories.slice(0, 15).map((h) => ({
          id: `play-${h.id}`,
          type: 'play' as const,
          title: `Đã nghe ${h.song.title}`,
          subtitle: h.song.artists?.join(', ') || undefined,
          timestamp: h.playedAt.toISOString(),
        })),
      ]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 40);

      const recentActiveDays: Array<{ date: string; label: string; active: boolean; plays: number }> = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = toDayKey(d);
        const plays = dayPlayCounts.get(key) || 0;
        recentActiveDays.push({
          date: key,
          label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
          active: plays > 0,
          plays,
        });
      }

      res.json({
        joinedAt: userRecord?.createdAt || null,
        totalPlays,
        streakDays,
        topArtist: sortedArtists[0] ? { name: sortedArtists[0][0], count: sortedArtists[0][1] } : null,
        topGenre: sortedGenres[0]?.[0] || null,
        inferredGenres: sortedGenres.slice(0, 4).map(([g]) => g),
        topArtists: sortedArtists.slice(0, 8).map(([name, count]) => ({ name, count })),
        topGenres: sortedGenres.slice(0, 8).map(([name, count]) => ({ name, count })),
        recentActiveDays,
        recentActivities,
        monthlyHighlights,
        weeklyChart: weeklyBuckets.map((b) => ({
          label: b.label,
          minutes: Math.round(weeklyMap.get(b.key) || 0),
        })),
        monthlyChart: monthlyBuckets.map((b) => ({
          label: b.label,
          minutes: Math.round(b.minutes),
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  async getContinueListening(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Vui lòng đăng nhập' });
        return;
      }
      const { prisma } = await import('../config/prisma.js');
      const rows = await prisma.continueListening.findMany({
        where: { userId: req.user.userId },
        orderBy: { playedAt: 'desc' },
        take: 30,
      });
      const items = rows.map((row) => ({
        track: row.snapshot,
        progressSeconds: row.progressSeconds,
        playedAt: row.playedAt.toISOString(),
      }));
      res.json({ items });
    } catch (err) {
      next(err);
    }
  }

  async upsertContinueListening(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Vui lòng đăng nhập' });
        return;
      }
      const track = req.body?.track;
      const trackId = typeof track?.id === 'string' ? track.id : '';
      if (!trackId || !track?.title) {
        res.status(400).json({ message: 'Thiếu thông tin bài hát' });
        return;
      }
      const progressSeconds = Math.max(0, Math.round(Number(req.body?.progressSeconds) || 0));
      const playedAt = req.body?.playedAt ? new Date(req.body.playedAt) : new Date();
      const validPlayedAt = Number.isNaN(playedAt.getTime()) ? new Date() : playedAt;

      const { prisma } = await import('../config/prisma.js');
      const userId = req.user.userId;

      await prisma.continueListening.upsert({
        where: { userId_trackId: { userId, trackId } },
        create: {
          userId,
          trackId,
          progressSeconds,
          snapshot: track,
          playedAt: validPlayedAt,
        },
        update: {
          progressSeconds,
          snapshot: track,
          playedAt: validPlayedAt,
        },
      });

      // Keep at most 30 items per user
      const extra = await prisma.continueListening.findMany({
        where: { userId },
        orderBy: { playedAt: 'desc' },
        skip: 30,
        select: { id: true },
      });
      if (extra.length > 0) {
        await prisma.continueListening.deleteMany({
          where: { id: { in: extra.map((e) => e.id) } },
        });
      }

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }

  async mergeContinueListening(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Vui lòng đăng nhập' });
        return;
      }
      const rawItems = Array.isArray(req.body?.items) ? req.body.items.slice(0, 30) : [];
      const { prisma } = await import('../config/prisma.js');
      const userId = req.user.userId;

      for (const item of rawItems) {
        const track = item?.track;
        const trackId = typeof track?.id === 'string' ? track.id : '';
        if (!trackId || !track?.title) continue;

        const progressSeconds = Math.max(0, Math.round(Number(item?.progressSeconds) || 0));
        const playedAt = item?.playedAt ? new Date(item.playedAt) : new Date();
        const validPlayedAt = Number.isNaN(playedAt.getTime()) ? new Date() : playedAt;

        const existing = await prisma.continueListening.findUnique({
          where: { userId_trackId: { userId, trackId } },
        });

        if (!existing || validPlayedAt > existing.playedAt) {
          await prisma.continueListening.upsert({
            where: { userId_trackId: { userId, trackId } },
            create: {
              userId,
              trackId,
              progressSeconds,
              snapshot: track,
              playedAt: validPlayedAt,
            },
            update: {
              progressSeconds,
              snapshot: track,
              playedAt: validPlayedAt,
            },
          });
        }
      }

      // Trim beyond 30
      const extra = await prisma.continueListening.findMany({
        where: { userId },
        orderBy: { playedAt: 'desc' },
        skip: 30,
        select: { id: true },
      });
      if (extra.length > 0) {
        await prisma.continueListening.deleteMany({
          where: { id: { in: extra.map((e) => e.id) } },
        });
      }

      const rows = await prisma.continueListening.findMany({
        where: { userId },
        orderBy: { playedAt: 'desc' },
        take: 30,
      });

      res.json({
        items: rows.map((row) => ({
          track: row.snapshot,
          progressSeconds: row.progressSeconds,
          playedAt: row.playedAt.toISOString(),
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  async removeContinueListening(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Vui lòng đăng nhập' });
        return;
      }
      const trackId = decodeURIComponent(req.params.trackId || '');
      if (!trackId) {
        res.status(400).json({ message: 'Thiếu trackId' });
        return;
      }
      const { prisma } = await import('../config/prisma.js');
      await prisma.continueListening.deleteMany({
        where: { userId: req.user.userId, trackId },
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }

  async clearContinueListening(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Vui lòng đăng nhập' });
        return;
      }
      const { prisma } = await import('../config/prisma.js');
      await prisma.continueListening.deleteMany({
        where: { userId: req.user.userId },
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();

