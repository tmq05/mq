import { Request } from 'express';
import { verifyAccessToken } from '../../utils/jwt.js';
import { prisma } from '../../config/prisma.js';
import { AssistantError } from './errors.js';

export type AssistantRole = 'GUEST' | 'USER' | 'MODERATOR' | 'ADMIN';

export interface AssistantAuthContext {
  userId?: string;
  role: AssistantRole;
  email?: string;
  ip: string;
}

/** Xác thực người dùng từ Bearer token hoặc cookie hiện có */
export async function resolveAssistantAuth(req: Request): Promise<AssistantAuthContext> {
  const ip =
    (typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : req.ip) || '127.0.0.1';

  const existingUser = (req as any).user;
  if (existingUser?.userId) {
    return {
      userId: existingUser.userId,
      role: (existingUser.role as AssistantRole) || 'USER',
      email: existingUser.email,
      ip,
    };
  }

  let token: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if ((req as any).cookies?.accessToken) {
    token = (req as any).cookies.accessToken;
  }

  if (!token) {
    return { role: 'GUEST', ip };
  }

  const payload = verifyAccessToken(token);
  if (!payload?.userId) {
    return { role: 'GUEST', ip };
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, email: true, isLocked: true },
    });

    if (!dbUser || dbUser.isLocked) {
      return { role: 'GUEST', ip };
    }

    return {
      userId: dbUser.id,
      role: (dbUser.role as AssistantRole) || 'USER',
      email: dbUser.email,
      ip,
    };
  } catch {
    return {
      userId: payload.userId,
      role: (payload.role as AssistantRole) || 'USER',
      email: payload.email,
      ip,
    };
  }
}

export function assertAuthenticated(auth: AssistantAuthContext): string {
  if (!auth.userId || auth.role === 'GUEST') {
    throw new AssistantError(
      'UNAUTHORIZED',
      'Bạn cần đăng nhập để thực hiện thao tác thay đổi dữ liệu hoặc truy cập thư viện cá nhân.',
      401
    );
  }
  return auth.userId;
}

export function assertAdmin(auth: AssistantAuthContext): void {
  if (!auth.userId || auth.role !== 'ADMIN') {
    throw new AssistantError(
      'FORBIDDEN',
      'Công cụ quản trị chỉ dành cho tài khoản Admin.',
      403
    );
  }
}

/** Kiểm tra playlist tồn tại và thuộc quyền sở hữu của userId */
export async function assertPlaylistOwnership(userId: string, playlistId: string) {
  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
  });

  if (!playlist) {
    throw new AssistantError('INVALID_INPUT', 'Playlist không tồn tại.', 404);
  }

  if (playlist.userId !== userId) {
    throw new AssistantError(
      'FORBIDDEN',
      'Bạn không có quyền chỉnh sửa hoặc xóa playlist của người dùng khác.',
      403
    );
  }

  return playlist;
}
