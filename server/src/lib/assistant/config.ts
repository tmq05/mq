import { env } from '../../config/env.js';

/**
 * Mọi thông số cấu hình cho Backend "Trợ lý mq" (Model, Token, Rate Limit, Timeout, Số vòng lặp)
 */
export const ASSISTANT_CONFIG = {
  /** Model chính cho suy luận phức tạp / gợi ý / hỏi đáp (lấy từ biến môi trường CHAT_MODEL) */
  get chatModel(): string {
    return process.env.CHAT_MODEL || env.CHAT_MODEL || env.GEMINI_MODEL || 'gemini-2.0-flash';
  },

  /** Model nhỏ/nhanh cho lệnh điều khiển player và tìm kiếm trực tiếp */
  get fastModel(): string {
    return process.env.CHAT_FAST_MODEL || env.CHAT_FAST_MODEL || 'gemini-2.0-flash-lite';
  },

  /** Khóa API Gemini (chỉ đọc ở server) */
  get apiKey(): string {
    return process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || '';
  },

  /** Thông số sinh văn bản */
  maxTokens: 800,
  temperature: 0.35,

  /** Giới hạn vòng lặp Agent & Tool Call mỗi lượt */
  maxAgentIterations: 5,
  maxToolCallsPerTurn: 6,

  /** Thời gian chờ tối đa (ms) */
  toolTimeoutMs: 8000,
  requestTimeoutMs: 60000,

  /** Thời gian hiệu lực của mã xác nhận hành động (5 phút) */
  confirmActionTtlMs: 5 * 60 * 1000,

  /** Giới hạn ngữ cảnh & đầu vào */
  maxContextMessages: 12,
  maxMessageLength: 1000,
  maxMessagesPayloadCount: 40,
  maxBodyBytes: 64 * 1024,
  maxToolResultsLimit: 8,

  /** Rate limit theo userId và IP */
  rateLimit: {
    perMinute: 20,
    minuteWindowMs: 60 * 1000,
    perDay: 200,
    dayWindowMs: 24 * 60 * 60 * 1000,
  },

  /** Cấu hình Retry có backoff cho lỗi tạm thời (5xx / network timeout) */
  retry: {
    maxRetries: 2,
    baseDelayMs: 300,
  },
} as const;
