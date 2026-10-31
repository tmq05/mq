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
}

export const userController = new UserController();

