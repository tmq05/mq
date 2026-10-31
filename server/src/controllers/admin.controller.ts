import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service.js';
import { localStorageProvider } from '../storage/local-storage.js';

export class AdminController {
  async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await adminService.getDashboardStats();
      res.json(stats);
    } catch (err) {
      next(err);
    }
  }

  async getProvidersStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await adminService.getProvidersStatus();
      res.json(status);
    } catch (err) {
      next(err);
    }
  }

  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const users = await adminService.getUsers(page, limit);
      res.json(users);
    } catch (err) {
      next(err);
    }
  }

  async toggleLockUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await adminService.toggleLockUser(req.params.id);
      res.json({ message: user.isLocked ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản', user });
    } catch (err) {
      next(err);
    }
  }

  async changeUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { role } = req.body;
      const user = await adminService.changeUserRole(req.params.id, role);
      res.json({ message: 'Đã cập nhật vai trò người dùng', user });
    } catch (err) {
      next(err);
    }
  }

  async uploadAudio(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        res.status(400).json({ message: 'Vui lòng chọn tệp âm thanh hợp lệ' });
        return;
      }
      const fileUrl = await localStorageProvider.uploadFile(req.file, 'audio');
      res.status(201).json({ url: fileUrl });
    } catch (err) {
      next(err);
    }
  }

  async uploadCover(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        res.status(400).json({ message: 'Vui lòng chọn tệp ảnh hợp lệ' });
        return;
      }
      const fileUrl = await localStorageProvider.uploadFile(req.file, 'covers');
      res.status(201).json({ url: fileUrl });
    } catch (err) {
      next(err);
    }
  }

  async createSong(req: Request, res: Response, next: NextFunction) {
    try {
      const song = await adminService.createSong(req.body);
      res.status(201).json(song);
    } catch (err) {
      next(err);
    }
  }

  async updateSong(req: Request, res: Response, next: NextFunction) {
    try {
      const song = await adminService.updateSong(req.params.id, req.body);
      res.json(song);
    } catch (err) {
      next(err);
    }
  }

  async deleteSong(req: Request, res: Response, next: NextFunction) {
    try {
      await adminService.deleteSong(req.params.id);
      res.json({ message: 'Đã xóa bài hát thành công' });
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();
