import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service.js';
import { localStorageProvider } from '../storage/local-storage.js';

function isValidAudioBuffer(buf: Buffer): boolean {
  if (!buf || buf.length < 4) return false;
  // MP3: ID3 or MPEG sync (0xFF 0xEx)
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return true;
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return true;
  // RIFF (WAV)
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) return true;
  // FLAC (fLaC)
  if (buf[0] === 0x66 && buf[1] === 0x4c && buf[2] === 0x61 && buf[3] === 0x43) return true;
  // OGG (OggS)
  if (buf[0] === 0x4f && buf[1] === 0x67 && buf[2] === 0x67 && buf[3] === 0x53) return true;
  // M4A / MP4 (ftyp)
  if (buf.length >= 8 && buf.toString('ascii', 4, 8) === 'ftyp') return true;
  return false;
}

function isValidImageBuffer(buf: Buffer): boolean {
  if (!buf || buf.length < 4) return false;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  // WEBP: RIFF....WEBP
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf.length >= 12 && buf.toString('ascii', 8, 12) === 'WEBP') return true;
  return false;
}

export class AdminController {
  async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const days = req.query.days ? parseInt(String(req.query.days), 10) : 7;
      const validDays = [7, 30, 90].includes(days) ? days : 7;
      const stats = await adminService.getDashboardStats(validDays);
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

  async getSystemHealth(req: Request, res: Response, next: NextFunction) {
    try {
      const health = await adminService.getSystemHealth();
      res.json(health);
    } catch (err) {
      next(err);
    }
  }

  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const search = req.query.search ? String(req.query.search) : undefined;
      const role = req.query.role as any;
      const status = req.query.status as any;
      const users = await adminService.getUsers({ page, limit, search, role, status });
      res.json(users);
    } catch (err) {
      next(err);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      await adminService.deleteUser(req.params.id);
      res.json({ message: 'Đã xóa tài khoản người dùng thành công' });
    } catch (err) {
      next(err);
    }
  }

  async getUserDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const details = await adminService.getUserDetails(req.params.id);
      res.json(details);
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
      if (!req.file || !req.file.buffer) {
        res.status(400).json({ message: 'Vui lòng chọn tệp âm thanh hợp lệ' });
        return;
      }
      if (!isValidAudioBuffer(req.file.buffer)) {
        res.status(400).json({
          message: 'Tệp tải lên không phải là định dạng âm thanh hợp lệ (MP3, WAV, FLAC, OGG, M4A) hoặc chứa nội dung không an toàn.',
        });
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
      if (!req.file || !req.file.buffer) {
        res.status(400).json({ message: 'Vui lòng chọn tệp ảnh hợp lệ' });
        return;
      }
      if (!isValidImageBuffer(req.file.buffer)) {
        res.status(400).json({
          message: 'Tệp tải lên không phải là định dạng hình ảnh hợp lệ (JPG, PNG, WEBP).',
        });
        return;
      }
      const fileUrl = await localStorageProvider.uploadFile(req.file, 'covers');
      res.status(201).json({ url: fileUrl });
    } catch (err) {
      next(err);
    }
  }

  async getSongs(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const search = req.query.search ? String(req.query.search) : undefined;
      const artist = req.query.artist ? String(req.query.artist) : undefined;
      const album = req.query.album ? String(req.query.album) : undefined;
      const source = req.query.source ? String(req.query.source) : undefined;
      const status = req.query.status as 'all' | 'visible' | 'hidden' | undefined;
      const sortBy = req.query.sortBy as 'createdAt' | 'playCount' | 'title' | 'durationMs' | undefined;
      const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined;

      const result = await adminService.getSongs({
        page,
        limit,
        search,
        artist,
        album,
        source,
        status,
        sortBy,
        sortOrder,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async toggleSongVisibility(req: Request, res: Response, next: NextFunction) {
    try {
      const { isHidden } = req.body;
      const song = await adminService.toggleSongVisibility(req.params.id, isHidden);
      res.json({
        message: song.isHidden ? 'Đã ẩn bài hát' : 'Đã hiện bài hát',
        song,
      });
    } catch (err) {
      next(err);
    }
  }

  async batchSongAction(req: Request, res: Response, next: NextFunction) {
    try {
      const { action, songIds } = req.body;
      const result = await adminService.batchSongAction(action, songIds);
      res.json(result);
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

  async getAlbums(req: Request, res: Response, next: NextFunction) {
    try {
      const albums = await adminService.getAlbums();
      res.json({ albums });
    } catch (err) {
      next(err);
    }
  }

  async updateAlbumCover(req: Request, res: Response, next: NextFunction) {
    try {
      const { coverUrl } = req.body;
      const updated = await adminService.updateAlbumCover(req.params.id, coverUrl);
      res.json({ message: 'Cập nhật ảnh bìa album thành công', album: updated });
    } catch (err) {
      next(err);
    }
  }

  // Artist CRUD
  async getArtists(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const search = req.query.search ? String(req.query.search) : undefined;
      const result = await adminService.getArtists({ page, limit, search });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async createArtist(req: Request, res: Response, next: NextFunction) {
    try {
      const artist = await adminService.createArtist(req.body);
      res.status(201).json(artist);
    } catch (err) {
      next(err);
    }
  }

  async updateArtist(req: Request, res: Response, next: NextFunction) {
    try {
      const artist = await adminService.updateArtist(req.params.id, req.body);
      res.json(artist);
    } catch (err) {
      next(err);
    }
  }

  async toggleArtistVerified(req: Request, res: Response, next: NextFunction) {
    try {
      const artist = await adminService.toggleArtistVerified(req.params.id);
      res.json({
        message: artist.isVerified ? 'Đã xác minh nghệ sĩ' : 'Đã hủy xác minh nghệ sĩ',
        artist,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteArtist(req: Request, res: Response, next: NextFunction) {
    try {
      await adminService.deleteArtist(req.params.id);
      res.json({ message: 'Đã xóa nghệ sĩ thành công' });
    } catch (err) {
      next(err);
    }
  }

  // Playlist Management
  async getPlaylists(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const search = req.query.search ? String(req.query.search) : undefined;
      const status = req.query.status as any;
      const rawPinned = req.query.isPinned ? String(req.query.isPinned) : undefined;
      const isPinned =
        rawPinned === 'true' || rawPinned === 'pinned'
          ? true
          : rawPinned === 'false' || rawPinned === 'unpinned'
            ? false
            : undefined;
      const result = await adminService.getPlaylists({ page, limit, search, status, isPinned });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async togglePlaylistPin(req: Request, res: Response, next: NextFunction) {
    try {
      const playlist = await adminService.togglePlaylistPin(req.params.id);
      res.json({
        message: playlist.isPinned ? 'Đã ghim playlist lên trang Khám phá' : 'Đã bỏ ghim playlist',
        playlist,
      });
    } catch (err) {
      next(err);
    }
  }

  async togglePlaylistBan(req: Request, res: Response, next: NextFunction) {
    try {
      const { isBanned } = req.body;
      const playlist = await adminService.togglePlaylistBan(req.params.id, isBanned);
      res.json({
        message: playlist.isBanned ? 'Đã gỡ và khóa playlist vi phạm' : 'Đã khôi phục playlist',
        playlist,
      });
    } catch (err) {
      next(err);
    }
  }

  async deletePlaylist(req: Request, res: Response, next: NextFunction) {
    try {
      await adminService.deletePlaylist(req.params.id);
      res.json({ message: 'Đã xóa playlist thành công' });
    } catch (err) {
      next(err);
    }
  }

  async getPlaylistDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const playlist = await adminService.getPlaylistDetails(req.params.id);
      res.json(playlist);
    } catch (err) {
      next(err);
    }
  }

  // Reports Management
  async getReports(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const status = req.query.status as any;
      const type = req.query.type as any;
      const search = req.query.search ? String(req.query.search) : undefined;
      const result = await adminService.getReports({ page, limit, status, type, search });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateReport(req: Request, res: Response, next: NextFunction) {
    try {
      const report = await adminService.updateReport(req.params.id, req.body);
      res.json({ message: 'Đã cập nhật trạng thái báo cáo', report });
    } catch (err) {
      next(err);
    }
  }

  async quickTakedownReport(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.quickTakedownReport(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async deleteReport(req: Request, res: Response, next: NextFunction) {
    try {
      await adminService.deleteReport(req.params.id);
      res.json({ message: 'Đã xóa báo cáo' });
    } catch (err) {
      next(err);
    }
  }

  async toggleProvider(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const { enabled } = req.body;
      const result = await adminService.toggleProvider(req.params.name, enabled, user);
      res.json({
        message: `Đã ${result.enabled ? 'bật' : 'tắt'} nguồn nhạc ${result.name}`,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  async testProviderConnection(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.testProviderConnection(req.params.name);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const action = req.query.action ? String(req.query.action) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;
      const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
      const endDate = req.query.endDate ? String(req.query.endDate) : undefined;

      const logs = await adminService.getAuditLogs({ page, limit, action, search, startDate, endDate });
      res.json(logs);
    } catch (err) {
      next(err);
    }
  }

  async exportAuditLogsCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const action = req.query.action ? String(req.query.action) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;
      const csv = await adminService.exportAuditLogsCsv({ action, search });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="mq-audit-logs-${Date.now()}.csv"`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }

  async getSystemSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await adminService.getSystemSettings();
      res.json(settings);
    } catch (err) {
      next(err);
    }
  }

  async updateSystemSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const settings = await adminService.updateSystemSettings(req.body, user);
      res.json({ message: 'Cập nhật cấu hình hệ thống thành công', settings });
    } catch (err) {
      next(err);
    }
  }

  async getSupportAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminService.getLockedSupportAlerts();
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  async resolveSupportAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const { action } = req.body as { action?: 'unlock' | 'dismiss' };
      if (action !== 'unlock' && action !== 'dismiss') {
        res.status(400).json({ message: 'Hành động không hợp lệ (chỉ chấp nhận unlock hoặc dismiss)' });
        return;
      }
      const actor = (req as any).user;
      const result = await adminService.resolveLockedSupportAlert(req.params.id, action, actor);
      res.json(result);
    } catch (err: any) {
      if (err?.statusCode) {
        res.status(err.statusCode).json({ message: err.message });
        return;
      }
      next(err);
    }
  }
}

export const adminController = new AdminController();


