import rateLimit from 'express-rate-limit';

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Quá nhiều yêu cầu từ IP của bạn, vui lòng thử lại sau.' },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Quá nhiều lần thử đăng nhập/đăng ký. Vui lòng thử lại sau 15 phút.' },
});

export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60, // 60 search requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Tần suất tìm kiếm quá nhanh, vui lòng thử lại sau vài giây.' },
});
