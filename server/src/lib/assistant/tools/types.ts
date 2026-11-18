import { z } from 'zod';
import { AssistantAuthContext } from '../auth.js';
import { ValidatedChatContext, wrapExternalData } from '../context.js';
import { UnifiedTrack } from '../../../providers/music-provider.interface.js';

/** Định dạng bài hát rút gọn trả về cho mô hình để tiết kiệm token */
export interface CompactTrack {
  id: string;
  title: string;
  artist: string;
  cover: string | null;
  source: string;
  isFull: boolean;
  duration: number;
}

export interface UIActionEventPayload {
  action: string;
  payload: Record<string, any>;
}

export interface ToolExecutionEnv {
  auth: AssistantAuthContext;
  context: ValidatedChatContext;
  signal?: AbortSignal;
  emitUIAction: (uiAction: UIActionEventPayload) => void;
  emitTracksPreview?: (tracks: UnifiedTrack[]) => void;
}

export interface AssistantToolDefinition<TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  category: 'read' | 'ui_action' | 'mutation' | 'admin';
  schema: TSchema;
  jsonSchema: {
    type: 'OBJECT';
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (args: z.infer<TSchema>, env: ToolExecutionEnv) => Promise<Record<string, any>>;
}

export function toCompactTrack(track: Partial<UnifiedTrack> & { id: string; title: string }): CompactTrack {
  const artistStr = Array.isArray(track.artists)
    ? track.artists.join(', ')
    : String((track as any).artist || '');
  return {
    id: track.id,
    title: wrapExternalData(track.title),
    artist: wrapExternalData(artistStr),
    cover: track.coverUrl || null,
    source: track.source || 'local',
    isFull: Boolean(track.isFullLength ?? true),
    duration: Math.round(Number(track.durationMs || 0) / 1000),
  };
}

export function expandMoodOrNaturalQuery(query: string, mood?: string): string {
  const combined = `${query} ${mood || ''}`.toLowerCase().trim();
  if (/buồn.*mưa|mưa.*buồn|nghe lúc mưa/.test(combined)) {
    return 'nhạc buồn mưa ballad Việt';
  }
  if (/chill.*học|học bài|tập trung|đọc sách/.test(combined)) {
    return 'nhạc chill học bài acoustic lofi';
  }
  if (/chạy bộ|tập gym|thể thao|sôi động/.test(combined)) {
    return 'rap Việt sôi động remix';
  }
  if (/ai mang cô đơn/.test(combined)) {
    return 'Ai Mang Cô Đơn Đi';
  }
  return (
    query
      .replace(
        /^(hãy\s+)?(mở|phát|bật|tìm|nghe|cho tôi nghe|tìm bài|mở bài|bài hát có câu|bài có câu)\s+/i,
        ''
      )
      .replace(/^['"“”]|['"“”]$/g, '')
      .trim() || query
  );
}
