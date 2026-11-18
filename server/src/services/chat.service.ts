import axios from 'axios';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { searchService } from './search.service.js';
import { songService } from './song.service.js';
import { playlistService } from './playlist.service.js';
import { CHAT_BACKEND_CONFIG, GEMINI_TOOL_DECLARATIONS } from '../config/chat.config.js';
import { UnifiedTrack } from '../providers/music-provider.interface.js';

export interface ChatContextPayload {
  currentTrack?: UnifiedTrack | null;
  isPlaying?: boolean;
  isShuffle?: boolean;
  repeatMode?: 'off' | 'all' | 'one';
  volume?: number;
  currentPath?: string;
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatConfirmationAction {
  id: string;
  actionType: 'create_playlist' | 'add_to_playlist' | 'remove_from_playlist';
  title: string;
  description: string;
  payload: Record<string, any>;
}

export interface ChatClientAction {
  type: 'play_song' | 'control_player' | 'add_to_queue';
  payload: Record<string, any>;
}

export interface ChatStreamCallbacks {
  onStatus: (text: string) => void;
  onTracks: (tracks: UnifiedTrack[]) => void;
  onClientAction: (action: ChatClientAction) => void;
  onConfirmation: (confirmation: ChatConfirmationAction) => void;
  onToken: (token: string) => void;
}

/** Lọc đầu vào & bọc dữ liệu ngoài để chống Prompt Injection */
export function sanitizeUserMessage(raw: string): string {
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, CHAT_BACKEND_CONFIG.maxMessageLength);
}

function wrapUntrusted(text: string | undefined | null): string {
  if (!text) return '';
  return `<untrusted_data>${String(text).replace(/<\/?untrusted_data>/gi, '')}</untrusted_data>`;
}

/** Chuyển đổi mô tả tâm trạng/hoàn cảnh tự nhiên sang từ khóa tìm kiếm nhạc tối ưu */
function expandNaturalMusicQuery(rawQuery: string): string {
  const q = rawQuery.toLowerCase().trim();
  if (/buồn.*mưa|mưa.*buồn|nghe lúc mưa/.test(q)) {
    return 'nhạc buồn mưa ballad Việt';
  }
  if (/chill.*học|học bài|tập trung|đọc sách/.test(q)) {
    return 'nhạc chill học bài acoustic lofi';
  }
  if (/chạy bộ|tập gym|thể thao|năng lượng|sôi động/.test(q)) {
    return 'rap Việt sôi động remix';
  }
  if (/ngủ|đêm muộn|khuya/.test(q)) {
    return 'nhạc nhẹ dễ ngủ acoustic';
  }
  if (/ai mang cô đơn/.test(q)) {
    return 'Ai Mang Cô Đơn Đi';
  }
  // Lọc bỏ các từ mệnh lệnh đầu câu
  return rawQuery
    .replace(
      /^(hãy\s+)?(mở|phát|bật|tìm|nghe|cho tôi nghe|tìm bài|mở bài|bài hát có câu|bài có câu)\s+/i,
      ''
    )
    .replace(/^['"“”]|['"“”]$/g, '')
    .trim() || rawQuery;
}

export class ChatService {
  /** Thực thi 1 tool và gửi sự kiện SSE tương ứng về client */
  async executeTool(
    toolName: string,
    args: Record<string, any>,
    userId: string | undefined,
    context: ChatContextPayload,
    callbacks: ChatStreamCallbacks
  ): Promise<Record<string, any>> {
    switch (toolName) {
      case 'search_songs': {
        const rawQuery = String(args.query || '').trim();
        const limit = Math.min(5, Math.max(1, Number(args.limit) || 4));
        const searchQuery = expandNaturalMusicQuery(rawQuery);
        callbacks.onStatus(`Đang tìm bài hát cho "${rawQuery}"...`);

        const result = await searchService.search({
          query: searchQuery,
          type: 'track',
          includeYouTube: true,
        });
        const tracks = (result.tracks || []).slice(0, limit);
        if (tracks.length > 0) {
          callbacks.onTracks(tracks);
        }
        return {
          query: rawQuery,
          expandedQuery: searchQuery,
          count: tracks.length,
          tracks: tracks.map((t) => ({
            id: t.id,
            title: wrapUntrusted(t.title),
            artists: t.artists.map((a) => wrapUntrusted(a)),
            source: t.source,
            isFullLength: t.isFullLength,
          })),
        };
      }

      case 'play_song': {
        const rawQuery = String(args.query || '').trim();
        const searchQuery = expandNaturalMusicQuery(rawQuery);
        callbacks.onStatus(`Đang tìm và phát "${rawQuery}"...`);

        const result = await searchService.search({
          query: searchQuery,
          type: 'track',
          includeYouTube: true,
        });
        const tracks = (result.tracks || []).slice(0, 4);
        if (tracks.length > 0) {
          callbacks.onTracks(tracks);
          callbacks.onClientAction({
            type: 'play_song',
            payload: { track: tracks[0], queue: tracks },
          });
          return {
            success: true,
            playingTrack: {
              title: wrapUntrusted(tracks[0].title),
              artists: tracks[0].artists.map((a) => wrapUntrusted(a)),
              source: tracks[0].source,
            },
          };
        }
        return { success: false, message: 'Không tìm thấy bài hát phù hợp để phát.' };
      }

      case 'control_player': {
        const action = String(args.action || 'toggle');
        const volumePercent =
          args.volumePercent !== undefined
            ? Math.max(0, Math.min(100, Number(args.volumePercent)))
            : undefined;
        callbacks.onStatus('Đang điều khiển trình phát...');
        callbacks.onClientAction({
          type: 'control_player',
          payload: { action, volumePercent },
        });
        return { success: true, action, volumePercent };
      }

      case 'add_to_queue': {
        const rawQuery = String(args.query || '').trim();
        const searchQuery = expandNaturalMusicQuery(rawQuery);
        callbacks.onStatus(`Đang tìm "${rawQuery}" để thêm vào hàng chờ...`);

        const result = await searchService.search({
          query: searchQuery,
          type: 'track',
          includeYouTube: true,
        });
        const track = result.tracks?.[0];
        if (track) {
          callbacks.onTracks([track]);
          callbacks.onClientAction({
            type: 'add_to_queue',
            payload: { track },
          });
          return {
            success: true,
            addedTrack: {
              title: wrapUntrusted(track.title),
              artists: track.artists.map((a) => wrapUntrusted(a)),
            },
          };
        }
        return { success: false, message: 'Không tìm thấy bài hát để thêm vào hàng chờ.' };
      }

      case 'create_playlist': {
        const title = String(args.title || 'Playlist mới').trim();
        const count = Math.min(15, Math.max(1, Number(args.count) || 10));
        const songQuery = String(args.songQuery || title).trim();
        const description = String(
          args.description || `Tạo bởi Trợ lý âm nhạc mq (${count} bài)`
        ).trim();

        callbacks.onStatus(`Đang tuyển chọn bài hát cho playlist "${title}"...`);
        const searchRes = await searchService.search({
          query: expandNaturalMusicQuery(songQuery),
          type: 'track',
          includeYouTube: true,
        });
        const tracks = (searchRes.tracks || []).slice(0, count);
        if (tracks.length > 0) {
          callbacks.onTracks(tracks.slice(0, 4));
        }

        const confirmation: ChatConfirmationAction = {
          id: `confirm-${crypto.randomUUID()}`,
          actionType: 'create_playlist',
          title: `Tạo playlist "${title}"`,
          description: `Tạo playlist mới gồm ${tracks.length} bài hát theo chủ đề "${songQuery}".`,
          payload: {
            title,
            description,
            tracks,
          },
        };
        callbacks.onConfirmation(confirmation);
        return {
          requiresConfirmation: true,
          playlistTitle: title,
          preparedSongsCount: tracks.length,
          note: userId
            ? 'Đã hiển thị thẻ xác nhận tạo playlist cho người dùng.'
            : 'Người dùng cần đăng nhập trước khi bấm Xác nhận lưu playlist.',
        };
      }

      case 'add_to_playlist': {
        const playlistName = String(args.playlistName || '').trim();
        const useCurrent = Boolean(args.useCurrentTrack || !args.songQuery);
        let trackToAdd: UnifiedTrack | null = useCurrent ? context.currentTrack || null : null;

        if (!trackToAdd && args.songQuery) {
          callbacks.onStatus(`Đang tìm bài "${args.songQuery}"...`);
          const res = await searchService.search({
            query: expandNaturalMusicQuery(String(args.songQuery)),
            type: 'track',
            includeYouTube: true,
          });
          trackToAdd = res.tracks?.[0] || null;
        }

        if (!trackToAdd) {
          return {
            success: false,
            message: 'Hiện chưa có bài hát nào đang phát hoặc không tìm thấy bài hát cần thêm.',
          };
        }

        const confirmation: ChatConfirmationAction = {
          id: `confirm-${crypto.randomUUID()}`,
          actionType: 'add_to_playlist',
          title: `Thêm vào playlist "${playlistName}"`,
          description: `Thêm bài "${trackToAdd.title}" (${trackToAdd.artists.join(', ')}) vào playlist "${playlistName}".`,
          payload: {
            playlistName,
            track: trackToAdd,
          },
        };
        callbacks.onConfirmation(confirmation);
        return {
          requiresConfirmation: true,
          playlistName,
          songTitle: wrapUntrusted(trackToAdd.title),
        };
      }

      case 'remove_from_playlist': {
        const playlistName = String(args.playlistName || '').trim();
        const songTitle =
          args.songQuery || context.currentTrack?.title || 'bài hát đã chọn';

        const confirmation: ChatConfirmationAction = {
          id: `confirm-${crypto.randomUUID()}`,
          actionType: 'remove_from_playlist',
          title: `Xóa bài hát khỏi playlist "${playlistName}"`,
          description: `Xác nhận xóa "${songTitle}" khỏi playlist "${playlistName}". Thao tác xóa luôn yêu cầu bạn xác nhận.`,
          payload: {
            playlistName,
            songQuery: String(songTitle),
            trackId: context.currentTrack?.id,
          },
        };
        callbacks.onConfirmation(confirmation);
        return {
          requiresConfirmation: true,
          playlistName,
          songTitle: wrapUntrusted(songTitle),
        };
      }

      case 'get_current_track': {
        if (!context.currentTrack) {
          return { isPlaying: false, currentTrack: null };
        }
        return {
          isPlaying: Boolean(context.isPlaying),
          isShuffle: Boolean(context.isShuffle),
          repeatMode: context.repeatMode || 'off',
          currentTrack: {
            title: wrapUntrusted(context.currentTrack.title),
            artists: context.currentTrack.artists.map((a) => wrapUntrusted(a)),
            album: wrapUntrusted(context.currentTrack.album),
            source: context.currentTrack.source,
            isFullLength: context.currentTrack.isFullLength,
          },
        };
      }

      case 'get_favorites': {
        if (!userId) {
          return { authenticated: false, favorites: [] };
        }
        callbacks.onStatus('Đang tra cứu bài hát yêu thích...');
        const likes = await songService.getUserLikes(userId);
        const topLikes = likes.slice(0, 4);
        if (topLikes.length > 0) {
          callbacks.onTracks(topLikes as any);
        }
        return {
          authenticated: true,
          totalFavorites: likes.length,
          favorites: topLikes.map((l) => ({
            title: wrapUntrusted(l.title),
            artists: l.artists.map((a) => wrapUntrusted(a)),
            source: l.source,
          })),
        };
      }

      case 'get_listening_history': {
        if (!userId) {
          return { authenticated: false, history: [] };
        }
        callbacks.onStatus('Đang tra cứu lịch sử nghe nhạc...');
        const history = await songService.getUserHistory(userId);
        const recent = history.slice(0, 4);
        if (recent.length > 0) {
          callbacks.onTracks(recent as any);
        }
        return {
          authenticated: true,
          totalHistory: history.length,
          recentTracks: recent.map((h) => ({
            title: wrapUntrusted(h.title),
            artists: h.artists.map((a) => wrapUntrusted(a)),
            source: h.source,
          })),
        };
      }

      case 'explain_copyright': {
        return {
          policy: CHAT_BACKEND_CONFIG.copyrightKnowledge,
          guide: CHAT_BACKEND_CONFIG.webGuideKnowledge,
        };
      }

      default:
        return { error: `Công cụ ${toolName} không tồn tại` };
    }
  }

  /** Xử lý luồng chat chính (ưu tiên Gemini API nếu có GEMINI_API_KEY, tự động fallback NLU thông minh) */
  async streamChat(
    userMessage: string,
    history: ChatHistoryItem[],
    context: ChatContextPayload,
    userId: string | undefined,
    callbacks: ChatStreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    const cleanMsg = sanitizeUserMessage(userMessage);
    if (!cleanMsg) {
      callbacks.onToken('Bạn hãy nhập yêu cầu âm nhạc hoặc tên bài hát nhé!');
      return;
    }

    // Chặn yêu cầu chép nguyên văn lời bài hát bản quyền -> mở LyricsDrawer hợp lệ
    if (/(chép lời|viết lời|toàn bộ lời bài|lời bài hát đầy đủ)/i.test(cleanMsg)) {
      await this.executeTool('control_player', { action: 'open_lyrics' }, userId, context, callbacks);
      await this.streamTextTokens(
        'Để tôn trọng bản quyền tác giả, mình không chép nguyên văn lời bài hát trong khung chat. Mình đã mở sẵn **bảng Lời bài hát đồng bộ (LRCLIB)** trên trình phát cho bạn rồi nhé!',
        callbacks,
        signal
      );
      return;
    }

    if (env.GEMINI_API_KEY) {
      try {
        await this.runGeminiWithTools(cleanMsg, history, context, userId, callbacks, signal);
        return;
      } catch (err: any) {
        if (signal?.aborted) return;
        // Nếu Gemini gặp lỗi key/quota thì chuyển mượt sang bộ NLU nội bộ
      }
    }

    await this.runSmartFallbackAssistant(cleanMsg, context, userId, callbacks, signal);
  }

  /** Gọi Gemini API với Function Calling */
  private async runGeminiWithTools(
    cleanMsg: string,
    history: ChatHistoryItem[],
    context: ChatContextPayload,
    userId: string | undefined,
    callbacks: ChatStreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    const recentHistory = (history || []).slice(-CHAT_BACKEND_CONFIG.maxHistoryMessages);

    const contextSummary = [
      `Trang đang xem: ${context.currentPath || '/'}`,
      context.currentTrack
        ? `Bài đang phát: ${wrapUntrusted(context.currentTrack.title)} - ${wrapUntrusted(
            context.currentTrack.artists?.join(', ')
          )} (Nguồn: ${context.currentTrack.source}, ${
            context.currentTrack.isFullLength ? 'Full' : 'Preview 30s'
          }, Trạng thái: ${context.isPlaying ? 'Đang phát' : 'Tạm dừng'})`
        : 'Bài đang phát: Chưa phát bài nào',
      `Đã đăng nhập: ${userId ? 'Có' : 'Chưa'}`,
    ].join('\n');

    const contents: any[] = recentHistory.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: sanitizeUserMessage(m.content) }],
    }));

    contents.push({
      role: 'user',
      parts: [
        {
          text: `[Ngữ cảnh hiện tại]\n${contextSummary}\n\n[Yêu cầu người dùng]\n${cleanMsg}`,
        },
      ],
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;

    const firstRes = await axios.post(
      url,
      {
        systemInstruction: {
          parts: [
            {
              text: `${CHAT_BACKEND_CONFIG.systemPrompt}\n\n${CHAT_BACKEND_CONFIG.copyrightKnowledge}\n\n${CHAT_BACKEND_CONFIG.webGuideKnowledge}`,
            },
          ],
        },
        contents,
        tools: [{ functionDeclarations: GEMINI_TOOL_DECLARATIONS }],
        generationConfig: {
          temperature: CHAT_BACKEND_CONFIG.temperature,
          maxOutputTokens: CHAT_BACKEND_CONFIG.maxOutputTokens,
        },
      },
      { signal, timeout: 15000 }
    );

    const candidate = firstRes.data?.candidates?.[0];
    const parts: any[] = candidate?.content?.parts || [];
    const functionCalls = parts.filter((p) => p.functionCall);

    if (functionCalls.length > 0) {
      const toolResponsesParts: any[] = [];
      for (const fc of functionCalls) {
        const { name, args } = fc.functionCall;
        const result = await this.executeTool(name, args || {}, userId, context, callbacks);
        toolResponsesParts.push({
          functionResponse: {
            name,
            response: { result },
          },
        });
      }

      contents.push(candidate.content);
      contents.push({
        role: 'function',
        parts: toolResponsesParts,
      });

      const secondRes = await axios.post(
        url,
        {
          systemInstruction: {
            parts: [{ text: CHAT_BACKEND_CONFIG.systemPrompt }],
          },
          contents,
          generationConfig: {
            temperature: CHAT_BACKEND_CONFIG.temperature,
            maxOutputTokens: CHAT_BACKEND_CONFIG.maxOutputTokens,
          },
        },
        { signal, timeout: 15000 }
      );

      const finalText =
        secondRes.data?.candidates?.[0]?.content?.parts
          ?.map((p: any) => p.text || '')
          .join('') || 'Mình đã thực hiện xong yêu cầu của bạn!';
      await this.streamTextTokens(finalText, callbacks, signal);
      return;
    }

    const directText =
      parts.map((p) => p.text || '').join('') ||
      'Mình có thể giúp bạn tìm bài hát, điều khiển nhạc hoặc tạo playlist nhé!';
    await this.streamTextTokens(directText, callbacks, signal);
  }

  /** Bộ xử lý NLU nội bộ giúp toàn bộ chức năng chạy mượt ngay cả khi chưa điền GEMINI_API_KEY */
  private async runSmartFallbackAssistant(
    msg: string,
    context: ChatContextPayload,
    userId: string | undefined,
    callbacks: ChatStreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    const lower = msg.toLowerCase();

    // 0. Từ chối lịch sự các chủ đề ngoài âm nhạc & web mq
    if (
      /(viết code|lập trình python|giải phương trình|chính trị|chứng khoán|bóng đá|thời tiết hôm nay|nấu ăn)/i.test(
        lower
      ) &&
      !/(nhạc|bài hát|ca sĩ|playlist|album)/i.test(lower)
    ) {
      await this.streamTextTokens(
        'Mình là **Trợ lý âm nhạc mq**, nên chỉ hỗ trợ tìm kiếm bài hát, gợi ý nhạc theo tâm trạng, quản lý playlist, điều khiển trình phát và giải đáp thông tin trên web **mq** thôi nhé! Bạn muốn nghe thử một giai điệu nào không?',
        callbacks,
        signal
      );
      return;
    }

    // 1. Giải thích bản quyền / tại sao 30s / Full vs Preview
    if (
      /(30\s*giây|30s|preview|xem trước|nghe thử|bản quyền|nguồn nhạc|vì sao.*ngắn|tại sao.*30)/i.test(
        lower
      )
    ) {
      await this.executeTool('explain_copyright', { topic: msg }, userId, context, callbacks);
      const reply = [
        'Trên **mq**, sự khác nhau giữa **Full** và **Preview (30 giây)** đến từ chính sách bản quyền của từng nguồn API chính thức:',
        '- **Nhãn Full (Xanh lá)**: Phát trọn vẹn 100% thời lượng từ kho nhạc **Local/Admin**, **Zing MP3**, **Audius**, **Jamendo (Creative Commons)** và **YouTube IFrame API**.',
        '- **Nhãn Preview (30 giây)**: Một số bản thu từ **Apple Music / iTunes** hoặc **Spotify** chỉ cấp phép đoạn nghe thử 30 giây miễn phí theo quy định của hãng đĩa.',
        '',
        'Bạn có thể ưu tiên chọn các bài có huy hiệu **Full** màu xanh lá để thưởng thức trọn vẹn bài hát nhé!',
      ].join('\n');
      await this.streamTextTokens(reply, callbacks, signal);
      return;
    }

    // 2. Hướng dẫn sử dụng web / phím tắt / đổi theme
    if (/(phím tắt|hướng dẫn|cách dùng|đổi chế độ|sáng tối|dark mode|light mode|ctrl)/i.test(lower)) {
      const reply = [
        'Dưới đây là các mẹo và phím tắt nhanh trên **mq**:',
        '- **Ctrl + K** (hoặc **⌘K**): Mở nhanh thanh tìm kiếm thông minh trên Navbar.',
        '- **Ctrl + /** : Mở hoặc đóng nhanh khung **Trợ lý âm nhạc mq**.',
        '- **Phím L**: Bật/tắt bảng **Lời bài hát đồng bộ (LRCLIB)**.',
        '- **Space (Phím cách)**: Phát / Tạm dừng bài hát hiện tại.',
        '- **Đổi giao diện Sáng / Tối**: Bấm biểu tượng Mặt trời / Mặt trăng ở góc phải trên thanh điều hướng (bấm biểu tượng giọt nước kế bên để đổi hiệu ứng chuyển cảnh).',
      ].join('\n');
      await this.streamTextTokens(reply, callbacks, signal);
      return;
    }

    // 3. Tạo playlist bằng hội thoại ("Tạo playlist 15 bài rap Việt để chạy bộ", "Tạo playlist chạy bộ")
    if (/tạo\s+playlist/i.test(lower)) {
      const countMatch = msg.match(/(\d+)\s*bài/i);
      const count = countMatch ? Math.min(15, Math.max(1, parseInt(countMatch[1], 10))) : 10;
      const cleaned = msg
        .replace(/tạo\s+playlist/i, '')
        .replace(/(\d+)\s*bài/i, '')
        .trim();
      const title = cleaned
        ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
        : 'Giai điệu yêu thích';
      const songQuery = cleaned || 'nhạc trẻ thịnh hành';

      const res = await this.executeTool(
        'create_playlist',
        { title, songQuery, count },
        userId,
        context,
        callbacks
      );
      await this.streamTextTokens(
        `Mình đã chuẩn bị sẵn playlist **"${title}"** với **${res.preparedSongsCount || count} bài hát** phù hợp. Bạn bấm nút **Xác nhận** bên dưới để lưu playlist vào thư viện nhé!`,
        callbacks,
        signal
      );
      return;
    }

    // 4. Thêm bài vào playlist ("thêm bài đang phát vào playlist Học tập")
    if (/thêm.*vào\s+playlist/i.test(lower)) {
      const plMatch = msg.match(/playlist\s+["“']?([^"”'\n]+)["”']?$/i);
      const playlistName = plMatch ? plMatch[1].trim() : 'Yêu thích';
      const useCurrent = /đang phát|bài này|hiện tại/i.test(lower);
      let songQuery: string | undefined;
      if (!useCurrent) {
        const m = msg.match(/thêm\s+(?:bài\s+)?(.+?)\s+vào\s+playlist/i);
        if (m) songQuery = m[1].trim();
      }

      const res = await this.executeTool(
        'add_to_playlist',
        { playlistName, useCurrentTrack: useCurrent, songQuery },
        userId,
        context,
        callbacks
      );
      if (res.requiresConfirmation) {
        await this.streamTextTokens(
          `Mình đã tạo yêu cầu thêm bài **${res.songTitle}** vào playlist **"${playlistName}"**. Bạn bấm **Xác nhận** ở thẻ bên dưới để thực hiện nhé!`,
          callbacks,
          signal
        );
      } else {
        await this.streamTextTokens(
          res.message || 'Bạn hãy phát một bài hát hoặc nêu rõ tên bài hát muốn thêm vào playlist nhé!',
          callbacks,
          signal
        );
      }
      return;
    }

    // 5. Xóa bài khỏi playlist ("xóa bài này khỏi playlist ...")
    if (/(xóa|gỡ).*khỏi\s+playlist/i.test(lower)) {
      const plMatch = msg.match(/playlist\s+["“']?([^"”'\n]+)["”']?$/i);
      const playlistName = plMatch ? plMatch[1].trim() : 'Playlist của bạn';
      await this.executeTool(
        'remove_from_playlist',
        { playlistName, useCurrentTrack: true },
        userId,
        context,
        callbacks
      );
      await this.streamTextTokens(
        `Vì thao tác xóa làm thay đổi dữ liệu playlist, bạn vui lòng bấm **Xác nhận** ở thẻ bên dưới để gỡ bài hát khỏi **"${playlistName}"** nhé.`,
        callbacks,
        signal
      );
      return;
    }

    // 6. Điều khiển trình phát (tạm dừng, tiếp tục, bài tiếp, bài trước, lặp lại, trộn bài, âm lượng, lời bài hát, hàng chờ)
    if (/^(tạm dừng|dừng nhạc|pause)$/i.test(lower) || /tạm dừng nhạc|dừng phát/i.test(lower)) {
      await this.executeTool('control_player', { action: 'pause' }, userId, context, callbacks);
      await this.streamTextTokens('Đã tạm dừng phát nhạc.', callbacks, signal);
      return;
    }
    if (/^(tiếp tục|phát tiếp|resume)$/i.test(lower)) {
      await this.executeTool('control_player', { action: 'play' }, userId, context, callbacks);
      await this.streamTextTokens('Đã tiếp tục phát nhạc.', callbacks, signal);
      return;
    }
    if (/(bài tiếp|qua bài|chuyển bài|next)/i.test(lower)) {
      await this.executeTool('control_player', { action: 'next' }, userId, context, callbacks);
      await this.streamTextTokens('Đã chuyển sang bài hát tiếp theo.', callbacks, signal);
      return;
    }
    if (/(bài trước|quay lại bài|previous)/i.test(lower)) {
      await this.executeTool('control_player', { action: 'previous' }, userId, context, callbacks);
      await this.streamTextTokens('Đã quay lại bài hát trước đó.', callbacks, signal);
      return;
    }
    if (/(lặp 1 bài|lặp một bài|repeat one)/i.test(lower)) {
      await this.executeTool('control_player', { action: 'repeat_one' }, userId, context, callbacks);
      await this.streamTextTokens('Đã bật chế độ **Lặp lại 1 bài**.', callbacks, signal);
      return;
    }
    if (/(tắt lặp|bỏ lặp|repeat off)/i.test(lower)) {
      await this.executeTool('control_player', { action: 'repeat_off' }, userId, context, callbacks);
      await this.streamTextTokens('Đã tắt chế độ lặp lại.', callbacks, signal);
      return;
    }
    if (/(lặp lại|bật lặp|repeat)/i.test(lower)) {
      await this.executeTool('control_player', { action: 'repeat_all' }, userId, context, callbacks);
      await this.streamTextTokens('Đã bật chế độ **Lặp lại toàn bộ danh sách**.', callbacks, signal);
      return;
    }
    if (/(tắt trộn|tắt ngẫu nhiên|shuffle off)/i.test(lower)) {
      await this.executeTool('control_player', { action: 'shuffle_off' }, userId, context, callbacks);
      await this.streamTextTokens('Đã tắt chế độ phát ngẫu nhiên.', callbacks, signal);
      return;
    }
    if (/(trộn bài|ngẫu nhiên|shuffle)/i.test(lower)) {
      await this.executeTool('control_player', { action: 'shuffle_on' }, userId, context, callbacks);
      await this.streamTextTokens('Đã bật chế độ **Phát ngẫu nhiên (Shuffle)**.', callbacks, signal);
      return;
    }
    if (/(âm lượng|volume)/i.test(lower)) {
      const volMatch = msg.match(/(\d{1,3})/);
      const volumePercent = volMatch ? Math.min(100, Math.max(0, parseInt(volMatch[1], 10))) : 70;
      await this.executeTool(
        'control_player',
        { action: 'volume', volumePercent },
        userId,
        context,
        callbacks
      );
      await this.streamTextTokens(
        `Đã điều chỉnh âm lượng trình phát về mức **${volumePercent}%**.`,
        callbacks,
        signal
      );
      return;
    }
    if (/(bật lời|mở lời|xem lời|lời bài hát|lyrics)/i.test(lower)) {
      await this.executeTool('control_player', { action: 'open_lyrics' }, userId, context, callbacks);
      await this.streamTextTokens(
        'Đã mở bảng **Lời bài hát đồng bộ (LRCLIB)** cho bạn!',
        callbacks,
        signal
      );
      return;
    }
    if (/(thêm vào hàng chờ|thêm vào queue)/i.test(lower)) {
      const q = msg.replace(/.*(thêm vào hàng chờ|thêm vào queue)\s*(bài)?/i, '').trim() || 'nhạc trẻ';
      const res = await this.executeTool('add_to_queue', { query: q }, userId, context, callbacks);
      await this.streamTextTokens(
        res.success
          ? `Đã thêm **${res.addedTrack.title}** vào hàng chờ phát tiếp theo.`
          : 'Mình chưa tìm thấy bài hát đó để thêm vào hàng chờ.',
        callbacks,
        signal
      );
      return;
    }

    // 7. Gợi ý cá nhân hóa ("nghe gì giống bài này", "gợi ý giống bài đang phát", "nghệ sĩ nào giống...")
    if (/(giống bài này|giống bài đang phát|tương tự bài này|gợi ý cá nhân)/i.test(lower)) {
      if (context.currentTrack) {
        const primaryArtist = context.currentTrack.artists?.[0] || context.currentTrack.title;
        const res = await this.executeTool(
          'search_songs',
          { query: primaryArtist, limit: 4 },
          userId,
          context,
          callbacks
        );
        await this.streamTextTokens(
          `Dựa trên bài **"${context.currentTrack.title}"** của **${primaryArtist}** mà bạn đang nghe, đây là ${res.count} ca khúc cùng màu sắc âm nhạc rất hợp để nghe tiếp:`,
          callbacks,
          signal
        );
        return;
      }
      if (userId) {
        const favs = await this.executeTool('get_favorites', {}, userId, context, callbacks);
        if (favs.totalFavorites > 0) {
          await this.streamTextTokens(
            'Hiện bạn chưa phát bài nào, nên mình gợi ý lại các ca khúc từ danh sách **Yêu thích** của bạn nhé:',
            callbacks,
            signal
          );
          return;
        }
      }
      await this.executeTool('search_songs', { query: 'V-Pop thịnh hành', limit: 4 }, userId, context, callbacks);
      await this.streamTextTokens(
        'Hiện chưa có bài nào đang phát, mình gợi ý cho bạn các bản hit **V-Pop thịnh hành** đang được nghe nhiều nhất trên mq nhé:',
        callbacks,
        signal
      );
      return;
    }

    // 8. Hỏi về nghệ sĩ / tiểu sử trong DB
    if (/(tiểu sử|nghệ sĩ nào giống|ai là ca sĩ|thông tin về ca sĩ|thông tin nghệ sĩ)/i.test(lower)) {
      const artistList = await prisma.artist.findMany({ take: 40 });
      const matched = artistList.find((a) => lower.includes(a.name.toLowerCase()));
      if (matched) {
        await this.executeTool('search_songs', { query: matched.name, limit: 4 }, userId, context, callbacks);
        await this.streamTextTokens(
          `**${matched.name}** ${
            matched.isVerified ? '(Nghệ sĩ xác minh trên mq) ' : ''
          }— ${
            matched.bio || 'Một trong những nghệ sĩ nổi bật được yêu thích trên mq.'
          }\n\nDưới đây là các ca khúc tiêu biểu của **${matched.name}** để bạn thưởng thức ngay:`,
          callbacks,
          signal
        );
        return;
      }
      await this.streamTextTokens(
        'Mình chưa có đầy đủ dữ liệu xác thực về tiểu sử chi tiết này trong kho dữ liệu của **mq** (mình xin phép không tự đoán để tránh sai lệch). Bạn có muốn mình tìm các bài hát liên quan để nghe thử không?',
        callbacks,
        signal
      );
      return;
    }

    // 9. Mặc định: Tìm kiếm hoặc phát nhạc theo ngôn ngữ tự nhiên
    const wantsImmediatePlay = /^(mở|phát|bật)\s+(ngay\s+)?(bài|nhạc)/i.test(lower);
    if (wantsImmediatePlay) {
      const res = await this.executeTool('play_song', { query: msg }, userId, context, callbacks);
      if (res.success) {
        await this.streamTextTokens(
          `Đang phát ngay **${res.playingTrack.title}** cho bạn! Bên dưới là các phiên bản và bài hát cùng chủ đề:`,
          callbacks,
          signal
        );
        return;
      }
    }

    const searchRes = await this.executeTool(
      'search_songs',
      { query: msg, limit: 4 },
      userId,
      context,
      callbacks
    );
    if (searchRes.count > 0) {
      await this.streamTextTokens(
        `Mình tìm thấy **${searchRes.count} bài hát** rất hợp với yêu cầu *"${msg}"* của bạn. Bạn bấm **Phát** trên thẻ bài hát để nghe ngay hoặc bấm **+** để lưu vào playlist nhé!`,
        callbacks,
        signal
      );
    } else {
      await this.streamTextTokens(
        `Mình chưa tìm thấy kết quả khớp hoàn toàn với *"${msg}"*. Bạn thử nhập tên bài hát, tên nghệ sĩ hoặc tâm trạng (ví dụ: *"nhạc chill học bài"*, *"Sơn Tùng M-TP"*) nhé!`,
        callbacks,
        signal
      );
    }
  }

  /** Phát chữ dần dần (streaming SSE) tạo cảm giác gõ mượt theo thời gian thực */
  private async streamTextTokens(
    fullText: string,
    callbacks: ChatStreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    const chunks = fullText.match(/.{1,14}(\s|$)|.{1,14}/gs) || [fullText];
    for (const chunk of chunks) {
      if (signal?.aborted) return;
      callbacks.onToken(chunk);
      await new Promise((r) => setTimeout(r, 18));
    }
  }

  /** Thực thi hành động đã được người dùng bấm nút "Xác nhận" trên thẻ trong chat */
  async executeConfirmedAction(
    userId: string,
    actionType: 'create_playlist' | 'add_to_playlist' | 'remove_from_playlist',
    payload: Record<string, any>
  ): Promise<{ message: string; playlistId?: string }> {
    if (actionType === 'create_playlist') {
      const title = String(payload.title || 'Playlist mới').trim();
      const description = String(payload.description || 'Tạo từ Trợ lý âm nhạc mq').trim();
      const tracks: UnifiedTrack[] = Array.isArray(payload.tracks) ? payload.tracks : [];

      const created = await playlistService.createPlaylist(userId, {
        title,
        description,
        isPublic: true,
        coverUrl: tracks[0]?.coverUrl,
      });

      for (const track of tracks) {
        try {
          await playlistService.addSong(userId, created.id, track);
        } catch {
          // Bỏ qua bài bị lỗi lẻ để không làm hỏng cả playlist
        }
      }

      return {
        playlistId: created.id,
        message: `Đã tạo playlist "${created.title}" với ${tracks.length} bài hát thành công!`,
      };
    }

    if (actionType === 'add_to_playlist') {
      const playlistName = String(payload.playlistName || '').trim();
      const track: UnifiedTrack | undefined = payload.track;
      if (!track) {
        throw new Error('Không có thông tin bài hát để thêm vào playlist.');
      }

      const userPlaylists = await playlistService.getUserPlaylists(userId);
      let target: { id: string; title: string } | undefined = userPlaylists.find(
        (p) => p.title.toLowerCase() === playlistName.toLowerCase()
      );
      if (!target) {
        target = await playlistService.createPlaylist(userId, {
          title: playlistName || 'Playlist mới',
          description: 'Tạo tự động bởi Trợ lý âm nhạc mq',
          isPublic: true,
          coverUrl: track.coverUrl,
        });
      }

      await playlistService.addSong(userId, target.id, track);
      return {
        playlistId: target.id,
        message: `Đã thêm "${track.title}" vào playlist "${target.title}"!`,
      };
    }

    if (actionType === 'remove_from_playlist') {
      const playlistName = String(payload.playlistName || '').trim();
      const songQuery = String(payload.songQuery || '').toLowerCase().trim();

      const userPlaylists = await playlistService.getUserPlaylists(userId);
      const target =
        userPlaylists.find((p) => p.title.toLowerCase() === playlistName.toLowerCase()) ||
        userPlaylists[0];

      if (!target) {
        throw new Error(`Không tìm thấy playlist "${playlistName}".`);
      }

      const detail = await playlistService.getPlaylist(target.id, userId);
      const matchedTrack = detail?.tracks?.find(
        (t) =>
          t.title.toLowerCase().includes(songQuery) ||
          (payload.trackId && t.id === payload.trackId)
      );

      if (!matchedTrack) {
        throw new Error(`Không tìm thấy bài hát cần xóa trong playlist "${target.title}".`);
      }

      const rawSongId = matchedTrack.id.startsWith('local:')
        ? matchedTrack.id.replace(/^local:/, '')
        : (matchedTrack as any).dbId || matchedTrack.sourceId;

      const dbSong = await prisma.song.findFirst({
        where: {
          OR: [{ id: rawSongId }, { sourceId: matchedTrack.sourceId }],
        },
      });

      if (!dbSong) {
        throw new Error('Không tìm thấy bản ghi bài hát trong playlist.');
      }

      await playlistService.removeSong(userId, target.id, dbSong.id);
      return {
        playlistId: target.id,
        message: `Đã xóa "${matchedTrack.title}" khỏi playlist "${target.title}".`,
      };
    }

    throw new Error('Hành động xác nhận không hợp lệ.');
  }
}

export const chatService = new ChatService();
