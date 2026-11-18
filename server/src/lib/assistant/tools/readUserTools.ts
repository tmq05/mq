import { z } from 'zod';
import { songService } from '../../../services/song.service.js';
import { playlistService } from '../../../services/playlist.service.js';
import { ASSISTANT_CONFIG } from '../config.js';
import { assertAuthenticated, assertPlaylistOwnership } from '../auth.js';
import { wrapExternalData } from '../context.js';
import { AssistantToolDefinition, toCompactTrack } from './types.js';

const EmptySchema = z.object({});

/** 1. get_current_track */
export const getCurrentTrackTool: AssistantToolDefinition<typeof EmptySchema> = {
  name: 'get_current_track',
  category: 'read',
  description:
    'Lấy thông tin bài hát đang phát và trạng thái trình phát hiện tại từ context người dùng.',
  schema: EmptySchema,
  jsonSchema: { type: 'OBJECT', properties: {} },
  execute: async (_args, env) => {
    const current = env.context.currentTrack;
    if (!current) {
      return { isPlaying: false, currentTrack: null };
    }
    return {
      isPlaying: Boolean(env.context.isPlaying),
      repeatMode: env.context.repeatMode || 'off',
      isShuffle: Boolean(env.context.isShuffle),
      volume: env.context.volume ?? 80,
      currentTrack: toCompactTrack({
        id: current.id,
        title: current.title,
        artists: current.artists,
        coverUrl: current.coverUrl || undefined,
        source: current.source as any,
        isFullLength: current.isFullLength,
        durationMs: current.durationMs,
      }),
    };
  },
};

/** 2. get_favorites */
export const getFavoritesTool: AssistantToolDefinition<typeof EmptySchema> = {
  name: 'get_favorites',
  category: 'read',
  description:
    'Lấy danh sách các bài hát yêu thích của người dùng hiện tại (tối đa 8 bài gần nhất).',
  schema: EmptySchema,
  jsonSchema: { type: 'OBJECT', properties: {} },
  execute: async (_args, env) => {
    if (!env.auth.userId) {
      return {
        authenticated: false,
        count: 0,
        tracks: [],
        note: 'Người dùng chưa đăng nhập nên chưa có danh sách yêu thích cá nhân.',
      };
    }
    const likes = await songService.getUserLikes(env.auth.userId);
    const slice = likes.slice(0, ASSISTANT_CONFIG.maxToolResultsLimit);
    if (slice.length > 0) {
      env.emitTracksPreview?.(slice.slice(0, 5) as any);
    }
    return {
      authenticated: true,
      count: likes.length,
      tracks: slice.map((t) => toCompactTrack(t as any)),
    };
  },
};

/** 3. get_listening_history */
export const GetHistorySchema = z.object({
  limit: z.number().int().min(1).max(ASSISTANT_CONFIG.maxToolResultsLimit).optional().default(5),
});

export const getListeningHistoryTool: AssistantToolDefinition<typeof GetHistorySchema> = {
  name: 'get_listening_history',
  category: 'read',
  description: 'Lấy lịch sử các bài hát người dùng vừa nghe gần đây.',
  schema: GetHistorySchema,
  jsonSchema: {
    type: 'OBJECT',
    properties: {
      limit: {
        type: 'NUMBER',
        description: 'Số lượng bài trong lịch sử cần lấy (tối đa 8).',
      },
    },
  },
  execute: async (args, env) => {
    if (!env.auth.userId) {
      return {
        authenticated: false,
        count: 0,
        tracks: [],
        note: 'Người dùng chưa đăng nhập.',
      };
    }
    const history = await songService.getUserHistory(env.auth.userId);
    const limit = Math.min(ASSISTANT_CONFIG.maxToolResultsLimit, args.limit ?? 5);
    const slice = history.slice(0, limit);
    if (slice.length > 0) {
      env.emitTracksPreview?.(slice.slice(0, 5) as any);
    }
    return {
      authenticated: true,
      count: slice.length,
      tracks: slice.map((h) => toCompactTrack(h as any)),
    };
  },
};

/** 4. get_playlists */
export const getPlaylistsTool: AssistantToolDefinition<typeof EmptySchema> = {
  name: 'get_playlists',
  category: 'read',
  description: 'Lấy danh sách các playlist cá nhân của người dùng hiện tại.',
  schema: EmptySchema,
  jsonSchema: { type: 'OBJECT', properties: {} },
  execute: async (_args, env) => {
    if (!env.auth.userId) {
      return { authenticated: false, playlists: [] };
    }
    const playlists = await playlistService.getUserPlaylists(env.auth.userId);
    return {
      authenticated: true,
      count: playlists.length,
      playlists: playlists.slice(0, ASSISTANT_CONFIG.maxToolResultsLimit).map((p) => ({
        id: p.id,
        title: wrapExternalData(p.title),
        songsCount: p._count?.songs ?? 0,
        isPublic: p.isPublic,
      })),
    };
  },
};

/** 5. get_playlist_tracks */
export const GetPlaylistTracksSchema = z.object({
  playlistId: z.string().min(1, 'Cần cung cấp playlistId'),
});

export const getPlaylistTracksTool: AssistantToolDefinition<typeof GetPlaylistTracksSchema> = {
  name: 'get_playlist_tracks',
  category: 'read',
  description: 'Lấy danh sách các bài hát bên trong một playlist cụ thể theo playlistId.',
  schema: GetPlaylistTracksSchema,
  jsonSchema: {
    type: 'OBJECT',
    properties: {
      playlistId: {
        type: 'STRING',
        description: 'Mã ID của playlist cần xem bài hát.',
      },
    },
    required: ['playlistId'],
  },
  execute: async (args, env) => {
    const userId = assertAuthenticated(env.auth);
    await assertPlaylistOwnership(userId, args.playlistId);

    const detail = await playlistService.getPlaylist(args.playlistId, userId);
    if (!detail) {
      return { found: false, tracks: [] };
    }

    const tracks = (detail.tracks || []).slice(0, ASSISTANT_CONFIG.maxToolResultsLimit);
    return {
      found: true,
      playlistId: detail.id,
      title: wrapExternalData(detail.title),
      tracks: tracks.map((t) => toCompactTrack(t as any)),
    };
  },
};
