import { Router, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest, requireAuth } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/role.middleware.js';
import {
  getApiKeyConfigurationStatus,
  getChatbotRuntimeSettings,
  updateChatbotRuntimeSettings,
} from '../lib/assistant/settings.js';
import {
  cleanupOldChatbotLogs,
  maskSensitiveObject,
  maskSensitiveText,
} from '../lib/assistant/logging.js';
import { ensureSampleChatbotData } from '../lib/assistant/seedChatbotData.js';

const router = Router();

// Bắt buộc quyền ADMIN cho toàn bộ API quản lý Chatbot
router.use(requireAuth, requireAdmin);

/** 1. GET /api/admin/chatbot/settings — Đọc cấu hình động + trạng thái API key */
router.get('/settings', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await ensureSampleChatbotData();
    const settings = await getChatbotRuntimeSettings();
    const apiKeyStatus = getApiKeyConfigurationStatus();
    res.json({ settings, apiKeyStatus });
  } catch (err) {
    next(err);
  }
});

/** 2. PUT /api/admin/chatbot/settings — Cập nhật cấu hình động, xóa cache & ghi AuditLog */
router.put('/settings', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await updateChatbotRuntimeSettings(req.body || {}, {
      userId: req.user?.userId,
      userEmail: req.user?.email,
      ip: req.ip,
    });
    res.json({
      message: 'Đã lưu cấu hình Trợ lý âm nhạc thành công.',
      settings: updated,
    });
  } catch (err: any) {
    res.status(400).json({
      message: err?.issues?.[0]?.message || err?.message || 'Dữ liệu cấu hình không hợp lệ.',
    });
  }
});

/** 3. GET /api/admin/chatbot/conversations — Danh sách nhật ký hội thoại (tìm kiếm, lọc, phân trang) */
router.get(
  '/conversations',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await ensureSampleChatbotData();

      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '12'), 10) || 12));
      const search = String(req.query.search || '').trim();
      const filter = String(req.query.filter || 'all'); // all | tool | error | bad_feedback | flagged
      const dateFrom = req.query.dateFrom ? new Date(String(req.query.dateFrom)) : null;
      const dateTo = req.query.dateTo ? new Date(String(req.query.dateTo)) : null;

      const where: Record<string, any> = {};
      if (filter === 'tool') where.hasToolCall = true;
      if (filter === 'error') where.hasError = true;
      if (filter === 'bad_feedback') where.hasBadFeedback = true;
      if (filter === 'flagged') where.flagged = true;

      if (dateFrom || dateTo) {
        where.startedAt = {
          ...(dateFrom && !isNaN(dateFrom.getTime()) ? { gte: dateFrom } : {}),
          ...(dateTo && !isNaN(dateTo.getTime()) ? { lte: dateTo } : {}),
        };
      }

      if (search) {
        where.OR = [
          { userName: { contains: search, mode: 'insensitive' } },
          { userId: { contains: search, mode: 'insensitive' } },
          { model: { contains: search, mode: 'insensitive' } },
          {
            messages: {
              some: { content: { contains: search, mode: 'insensitive' } },
            },
          },
          {
            toolCalls: {
              some: { toolName: { contains: search, mode: 'insensitive' } },
            },
          },
        ];
      }

      const [total, rows] = await Promise.all([
        prisma.chatConversation.count({ where }),
        prisma.chatConversation.findMany({
          where,
          orderBy: { startedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              take: 2,
              select: { id: true, role: true, content: true, feedback: true },
            },
            toolCalls: {
              select: { id: true, toolName: true, status: true, durationMs: true },
            },
          },
        }),
      ]);

      res.json({
        conversations: rows.map((r) => ({
          ...r,
          previewMessage: maskSensitiveText(r.messages[0]?.content || ''),
          toolsSummary: r.toolCalls.map((tc) => tc.toolName),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/** 4. GET /api/admin/chatbot/conversations/export — Xuất CSV / JSON đã che dữ liệu nhạy cảm + ghi AuditLog */
router.get(
  '/conversations/export',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const format = String(req.query.format || 'json').toLowerCase();
      const rows = await prisma.chatConversation.findMany({
        orderBy: { startedAt: 'desc' },
        take: 200,
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
          toolCalls: { orderBy: { stepIndex: 'asc' } },
        },
      });

      const sanitized = rows.map((r) => ({
        id: r.id,
        userId: r.userId ? `${r.userId.slice(0, 6)}***` : 'guest',
        userName: maskSensitiveText(r.userName || 'Khách'),
        startedAt: r.startedAt.toISOString(),
        model: r.model,
        totalTokenIn: r.totalTokenIn,
        totalTokenOut: r.totalTokenOut,
        totalTokens: r.totalTokens,
        costUsd: Number(r.cost.toFixed(6)),
        latencyMs: r.latencyMs,
        hasError: r.hasError,
        hasToolCall: r.hasToolCall,
        flagged: r.flagged,
        flagReason: r.flagReason,
        messages: r.messages.map((m) => ({
          role: m.role,
          content: maskSensitiveText(m.content),
          feedback: m.feedback,
          createdAt: m.createdAt.toISOString(),
        })),
        toolCalls: r.toolCalls.map((t) => ({
          stepIndex: t.stepIndex,
          toolName: t.toolName,
          args: maskSensitiveObject(t.args),
          status: t.status,
          durationMs: t.durationMs,
        })),
      }));

      // Ghi Audit Log cho mọi lần xuất dữ liệu hội thoại
      await prisma.auditLog.create({
        data: {
          userId: req.user?.userId,
          userEmail: req.user?.email,
          userName: 'Admin',
          action: 'EXPORT_CHAT_CONVERSATIONS',
          targetType: 'SYSTEM',
          targetTitle: `Xuất ${sanitized.length} hội thoại (${format.toUpperCase()})`,
          ipAddress: req.ip,
        },
      });

      if (format === 'csv') {
        const header =
          'id,user,startedAt,model,totalTokens,costUsd,latencyMs,hasToolCall,hasError,flagged,firstMessage\n';
        const csvLines = sanitized.map((item) => {
          const firstMsg = (item.messages[0]?.content || '').replace(/"/g, '""');
          return `"${item.id}","${item.userName}","${item.startedAt}","${item.model}",${item.totalTokens},${item.costUsd},${item.latencyMs},${item.hasToolCall},${item.hasError},${item.flagged},"${firstMsg}"`;
        });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="mq-chatbot-conversations-${Date.now()}.csv"`
        );
        res.send('\uFEFF' + header + csvLines.join('\n'));
        return;
      }

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({ exportedAt: new Date().toISOString(), count: sanitized.length, items: sanitized });
    } catch (err) {
      next(err);
    }
  }
);

/** 5. GET /api/admin/chatbot/conversations/:id — Xem chi tiết dòng thời gian hội thoại + ghi AuditLog */
router.get(
  '/conversations/:id',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const detail = await prisma.chatConversation.findUnique({
        where: { id },
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
          toolCalls: { orderBy: { stepIndex: 'asc' } },
          promptVersion: { select: { id: true, version: true, note: true } },
        },
      });

      if (!detail) {
        res.status(404).json({ message: 'Không tìm thấy hội thoại.' });
        return;
      }

      // Mọi lần xem chi tiết hội thoại đều được ghi vào AuditLog
      await prisma.auditLog.create({
        data: {
          userId: req.user?.userId,
          userEmail: req.user?.email,
          userName: 'Admin',
          action: 'VIEW_CHAT_CONVERSATION',
          targetType: 'SYSTEM',
          targetId: detail.id,
          targetTitle: `Xem nhật ký hội thoại #${detail.id.slice(0, 8)}`,
          ipAddress: req.ip,
        },
      });

      res.json({
        conversation: {
          ...detail,
          messages: detail.messages.map((m) => ({
            ...m,
            content: maskSensitiveText(m.content),
          })),
          toolCalls: detail.toolCalls.map((tc) => ({
            ...tc,
            args: maskSensitiveObject(tc.args),
            resultSummary: maskSensitiveObject(tc.resultSummary),
          })),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/** 6. POST /api/admin/chatbot/conversations/cleanup — Dọn hội thoại quá hạn lưu trữ */
router.post(
  '/conversations/cleanup',
  async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await cleanupOldChatbotLogs();
      res.json({
        message: `Đã dọn ${result.deletedCount} hội thoại cũ hơn ${result.retentionDays} ngày.`,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
