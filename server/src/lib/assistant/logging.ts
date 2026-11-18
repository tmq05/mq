import { prisma } from '../../config/prisma.js';
import { hashIdentifier } from './errors.js';
import { getChatbotRuntimeSettings } from './settings.js';

/** Che thông tin nhạy cảm (email, số điện thoại, JWT/API token) trước khi lưu DB hoặc xuất CSV/JSON */
export function maskSensitiveText(raw: string): string {
  if (!raw) return '';
  return (
    raw
      // Che JWT / Bearer token / API key
      .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED_TOKEN]')
      .replace(/AIza[0-9A-Za-z\-_]{25,}/g, '[REDACTED_API_KEY]')
      .replace(/eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*/g, '[REDACTED_JWT]')
      // Che Email: giữ ký tự đầu và domain
      .replace(
        /\b([a-zA-Z0-9._%+-])[a-zA-Z0-9._%+-]*@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
        '$1***@$2'
      )
      // Che số điện thoại Việt Nam (10 số: 0912345678 -> 091*****78)
      .replace(/\b(\+?84|0)([35789]\d)(\d{5})(\d{2})\b/g, '$1$2*****$4')
  );
}

export function maskSensitiveObject(value: unknown): any {
  if (typeof value === 'string') return maskSensitiveText(value);
  if (Array.isArray(value)) return value.map((item) => maskSensitiveObject(item));
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, any>)) {
      if (/(password|token|secret|apikey|authorization)/i.test(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = maskSensitiveObject(v);
      }
    }
    return out;
  }
  return value;
}

/** Ước tính số token từ độ dài văn bản (~4 ký tự / token) */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 3.8));
}

export interface RecordedToolCallStep {
  stepIndex: number;
  toolName: string;
  args: Record<string, any>;
  resultSummary: Record<string, any>;
  status: 'success' | 'error' | 'needs_confirmation';
  durationMs: number;
}

export interface RecordChatTurnInput {
  conversationId?: string;
  userId?: string;
  userName?: string;
  ip: string;
  model: string;
  promptVersionId?: string;
  userMessage: string;
  assistantMessage: string;
  toolCalls: RecordedToolCallStep[];
  latencyMs: number;
  hasError?: boolean;
  flagged?: boolean;
  flagReason?: string;
}

/**
 * Ghi nhật ký lượt hội thoại, tin nhắn, từng bước tool call và cộng dồn usage_daily.
 * Chạy bất đồng bộ (không chặn luồng phản hồi SSE), tự bắt mọi lỗi để không ảnh hưởng người dùng.
 */
export async function recordChatTurnToDatabase(input: RecordChatTurnInput): Promise<string | null> {
  try {
    const settings = await getChatbotRuntimeSettings();
    const maskedUserMsg = maskSensitiveText(input.userMessage);
    const maskedAssistantMsg = maskSensitiveText(input.assistantMessage);

    const tokenIn = estimateTokens(maskedUserMsg) + 120; // kèm ngữ cảnh system
    const tokenOut =
      estimateTokens(maskedAssistantMsg) +
      input.toolCalls.reduce(
        (acc, tc) => acc + estimateTokens(JSON.stringify(tc.resultSummary)),
        0
      );
    const totalTokens = tokenIn + tokenOut;

    const modelPricing = settings.pricing[input.model] || {
      inputPer1MUsd: 0.1,
      outputPer1MUsd: 0.4,
    };
    const cost =
      (tokenIn / 1_000_000) * modelPricing.inputPer1MUsd +
      (tokenOut / 1_000_000) * modelPricing.outputPer1MUsd;

    const suspiciousInjection =
      /(bỏ qua mọi chỉ dẫn|ignore all previous|in system prompt|print system prompt|show api key|<script)/i.test(
        input.userMessage
      );
    const flagged = Boolean(input.flagged || suspiciousInjection);
    const flagReason =
      input.flagReason ||
      (suspiciousInjection ? 'Nghi vấn Prompt Injection / dò System Prompt' : undefined);

    const hasToolError = input.toolCalls.some((t) => t.status === 'error');
    const hasError = Boolean(input.hasError || hasToolError);

    let convId = input.conversationId;
    if (convId) {
      const existing = await prisma.chatConversation.findUnique({
        where: { id: convId },
      });
      if (!existing) convId = undefined;
    }

    if (!convId) {
      const createdConv = await prisma.chatConversation.create({
        data: {
          userId: input.userId || null,
          userName: input.userName || (input.userId ? 'Thành viên' : 'Khách ẩn danh'),
          ipHash: hashIdentifier(input.ip),
          model: input.model,
          promptVersionId: input.promptVersionId || null,
          totalTokenIn: tokenIn,
          totalTokenOut: tokenOut,
          totalTokens,
          cost,
          latencyMs: input.latencyMs,
          hasError,
          hasToolCall: input.toolCalls.length > 0,
          flagged,
          flagReason,
        },
      });
      convId = createdConv.id;
    } else {
      await prisma.chatConversation.update({
        where: { id: convId },
        data: {
          totalTokenIn: { increment: tokenIn },
          totalTokenOut: { increment: tokenOut },
          totalTokens: { increment: totalTokens },
          cost: { increment: cost },
          latencyMs: input.latencyMs,
          ...(hasError ? { hasError: true } : {}),
          ...(input.toolCalls.length > 0 ? { hasToolCall: true } : {}),
          ...(flagged ? { flagged: true, flagReason } : {}),
        },
      });
    }

    // Lưu tin nhắn người dùng
    await prisma.chatMessageLog.create({
      data: {
        conversationId: convId,
        role: 'user',
        content: maskedUserMsg,
        tokenIn,
        tokenOut: 0,
        latencyMs: 0,
      },
    });

    // Lưu tin nhắn phản hồi của Trợ lý
    const assistantMsgRow = await prisma.chatMessageLog.create({
      data: {
        conversationId: convId,
        role: 'assistant',
        content: maskedAssistantMsg || '(Thực thi công cụ)',
        tokenIn: 0,
        tokenOut,
        latencyMs: input.latencyMs,
      },
    });

    // Lưu từng bước gọi công cụ (tool_calls)
    for (const tc of input.toolCalls) {
      await prisma.chatToolCallLog.create({
        data: {
          conversationId: convId,
          messageId: assistantMsgRow.id,
          stepIndex: tc.stepIndex,
          toolName: tc.toolName,
          args: maskSensitiveObject(tc.args),
          resultSummary: maskSensitiveObject(tc.resultSummary),
          status: tc.status,
          durationMs: tc.durationMs,
        },
      });
    }

    // Cộng dồn bảng tổng hợp theo ngày (usage_daily) để dashboard truy vấn cực nhanh
    const today = new Date().toISOString().slice(0, 10);
    await prisma.chatbotUsageDaily.upsert({
      where: {
        date_model: {
          date: today,
          model: input.model,
        },
      },
      update: {
        tokenIn: { increment: tokenIn },
        tokenOut: { increment: tokenOut },
        cost: { increment: cost },
        requests: { increment: 1 },
        errors: { increment: hasError ? 1 : 0 },
        totalLatencyMs: { increment: input.latencyMs },
      },
      create: {
        date: today,
        model: input.model,
        tokenIn,
        tokenOut,
        cost,
        requests: 1,
        errors: hasError ? 1 : 0,
        totalLatencyMs: input.latencyMs,
      },
    });

    return convId;
  } catch {
    // Nếu ghi log lỗi thì chatbot vẫn hoạt động bình thường
    return null;
  }
}

/** Tự động dọn dẹp hội thoại cũ hơn số ngày lưu trữ cấu hình (retentionDays) */
export async function cleanupOldChatbotLogs(): Promise<{ deletedCount: number; retentionDays: number }> {
  const settings = await getChatbotRuntimeSettings();
  const cutoff = new Date(Date.now() - settings.retentionDays * 24 * 60 * 60 * 1000);
  const res = await prisma.chatConversation.deleteMany({
    where: {
      startedAt: { lt: cutoff },
    },
  });
  return {
    deletedCount: res.count,
    retentionDays: settings.retentionDays,
  };
}
