import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';

export const ALLOWED_CHAT_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
] as const;

export type AllowedChatModel = (typeof ALLOWED_CHAT_MODELS)[number];

export const ALL_TOOL_NAMES = [
  'search_songs',
  'get_current_track',
  'get_favorites',
  'get_listening_history',
  'get_playlists',
  'get_playlist_tracks',
  'get_recommendations',
  'get_artist_info',
  'explain_copyright',
  'play_song',
  'control_player',
  'add_to_queue',
  'open_lyrics',
  'navigate',
  'create_playlist',
  'add_to_playlist',
  'remove_from_playlist',
  'delete_playlist',
  'get_stats',
  'get_source_errors',
] as const;

export const ToolPolicySchema = z.object({
  enabled: z.boolean(),
  allowedRoles: z.array(z.enum(['GUEST', 'USER', 'ADMIN'])).min(1),
});

export const RoleRateLimitSchema = z.object({
  perMinute: z.number().int().min(1).max(500),
  perDay: z.number().int().min(1).max(10000),
  maxMessageLength: z.number().int().min(50).max(4000),
});

export const ModelPricingSchema = z.object({
  inputPer1MUsd: z.number().min(0).max(100),
  outputPer1MUsd: z.number().min(0).max(200),
});

export const ChatbotRuntimeSettingsSchema = z.object({
  /** Kill switch bật/tắt toàn bộ chatbot */
  enabled: z.boolean(),
  maintenanceMessage: z.string().min(5).max(500),

  /** Cấu hình mô hình & vòng lặp Agent */
  primaryModel: z.enum(ALLOWED_CHAT_MODELS),
  secondaryModel: z.enum(ALLOWED_CHAT_MODELS),
  maxTokens: z.number().int().min(100).max(2048),
  temperature: z.number().min(0).max(1),
  maxAgentIterations: z.number().int().min(1).max(8),
  maxToolCallsPerTurn: z.number().int().min(1).max(10),
  toolTimeoutMs: z.number().int().min(1000).max(20000),
  requestTimeoutMs: z.number().int().min(5000).max(120000),

  /** Thời gian lưu nhật ký hội thoại (ngày) trước khi tự động dọn */
  retentionDays: z.number().int().min(1).max(365),

  /** Rate limit theo từng vai trò */
  rateLimits: z.object({
    GUEST: RoleRateLimitSchema,
    USER: RoleRateLimitSchema,
    ADMIN: RoleRateLimitSchema,
  }),

  /** Bật/tắt và phân quyền từng công cụ */
  tools: z.record(z.string(), ToolPolicySchema),

  /** Bảng giá ước tính USD / 1 triệu token */
  pricing: z.record(z.string(), ModelPricingSchema),
});

export type ChatbotRuntimeSettings = z.infer<typeof ChatbotRuntimeSettingsSchema>;

export const DEFAULT_CHATBOT_SETTINGS: ChatbotRuntimeSettings = {
  enabled: true,
  maintenanceMessage:
    'Trợ lý âm nhạc mq đang tạm bảo trì để nâng cấp. Bạn vui lòng quay lại sau ít phút nhé!',
  primaryModel: 'gemini-2.0-flash',
  secondaryModel: 'gemini-2.0-flash-lite',
  maxTokens: 800,
  temperature: 0.35,
  maxAgentIterations: 5,
  maxToolCallsPerTurn: 6,
  toolTimeoutMs: 8000,
  requestTimeoutMs: 60000,
  retentionDays: 30,
  rateLimits: {
    GUEST: { perMinute: 12, perDay: 80, maxMessageLength: 600 },
    USER: { perMinute: 20, perDay: 200, maxMessageLength: 1000 },
    ADMIN: { perMinute: 60, perDay: 1000, maxMessageLength: 2000 },
  },
  tools: {
    search_songs: { enabled: true, allowedRoles: ['GUEST', 'USER', 'ADMIN'] },
    get_current_track: { enabled: true, allowedRoles: ['GUEST', 'USER', 'ADMIN'] },
    get_favorites: { enabled: true, allowedRoles: ['USER', 'ADMIN'] },
    get_listening_history: { enabled: true, allowedRoles: ['USER', 'ADMIN'] },
    get_playlists: { enabled: true, allowedRoles: ['USER', 'ADMIN'] },
    get_playlist_tracks: { enabled: true, allowedRoles: ['USER', 'ADMIN'] },
    get_recommendations: { enabled: true, allowedRoles: ['GUEST', 'USER', 'ADMIN'] },
    get_artist_info: { enabled: true, allowedRoles: ['GUEST', 'USER', 'ADMIN'] },
    explain_copyright: { enabled: true, allowedRoles: ['GUEST', 'USER', 'ADMIN'] },
    play_song: { enabled: true, allowedRoles: ['GUEST', 'USER', 'ADMIN'] },
    control_player: { enabled: true, allowedRoles: ['GUEST', 'USER', 'ADMIN'] },
    add_to_queue: { enabled: true, allowedRoles: ['GUEST', 'USER', 'ADMIN'] },
    open_lyrics: { enabled: true, allowedRoles: ['GUEST', 'USER', 'ADMIN'] },
    navigate: { enabled: true, allowedRoles: ['GUEST', 'USER', 'ADMIN'] },
    create_playlist: { enabled: true, allowedRoles: ['USER', 'ADMIN'] },
    add_to_playlist: { enabled: true, allowedRoles: ['USER', 'ADMIN'] },
    remove_from_playlist: { enabled: true, allowedRoles: ['USER', 'ADMIN'] },
    delete_playlist: { enabled: true, allowedRoles: ['USER', 'ADMIN'] },
    get_stats: { enabled: true, allowedRoles: ['ADMIN'] },
    get_source_errors: { enabled: true, allowedRoles: ['ADMIN'] },
  },
  pricing: {
    'gemini-2.0-flash': { inputPer1MUsd: 0.1, outputPer1MUsd: 0.4 },
    'gemini-2.0-flash-lite': { inputPer1MUsd: 0.075, outputPer1MUsd: 0.3 },
    'gemini-1.5-pro': { inputPer1MUsd: 1.25, outputPer1MUsd: 5.0 },
    'gemini-1.5-flash': { inputPer1MUsd: 0.075, outputPer1MUsd: 0.3 },
  },
};

const SETTINGS_DB_KEY = 'runtime_config';
const CACHE_TTL_MS = 45 * 1000; // 45s cache TTL

let cachedSettings: ChatbotRuntimeSettings | null = null;
let cacheExpiresAt = 0;

/** Đọc cấu hình động từ DB kèm bộ nhớ đệm (TTL 45s) và fallback mặc định nếu DB lỗi */
export async function getChatbotRuntimeSettings(
  forceRefresh = false
): Promise<ChatbotRuntimeSettings> {
  const now = Date.now();
  if (!forceRefresh && cachedSettings && now < cacheExpiresAt) {
    return cachedSettings;
  }

  try {
    const row = await prisma.chatbotSetting.findUnique({
      where: { key: SETTINGS_DB_KEY },
    });

    if (!row || !row.value) {
      cachedSettings = DEFAULT_CHATBOT_SETTINGS;
      cacheExpiresAt = now + CACHE_TTL_MS;
      return DEFAULT_CHATBOT_SETTINGS;
    }

    const merged = {
      ...DEFAULT_CHATBOT_SETTINGS,
      ...(row.value as Record<string, any>),
      rateLimits: {
        ...DEFAULT_CHATBOT_SETTINGS.rateLimits,
        ...((row.value as any)?.rateLimits || {}),
      },
      tools: {
        ...DEFAULT_CHATBOT_SETTINGS.tools,
        ...((row.value as any)?.tools || {}),
      },
      pricing: {
        ...DEFAULT_CHATBOT_SETTINGS.pricing,
        ...((row.value as any)?.pricing || {}),
      },
    };

    const parsed = ChatbotRuntimeSettingsSchema.safeParse(merged);
    cachedSettings = parsed.success ? parsed.data : DEFAULT_CHATBOT_SETTINGS;
    cacheExpiresAt = now + CACHE_TTL_MS;
    return cachedSettings;
  } catch {
    // Fallback an toàn về cấu hình mặc định trong code nếu DB tạm lỗi
    return cachedSettings || DEFAULT_CHATBOT_SETTINGS;
  }
}

/** Cập nhật cấu hình động từ trang Admin, làm mới cache ngay lập tức và ghi AuditLog */
export async function updateChatbotRuntimeSettings(
  partialUpdate: Partial<ChatbotRuntimeSettings>,
  actor: { userId?: string; userEmail?: string; userName?: string; ip?: string }
): Promise<ChatbotRuntimeSettings> {
  const previous = await getChatbotRuntimeSettings(true);

  const nextCandidate: ChatbotRuntimeSettings = {
    ...previous,
    ...partialUpdate,
    rateLimits: {
      ...previous.rateLimits,
      ...(partialUpdate.rateLimits || {}),
    },
    tools: {
      ...previous.tools,
      ...(partialUpdate.tools || {}),
    },
    pricing: {
      ...previous.pricing,
      ...(partialUpdate.pricing || {}),
    },
  };

  const validated = ChatbotRuntimeSettingsSchema.parse(nextCandidate);

  await prisma.chatbotSetting.upsert({
    where: { key: SETTINGS_DB_KEY },
    update: {
      value: validated as any,
      updatedBy: actor.userEmail || actor.userId || 'admin',
    },
    create: {
      key: SETTINGS_DB_KEY,
      value: validated as any,
      updatedBy: actor.userEmail || actor.userId || 'admin',
    },
  });

  // Làm mới cache ngay lập tức
  cachedSettings = validated;
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;

  // Ghi Audit Log bất biến (giá trị trước / sau)
  try {
    await prisma.auditLog.create({
      data: {
        userId: actor.userId,
        userEmail: actor.userEmail,
        userName: actor.userName || 'Admin',
        action: 'UPDATE_CHATBOT_SETTINGS',
        targetType: 'SYSTEM',
        targetId: SETTINGS_DB_KEY,
        targetTitle: 'Cấu hình Trợ lý âm nhạc mq',
        details: JSON.stringify({
          before: {
            enabled: previous.enabled,
            primaryModel: previous.primaryModel,
            secondaryModel: previous.secondaryModel,
            maxTokens: previous.maxTokens,
            temperature: previous.temperature,
          },
          after: {
            enabled: validated.enabled,
            primaryModel: validated.primaryModel,
            secondaryModel: validated.secondaryModel,
            maxTokens: validated.maxTokens,
            temperature: validated.temperature,
          },
        }),
        ipAddress: actor.ip,
      },
    });
  } catch {
    // ignore audit error
  }

  return validated;
}

export function invalidateChatbotSettingsCache(): void {
  cachedSettings = null;
  cacheExpiresAt = 0;
}

/** Chỉ trả trạng thái đã cấu hình hay chưa, tuyệt đối không trả API key ra ngoài */
export function getApiKeyConfigurationStatus(): {
  configured: boolean;
  provider: 'gemini';
  allowedModels: readonly string[];
} {
  const key = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || '';
  return {
    configured: Boolean(key && key.trim().length > 8),
    provider: 'gemini',
    allowedModels: ALLOWED_CHAT_MODELS,
  };
}
