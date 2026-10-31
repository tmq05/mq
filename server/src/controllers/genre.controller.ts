import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';

export class GenreController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const genres = await prisma.genre.findMany({
        include: {
          _count: { select: { songs: true } },
        },
      });
      res.json({ genres });
    } catch (err) {
      next(err);
    }
  }

  async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const genre = await prisma.genre.findUnique({
        where: { slug },
        include: {
          songs: {
            take: 30,
            include: { artist: true },
          },
        },
      });

      if (!genre) {
        res.status(404).json({ message: 'Không tìm thấy thể loại nhạc' });
        return;
      }

      const formattedSongs = genre.songs.map((s) => ({
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
        genre: {
          id: genre.id,
          name: genre.name,
          slug: genre.slug,
          imageUrl: genre.imageUrl,
        },
        songs: formattedSongs,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const genreController = new GenreController();

