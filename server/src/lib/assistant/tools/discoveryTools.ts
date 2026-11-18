import { z } from 'zod';
import { prisma } from '../../../config/prisma.js';
import { searchService } from '../../../services/search.service.js';
import { songService } from '../../../services/song.service.js';
import { ASSISTANT_CONFIG } from '../config.js';
import { wrapExternalData } from '../context.js';
import { MQ_COPYRIGHT_FACTS } from '../systemPrompt.js';
import {
  AssistantToolDefinition,
  expandMoodOrNaturalQuery,
  toCompactTrack,
} from './types.js';

/** 1. get_recommendations */
export const GetRecommendationsSchema = z.object({
  seedTrackId: z.string().optional(),
  seedArtist: z.string().max(120).optional(),
  mood: z.string().max(120).optional(),
});

export const getRecommendationsTool: AssistantToolDefinition<typeof GetRecommendationsSchema> = {
  name: 'get_recommendations',
  category: 'read',
  description:
    'Gợi ý bài hát cá nhân hóa dựa trên bài đang phát, nghệ sĩ yêu thích, lịch sử nghe hoặc tâm trạng.',
  schema: GetRecommendationsSchema,
  jsonSchema: {
    type: 'OBJECT',
    properties: {
      seedTrackId: {
        type: 'STRING',
        description: 'ID bài hát mẫu để tìm nhạc tương tự.',
      },
      seedArtist: {
        type: 'STRING',
        description: 'Tên nghệ sĩ mẫu để gợi ý nhạc cùng phong cách.',
      },
      mood: {
        type: 'STRING',
        description: 'Tâm trạng hoặc hoàn cảnh nghe nhạc.',
      },
    },
  },
  execute: async (args, env) => {
    let querySeed = args.seedArtist || args.mood || '';

    if (!querySeed && env.context.currentTrack) {
      querySeed =
        env.context.currentTrack.artists?.[0] || env.context.currentTrack.title;
    }

    if (!querySeed && env.auth.userId) {
      const likes = await songService.getUserLikes(env.auth.userId);
      if (likes.length > 0) {
        querySeed = likes[0].artists?.[0] || likes[0].title;
      }
    }

    const finalQuery = expandMoodOrNaturalQuery(querySeed || 'V-Pop thịnh hành', args.mood);
    const res = await searchService.search({
      query: finalQuery,
      type: 'track',
      includeYouTube: true,
    });

    const filtered = (res.tracks || [])
      .filter((t) => t.id !== env.context.currentTrack?.id)
      .slice(0, 5);

    if (filtered.length > 0) {
      env.emitTracksPreview?.(filtered);
    }

    return {
      basedOn: wrapExternalData(querySeed || 'Thịnh hành trên mq'),
      count: filtered.length,
      recommendations: filtered.map((t) => toCompactTrack(t)),
    };
  },
};

/** 2. get_artist_info */
export const GetArtistInfoSchema = z
  .object({
    artistId: z.string().optional(),
    name: z.string().max(120).optional(),
  })
  .refine((data) => Boolean(data.artistId || data.name), {
    message: 'Cần truyền artistId hoặc name của nghệ sĩ',
  });

export const getArtistInfoTool: AssistantToolDefinition<typeof GetArtistInfoSchema> = {
  name: 'get_artist_info',
  category: 'read',
  description:
    'Tra cứu thông tin tiểu sử, trạng thái xác minh và các bài hát/album của nghệ sĩ từ cơ sở dữ liệu web mq.',
  schema: GetArtistInfoSchema,
  jsonSchema: {
    type: 'OBJECT',
    properties: {
      artistId: {
        type: 'STRING',
        description: 'ID của nghệ sĩ trên mq.',
      },
      name: {
        type: 'STRING',
        description: 'Tên nghệ sĩ cần tra cứu (ví dụ: "tlinh", "Sơn Tùng M-TP", "Vũ.").',
      },
    },
  },
  execute: async (args) => {
    const artist = await prisma.artist.findFirst({
      where: args.artistId
        ? { id: args.artistId }
        : { name: { contains: args.name || '', mode: 'insensitive' } },
      include: {
        songs: { take: ASSISTANT_CONFIG.maxToolResultsLimit },
        albums: { take: 5 },
        _count: { select: { followers: true, songs: true, albums: true } },
      },
    });

    if (!artist) {
      return {
        found: false,
        note: 'Không tìm thấy thông tin xác thực của nghệ sĩ này trong cơ sở dữ liệu nội bộ mq. Không tự suy diễn tiểu sử.',
      };
    }

    return {
      found: true,
      id: artist.id,
      name: wrapExternalData(artist.name),
      isVerified: artist.isVerified,
      bio: wrapExternalData(artist.bio || 'Chưa có mô tả chi tiết.'),
      followersCount: artist._count.followers,
      albums: artist.albums.map((al) => ({
        id: al.id,
        title: wrapExternalData(al.title),
        releaseDate: al.releaseDate,
      })),
    };
  },
};

/** 3. explain_copyright */
export const ExplainCopyrightSchema = z.object({
  topic: z.string().max(150).optional().default('overview'),
});

export const explainCopyrightTool: AssistantToolDefinition<typeof ExplainCopyrightSchema> = {
  name: 'explain_copyright',
  category: 'read',
  description:
    'Trích xuất nguyên văn thông tin từ trang Bản quyền (/credits) và cấu hình nguồn nhạc của web mq (Full vs Preview 30s, nguồn nào nghe đầy đủ). Dùng khi người dùng hỏi về nguồn nhạc hoặc bản quyền.',
  schema: ExplainCopyrightSchema,
  jsonSchema: {
    type: 'OBJECT',
    properties: {
      topic: {
        type: 'STRING',
        description: 'Chủ đề cụ thể: "full_vs_preview", "sources", "lyrics", hoặc "overview".',
      },
    },
  },
  execute: async (args) => {
    return {
      topic: args.topic,
      overview: MQ_COPYRIGHT_FACTS.overview,
      fullVsPreview: MQ_COPYRIGHT_FACTS.fullVsPreview,
      sources: MQ_COPYRIGHT_FACTS.sources,
    };
  },
};
