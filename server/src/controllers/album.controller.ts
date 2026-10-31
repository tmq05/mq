import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';

export class AlbumController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const albums = await prisma.album.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { artist: true },
      });

      const formatted = albums.map((album) => ({
        id: `local:${album.id}`,
        dbId: album.id,
        title: album.title,
        coverUrl: album.coverUrl,
        releaseDate: album.releaseDate,
        artist: album.artist?.name || 'Nhiều nghệ sĩ',
      }));

      res.json({ albums: formatted });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const cleanId = id.replace(/^local:/, '');

      const album = await prisma.album.findUnique({
        where: { id: cleanId },
        include: {
          artist: true,
          songs: {
            include: { artist: true },
          },
        },
      });

      if (!album) {
        res.status(404).json({ message: 'Không tìm thấy album' });
        return;
      }

      const formattedSongs = album.songs.map((s) => ({
        id: `local:${s.id}`,
        dbId: s.id,
        source: s.source,
        sourceId: s.sourceId,
        title: s.title,
        artists: s.artists,
        album: album.title,
        coverUrl: s.coverUrl || album.coverUrl,
        durationMs: s.durationMs,
        playbackType: s.playbackType,
        streamUrl: s.streamUrl || `/api/songs/${s.id}/stream`,
        embedId: s.embedId,
        previewUrl: s.previewUrl,
        isFullLength: s.isFullLength,
      }));

      res.json({
        id: `local:${album.id}`,
        title: album.title,
        coverUrl: album.coverUrl,
        releaseDate: album.releaseDate,
        artist: album.artist?.name || 'Various Artists',
        tracks: formattedSongs,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const albumController = new AlbumController();

