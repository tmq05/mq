import { z } from 'zod';
import { adminService } from '../../../services/admin.service.js';
import { quotaService } from '../../../services/quota.service.js';
import { assertAdmin } from '../auth.js';
import { AssistantToolDefinition } from './types.js';

/** 1. get_stats (Chỉ Admin) */
export const GetStatsInputSchema = z.object({
  days: z.number().int().min(1).max(90).optional().default(7),
});

export const getStatsAdminTool: AssistantToolDefinition<typeof GetStatsInputSchema> = {
  name: 'get_stats',
  category: 'admin',
  description:
    'Lấy thống kê tổng quan hệ thống (số người dùng, tổng bài hát, nghệ sĩ, lượt nghe). Chỉ khả dụng cho Admin.',
  schema: GetStatsInputSchema,
  jsonSchema: {
    type: 'OBJECT',
    properties: {
      days: {
        type: 'NUMBER',
        description: 'Khoảng ngày thống kê (mặc định 7 ngày).',
      },
    },
  },
  execute: async (args, env) => {
    assertAdmin(env.auth);
    const stats = await adminService.getDashboardStats(args.days ?? 7);
    return {
      totalUsers: stats.totalUsers ?? 0,
      totalSongs: stats.totalSongs ?? 0,
      totalArtists: stats.totalArtists ?? 0,
      totalAlbums: stats.totalAlbums ?? 0,
      totalPlaylists: stats.totalPlaylists ?? 0,
      totalPlays: stats.totalPlays ?? 0,
      periodPlays: stats.periodPlays ?? 0,
    };
  },
};

/** 2. get_source_errors (Chỉ Admin) */
const EmptySchema = z.object({});

export const getSourceErrorsAdminTool: AssistantToolDefinition<typeof EmptySchema> = {
  name: 'get_source_errors',
  category: 'admin',
  description:
    'Kiểm tra trạng thái hạn mức (quota) và cảnh báo lỗi của các nguồn nhạc bên thứ ba (YouTube, Spotify, Zing MP3, Jamendo...). Chỉ khả dụng cho Admin.',
  schema: EmptySchema,
  jsonSchema: { type: 'OBJECT', properties: {} },
  execute: async (_args, env) => {
    assertAdmin(env.auth);
    const quotas = quotaService.getQuotaStatus();
    const sources = Object.values(quotas).map((q) => ({
      name: q.name,
      displayName: q.displayName,
      used: q.used,
      limit: q.limit,
      percentage: q.percentage,
      isWarning: q.isWarning,
      isExceeded: q.isExceeded,
    }));

    return {
      sourcesCount: sources.length,
      warnings: sources.filter((s) => s.isWarning || s.isExceeded),
      sources,
    };
  },
};
