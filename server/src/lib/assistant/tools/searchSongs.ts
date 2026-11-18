import { z } from 'zod';
import { searchService } from '../../../services/search.service.js';
import { ASSISTANT_CONFIG } from '../config.js';
import {
  AssistantToolDefinition,
  expandMoodOrNaturalQuery,
  toCompactTrack,
} from './types.js';

export const SearchSongsInputSchema = z.object({
  query: z.string().min(1, 'Từ khóa tìm kiếm không được rỗng').max(200),
  source: z
    .enum(['all', 'local', 'zingmp3', 'spotify', 'youtube', 'audius', 'jamendo', 'itunes'])
    .optional(),
  mood: z.string().max(100).optional(),
  limit: z.number().int().min(1).max(ASSISTANT_CONFIG.maxToolResultsLimit).optional().default(5),
});

export const searchSongsTool: AssistantToolDefinition<typeof SearchSongsInputSchema> = {
  name: 'search_songs',
  category: 'read',
  description:
    'Tìm kiếm bài hát đa nguồn trên mq theo tên bài, nghệ sĩ, đoạn lời hoặc tâm trạng/hoàn cảnh. Dùng khi người dùng muốn tìm hoặc gợi ý bài hát.',
  schema: SearchSongsInputSchema,
  jsonSchema: {
    type: 'OBJECT',
    properties: {
      query: {
        type: 'STRING',
        description: 'Từ khóa tìm kiếm bài hát, nghệ sĩ hoặc chủ đề âm nhạc.',
      },
      source: {
        type: 'STRING',
        enum: ['all', 'local', 'zingmp3', 'spotify', 'youtube', 'audius', 'jamendo', 'itunes'],
        description: 'Nguồn nhạc cụ thể (nếu người dùng yêu cầu).',
      },
      mood: {
        type: 'STRING',
        description: 'Tâm trạng hoặc hoàn cảnh nghe nhạc (ví dụ: buồn, mưa, chill, học bài, chạy bộ).',
      },
      limit: {
        type: 'NUMBER',
        description: 'Số lượng bài trả về (tối đa 8, mặc định 5).',
      },
    },
    required: ['query'],
  },
  execute: async (args, env) => {
    const expandedQuery = expandMoodOrNaturalQuery(args.query, args.mood);
    const sources =
      args.source && args.source !== 'all' ? [args.source] : undefined;

    const res = await searchService.search({
      query: expandedQuery,
      type: 'track',
      sources,
      includeYouTube: true,
    });

    const limit = Math.min(ASSISTANT_CONFIG.maxToolResultsLimit, args.limit ?? 5);
    const rawTracks = (res.tracks || []).slice(0, limit);
    if (rawTracks.length > 0) {
      env.emitTracksPreview?.(rawTracks);
    }

    return {
      query: args.query,
      expandedQuery,
      count: rawTracks.length,
      tracks: rawTracks.map((t) => toCompactTrack(t)),
    };
  },
};
