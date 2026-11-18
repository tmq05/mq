import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { resolveSafeAvatarUrl } from '../config/preset-avatars.js';
import { assertNoProfanity } from '../utils/profanity-filter.js';
import { otpService } from './otp.service.js';
import { settingsService } from './settings.service.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.js';

export class AuthService {
  async register(data: { email: string; password: string; name: string }) {
    const isAllowed = await settingsService.isRegistrationAllowed();
    if (!isAllowed) {
      throw new Error('Tính năng đăng ký tài khoản mới hiện đang tạm đóng theo cài đặt hệ thống.');
    }

    assertNoProfanity([{ label: 'Tên hiển thị', value: data.name }]);

    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      throw new Error('Email này đã được sử dụng');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.upsert({
      where: { token: refreshToken },
      update: { expiresAt },
      create: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return { user, accessToken, refreshToken };
  }

  async login(data: { email: string; password: string }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (!user) {
      throw new Error('Email hoặc mật khẩu không chính xác');
    }

    if (user.isLocked) {
      throw Object.assign(new Error('Tài khoản của bạn đã bị khóa bởi quản trị viên'), {
        statusCode: 403,
        code: 'ACCOUNT_LOCKED',
      });
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Email hoặc mật khẩu không chính xác');
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.upsert({
      where: { token: refreshToken },
      update: { expiresAt },
      create: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    };
  }

  async refresh(token: string) {
    const payload = verifyRefreshToken(token);
    if (!payload) {
      throw new Error('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!storedToken || storedToken.revokedAt || new Date() > storedToken.expiresAt) {
      throw new Error('Refresh token đã bị hủy hoặc không tồn tại');
    }

    if (storedToken.user.isLocked) {
      throw new Error('Tài khoản của bạn đã bị khóa');
    }

    // Revoke old token and issue new pair (Token Rotation)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const newAccessToken = generateAccessToken({
      userId: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
    });

    const newRefreshToken = generateRefreshToken({
      userId: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.upsert({
      where: { token: newRefreshToken },
      update: { expiresAt },
      create: {
        token: newRefreshToken,
        userId: storedToken.user.id,
        expiresAt,
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: storedToken.user.id,
        email: storedToken.user.email,
        name: storedToken.user.name,
        role: storedToken.user.role,
        avatarUrl: storedToken.user.avatarUrl,
      },
    };
  }

  async logout(token?: string) {
    if (token) {
      await prisma.refreshToken.updateMany({
        where: { token },
        data: { revokedAt: new Date() },
      });
    }
    return { success: true };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }

    return user;
  }

  async updateProfile(
    userId: string,
    data: { name?: string; avatarUrl?: string | null; presetId?: string }
  ) {
    assertNoProfanity([{ label: 'Tên hiển thị', value: data.name }]);

    const resolvedAvatar = resolveSafeAvatarUrl({
      presetId: data.presetId,
      avatarUrl: data.avatarUrl,
    });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(resolvedAvatar !== undefined ? { avatarUrl: resolvedAvatar } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
    return updated;
  }

  async updateAvatar(
    userId: string,
    data: { presetId?: string; avatarUrl?: string | null }
  ) {
    const resolvedAvatar = resolveSafeAvatarUrl(data);
    if (resolvedAvatar === undefined) {
      throw Object.assign(new Error('Vui lòng chọn ảnh đại diện hoặc cung cấp URL hợp lệ'), {
        statusCode: 400,
      });
    }

    return prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: resolvedAvatar },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Return success even if email not found to avoid user enumeration
      return { message: 'Nếu email tồn tại, đường link đặt lại mật khẩu đã được gửi.' };
    }

    // In a production app, send email with reset token. Here we generate a mock token:
    const resetToken = crypto.randomBytes(32).toString('hex');
    return {
      message: 'Đường dẫn đặt lại mật khẩu đã được xử lý thành công.',
      resetToken, // for testing purposes
    };
  }

  async resetPassword(data: { email: string; newPassword: string }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (!user) {
      throw new Error('Người dùng không tồn tại');
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Invalidate existing refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { revokedAt: new Date() },
    });

    return { message: 'Mật khẩu đã được cập nhật thành công.' };
  }

  async resetPasswordWithOtp(data: {
    email: string;
    target: string;
    channel: 'email' | 'phone';
    otp: string;
    newPassword: string;
  }) {
    // 1. Xác thực OTP
    await otpService.verifyOtp(data.target, data.channel, data.otp);

    // 2. Tìm người dùng
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (!user) {
      throw new Error('Không tìm thấy tài khoản người dùng tương ứng');
    }

    // 3. Kiểm tra mật khẩu mới
    if (!data.newPassword || data.newPassword.length < 6) {
      throw new Error('Mật khẩu mới phải chứa ít nhất 6 ký tự');
    }

    // 4. Băm mật khẩu và lưu
    const passwordHash = await bcrypt.hash(data.newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // 5. Thu hồi tất cả refresh token cũ
    await prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { revokedAt: new Date() },
    });

    return { message: 'Mật khẩu đã được cập nhật thành công! Vui lòng đăng nhập với mật khẩu mới.' };
  }

  async changePassword(userId: string, currentPass: string, newPass: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('Người dùng không tồn tại');
    }

    const isValid = await bcrypt.compare(currentPass, user.passwordHash);
    if (!isValid) {
      throw new Error('Mật khẩu hiện tại không chính xác');
    }

    if (newPass.length < 6) {
      throw new Error('Mật khẩu mới phải chứa ít nhất 6 ký tự');
    }

    const passwordHash = await bcrypt.hash(newPass, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Đổi mật khẩu thành công!' };
  }

  async logoutAllDevices(userId: string) {
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });
    return { message: 'Đã đăng xuất khỏi tất cả các thiết bị thành công!' };
  }

  /**
   * Gửi yêu cầu hỗ trợ mở khóa tài khoản (lưu vào bảng reports + audit_logs để thông báo cho Admin & Moderator)
   */
  async submitLockedAccountSupport(data: { email: string; message: string }) {
    const email = (data.email || '').toLowerCase().trim();
    const message = (data.message || '').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw Object.assign(new Error('Địa chỉ email không hợp lệ'), { statusCode: 400 });
    }
    if (message.length < 10 || message.length > 1000) {
      throw Object.assign(
        new Error('Vui lòng nhập nội dung hỗ trợ từ 10 đến 1000 ký tự'),
        { statusCode: 400 }
      );
    }

    assertNoProfanity([{ label: 'Nội dung hỗ trợ', value: message }]);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw Object.assign(new Error('Không tìm thấy tài khoản tương ứng với email này'), {
        statusCode: 404,
      });
    }
    if (!user.isLocked) {
      throw Object.assign(new Error('Tài khoản này hiện đang hoạt động, không bị khóa'), {
        statusCode: 400,
      });
    }

    const existingPending = await prisma.report.findFirst({
      where: {
        targetType: 'account_appeal',
        targetId: user.id,
        status: 'PENDING',
      },
    });
    if (existingPending) {
      throw Object.assign(
        new Error(
          'Bạn đã gửi yêu cầu hỗ trợ đang chờ xử lý. Admin hoặc Moderator sẽ xem xét sớm nhất.'
        ),
        { statusCode: 400 }
      );
    }

    const report = await prisma.report.create({
      data: {
        targetType: 'account_appeal',
        targetId: user.id,
        targetTitle: `Hỗ trợ mở khóa tài khoản: ${user.name}`,
        reason: 'Yêu cầu hỗ trợ mở khóa tài khoản bị khóa',
        description: message,
        type: 'OTHER',
        status: 'PENDING',
        reporterEmail: user.email,
        reporterName: user.name,
        userId: user.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        action: 'ACCOUNT_SUPPORT_REQUEST',
        targetType: 'USER',
        targetId: user.id,
        targetTitle: user.email,
        details: message,
      },
    });

    return {
      success: true,
      reportId: report.id,
      message: 'Đã gửi yêu cầu hỗ trợ tới Admin và Moderator. Vui lòng chờ xét duyệt.',
    };
  }
}

export const authService = new AuthService();

