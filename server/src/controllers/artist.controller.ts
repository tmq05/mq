import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { deezerProvider } from '../providers/deezer.provider.js';

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

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check if external provider id
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

      res.json({
        id: `local:${artist.id}`,
        name: artist.name,
        bio: artist.bio,
        imageUrl: artist.imageUrl,
        albums: artist.albums,
        topTracks: formattedSongs,
        followersCount: artist._count.followers,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const artistController = new ArtistController();

