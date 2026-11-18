import { Router } from 'express';
import { optionalAuth, requireAuth, AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { chatController } from '../controllers/chat.controller.js';
import { prisma } from '../config/prisma.js';

const router = Router();

/** Route chuẩn theo đặc tả: POST /api/chat (SSE Agent Loop) & POST /api/chat/confirm (One-time Action Confirmation) */
router.post('/', optionalAuth, (req, res, next) =>
  chatController.handleChatSSE(req, res, next)
);

router.post('/confirm', requireAuth, (req, res, next) =>
  chatController.handleConfirm(req, res, next)
);

/** Giữ alias tương thích ngược */
router.post('/stream', optionalAuth, (req, res, next) =>
  chatController.handleChatSSE(req, res, next)
);

router.post('/confirm-action', requireAuth, (req, res, next) =>
  chatController.handleConfirm(req, res, next)
);

/** Cho phép người dùng tự xóa toàn bộ lịch sử hội thoại của chính mình trên server */
router.delete('/history', requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user?.userId) {
      res.status(401).json({ message: 'Vui lòng đăng nhập.' });
      return;
    }
    const deleted = await prisma.chatConversation.deleteMany({
      where: { userId: authReq.user.userId },
    });
    res.json({
      message: 'Đã xóa lịch sử hội thoại của bạn.',
      deletedCount: deleted.count,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
