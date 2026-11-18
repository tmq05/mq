import { z } from 'zod';
import { prisma } from '../../../config/prisma.js';
import { playlistService } from '../../../services/playlist.service.js';
import { searchService } from '../../../services/search.service.js';
import { songService } from '../../../services/song.service.js';
import { assertAuthenticated, assertPlaylistOwnership } from '../auth.js';
import {
  consumePendingConfirmation,
  createPendingConfirmation,
} from '../confirmationStore.js';
import {
  AssistantToolDefinition,
  expandMoodOrNaturalQuery,
} from './types.js';
import { UnifiedTrack } from '../../../providers/music-provider.interface.js';

/** 1. create_playlist */
export const CreatePlaylistInputSchema = z.object({
  title: z.string().min(1, 'Tên playlist không được rỗng').max(100),
  description: z.string().max(300).optional(),
  songQuery: z.string().max(200).optional(),
  count: z.number().int().min(1).max(15).optional().default(10),
});

export const createPlaylistTool: AssistantToolDefinition<typeof CreatePlaylistInputSchema> = {
  name: 'create_playlist',
  category: 'mutation',
  description:
    'Tạo playlist mới (tùy chọn kèm danh sách bài hát theo chủ đề). Công cụ trả về status="needs_confirmation" kèm actionId để người dùng xác nhận trước khi thực thi.',
  schema: CreatePlaylistInputSchema,
  jsonSchema: {
    type: 'OBJECT',
    properties: {
      title: { type: 'STRING', description: 'Tên playlist cần tạo.' },
      description: { type: 'STRING', description: 'Mô tả ngắn cho playlist.' },
      songQuery: {
        type: 'STRING',
        description: 'Từ khóa chủ đề để tự động tìm các bài hát đưa vào playlist.',
      },
      count: {
        type: 'NUMBER',
        description: 'Số lượng bài hát muốn đưa vào (mặc định 10, tối đa 15).',
      },
    },
    required: ['title'],
  },
  execute: async (args, env) => {
    const userId = assertAuthenticated(env.auth);
    const count = Math.min(15, Math.max(1, args.count ?? 10));
    const query = expandMoodOrNaturalQuery(args.songQuery || args.title);

    const searchRes = await searchService.search({
      query,
      type: 'track',
      includeYouTube: true,
    });
    const tracks = (searchRes.tracks || []).slice(0, count);
    if (tracks.length > 0) {
      env.emitTracksPreview?.(tracks.slice(0, 4));
    }

    const summary = `Tạo playlist "${args.title}" gồm ${tracks.length} bài hát theo chủ đề "${
      args.songQuery || args.title
    }".`;

    const confirmation = createPendingConfirmation({
      userId,
      actionType: 'create_playlist',
      summary,
      payload: {
        title: args.title,
        description: args.description || `Tạo bởi Trợ lý mq (${tracks.length} bài)`,
        tracks,
      },
    });

    env.emitUIAction({
      action: 'confirmation_required',
      payload: {
        id: confirmation.actionId,
        actionId: confirmation.actionId,
        actionType: 'create_playlist',
        title: `Tạo playlist "${args.title}"`,
        description: summary,
        payload: {
          actionId: confirmation.actionId,
          title: args.title,
          tracks,
        },
      },
    });

    return confirmation;
  },
};

/** 2. add_to_playlist */
export const AddToPlaylistInputSchema = z.object({
  playlistId: z.string().optional(),
  playlistName: z.string().max(100).optional(),
  trackId: z.string().optional(),
  songQuery: z.string().max(200).optional(),
  useCurrentTrack: z.boolean().optional().default(false),
});

export const addToPlaylistTool: AssistantToolDefinition<typeof AddToPlaylistInputSchema> = {
  name: 'add_to_playlist',
  category: 'mutation',
  description:
    'Thêm bài hát vào playlist của người dùng (trả về status="needs_confirmation" để người dùng xác nhận).',
  schema: AddToPlaylistInputSchema,
  jsonSchema: {
    type: 'OBJECT',
    properties: {
      playlistId: { type: 'STRING', description: 'ID playlist đích (nếu biết).' },
      playlistName: { type: 'STRING', description: 'Tên playlist đích.' },
      trackId: { type: 'STRING', description: 'ID bài hát cần thêm.' },
      songQuery: { type: 'STRING', description: 'Tên bài hát cần thêm.' },
      useCurrentTrack: {
        type: 'BOOLEAN',
        description: 'True nếu thêm bài đang phát hiện tại.',
      },
    },
  },
  execute: async (args, env) => {
    const userId = assertAuthenticated(env.auth);

    let targetPlaylistName = args.playlistName || 'Yêu thích';
    if (args.playlistId) {
      const owned = await assertPlaylistOwnership(userId, args.playlistId);
      targetPlaylistName = owned.title;
    }

    let track: UnifiedTrack | null = null;
    if (args.trackId) {
      track = await songService.getSong(args.trackId);
    }
    if (!track && (args.useCurrentTrack || !args.songQuery) && env.context.currentTrack) {
      track = {
        ...env.context.currentTrack,
        source: env.context.currentTrack.source as any,
        sourceId:
          env.context.currentTrack.sourceId ||
          env.context.currentTrack.id.split(':').slice(1).join(':') ||
          env.context.currentTrack.id,
        coverUrl: env.context.currentTrack.coverUrl || undefined,
        album: env.context.currentTrack.album || undefined,
        playbackType: 'audio',
        isFullLength: env.context.currentTrack.isFullLength ?? true,
      };
    }
    if (!track && args.songQuery) {
      const res = await searchService.search({
        query: expandMoodOrNaturalQuery(args.songQuery),
        type: 'track',
        includeYouTube: true,
      });
      track = res.tracks?.[0] || null;
    }

    if (!track) {
      return {
        status: 'error',
        message: 'Không tìm thấy bài hát cần thêm vào playlist.',
      };
    }

    const summary = `Thêm bài "${track.title}" vào playlist "${targetPlaylistName}".`;
    const confirmation = createPendingConfirmation({
      userId,
      actionType: 'add_to_playlist',
      summary,
      payload: {
        playlistId: args.playlistId,
        playlistName: targetPlaylistName,
        track,
      },
    });

    env.emitUIAction({
      action: 'confirmation_required',
      payload: {
        id: confirmation.actionId,
        actionId: confirmation.actionId,
        actionType: 'add_to_playlist',
        title: `Thêm vào playlist "${targetPlaylistName}"`,
        description: summary,
        payload: {
          actionId: confirmation.actionId,
          playlistName: targetPlaylistName,
          track,
        },
      },
    });

    return confirmation;
  },
};

/** 3. remove_from_playlist (Luôn bắt buộc xác nhận) */
export const RemoveFromPlaylistInputSchema = z.object({
  playlistId: z.string().optional(),
  playlistName: z.string().max(100).optional(),
  trackId: z.string().optional(),
  songQuery: z.string().max(200).optional(),
});

export const removeFromPlaylistTool: AssistantToolDefinition<typeof RemoveFromPlaylistInputSchema> = {
  name: 'remove_from_playlist',
  category: 'mutation',
  description:
    'Xóa một bài hát khỏi playlist của người dùng. Luôn trả về status="needs_confirmation" để người dùng xác nhận trước khi xóa.',
  schema: RemoveFromPlaylistInputSchema,
  jsonSchema: {
    type: 'OBJECT',
    properties: {
      playlistId: { type: 'STRING', description: 'ID playlist (nếu có).' },
      playlistName: { type: 'STRING', description: 'Tên playlist.' },
      trackId: { type: 'STRING', description: 'ID bài hát cần xóa khỏi playlist.' },
      songQuery: { type: 'STRING', description: 'Tên bài hát cần xóa.' },
    },
  },
  execute: async (args, env) => {
    const userId = assertAuthenticated(env.auth);
    let playlistTitle = args.playlistName || 'Playlist của bạn';

    if (args.playlistId) {
      const owned = await assertPlaylistOwnership(userId, args.playlistId);
      playlistTitle = owned.title;
    }

    const songLabel =
      args.songQuery || env.context.currentTrack?.title || args.trackId || 'bài hát đã chọn';
    const summary = `Xóa bài "${songLabel}" khỏi playlist "${playlistTitle}".`;

    const confirmation = createPendingConfirmation({
      userId,
      actionType: 'remove_from_playlist',
      summary,
      payload: {
        playlistId: args.playlistId,
        playlistName: playlistTitle,
        trackId: args.trackId || env.context.currentTrack?.id,
        songQuery: songLabel,
      },
    });

    env.emitUIAction({
      action: 'confirmation_required',
      payload: {
        id: confirmation.actionId,
        actionId: confirmation.actionId,
        actionType: 'remove_from_playlist',
        title: `Xóa bài khỏi "${playlistTitle}"`,
        description: summary,
        payload: {
          actionId: confirmation.actionId,
          playlistName: playlistTitle,
          songQuery: songLabel,
        },
      },
    });

    return confirmation;
  },
};

/** 4. delete_playlist (Luôn bắt buộc xác nhận) */
export const DeletePlaylistInputSchema = z
  .object({
    playlistId: z.string().optional(),
    playlistName: z.string().max(100).optional(),
  })
  .refine((d) => Boolean(d.playlistId || d.playlistName), {
    message: 'Cần cung cấp playlistId hoặc playlistName để xóa playlist',
  });

export const deletePlaylistTool: AssistantToolDefinition<typeof DeletePlaylistInputSchema> = {
  name: 'delete_playlist',
  category: 'mutation',
  description:
    'Xóa hoàn toàn một playlist của người dùng. Luôn bắt buộc trả về status="needs_confirmation" để người dùng xác nhận.',
  schema: DeletePlaylistInputSchema,
  jsonSchema: {
    type: 'OBJECT',
    properties: {
      playlistId: { type: 'STRING', description: 'ID playlist cần xóa.' },
      playlistName: { type: 'STRING', description: 'Tên playlist cần xóa.' },
    },
  },
  execute: async (args, env) => {
    const userId = assertAuthenticated(env.auth);

    let targetId = args.playlistId;
    let targetTitle = args.playlistName || '';

    if (targetId) {
      const owned = await assertPlaylistOwnership(userId, targetId);
      targetTitle = owned.title;
    } else if (targetTitle) {
      const userPlaylists = await playlistService.getUserPlaylists(userId);
      const matched = userPlaylists.find(
        (p) => p.title.toLowerCase() === targetTitle.toLowerCase()
      );
      if (matched) {
        targetId = matched.id;
        targetTitle = matched.title;
      }
    }

    const summary = `Xóa vĩnh viễn playlist "${targetTitle || targetId}" khỏi thư viện cá nhân.`;
    const confirmation = createPendingConfirmation({
      userId,
      actionType: 'delete_playlist',
      summary,
      payload: {
        playlistId: targetId,
        playlistName: targetTitle,
      },
    });

    env.emitUIAction({
      action: 'confirmation_required',
      payload: {
        id: confirmation.actionId,
        actionId: confirmation.actionId,
        actionType: 'delete_playlist',
        title: `Xóa playlist "${targetTitle || targetId}"`,
        description: summary,
        payload: {
          actionId: confirmation.actionId,
          playlistId: targetId,
          playlistName: targetTitle,
        },
      },
    });

    return confirmation;
  },
};

/** Thực thi hành động đã được người dùng xác nhận qua POST /api/chat/confirm */
export async function executeConfirmedActionById(
  actionId: string,
  userId: string
): Promise<{ status: 'completed'; actionId: string; message: string; playlistId?: string }> {
  const item = consumePendingConfirmation(actionId, userId);
  const { actionType, payload } = item;

  if (actionType === 'create_playlist') {
    const created = await playlistService.createPlaylist(userId, {
      title: String(payload.title || 'Playlist mới'),
      description: String(payload.description || 'Tạo bởi Trợ lý mq'),
      isPublic: true,
      coverUrl: payload.tracks?.[0]?.coverUrl,
    });

    const tracks: UnifiedTrack[] = Array.isArray(payload.tracks) ? payload.tracks : [];
    for (const track of tracks) {
      try {
        await playlistService.addSong(userId, created.id, track);
      } catch {
        // ignore single track failure
      }
    }

    return {
      status: 'completed',
      actionId,
      playlistId: created.id,
      message: `Đã tạo playlist "${created.title}" với ${tracks.length} bài hát thành công!`,
    };
  }

  if (actionType === 'add_to_playlist') {
    const track: UnifiedTrack | undefined = payload.track;
    if (!track) {
      throw new Error('Không tìm thấy thông tin bài hát cần thêm.');
    }

    let playlistId: string | undefined = payload.playlistId;
    let playlistTitle: string = payload.playlistName || 'Playlist mới';

    if (playlistId) {
      const owned = await assertPlaylistOwnership(userId, playlistId);
      playlistTitle = owned.title;
    } else {
      const list = await playlistService.getUserPlaylists(userId);
      const found = list.find(
        (p) => p.title.toLowerCase() === playlistTitle.toLowerCase()
      );
      if (found) {
        playlistId = found.id;
        playlistTitle = found.title;
      } else {
        const created = await playlistService.createPlaylist(userId, {
          title: playlistTitle,
          description: 'Tạo bởi Trợ lý mq',
          isPublic: true,
          coverUrl: track.coverUrl,
        });
        playlistId = created.id;
        playlistTitle = created.title;
      }
    }

    await playlistService.addSong(userId, playlistId, track);
    return {
      status: 'completed',
      actionId,
      playlistId,
      message: `Đã thêm "${track.title}" vào playlist "${playlistTitle}"!`,
    };
  }

  if (actionType === 'remove_from_playlist') {
    const list = await playlistService.getUserPlaylists(userId);
    const target = payload.playlistId
      ? await assertPlaylistOwnership(userId, payload.playlistId)
      : list.find(
          (p) =>
            p.title.toLowerCase() ===
            String(payload.playlistName || '').toLowerCase()
        ) || list[0];

    if (!target) {
      throw new Error('Không tìm thấy playlist cần xóa bài hát.');
    }

    const detail = await playlistService.getPlaylist(target.id, userId);
    const queryLower = String(payload.songQuery || '').toLowerCase();
    const matched = detail?.tracks?.find(
      (t) =>
        (payload.trackId && t.id === payload.trackId) ||
        t.title.toLowerCase().includes(queryLower)
    );

    if (!matched) {
      throw new Error(`Không tìm thấy bài hát trong playlist "${target.title}".`);
    }

    const dbSong = await prisma.song.findFirst({
      where: {
        OR: [{ id: (matched as any).dbId || matched.sourceId }, { sourceId: matched.sourceId }],
      },
    });
    if (!dbSong) {
      throw new Error('Không tìm thấy bản ghi bài hát để xóa.');
    }

    await playlistService.removeSong(userId, target.id, dbSong.id);
    return {
      status: 'completed',
      actionId,
      playlistId: target.id,
      message: `Đã xóa "${matched.title}" khỏi playlist "${target.title}".`,
    };
  }

  if (actionType === 'delete_playlist') {
    let targetId: string | undefined = payload.playlistId;
    let targetTitle: string = payload.playlistName || '';

    if (targetId) {
      const owned = await assertPlaylistOwnership(userId, targetId);
      targetTitle = owned.title;
    } else {
      const list = await playlistService.getUserPlaylists(userId);
      const found = list.find(
        (p) => p.title.toLowerCase() === targetTitle.toLowerCase()
      );
      if (!found) {
        throw new Error(`Không tìm thấy playlist "${targetTitle}" để xóa.`);
      }
      targetId = found.id;
      targetTitle = found.title;
    }

    await playlistService.deletePlaylist(userId, targetId);
    return {
      status: 'completed',
      actionId,
      playlistId: targetId,
      message: `Đã xóa playlist "${targetTitle}" thành công.`,
    };
  }

  throw new Error('Loại hành động xác nhận không được hỗ trợ.');
}
