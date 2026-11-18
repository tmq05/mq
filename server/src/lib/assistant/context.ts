import { z } from 'zod';
import { ASSISTANT_CONFIG } from './config.js';

/** Schema validate tin nhắn và ngữ cảnh đầu vào của POST /api/chat */
export const ChatMessageInputSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z
    .string()
    .min(1, 'Tin nhắn không được rỗng')
    .max(
      ASSISTANT_CONFIG.maxMessageLength,
      `Tin nhắn không được vượt quá ${ASSISTANT_CONFIG.maxMessageLength} ký tự`
    ),
});

export const CompactQueueItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  artists: z.array(z.string()).optional(),
  source: z.string().optional(),
});

export const ChatContextSchema = z
  .object({
    currentTrack: z
      .object({
        id: z.string(),
        title: z.string(),
        artists: z.array(z.string()).default([]),
        album: z.string().optional().nullable(),
        coverUrl: z.string().optional().nullable(),
        source: z.string().default('local'),
        sourceId: z.string().optional(),
        durationMs: z.number().optional().default(0),
        isFullLength: z.boolean().optional().default(true),
      })
      .optional()
      .nullable(),
    isPlaying: z.boolean().optional().default(false),
    repeatMode: z.enum(['off', 'all', 'one']).optional().default('off'),
    isShuffle: z.boolean().optional().default(false),
    volume: z.number().min(0).max(100).optional().default(80),
    currentPath: z.string().max(200).optional().default('/'),
    queue: z.array(CompactQueueItemSchema).max(20).optional().default([]),
  })
  .default({});

export const ChatRequestBodySchema = z.object({
  messages: z
    .array(ChatMessageInputSchema)
    .min(1, 'Cần ít nhất 1 tin nhắn')
    .max(ASSISTANT_CONFIG.maxMessagesPayloadCount, 'Số lượng tin nhắn vượt quá giới hạn'),
  context: ChatContextSchema.optional(),
});

export type ValidatedChatContext = z.infer<typeof ChatContextSchema>;
export type ValidatedChatMessage = z.infer<typeof ChatMessageInputSchema>;

/** Bọc dữ liệu bên ngoài trong thẻ <data>...</data> và loại bỏ thẻ giả mạo để chống Prompt Injection */
export function wrapExternalData(value: unknown): string {
  if (value === null || value === undefined) return '';
  const cleaned = String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<\/?data>/gi, '')
    .replace(/<\/?system>/gi, '')
    .trim();
  return `<data>${cleaned}</data>`;
}

/** Lọc chuỗi văn bản người dùng gửi lên */
export function sanitizeChatText(input: string): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, ASSISTANT_CONFIG.maxMessageLength);
}

/** Cắt lịch sử hội thoại chỉ giữ 10-12 tin gần nhất và tóm tắt ngắn các tin cũ hơn */
export function buildTrimmedContext(messages: ValidatedChatMessage[]): {
  recentMessages: ValidatedChatMessage[];
  olderSummary: string | null;
} {
  const maxRecent = ASSISTANT_CONFIG.maxContextMessages;
  if (messages.length <= maxRecent) {
    return {
      recentMessages: messages.map((m) => ({
        role: m.role,
        content: sanitizeChatText(m.content),
      })),
      olderSummary: null,
    };
  }

  const older = messages.slice(0, messages.length - maxRecent);
  const recent = messages.slice(-maxRecent).map((m) => ({
    role: m.role,
    content: sanitizeChatText(m.content),
  }));

  const userTopics = older
    .filter((m) => m.role === 'user')
    .slice(-5)
    .map((m) => sanitizeChatText(m.content).slice(0, 60));

  const olderSummary =
    userTopics.length > 0
      ? `Tóm tắt ${older.length} tin nhắn trước đó: người dùng đã hỏi về [${userTopics.join(' | ')}].`
      : null;

  return { recentMessages: recent, olderSummary };
}

/** Định tuyến model: lệnh điều khiển player / tìm kiếm ngắn dùng fastModel, câu hỏi phức tạp dùng chatModel */
export function selectModelForTurn(userMessage: string): string {
  const lower = userMessage.toLowerCase().trim();
  const isSimpleCommand =
    lower.length < 48 &&
    /^(tạm dừng|dừng|phát|tiếp tục|bài tiếp|qua bài|bài trước|lặp lại|ngẫu nhiên|trộn bài|âm lượng|bật lời|mở lời|mở bài|tìm bài)/i.test(
      lower
    );

  return isSimpleCommand ? ASSISTANT_CONFIG.fastModel : ASSISTANT_CONFIG.chatModel;
}
