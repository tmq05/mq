import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { songService } from '../services/song.service.js';
import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { streamAudioFile } from '../utils/range-stream.js';
import { env } from '../config/env.js';

export class SongController {
  async getSong(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const track = await songService.getSong(id);
      if (!track) {
        res.status(404).json({ message: 'Không tìm thấy bài hát' });
        return;
      }
      res.json(track);
    } catch (err) {
      next(err);
    }
  }

  async streamSong(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const cleanId = id.replace(/^local:/, '');

      const song = await prisma.song.findFirst({
        where: {
          OR: [{ id: cleanId }, { sourceId: cleanId }],
          source: 'local',
        },
      });

      if (!song) {
        res.status(404).json({ message: 'Bài hát không tồn tại trên hệ thống' });
        return;
      }

      // Check if file is stored locally
      let audioPath = '';
      if (song.streamUrl && song.streamUrl.startsWith('/uploads/')) {
        audioPath = path.resolve(process.cwd(), song.streamUrl.replace('/uploads/', env.UPLOAD_DIR + '/'));
      }

      // Fallback to sample MP3 if not found or if path is sample
      if (!audioPath || !fs.existsSync(audioPath)) {
        const sampleAudio = path.resolve(process.cwd(), env.UPLOAD_DIR, 'audio', 'sample.mp3');
        if (fs.existsSync(sampleAudio)) {
          audioPath = sampleAudio;
        } else {
          res.status(404).json({ message: 'Tệp âm thanh nguồn chưa sẵn sàng' });
          return;
        }
      }

      // Stream with HTTP 206 Range requests
      streamAudioFile(audioPath, req, res);
    } catch (err) {
      next(err);
    }
  }

  async getStreamInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const { source, sourceId } = req.params;
      const info = await songService.getStreamInfo(source, sourceId);
      if (!info) {
        res.status(404).json({ message: 'Không lấy được thông tin phát cho nguồn này' });
        return;
      }
      res.json(info);
    } catch (err) {
      next(err);
    }
  }

  async toggleLike(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Vui lòng đăng nhập' });
        return;
      }
      const track = req.body.track;
      if (!track) {
        res.status(400).json({ message: 'Dữ liệu bài hát là bắt buộc' });
        return;
      }
      const result = await songService.toggleLike(req.user.userId, track);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async recordPlay(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const track = req.body.track;
      await songService.recordPlay(req.user?.userId, track);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  async getTrending(req: Request, res: Response, next: NextFunction) {
    try {
      // 10 top local songs
      const localSongs = await prisma.song.findMany({
        where: { source: 'local' },
        orderBy: { playCount: 'desc' },
        take: 12,
        include: { artist: true },
      });

      const formatted = localSongs.map((s) => ({
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
        playCount: s.playCount,
      }));

      res.json({ trending: formatted });
    } catch (err) {
      next(err);
    }
  }

  async getVietnameseHits(req: Request, res: Response, next: NextFunction) {
    try {
      const songs = await prisma.song.findMany({
        where: {
          source: 'local',
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { artist: true },
      });

      const formatted = songs.map((s) => ({
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
        isFullLength: s.isFullLength,
      }));

      res.json({ vpop: formatted });
    } catch (err) {
      next(err);
    }
  }
}

export const songController = new SongController();
