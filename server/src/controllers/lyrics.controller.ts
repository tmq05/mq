import { Request, Response, NextFunction } from 'express';
import { lyricsService } from '../services/lyrics.service.js';

export class LyricsController {
  async getLyrics(req: Request, res: Response, next: NextFunction) {
    try {
      const title = String(req.query.title || '');
      const artist = String(req.query.artist || '');
      const durationMs = req.query.durationMs
        ? parseInt(String(req.query.durationMs), 10)
        : undefined;
      const songId = req.query.songId ? String(req.query.songId) : undefined;

      if (!title || !artist) {
        res.status(400).json({ message: 'Tiêu đề và tên nghệ sĩ là bắt buộc' });
        return;
      }

      const lyrics = await lyricsService.getLyrics(title, artist, durationMs, songId);
      res.json(lyrics);
    } catch (err) {
      next(err);
    }
  }
}

export const lyricsController = new LyricsController();

