import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { otpService } from '../services/otp.service.js';
import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { env } from '../config/env.js';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name } = req.body;
      const result = await authService.register({ email, password, name });

      // Set refresh token in httpOnly cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json({
        user: result.user,
        accessToken: result.accessToken,
      });
    } catch (err: any) {
      if (err?.code === 'ACCOUNT_LOCKED') {
        res.status(403).json({ message: err.message, code: 'ACCOUNT_LOCKED' });
        return;
      }
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login({ email, password });

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        user: result.user,
        accessToken: result.accessToken,
      });
    } catch (err: any) {
      if (err?.code === 'ACCOUNT_LOCKED') {
        res.status(403).json({ message: err.message, code: 'ACCOUNT_LOCKED' });
        return;
      }
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies.refreshToken || req.body.refreshToken;
      if (!token) {
        res.status(401).json({ message: 'Không tìm thấy refresh token' });
        return;
      }

      const result = await authService.refresh(token);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        user: result.user,
        accessToken: result.accessToken,
      });
    } catch (err: any) {
      if (err?.code === 'ACCOUNT_LOCKED') {
        res.status(403).json({ message: err.message, code: 'ACCOUNT_LOCKED' });
        return;
      }
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies.refreshToken;
      await authService.logout(token);
      res.clearCookie('refreshToken');
      res.json({ message: 'Đăng xuất thành công' });
    } catch (err: any) {
      if (err?.code === 'ACCOUNT_LOCKED') {
        res.status(403).json({ message: err.message, code: 'ACCOUNT_LOCKED' });
        return;
      }
      next(err);
    }
  }

  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Chưa đăng nhập' });
        return;
      }
      const user = await authService.getMe(req.user.userId);
      res.json(user);
    } catch (err: any) {
      if (err?.code === 'ACCOUNT_LOCKED') {
        res.status(403).json({ message: err.message, code: 'ACCOUNT_LOCKED' });
        return;
      }
      next(err);
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Chưa đăng nhập' });
        return;
      }
      const updated = await authService.updateProfile(req.user.userId, req.body);
      res.json(updated);
    } catch (err: any) {
      if (err?.code === 'ACCOUNT_LOCKED') {
        res.status(403).json({ message: err.message, code: 'ACCOUNT_LOCKED' });
        return;
      }
      next(err);
    }
  }

  async updateAvatar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Chưa đăng nhập' });
        return;
      }
      const updated = await authService.updateAvatar(req.user.userId, req.body);
      res.json(updated);
    } catch (err: any) {
      if (err?.code === 'ACCOUNT_LOCKED') {
        res.status(403).json({ message: err.message, code: 'ACCOUNT_LOCKED' });
        return;
      }
      next(err);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.forgotPassword(req.body.email);
      res.json(result);
    } catch (err: any) {
      if (err?.code === 'ACCOUNT_LOCKED') {
        res.status(403).json({ message: err.message, code: 'ACCOUNT_LOCKED' });
        return;
      }
      next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.resetPassword(req.body);
      res.json(result);
    } catch (err: any) {
      if (err?.code === 'ACCOUNT_LOCKED') {
        res.status(403).json({ message: err.message, code: 'ACCOUNT_LOCKED' });
        return;
      }
      next(err);
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Chưa đăng nhập' });
        return;
      }
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        res.status(400).json({ message: 'Vui lòng điền đầy đủ mật khẩu hiện tại và mật khẩu mới' });
        return;
      }
      const result = await authService.changePassword(req.user.userId, currentPassword, newPassword);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ message: err.message || 'Lỗi đổi mật khẩu' });
    }
  }

  async logoutAllDevices(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Chưa đăng nhập' });
        return;
      }
      const result = await authService.logoutAllDevices(req.user.userId);
      res.json(result);
    } catch (err: any) {
      if (err?.code === 'ACCOUNT_LOCKED') {
        res.status(403).json({ message: err.message, code: 'ACCOUNT_LOCKED' });
        return;
      }
      next(err);
    }
  }

  async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { target, channel, email } = req.body;
      if (!target || !channel) {
        res.status(400).json({ message: 'Vui lòng cung cấp thông tin người nhận và kênh gửi (email/phone)' });
        return;
      }
      if (channel !== 'email' && channel !== 'phone') {
        res.status(400).json({ message: 'Kênh gửi không hợp lệ. Chỉ chấp nhận email hoặc phone' });
        return;
      }

      // Kiểm tra định dạng email
      if (channel === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(target)) {
          res.status(400).json({ message: 'Địa chỉ email không đúng định dạng' });
          return;
        }
      } else {
        // Kiểm tra số điện thoại (hỗ trợ số di động VN)
        const cleanPhone = target.replace(/[\s\-\.\(\)]/g, '');
        if (!/^(0|\+84|84)?[3|5|7|8|9][0-9]{8}$/.test(cleanPhone)) {
          res.status(400).json({ message: 'Số điện thoại không đúng định dạng di động Việt Nam (ví dụ: 0912345678)' });
          return;
        }
      }

      // Kiểm tra tài khoản tồn tại nếu là chức năng đặt lại mật khẩu
      const accountEmail = channel === 'email' ? target : email;
      if (accountEmail) {
        const user = await prisma.user.findUnique({
          where: { email: accountEmail.toLowerCase().trim() },
        });
        if (!user) {
          res.status(404).json({ message: `Không tìm thấy tài khoản với email "${accountEmail}"` });
          return;
        }
      }

      const result = await otpService.requestOtp(target, channel);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ message: err.message || 'Lỗi gửi mã OTP' });
    }
  }

  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { target, channel, otp } = req.body;
      if (!target || !channel || !otp) {
        res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin xác thực và mã OTP' });
        return;
      }
      await otpService.verifyOtp(target, channel, otp, false);
      res.json({ success: true, message: 'Xác thực mã OTP thành công.' });
    } catch (err: any) {
      res.status(400).json({ message: err.message || 'Mã OTP không hợp lệ' });
    }
  }

  async resetPasswordWithOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, target, channel, otp, newPassword } = req.body;
      if (!email || !target || !channel || !otp || !newPassword) {
        res.status(400).json({ message: 'Vui lòng điền đầy đủ tất cả các trường thông tin' });
        return;
      }
      const result = await authService.resetPasswordWithOtp({
        email,
        target,
        channel,
        otp,
        newPassword,
      });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ message: err.message || 'Lỗi đặt lại mật khẩu' });
    }
  }

  async submitLockedSupport(req: Request, res: Response) {
    try {
      const result = await authService.submitLockedAccountSupport({
        email: req.body.email,
        message: req.body.message,
      });
      res.status(201).json(result);
    } catch (err: any) {
      res
        .status(err?.statusCode || 400)
        .json({ message: err.message || 'Không thể gửi yêu cầu hỗ trợ' });
    }
  }
}

export const authController = new AuthController();

