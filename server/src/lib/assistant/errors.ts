import crypto from 'crypto';
import { logger } from '../../config/logger.js';

export type AssistantErrorCode =
  | 'RATE_LIMITED'
  | 'MODEL_TIMEOUT'
  | 'MODEL_OVERLOADED'
  | 'QUOTA_EXCEEDED'
  | 'PROVIDER_ERROR'
  | 'TOOL_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INVALID_INPUT'
  | 'CONFIRMATION_EXPIRED'
  | 'INTERNAL_ERROR';

export class AssistantError extends Error {
  public readonly code: AssistantErrorCode;
  public readonly statusCode: number;
  public readonly retryAfterSec?: number;

  constructor(
    code: AssistantErrorCode,
    message: string,
    statusCode = 400,
    retryAfterSec?: number
  ) {
    super(message);
    this.name = 'AssistantError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryAfterSec = retryAfterSec;
  }
}

/** Phân loại lỗi sang mã chuẩn và thông điệp tiếng Việt thân thiện (không lộ stack trace nội bộ) */
export function classifyAssistantError(err: any): {
  code: AssistantErrorCode;
  message: string;
  statusCode: number;
  retryAfterSec?: number;
} {
  if (err instanceof AssistantError) {
    return {
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
      retryAfterSec: err.retryAfterSec,
    };
  }

  const status = err?.response?.status || err?.status;
  const rawMsg = String(err?.message || '').toLowerCase();

  if (status === 429 || rawMsg.includes('quota') || rawMsg.includes('rate limit')) {
    return {
      code: 'QUOTA_EXCEEDED',
      message: 'Hệ thống AI đang đạt giới hạn lượt gọi tạm thời. Bạn vui lòng đợi ít giây rồi thử lại nhé.',
      statusCode: 429,
      retryAfterSec: 15,
    };
  }

  if (
    err?.code === 'ECONNABORTED' ||
    rawMsg.includes('timeout') ||
    rawMsg.includes('timed out')
  ) {
    return {
      code: 'MODEL_TIMEOUT',
      message: 'Thời gian phản hồi quá lâu. Bạn vui lòng bấm Thử lại nhé.',
      statusCode: 504,
    };
  }

  if (status === 503 || status === 502 || rawMsg.includes('overloaded')) {
    return {
      code: 'MODEL_OVERLOADED',
      message: 'Mô hình AI đang quá tải tạm thời. Bạn vui lòng thử lại sau giây lát.',
      statusCode: 503,
    };
  }

  return {
    code: 'INTERNAL_ERROR',
    message: 'Trợ lý âm nhạc gặp sự cố tạm thời. Bạn vui lòng thử lại nhé.',
    statusCode: 500,
  };
}

/** Băm ẩn danh userId để ghi log an toàn, tuyệt đối không log nội dung tin nhắn nhạy cảm */
export function hashIdentifier(id: string | undefined | null): string {
  if (!id) return 'guest';
  return crypto.createHash('sha256').update(String(id)).digest('hex').slice(0, 12);
}

export interface AssistantLogMeta {
  userId?: string;
  durationMs: number;
  toolsUsed: string[];
  estimatedTokens?: number;
  model?: string;
  errorCode?: string;
}

export function logAssistantMetadata(meta: AssistantLogMeta): void {
  logger.info(
    {
      assistantEvent: 'chat_turn',
      userHash: hashIdentifier(meta.userId),
      durationMs: meta.durationMs,
      toolsUsed: meta.toolsUsed,
      estimatedTokens: meta.estimatedTokens ?? 0,
      model: meta.model,
      errorCode: meta.errorCode ?? null,
    },
    'Assistant turn completed'
  );
}
