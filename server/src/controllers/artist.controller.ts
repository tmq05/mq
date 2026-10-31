import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { deezerProvider } from '../providers/deezer.provider.js';
import { spotifyProvider } from '../providers/spotify.provider.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export class ArtistController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const artists = await prisma.artist.findMany({
        take: 20,
        orderBy: { name: 'asc' },
        include: { _count: { select: { songs: true, followers: true } } },
      });
      res.json({ artists });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check if external provider id
      if (id.startsWith('spotify:')) {
        const sourceId = id.replace('spotify:', '');
        const extArtist = await spotifyProvider.getArtist(sourceId);
        if (extArtist) {
          res.json(extArtist);
          return;
        }
      }

      if (id.startsWith('deezer:')) {
        const sourceId = id.replace('deezer:', '');
        const extArtist = await deezerProvider.getArtist(sourceId);
        if (extArtist) {
          res.json(extArtist);
          return;
        }
      }

      const cleanId = id.replace(/^local:/, '');
      const artist = await prisma.artist.findUnique({
        where: { id: cleanId },
        include: {
          albums: true,
          songs: {
            take: 20,
            orderBy: { playCount: 'desc' },
          },
          _count: { select: { followers: true } },
        },
      });

      if (!artist) {
        res.status(404).json({ message: 'Không tìm thấy nghệ sĩ' });
        return;
      }

      const formattedSongs = artist.songs.map((s) => ({
        id: `local:${s.id}`,
        dbId: s.id,
        source: s.source,
        sourceId: s.sourceId,
        title: s.title,
        artists: s.artists,
        album: s.album,
        coverUrl: s.coverUrl,
        durationMs: s.durationMs,
        playbackType: s.playbackType,
        streamUrl: s.streamUrl || `/api/songs/${s.id}/stream`,
        embedId: s.embedId,
        previewUrl: s.previewUrl,
        isFullLength: s.isFullLength,
      }));

      let isFollowing = false;
      if (req.user?.userId) {
        const follow = await prisma.follow.findUnique({
          where: {
            userId_artistId: {
              userId: req.user.userId,
              artistId: artist.id,
            },
          },
        });
        isFollowing = Boolean(follow);
      }

      res.json({
        id: `local:${artist.id}`,
        dbId: artist.id,
        name: artist.name,
        bio: artist.bio,
        imageUrl: artist.imageUrl,
        albums: artist.albums,
        topTracks: formattedSongs,
        followersCount: artist._count.followers,
        isFollowing,
      });
    } catch (err) {
      next(err);
    }
  }

  async toggleFollow(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Vui lòng đăng nhập để theo dõi nghệ sĩ' });
        return;
      }
      const { id } = req.params;
      const cleanId = id.replace(/^local:/, '');

      const artist = await prisma.artist.findUnique({ where: { id: cleanId } });
      if (!artist) {
        res.status(404).json({ message: 'Không tìm thấy nghệ sĩ' });
        return;
      }

      const existing = await prisma.follow.findUnique({
        where: {
          userId_artistId: {
            userId: req.user.userId,
            artistId: cleanId,
          },
        },
      });

      if (existing) {
        await prisma.follow.delete({ where: { id: existing.id } });
        res.json({ isFollowing: false });
      } else {
        await prisma.follow.create({
          data: {
            userId: req.user.userId,
            artistId: cleanId,
          },
        });
        res.json({ isFollowing: true });
      }
    } catch (err) {
      next(err);
    }
  }
}

export const artistController = new ArtistController();

