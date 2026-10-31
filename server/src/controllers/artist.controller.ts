import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
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

      // Fetch genuine hits for this artist from Spotify (no local, no deezer)
      let topTracks: any[] = [];
      try {
        const spotifyRes = await spotifyProvider.search(artist.name, 'track');
        if (spotifyRes.tracks.length > 0) {
          const cleanArtistName = artist.name.replace(/\./g, '').trim().toLowerCase();
          const matchedSpotifyTracks = spotifyRes.tracks.filter((t) =>
            t.artists.some((a) => {
              const aClean = a.replace(/\./g, '').trim().toLowerCase();
              return aClean === cleanArtistName || aClean.includes(cleanArtistName) || cleanArtistName.includes(aClean);
            })
          );
          if (matchedSpotifyTracks.length >= 2) {
            topTracks = matchedSpotifyTracks.slice(0, 15);
          } else {
            topTracks = spotifyRes.tracks.slice(0, 10);
          }
        }
      } catch {
        // ignore
      }

      if (topTracks.length === 0) {
        topTracks = artist.songs.map((s) => ({
          id: `zingmp3:${s.sourceId || s.id}`,
          dbId: s.id,
          source: 'zingmp3',
          sourceId: s.sourceId || s.id,
          title: s.title,
          artists: s.artists,
          album: s.album,
          coverUrl: s.coverUrl,
          durationMs: s.durationMs,
          playbackType: 'youtube',
          streamUrl: s.streamUrl || `/api/songs/${s.id}/stream`,
          embedId: s.embedId,
          previewUrl: s.previewUrl,
          isFullLength: true,
        }));
      }

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
        topTracks,
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
