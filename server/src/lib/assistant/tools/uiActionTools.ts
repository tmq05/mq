import { z } from 'zod';
import { songService } from '../../../services/song.service.js';
import { searchService } from '../../../services/search.service.js';
import {
  AssistantToolDefinition,
  expandMoodOrNaturalQuery,
  toCompactTrack,
} from './types.js';

/** 1. play_song */
export const PlaySongInputSchema = z
  .object({
    trackId: z.string().optional(),
    query: z.string().max(200).optional(),
    source: z.string().optional(),
  })
  .refine((d) => Boolean(d.trackId || d.query), {
    message: 'Cần cung cấp trackId hoặc query bài hát cần phát',
  });

export const playSongTool: AssistantToolDefinition<typeof PlaySongInputSchema> = {
  name: 'play_song',
  category: 'ui_action',
  description:
    'Phát một bài hát trên giao diện thông qua sự kiện ui_action gửi về trình phát của client.',
  schema: PlaySongInputSchema,
  jsonSchema: {
    type: 'OBJECT',
    properties: {
      trackId: {
        type: 'STRING',
        description: 'ID của bài hát (ví dụ từ kết quả search_songs).',
      },
      query: {
        type: 'STRING',
        description: 'Tên bài hát hoặc nghệ sĩ nếu chưa có trackId.',
      },
      source: {
        type: 'STRING',
        description: 'Nguồn phát (tùy chọn).',
      },
    },
  },
  execute: async (args, env) => {
    let track = args.trackId ? await songService.getSong(args.trackId) : null;
    let queue = track ? [track] : [];

    if (!track && (args.query || args.trackId)) {
      const q = expandMoodOrNaturalQuery(args.query || args.trackId || '');
      const res = await searchService.search({
        query: q,
        type: 'track',
        includeYouTube: true,
      });
      queue = (res.tracks || []).slice(0, 5);
      track = queue[0] || null;
    }

    if (!track) {
      return {
        success: false,
        message: 'Không tìm thấy bài hát phù hợp để phát.',
      };
    }

    env.emitTracksPreview?.(queue);
    env.emitUIAction({
      action: 'play_song',
      payload: {
        track,
        queue,
        source: args.source || track.source,
      },
    });

    return {
      success: true,
      uiActionEmitted: 'play_song',
      track: toCompactTrack(track),
    };
  },
};

/** 2. control_player */
export const ControlPlayerInputSchema = z.object({
  action: z.enum([
    'play',
    'pause',
    'next',
    'prev',
    'repeat',
    'shuffle',
    'seek',
    'volume',
  ]),
  value: z.union([z.number(), z.string(), z.boolean()]).optional(),
});

export const controlPlayerTool: AssistantToolDefinition<typeof ControlPlayerInputSchema> = {
  name: 'control_player',
  category: 'ui_action',
  description:
    'Điều khiển trình phát nhạc ở client (play, pause, next, prev, repeat, shuffle, seek, volume) qua sự kiện ui_action.',
  schema: ControlPlayerInputSchema,
  jsonSchema: {
    type: 'OBJECT',
    properties: {
      action: {
        type: 'STRING',
        enum: ['play', 'pause', 'next', 'prev', 'repeat', 'shuffle', 'seek', 'volume'],
        description: 'Lệnh điều khiển trình phát.',
      },
      value: {
        type: 'STRING',
        description:
          'Giá trị kèm theo: mức âm lượng (0-100), vị trí tua giây (seek), chế độ lặp ("off"|"all"|"one") hoặc trạng thái shuffle ("on"|"off").',
      },
    },
    required: ['action'],
  },
  execute: async (args, env) => {
    env.emitUIAction({
      action: 'control_player',
      payload: {
        action: args.action,
        value: args.value,
      },
    });
    return {
      success: true,
      uiActionEmitted: 'control_player',
      control: args.action,
      value: args.value ?? null,
    };
  },
};

/** 3. add_to_queue */
export const AddToQueueInputSchema = z
  .object({
    trackId: z.string().optional(),
    query: z.string().max(200).optional(),
  })
  .refine((d) => Boolean(d.trackId || d.query), {
    message: 'Cần cung cấp trackId hoặc query để thêm vào hàng chờ',
  });

export const addToQueueTool: AssistantToolDefinition<typeof AddToQueueInputSchema> = {
  name: 'add_to_queue',
  category: 'ui_action',
  description: 'Thêm một bài hát vào danh sách hàng chờ phát (queue) trên giao diện.',
  schema: AddToQueueInputSchema,
  jsonSchema: {
    type: 'OBJECT',
    properties: {
      trackId: {
        type: 'STRING',
        description: 'ID của bài hát cần thêm vào hàng chờ.',
      },
      query: {
        type: 'STRING',
        description: 'Tên bài hát nếu chưa có trackId.',
      },
    },
  },
  execute: async (args, env) => {
    let track = args.trackId ? await songService.getSong(args.trackId) : null;
    if (!track && (args.query || args.trackId)) {
      const res = await searchService.search({
        query: expandMoodOrNaturalQuery(args.query || args.trackId || ''),
        type: 'track',
        includeYouTube: true,
      });
      track = res.tracks?.[0] || null;
    }

    if (!track) {
      return {
        success: false,
        message: 'Không tìm thấy bài hát để thêm vào hàng chờ.',
      };
    }

    env.emitTracksPreview?.([track]);
    env.emitUIAction({
      action: 'add_to_queue',
      payload: { track },
    });

    return {
      success: true,
      uiActionEmitted: 'add_to_queue',
      track: toCompactTrack(track),
    };
  },
};

/** 4. open_lyrics */
const EmptySchema = z.object({});

export const openLyricsTool: AssistantToolDefinition<typeof EmptySchema> = {
  name: 'open_lyrics',
  category: 'ui_action',
  description:
    'Mở bảng hiển thị lời bài hát đồng bộ (nguồn LRCLIB hợp lệ) trên giao diện. Luôn dùng công cụ này thay vì tự viết lời bài hát có bản quyền.',
  schema: EmptySchema,
  jsonSchema: { type: 'OBJECT', properties: {} },
  execute: async (_args, env) => {
    env.emitUIAction({
      action: 'open_lyrics',
      payload: {},
    });
    return {
      success: true,
      uiActionEmitted: 'open_lyrics',
      note: 'Đã phát sự kiện mở bảng lời bài hát đồng bộ (LRCLIB) trên giao diện.',
    };
  },
};

/** 5. navigate */
export const NavigateInputSchema = z.object({
  path: z
    .string()
    .regex(/^\/[a-zA-Z0-9\-_/?=&%]*$/, 'Đường dẫn điều hướng nội bộ phải bắt đầu bằng /'),
});

export const navigateTool: AssistantToolDefinition<typeof NavigateInputSchema> = {
  name: 'navigate',
  category: 'ui_action',
  description:
    'Chuyển trang trên ứng dụng web mq (ví dụ: "/", "/search", "/artists", "/library", "/credits", "/profile").',
  schema: NavigateInputSchema,
  jsonSchema: {
    type: 'OBJECT',
    properties: {
      path: {
        type: 'STRING',
        description: 'Đường dẫn nội bộ cần chuyển tới (bắt đầu bằng "/").',
      },
    },
    required: ['path'],
  },
  execute: async (args, env) => {
    env.emitUIAction({
      action: 'navigate',
      payload: { path: args.path },
    });
    return {
      success: true,
      uiActionEmitted: 'navigate',
      path: args.path,
    };
  },
};
