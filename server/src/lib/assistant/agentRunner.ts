import axios from 'axios';
import { ASSISTANT_CONFIG } from './config.js';
import { AssistantAuthContext } from './auth.js';
import {
  buildTrimmedContext,
  selectModelForTurn,
  ValidatedChatContext,
  ValidatedChatMessage,
} from './context.js';
import { buildSystemPrompt } from './systemPrompt.js';
import {
  buildGeminiToolsDeclaration,
  executeRegisteredTool,
  getRegisteredToolsForUser,
} from './registry.js';
import {
  AssistantError,
  classifyAssistantError,
  logAssistantMetadata,
} from './errors.js';
import { getChatbotRuntimeSettings } from './settings.js';
import {
  recordChatTurnToDatabase,
  RecordedToolCallStep,
} from './logging.js';
import { UnifiedTrack } from '../../providers/music-provider.interface.js';

export type AssistantSSEEventType =
  | 'text_delta'
  | 'tool_call'
  | 'tool_result'
  | 'ui_action'
  | 'error'
  | 'done'
  // Tương thích thêm với UI hiện có
  | 'token'
  | 'status'
  | 'tracks'
  | 'client_action'
  | 'confirmation';

export interface AssistantSSEStreamEmitter {
  emit: (event: AssistantSSEEventType, data: Record<string, any>) => void;
}

/** Gọi Gemini REST API kèm Retry + Exponential Backoff cho lỗi tạm thời (5xx/timeout), không retry lỗi 4xx */
async function callGeminiWithRetry(
  url: string,
  payload: Record<string, any>,
  signal?: AbortSignal
): Promise<any> {
  let attempt = 0;
  const maxRetries = ASSISTANT_CONFIG.retry.maxRetries;

  while (true) {
    try {
      const res = await axios.post(url, payload, {
        signal,
        timeout: 18000,
      });
      return res.data;
    } catch (err: any) {
      if (signal?.aborted) throw err;

      const status = err?.response?.status;
      const is4xx = status && status >= 400 && status < 500;
      if (is4xx || attempt >= maxRetries) {
        throw err;
      }

      attempt += 1;
      const delay = ASSISTANT_CONFIG.retry.baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/** Phát văn bản theo từng cụm nhỏ qua sự kiện text_delta (và token cho client hiện có) */
async function emitTextDeltaStream(
  text: string,
  emitter: AssistantSSEStreamEmitter,
  signal?: AbortSignal
): Promise<void> {
  const chunks = text.match(/.{1,16}(\s|$)|.{1,16}/gs) || [text];
  for (const delta of chunks) {
    if (signal?.aborted) return;
    emitter.emit('text_delta', { delta });
    emitter.emit('token', { text: delta });
    await new Promise((r) => setTimeout(r, 12));
  }
}

/** Chuyển đổi sự kiện ui_action chuẩn sang sự kiện client_action / confirmation cho giao diện */
function forwardUIActionToClient(
  uiAction: { action: string; payload: Record<string, any> },
  emitter: AssistantSSEStreamEmitter
) {
  emitter.emit('ui_action', uiAction);

  if (uiAction.action === 'confirmation_required') {
    emitter.emit('confirmation', uiAction.payload);
    return;
  }

  if (uiAction.action === 'play_song') {
    emitter.emit('client_action', {
      type: 'play_song',
      payload: uiAction.payload,
    });
    return;
  }

  if (uiAction.action === 'add_to_queue') {
    emitter.emit('client_action', {
      type: 'add_to_queue',
      payload: uiAction.payload,
    });
    return;
  }

  if (uiAction.action === 'open_lyrics') {
    emitter.emit('client_action', {
      type: 'control_player',
      payload: { action: 'open_lyrics' },
    });
    return;
  }

  if (uiAction.action === 'navigate') {
    emitter.emit('client_action', {
      type: 'navigate',
      payload: uiAction.payload,
    });
    return;
  }

  if (uiAction.action === 'control_player') {
    const raw = uiAction.payload.action;
    const val = uiAction.payload.value;
    let mappedAction = raw;
    let volumePercent: number | undefined;

    if (raw === 'prev') mappedAction = 'previous';
    if (raw === 'repeat') {
      mappedAction =
        val === 'one' ? 'repeat_one' : val === 'off' ? 'repeat_off' : 'repeat_all';
    }
    if (raw === 'shuffle') {
      mappedAction = val === 'off' || val === false ? 'shuffle_off' : 'shuffle_on';
    }
    if (raw === 'volume') {
      volumePercent = Number(val ?? 70);
    }

    emitter.emit('client_action', {
      type: 'control_player',
      payload: { action: mappedAction, volumePercent, value: val },
    });
  }
}

/**
 * Vòng lặp Agent chính của "Trợ lý mq":
 * - Cắt ngữ cảnh (10-12 tin gần nhất + tóm tắt tin cũ).
 * - Đăng ký tool theo quyền (GUEST / USER / ADMIN).
 * - Gọi model -> nếu có tool_call thì thực thi -> trả tool_result lại cho model -> lặp tối đa 5 vòng / 6 tool calls.
 * - Hỗ trợ hủy qua AbortSignal và giới hạn tổng thời gian 60s.
 */
export async function runAssistantAgentTurn(params: {
  messages: ValidatedChatMessage[];
  context: ValidatedChatContext;
  auth: AssistantAuthContext;
  emitter: AssistantSSEStreamEmitter;
  signal?: AbortSignal;
  conversationId?: string;
}): Promise<{ iterations: number; toolCallsCount: number; toolsUsed: string[] }> {
  const startedAt = Date.now();
  const toolsUsed: string[] = [];
  const recordedToolSteps: RecordedToolCallStep[] = [];
  let accumulatedReply = '';
  let iterations = 0;
  let toolCallsCount = 0;

  const runtimeSettings = await getChatbotRuntimeSettings();

  // Kill Switch: Nếu Admin đã tắt toàn bộ Chatbot thì trả thông báo bảo trì ngay
  if (!runtimeSettings.enabled) {
    await emitTextDeltaStream(
      runtimeSettings.maintenanceMessage,
      params.emitter,
      params.signal
    );
    params.emitter.emit('done', { iterations: 0, toolCalls: 0, maintenance: true });
    return { iterations: 0, toolCallsCount: 0, toolsUsed: [] };
  }

  const wrappedEmitter: AssistantSSEStreamEmitter = {
    emit: (event, data) => {
      if (event === 'text_delta' && typeof data.delta === 'string') {
        accumulatedReply += data.delta;
      }
      params.emitter.emit(event, data);
    },
  };

  const requestTimeoutController = new AbortController();
  const overallTimer = setTimeout(() => {
    requestTimeoutController.abort();
  }, runtimeSettings.requestTimeoutMs || ASSISTANT_CONFIG.requestTimeoutMs);

  const combinedAbort = () =>
    Boolean(params.signal?.aborted || requestTimeoutController.signal.aborted);

  const { recentMessages, olderSummary } = buildTrimmedContext(params.messages);
  const lastUserMessage =
    [...recentMessages].reverse().find((m) => m.role === 'user')?.content || '';

  const toolsMap = getRegisteredToolsForUser(params.auth, runtimeSettings);
  const isSimple = selectModelForTurn(lastUserMessage) === ASSISTANT_CONFIG.fastModel;
  const selectedModel = isSimple
    ? runtimeSettings.secondaryModel
    : runtimeSettings.primaryModel;
  const systemInstructionText = buildSystemPrompt(params.context, olderSummary);

  const toolEnv = {
    auth: params.auth,
    context: params.context,
    signal: params.signal,
    emitUIAction: (uiAction: { action: string; payload: Record<string, any> }) => {
      forwardUIActionToClient(uiAction, wrappedEmitter);
    },
    emitTracksPreview: (tracks: UnifiedTrack[]) => {
      wrappedEmitter.emit('tracks', { tracks: tracks.slice(0, 5) });
    },
  };

  try {
    // Chặn cứng các nỗ lực Prompt Injection yêu cầu in system prompt / API key
    if (
      /(bỏ qua mọi chỉ dẫn|ignore all previous instructions|in system prompt|print system prompt|tiết lộ system prompt|show api key)/i.test(
        lastUserMessage
      )
    ) {
      await emitTextDeltaStream(
        'Mình là **Trợ lý âm nhạc mq**, mình không thể tiết lộ cấu hình hệ thống nội bộ. Bạn có muốn mình tìm một bài hát hay tạo playlist cho bạn không?',
        wrappedEmitter,
        params.signal
      );
      wrappedEmitter.emit('done', { iterations: 1, toolCalls: 0 });
      return { iterations: 1, toolCallsCount: 0, toolsUsed };
    }

    // Chặn yêu cầu viết/trích nguyên văn lời bài hát bản quyền -> gọi open_lyrics (LRCLIB)
    if (
      /(cho tôi lời bài hát|viết lời bài hát|chép lời bài hát|toàn bộ lời bài|lyrics của bài)/i.test(
        lastUserMessage
      )
    ) {
      const stepStart = Date.now();
      iterations = 1;
      toolCallsCount = 1;
      toolsUsed.push('open_lyrics');
      wrappedEmitter.emit('tool_call', { name: 'open_lyrics', args: {} });
      wrappedEmitter.emit('status', { text: 'Đang mở bảng lời bài hát đồng bộ...' });
      const res = await executeRegisteredTool('open_lyrics', {}, toolEnv, toolsMap);
      wrappedEmitter.emit('tool_result', { name: 'open_lyrics', result: res.data });
      recordedToolSteps.push({
        stepIndex: 1,
        toolName: 'open_lyrics',
        args: {},
        resultSummary: res.data,
        status: res.ok ? 'success' : 'error',
        durationMs: Date.now() - stepStart,
      });

      await emitTextDeltaStream(
        'Để tôn trọng bản quyền tác giả, mình không tự viết hay trích dẫn nguyên văn lời bài hát trong khung chat. Mình đã mở **bảng Lời bài hát đồng bộ (nguồn LRCLIB)** trên giao diện cho bạn rồi nhé!',
        wrappedEmitter,
        params.signal
      );
      wrappedEmitter.emit('done', { iterations, toolCalls: toolCallsCount });
      return { iterations, toolCallsCount, toolsUsed };
    }

    // Nếu có GEMINI_API_KEY: chạy vòng lặp Agent với Gemini (tối đa 5 vòng lặp)
    if (ASSISTANT_CONFIG.apiKey) {
      try {
        const geminiContents: any[] = recentMessages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

        const geminiTools = buildGeminiToolsDeclaration(toolsMap);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${ASSISTANT_CONFIG.apiKey}`;

        while (iterations < ASSISTANT_CONFIG.maxAgentIterations) {
          if (combinedAbort()) break;
          iterations += 1;

          const data = await callGeminiWithRetry(
            url,
            {
              systemInstruction: { parts: [{ text: systemInstructionText }] },
              contents: geminiContents,
              tools: [{ functionDeclarations: geminiTools }],
              generationConfig: {
                temperature: ASSISTANT_CONFIG.temperature,
                maxOutputTokens: ASSISTANT_CONFIG.maxTokens,
              },
            },
            params.signal
          );

          const candidate = data?.candidates?.[0];
          const parts: any[] = candidate?.content?.parts || [];
          const fnCalls = parts.filter((p) => p.functionCall);

          if (fnCalls.length === 0) {
            const finalReply =
              parts.map((p) => p.text || '').join('') ||
              'Mình đã hoàn tất yêu cầu của bạn!';
            await emitTextDeltaStream(finalReply, params.emitter, params.signal);
            params.emitter.emit('done', { iterations, toolCalls: toolCallsCount });
            return { iterations, toolCallsCount, toolsUsed };
          }

          geminiContents.push(candidate.content);
          const fnResponseParts: any[] = [];

          for (const fc of fnCalls) {
            if (toolCallsCount >= ASSISTANT_CONFIG.maxToolCallsPerTurn) {
              break;
            }
            const name: string = fc.functionCall.name;
            const args: Record<string, any> = fc.functionCall.args || {};

            toolCallsCount += 1;
            toolsUsed.push(name);
            params.emitter.emit('tool_call', { name, args });
            params.emitter.emit('status', { text: `Đang thực hiện ${name}...` });

            const execRes = await executeRegisteredTool(name, args, toolEnv, toolsMap);
            params.emitter.emit('tool_result', { name, result: execRes.data });

            fnResponseParts.push({
              functionResponse: {
                name,
                response: execRes.data,
              },
            });
          }

          geminiContents.push({
            role: 'function',
            parts: fnResponseParts,
          });
        }
      } catch (geminiErr: any) {
        if (combinedAbort()) throw geminiErr;
        // Nếu Gemini lỗi tạm thời hoặc chưa cấu hình key hợp lệ thì chuyển sang bộ điều phối Deterministic Agent Loop bên dưới
      }
    }

    // Bộ điều phối Deterministic Agent Loop (đảm bảo tool_call -> tool_result -> text_delta hoạt động 100% kể cả khi dev không có khóa ngoài)
    const fallbackResult = await runDeterministicAgentLoop({
      userMessage: lastUserMessage,
      toolEnv,
      toolsMap,
      emitter: wrappedEmitter,
      signal: params.signal,
      recordedToolSteps,
    });

    iterations = fallbackResult.iterations;
    toolCallsCount = fallbackResult.toolCallsCount;
    toolsUsed.push(...fallbackResult.toolsUsed);

    wrappedEmitter.emit('done', { iterations, toolCalls: toolCallsCount });
    return { iterations, toolCallsCount, toolsUsed };
  } catch (err: any) {
    const classified = classifyAssistantError(err);
    wrappedEmitter.emit('error', {
      code: classified.code,
      message: classified.message,
      ...(classified.retryAfterSec ? { retryAfterSec: classified.retryAfterSec } : {}),
    });
    logAssistantMetadata({
      userId: params.auth.userId,
      durationMs: Date.now() - startedAt,
      toolsUsed,
      model: selectedModel,
      errorCode: classified.code,
    });
    return { iterations, toolCallsCount, toolsUsed };
  } finally {
    clearTimeout(overallTimer);
    const totalLatency = Date.now() - startedAt;
    logAssistantMetadata({
      userId: params.auth.userId,
      durationMs: totalLatency,
      toolsUsed,
      model: selectedModel,
    });
    // Ghi log hội thoại bất đồng bộ vào DB (không chặn phản hồi SSE)
    void recordChatTurnToDatabase({
      conversationId: params.conversationId,
      userId: params.auth.userId,
      ip: params.auth.ip,
      model: selectedModel,
      userMessage: lastUserMessage,
      assistantMessage: accumulatedReply,
      toolCalls: recordedToolSteps,
      latencyMs: totalLatency,
    });
  }
}

async function runDeterministicAgentLoop(params: {
  userMessage: string;
  toolEnv: any;
  toolsMap: Map<string, any>;
  emitter: AssistantSSEStreamEmitter;
  signal?: AbortSignal;
  recordedToolSteps: RecordedToolCallStep[];
}): Promise<{ iterations: number; toolCallsCount: number; toolsUsed: string[] }> {
  const { userMessage, toolEnv, toolsMap, emitter, signal, recordedToolSteps } = params;
  const lower = userMessage.toLowerCase().trim();
  const toolsUsed: string[] = [];
  let toolCallsCount = 0;

  const callTool = async (name: string, args: Record<string, any>) => {
    const stepStart = Date.now();
    toolCallsCount += 1;
    toolsUsed.push(name);
    emitter.emit('tool_call', { name, args });
    emitter.emit('status', { text: `Đang gọi công cụ ${name}...` });
    const res = await executeRegisteredTool(name, args, toolEnv, toolsMap);
    emitter.emit('tool_result', { name, result: res.data });
    recordedToolSteps.push({
      stepIndex: toolCallsCount,
      toolName: name,
      args,
      resultSummary: res.data,
      status: !res.ok
        ? 'error'
        : res.data?.status === 'needs_confirmation'
          ? 'needs_confirmation'
          : 'success',
      durationMs: Date.now() - stepStart,
    });
    return res;
  };

  // 1. Ngoài phạm vi âm nhạc
  if (
    /(viết code|lập trình|giải phương trình|chính trị|chứng khoán|bóng đá|thời tiết hôm nay|nấu ăn)/i.test(
      lower
    ) &&
    !/(nhạc|bài hát|ca sĩ|playlist|album)/i.test(lower)
  ) {
    await emitTextDeltaStream(
      'Mình là **Trợ lý âm nhạc mq**, nên chỉ hỗ trợ về âm nhạc và các tính năng trên web **mq**. Bạn muốn mình tìm một ca khúc hay gợi ý playlist theo tâm trạng nào không?',
      emitter,
      signal
    );
    return { iterations: 1, toolCallsCount, toolsUsed };
  }

  // 2. Công cụ Admin (get_stats / get_source_errors)
  if (/(thống kê hệ thống|get_stats|báo cáo admin)/i.test(lower)) {
    const res = await callTool('get_stats', { days: 7 });
    if (!res.ok) {
      await emitTextDeltaStream(
        res.data.message || 'Bạn không có quyền truy cập công cụ quản trị (Admin).',
        emitter,
        signal
      );
      return { iterations: 2, toolCallsCount, toolsUsed };
    }
    await emitTextDeltaStream(
      `Thống kê hệ thống **mq**:\n- Người dùng: **${res.data.totalUsers}**\n- Bài hát Local: **${res.data.totalSongs}**\n- Nghệ sĩ: **${res.data.totalArtists}**\n- Tổng lượt phát: **${res.data.totalPlays}**`,
      emitter,
      signal
    );
    return { iterations: 2, toolCallsCount, toolsUsed };
  }

  if (/(lỗi nguồn nhạc|get_source_errors|quota nguồn)/i.test(lower)) {
    const res = await callTool('get_source_errors', {});
    if (!res.ok) {
      await emitTextDeltaStream(
        res.data.message || 'Công cụ kiểm tra nguồn nhạc chỉ dành cho Admin.',
        emitter,
        signal
      );
      return { iterations: 2, toolCallsCount, toolsUsed };
    }
    await emitTextDeltaStream(
      `Đã kiểm tra **${res.data.sourcesCount} nguồn nhạc**. Số nguồn đang cảnh báo hạn mức: **${res.data.warnings?.length ?? 0}**.`,
      emitter,
      signal
    );
    return { iterations: 2, toolCallsCount, toolsUsed };
  }

  // 3. Giải thích bản quyền / Full vs Preview 30s
  if (/(30\s*giây|30s|preview|bản quyền|nguồn nhạc|vì sao.*ngắn)/i.test(lower)) {
    const res = await callTool('explain_copyright', { topic: 'full_vs_preview' });
    await emitTextDeltaStream(
      `${res.data.overview}\n\n- ${res.data.fullVsPreview}`,
      emitter,
      signal
    );
    return { iterations: 2, toolCallsCount, toolsUsed };
  }

  // 4. Xóa playlist (delete_playlist — bắt buộc xác nhận)
  if (/(xóa|xoá)\s+playlist/i.test(lower)) {
    const nameMatch = userMessage.match(/playlist\s+["“']?([^"”'\n]+)["”']?$/i);
    const playlistName = nameMatch ? nameMatch[1].trim() : 'Playlist';
    const res = await callTool('delete_playlist', { playlistName });
    if (!res.ok) {
      await emitTextDeltaStream(res.data.message, emitter, signal);
      return { iterations: 2, toolCallsCount, toolsUsed };
    }
    await emitTextDeltaStream(
      `Thao tác xóa luôn yêu cầu xác nhận. Mình đã tạo thẻ xác nhận xóa playlist **"${playlistName}"** (mã xác nhận có hiệu lực 5 phút). Bạn bấm **Xác nhận** để thực hiện nhé!`,
      emitter,
      signal
    );
    return { iterations: 2, toolCallsCount, toolsUsed };
  }

  // 5. Tạo playlist (create_playlist — bắt buộc xác nhận)
  if (/tạo\s+playlist/i.test(lower)) {
    const countMatch = userMessage.match(/(\d+)\s*bài/i);
    const count = countMatch ? Math.min(15, Math.max(1, parseInt(countMatch[1], 10))) : 10;
    const cleaned = userMessage
      .replace(/tạo\s+playlist/i, '')
      .replace(/(\d+)\s*bài/i, '')
      .trim();
    const title = cleaned
      ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
      : 'Playlist mới';
    const res = await callTool('create_playlist', {
      title,
      songQuery: cleaned || 'nhạc trẻ thịnh hành',
      count,
    });
    if (!res.ok) {
      await emitTextDeltaStream(res.data.message, emitter, signal);
      return { iterations: 2, toolCallsCount, toolsUsed };
    }
    await emitTextDeltaStream(
      `Mình đã chuẩn bị yêu cầu **${res.data.summary}**. Bạn bấm nút **Xác nhận** bên dưới để lưu playlist nhé!`,
      emitter,
      signal
    );
    return { iterations: 2, toolCallsCount, toolsUsed };
  }

  // 6. Thêm vào playlist (add_to_playlist — bắt buộc xác nhận)
  if (/thêm.*vào\s+playlist/i.test(lower)) {
    const plMatch = userMessage.match(/playlist\s+["“']?([^"”'\n]+)["”']?$/i);
    const playlistName = plMatch ? plMatch[1].trim() : 'Yêu thích';
    const useCurrentTrack = /đang phát|bài này|hiện tại/i.test(lower);
    const res = await callTool('add_to_playlist', {
      playlistName,
      useCurrentTrack,
    });
    if (!res.ok) {
      await emitTextDeltaStream(res.data.message, emitter, signal);
      return { iterations: 2, toolCallsCount, toolsUsed };
    }
    await emitTextDeltaStream(
      `Mình đã chuẩn bị thẻ xác nhận: **${res.data.summary || 'Thêm bài hát vào playlist'}**. Bạn bấm **Xác nhận** để hoàn tất nhé!`,
      emitter,
      signal
    );
    return { iterations: 2, toolCallsCount, toolsUsed };
  }

  // 7. Xóa bài khỏi playlist (remove_from_playlist — bắt buộc xác nhận)
  if (/(xóa|gỡ).*khỏi\s+playlist/i.test(lower)) {
    const plMatch = userMessage.match(/playlist\s+["“']?([^"”'\n]+)["”']?$/i);
    const playlistName = plMatch ? plMatch[1].trim() : 'Playlist';
    const res = await callTool('remove_from_playlist', { playlistName });
    if (!res.ok) {
      await emitTextDeltaStream(res.data.message, emitter, signal);
      return { iterations: 2, toolCallsCount, toolsUsed };
    }
    await emitTextDeltaStream(
      `Vui lòng bấm **Xác nhận** trên thẻ bên dưới để gỡ bài hát khỏi playlist **"${playlistName}"**.`,
      emitter,
      signal
    );
    return { iterations: 2, toolCallsCount, toolsUsed };
  }

  // 8. Điều khiển trình phát
  if (/^(tạm dừng|dừng nhạc|pause)$/i.test(lower) || /tạm dừng nhạc/i.test(lower)) {
    await callTool('control_player', { action: 'pause' });
    await emitTextDeltaStream('Đã tạm dừng phát nhạc.', emitter, signal);
    return { iterations: 2, toolCallsCount, toolsUsed };
  }
  if (/^(tiếp tục|phát tiếp|resume)$/i.test(lower)) {
    await callTool('control_player', { action: 'play' });
    await emitTextDeltaStream('Đã tiếp tục phát nhạc.', emitter, signal);
    return { iterations: 2, toolCallsCount, toolsUsed };
  }
  if (/(bài tiếp|qua bài|chuyển bài|next)/i.test(lower)) {
    await callTool('control_player', { action: 'next' });
    await emitTextDeltaStream('Đã chuyển sang bài tiếp theo.', emitter, signal);
    return { iterations: 2, toolCallsCount, toolsUsed };
  }
  if (/(bài trước|quay lại bài|prev)/i.test(lower)) {
    await callTool('control_player', { action: 'prev' });
    await emitTextDeltaStream('Đã quay lại bài trước đó.', emitter, signal);
    return { iterations: 2, toolCallsCount, toolsUsed };
  }
  if (/(lặp lại|bật lặp|repeat)/i.test(lower)) {
    const mode = /1 bài|một bài|one/i.test(lower)
      ? 'one'
      : /tắt|off/i.test(lower)
        ? 'off'
        : 'all';
    await callTool('control_player', { action: 'repeat', value: mode });
    await emitTextDeltaStream(`Đã đặt chế độ lặp lại: **${mode}**.`, emitter, signal);
    return { iterations: 2, toolCallsCount, toolsUsed };
  }
  if (/(trộn bài|ngẫu nhiên|shuffle)/i.test(lower)) {
    const val = /tắt|off/i.test(lower) ? 'off' : 'on';
    await callTool('control_player', { action: 'shuffle', value: val });
    await emitTextDeltaStream(
      val === 'on' ? 'Đã bật phát ngẫu nhiên.' : 'Đã tắt phát ngẫu nhiên.',
      emitter,
      signal
    );
    return { iterations: 2, toolCallsCount, toolsUsed };
  }
  if (/(âm lượng|volume)/i.test(lower)) {
    const m = userMessage.match(/(\d{1,3})/);
    const vol = m ? Math.min(100, Math.max(0, parseInt(m[1], 10))) : 70;
    await callTool('control_player', { action: 'volume', value: vol });
    await emitTextDeltaStream(`Đã chỉnh âm lượng về **${vol}%**.`, emitter, signal);
    return { iterations: 2, toolCallsCount, toolsUsed };
  }

  // 9. Gợi ý cá nhân hóa (get_recommendations)
  if (/(giống bài này|giống bài đang phát|tương tự|nghe gì giống|gợi ý)/i.test(lower)) {
    const res = await callTool('get_recommendations', { mood: userMessage });
    await emitTextDeltaStream(
      `Dựa trên ngữ cảnh nghe nhạc của bạn, mình gợi ý **${res.data.count || 0} ca khúc** phù hợp bên dưới:`,
      emitter,
      signal
    );
    return { iterations: 2, toolCallsCount, toolsUsed };
  }

  // 10. Thông tin nghệ sĩ (get_artist_info)
  if (/(tiểu sử|thông tin nghệ sĩ|nghệ sĩ|ca sĩ)\s+(.+)/i.test(lower)) {
    const m = userMessage.match(/(?:tiểu sử|thông tin nghệ sĩ|nghệ sĩ|ca sĩ)\s+(.+)/i);
    const artistName = m ? m[1].trim() : userMessage;
    const info = await callTool('get_artist_info', { name: artistName });
    if (info.data.found) {
      await emitTextDeltaStream(
        `**${info.data.name}** — ${info.data.bio}`,
        emitter,
        signal
      );
      return { iterations: 2, toolCallsCount, toolsUsed };
    }
  }

  // 11. Phát ngay hoặc tìm kiếm bài hát (play_song / search_songs)
  if (/^(mở|phát|bật)\s+(ngay\s+)?(bài|nhạc)/i.test(lower)) {
    const searchRes = await callTool('search_songs', { query: userMessage, limit: 5 });
    const firstId = searchRes.data.tracks?.[0]?.id;
    if (firstId) {
      await callTool('play_song', { trackId: firstId, query: userMessage });
      await emitTextDeltaStream(
        `Đã tìm thấy và phát ngay ca khúc phù hợp với yêu cầu *"${userMessage}"* của bạn!`,
        emitter,
        signal
      );
      return { iterations: 3, toolCallsCount, toolsUsed };
    }
  }

  const searchRes = await callTool('search_songs', { query: userMessage, limit: 5 });
  if ((searchRes.data.count ?? 0) > 0) {
    await emitTextDeltaStream(
      `Mình tìm thấy **${searchRes.data.count} bài hát** khớp với yêu cầu *"${userMessage}"* của bạn:`,
      emitter,
      signal
    );
  } else {
    await emitTextDeltaStream(
      `Mình chưa tìm thấy bài hát khớp với *"${userMessage}"*. Bạn thử nhập tên bài hát, nghệ sĩ hoặc tâm trạng khác nhé!`,
      emitter,
      signal
    );
  }

  return { iterations: 2, toolCallsCount, toolsUsed };
}
