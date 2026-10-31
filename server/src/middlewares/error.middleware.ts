import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error(
    {
      err: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    },
    'Unhandled request error'
  );

  const status = err.status || err.statusCode || 500;
  const message =
    err.message || 'Đã có lỗi xảy ra từ máy chủ, vui lòng thử lại sau.';

  res.status(status).json({
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}
