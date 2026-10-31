import { Request, Response, NextFunction } from 'express';
import { playlistService } from '../services/playlist.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export class PlaylistController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Vui lòng đăng nhập' });
        return;
      }
      const playlist = await playlistService.createPlaylist(req.user.userId, req.body);
      res.status(201).json(playlist);
    } catch (err) {
      next(err);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Vui lòng đăng nhập' });
        return;
      }
      const updated = await playlistService.updatePlaylist(
        req.user.userId,
        req.params.id,
        req.body
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Vui lòng đăng nhập' });
        return;
      }
      const result = await playlistService.deletePlaylist(req.user.userId, req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const playlist = await playlistService.getPlaylist(req.params.id, req.user?.userId);
      res.json(playlist);
    } catch (err) {
      next(err);
    }
  }

  async addSong(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Vui lòng đăng nhập' });
        return;
      }
      const result = await playlistService.addSong(
        req.user.userId,
        req.params.id,
        req.body.track
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async removeSong(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Vui lòng đăng nhập' });
        return;
      }
      const result = await playlistService.removeSong(
        req.user.userId,
        req.params.id,
        req.params.songId
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getUserPlaylists(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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
}

export const playlistController = new PlaylistController();
