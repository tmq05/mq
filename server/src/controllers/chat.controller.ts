import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ASSISTANT_CONFIG } from '../lib/assistant/config.js';
import { assertAuthenticated, resolveAssistantAuth } from '../lib/assistant/auth.js';
import { enforceAssistantRateLimit } from '../lib/assistant/rateLimit.js';
import { getChatbotRuntimeSettings } from '../lib/assistant/settings.js';
import {
  ChatContextSchema,
  ChatRequestBodySchema,
  sanitizeChatText,
  ValidatedChatMessage,
} from '../lib/assistant/context.js';
import { runAssistantAgentTurn } from '../lib/assistant/agentRunner.js';
import { executeConfirmedActionById } from '../lib/assistant/tools/playlistMutationTools.js';
import {
  AssistantError,
  classifyAssistantError,
} from '../lib/assistant/errors.js';
import { chatService } from '../services/chat.service.js';

const ConfirmBodySchema = z.object({
  actionId: z.string().min(1).optional(),
  actionType: z
    .enum(['create_playlist', 'add_to_playlist', 'remove_from_playlist', 'delete_playlist'])
    .optional(),
  payload: z.record(z.any()).optional(),
});

export class ChatController {
  /**
   * POST /api/chat (và alias POST /api/chat/stream)
   * Nhận { messages, context } (hoặc { message, history, context }),
   * kiểm tra rate limit & Zod schema, chạy vòng lặp Agent (tối đa 5 vòng) và trả SSE.
   */
  async handleChatSSE(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const rawBodySize = JSON.stringify(req.body || {}).length;
      if (rawBodySize > ASSISTANT_CONFIG.maxBodyBytes) {
        res.status(413).json({
          code: 'INVALID_INPUT',
          message: 'Kích thước dữ liệu gửi lên vượt quá giới hạn cho phép.',
        });
        return;
      }

      const auth = await resolveAssistantAuth(req);
      const runtimeSettings = await getChatbotRuntimeSettings();
      const roleKey =
        !auth.userId || auth.role === 'GUEST'
          ? 'GUEST'
          : auth.role === 'ADMIN'
            ? 'ADMIN'
            : 'USER';
      const roleRate = runtimeSettings.rateLimits[roleKey];
      const rateRes = enforceAssistantRateLimit({
        userId: auth.userId,
        ip: auth.ip,
        perMinute: roleRate.perMinute,
        perDay: roleRate.perDay,
      });
      res.setHeader('X-RateLimit-Remaining-Minute', String(rateRes.remainingMinute));
      res.setHeader('X-RateLimit-Remaining-Day', String(rateRes.remainingDay));

      // Chuẩn hóa { messages, context } hoặc { message, history, context }
      let normalizedMessages: ValidatedChatMessage[] = [];
      if (Array.isArray(req.body?.messages)) {
        const parsed = ChatRequestBodySchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({
            code: 'INVALID_INPUT',
            message: parsed.error.issues[0]?.message || 'Dữ liệu đầu vào không hợp lệ.',
          });
          return;
        }
        normalizedMessages = parsed.data.messages;
      } else if (typeof req.body?.message === 'string') {
        const singleMsg = req.body.message.trim();
        if (!singleMsg) {
          res.status(400).json({
            code: 'INVALID_INPUT',
            message: 'Nội dung tin nhắn không được để trống.',
          });
          return;
        }
        if (singleMsg.length > ASSISTANT_CONFIG.maxMessageLength) {
          res.status(400).json({
            code: 'INVALID_INPUT',
            message: `Tin nhắn không được vượt quá ${ASSISTANT_CONFIG.maxMessageLength} ký tự.`,
          });
          return;
        }
        const history: ValidatedChatMessage[] = Array.isArray(req.body?.history)
          ? req.body.history
              .filter((h: any) => h && typeof h.content === 'string' && h.content.trim())
              .slice(-ASSISTANT_CONFIG.maxContextMessages)
              .map((h: any) => ({
                role: h.role === 'assistant' ? ('assistant' as const) : ('user' as const),
                content: sanitizeChatText(h.content),
              }))
          : [];
        normalizedMessages = [...history, { role: 'user', content: sanitizeChatText(singleMsg) }];
      } else {
        res.status(400).json({
          code: 'INVALID_INPUT',
          message: 'Thiếu danh sách messages hoặc message.',
        });
        return;
      }

      const parsedContext = ChatContextSchema.safeParse(req.body?.context ?? {});
      const validatedContext = parsedContext.success
        ? parsedContext.data
        : ChatContextSchema.parse({});

      // Thiết lập SSE headers
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const abortController = new AbortController();
      req.on('close', () => {
        abortController.abort();
      });

      const emit = (event: string, data: Record<string, any>) => {
        if (res.writableEnded) return;
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      await runAssistantAgentTurn({
        messages: normalizedMessages,
        context: validatedContext,
        auth,
        emitter: { emit },
        signal: abortController.signal,
      });

      if (!res.writableEnded) {
        res.end();
      }
    } catch (err: any) {
      const classified = classifyAssistantError(err);
      if (classified.retryAfterSec) {
        res.setHeader('Retry-After', String(classified.retryAfterSec));
      }
      if (!res.headersSent) {
        res.status(classified.statusCode).json({
          code: classified.code,
          message: classified.message,
          ...(classified.retryAfterSec ? { retryAfterSec: classified.retryAfterSec } : {}),
        });
      } else if (!res.writableEnded) {
        res.write(
          `event: error\ndata: ${JSON.stringify({
            code: classified.code,
            message: classified.message,
            retryAfterSec: classified.retryAfterSec,
          })}\n\n`
        );
        res.end();
      }
    }
  }

  /**
   * POST /api/chat/confirm (và alias POST /api/chat/confirm-action)
   * Xác nhận và thực thi hành động thay đổi dữ liệu bằng actionId dùng 1 lần (hết hạn sau 5 phút, gắn với userId).
   */
  async handleConfirm(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const auth = await resolveAssistantAuth(req);
      const userId = assertAuthenticated(auth);
      enforceAssistantRateLimit({ userId, ip: auth.ip });

      const parsed = ConfirmBodySchema.safeParse(req.body || {});
      if (!parsed.success) {
        throw new AssistantError('INVALID_INPUT', 'Dữ liệu xác nhận không hợp lệ.', 400);
      }

      const actionId =
        parsed.data.actionId || parsed.data.payload?.actionId;

      if (actionId) {
        const result = await executeConfirmedActionById(actionId, userId);
        res.json(result);
        return;
      }

      if (parsed.data.actionType && parsed.data.payload && parsed.data.actionType !== 'delete_playlist') {
        const fallbackResult = await chatService.executeConfirmedAction(
          userId,
          parsed.data.actionType,
          parsed.data.payload
        );
        res.json({ status: 'completed', ...fallbackResult });
        return;
      }

      throw new AssistantError(
        'INVALID_INPUT',
        'Thiếu mã xác nhận hành động (actionId).',
        400
      );
    } catch (err: any) {
      const classified = classifyAssistantError(err);
      res.status(classified.statusCode).json({
        code: classified.code,
        message: classified.message,
        ...(classified.retryAfterSec ? { retryAfterSec: classified.retryAfterSec } : {}),
      });
    }
  }
}

export const chatController = new ChatController();
