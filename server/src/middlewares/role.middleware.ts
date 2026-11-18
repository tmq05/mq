import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ message: 'Quyền truy cập bị từ chối. Yêu cầu quyền Quản trị viên (ADMIN).' });
    return;
  }
  next();
}

export function requireModerator(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'MODERATOR')) {
    res.status(403).json({ message: 'Quyền truy cập bị từ chối. Yêu cầu quyền Kiểm duyệt viên hoặc Quản trị viên.' });
    return;
  }
  next();
}


