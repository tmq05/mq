import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt.js';
import { prisma } from '../config/prisma.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Vui lòng đăng nhập để tiếp tục' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyAccessToken(token);

  if (!payload) {
    res.status(401).json({ message: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ' });
    return;
  }

  // Check if user is locked
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, isLocked: true, role: true, email: true },
  });

  if (!user) {
    res.status(401).json({ message: 'Tài khoản không tồn tại' });
    return;
  }

  if (user.isLocked) {
    res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa' });
    return;
  }

  req.user = {
    userId: user.id,
    role: user.role,
    email: user.email,
  };

  next();
}

export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyAccessToken(token);

  if (payload) {
    req.user = payload;
  }

  next();
}

