import { AssistantAuthContext } from './auth.js';
import { ASSISTANT_CONFIG } from './config.js';
import { AssistantError } from './errors.js';
import { ChatbotRuntimeSettings, DEFAULT_CHATBOT_SETTINGS } from './settings.js';
import { AssistantToolDefinition, ToolExecutionEnv } from './tools/types.js';
import { searchSongsTool } from './tools/searchSongs.js';
import {
  getCurrentTrackTool,
  getFavoritesTool,
  getListeningHistoryTool,
  getPlaylistsTool,
  getPlaylistTracksTool,
} from './tools/readUserTools.js';
import {
  explainCopyrightTool,
  getArtistInfoTool,
  getRecommendationsTool,
} from './tools/discoveryTools.js';
import {
  addToQueueTool,
  controlPlayerTool,
  navigateTool,
  openLyricsTool,
  playSongTool,
} from './tools/uiActionTools.js';
import {
  addToPlaylistTool,
  createPlaylistTool,
  deletePlaylistTool,
  removeFromPlaylistTool,
} from './tools/playlistMutationTools.js';
import { getSourceErrorsAdminTool, getStatsAdminTool } from './tools/adminTools.js';

const PUBLIC_TOOLS: AssistantToolDefinition<any>[] = [
  searchSongsTool,
  getCurrentTrackTool,
  getFavoritesTool,
  getListeningHistoryTool,
  getPlaylistsTool,
  getPlaylistTracksTool,
  getRecommendationsTool,
  getArtistInfoTool,
  explainCopyrightTool,
  playSongTool,
  controlPlayerTool,
  addToQueueTool,
  openLyricsTool,
  navigateTool,
];

const USER_MUTATION_TOOLS: AssistantToolDefinition<any>[] = [
  createPlaylistTool,
  addToPlaylistTool,
  removeFromPlaylistTool,
  deletePlaylistTool,
];

const ADMIN_TOOLS: AssistantToolDefinition<any>[] = [
  getStatsAdminTool,
  getSourceErrorsAdminTool,
];

const ALL_TOOLS_LIST: AssistantToolDefinition<any>[] = [
  ...PUBLIC_TOOLS,
  ...USER_MUTATION_TOOLS,
  ...ADMIN_TOOLS,
];

/**
 * Đăng ký danh sách công cụ theo quyền người dùng VÀ cấu hình động trong DB:
 * - Nếu tool bị tắt (enabled === false) trong cấu hình động -> KHÔNG đăng ký cho model.
 * - Kiểm tra vai trò hiện tại (GUEST / USER / ADMIN) so với allowedRoles.
 */
export function getRegisteredToolsForUser(
  auth: AssistantAuthContext,
  runtimeSettings: ChatbotRuntimeSettings = DEFAULT_CHATBOT_SETTINGS
): Map<string, AssistantToolDefinition<any>> {
  const map = new Map<string, AssistantToolDefinition<any>>();
  const effectiveRole: 'GUEST' | 'USER' | 'ADMIN' =
    !auth.userId || auth.role === 'GUEST'
      ? 'GUEST'
      : auth.role === 'ADMIN'
        ? 'ADMIN'
        : 'USER';

  for (const tool of ALL_TOOLS_LIST) {
    // Ràng buộc cứng bảo mật: khách không bao giờ nhận tool mutation hoặc admin
    if (effectiveRole === 'GUEST' && (tool.category === 'mutation' || tool.category === 'admin')) {
      continue;
    }
    // Ràng buộc cứng bảo mật: chỉ ADMIN mới nhận tool admin
    if (tool.category === 'admin' && effectiveRole !== 'ADMIN') {
      continue;
    }

    const policy = runtimeSettings.tools?.[tool.name];
    if (policy) {
      if (!policy.enabled) continue;
      if (!policy.allowedRoles.includes(effectiveRole)) continue;
    }

    map.set(tool.name, tool);
  }

  return map;
}

/** Chuyển danh sách tool đã đăng ký sang định dạng Function Declarations của Gemini */
export function buildGeminiToolsDeclaration(
  toolsMap: Map<string, AssistantToolDefinition<any>>
) {
  return Array.from(toolsMap.values()).map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.jsonSchema,
  }));
}

/**
 * Thực thi 1 công cụ với:
 * 1. Kiểm tra quyền truy cập trong registry của người dùng hiện tại.
 * 2. Validate đầu vào bằng Zod.
 * 3. Giới hạn thời gian chạy tối đa 8 giây (toolTimeoutMs).
 * 4. Bắt lỗi an toàn để trả về kết quả lỗi cho model mà không làm sập luồng chat.
 */
export async function executeRegisteredTool(
  toolName: string,
  rawArgs: unknown,
  env: ToolExecutionEnv,
  toolsMap?: Map<string, AssistantToolDefinition<any>>
): Promise<{ ok: boolean; data: Record<string, any> }> {
  const registry = toolsMap ?? getRegisteredToolsForUser(env.auth);
  const tool = registry.get(toolName);

  if (!tool) {
    // Kiểm tra xem có phải tool Admin hoặc tool Mutation bị gọi trái phép không
    const isAdminTool = ADMIN_TOOLS.some((t) => t.name === toolName);
    if (isAdminTool) {
      return {
        ok: false,
        data: {
          errorCode: 'FORBIDDEN',
          message: 'Công cụ quản trị chỉ dành cho Admin.',
        },
      };
    }

    const isMutationTool = USER_MUTATION_TOOLS.some((t) => t.name === toolName);
    if (isMutationTool && (!env.auth.userId || env.auth.role === 'GUEST')) {
      return {
        ok: false,
        data: {
          errorCode: 'UNAUTHORIZED',
          message: 'Vui lòng đăng nhập để tạo, chỉnh sửa hoặc xóa playlist.',
        },
      };
    }

    return {
      ok: false,
      data: {
        errorCode: 'TOOL_ERROR',
        message: `Công cụ "${toolName}" không tồn tại hoặc không được phép sử dụng.`,
      },
    };
  }

  const parsed = tool.schema.safeParse(rawArgs ?? {});
  if (!parsed.success) {
    return {
      ok: false,
      data: {
        errorCode: 'INVALID_INPUT',
        message: 'Tham số gọi công cụ không hợp lệ.',
        issues: parsed.error.issues.map((i: any) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
    };
  }

  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(
          new AssistantError(
            'TOOL_ERROR',
            `Công cụ ${toolName} phản hồi quá ${ASSISTANT_CONFIG.toolTimeoutMs}ms.`,
            504
          )
        );
      }, ASSISTANT_CONFIG.toolTimeoutMs);
    });

    const result = await Promise.race([
      tool.execute(parsed.data, env),
      timeoutPromise,
    ]);

    return { ok: true, data: result };
  } catch (err: any) {
    return {
      ok: false,
      data: {
        errorCode: err instanceof AssistantError ? err.code : 'TOOL_ERROR',
        message:
          err?.message ||
          `Không thể thực thi công cụ ${toolName} lúc này. Hãy xin lỗi người dùng và đề xuất cách khác.`,
      },
    };
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}
