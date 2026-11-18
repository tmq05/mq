import { create } from 'zustand';
import { UnifiedTrack } from '../types/index.js';
import { usePlayerStore } from './player-store.js';
import { useAuthModalStore } from './auth-modal-store.js';
import { useAuthStore } from './auth-store.js';
import { api } from '../api/client.js';
import { CHAT_UI_CONFIG } from '../components/chat/chat.config.js';

export interface ChatConfirmationData {
  id: string;
  actionType: 'create_playlist' | 'add_to_playlist' | 'remove_from_playlist';
  title: string;
  description: string;
  payload: Record<string, any>;
  status?: 'pending' | 'confirming' | 'confirmed' | 'cancelled' | 'error';
  resultMessage?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  tracks?: UnifiedTrack[];
  confirmation?: ChatConfirmationData;
  isStreaming?: boolean;
  isError?: boolean;
}

interface ChatState {
  isOpen: boolean;
  messages: ChatMessage[];
  isStreaming: boolean;
  activeToolStatus: string | null;
  lastUserPrompt: string | null;
  abortController: AbortController | null;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  clearConversation: () => void;
  sendMessage: (prompt: string, currentPath?: string) => Promise<void>;
  stopStreaming: () => void;
  retryLastMessage: (currentPath?: string) => Promise<void>;
  confirmAction: (messageId: string, onSuccessInvalidate?: () => void) => Promise<void>;
  cancelAction: (messageId: string) => void;
}

function loadSavedMessages(): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CHAT_UI_CONFIG.storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(-30).map((m) => ({ ...m, isStreaming: false }));
    }
  } catch {
    // ignore corrupt storage
  }
  return [];
}

function saveMessages(messages: ChatMessage[]) {
  if (typeof window === 'undefined') return;
  try {
    const clean = messages.slice(-30).map((m) => ({ ...m, isStreaming: false }));
    window.localStorage.setItem(CHAT_UI_CONFIG.storageKey, JSON.stringify(clean));
  } catch {
    // ignore quota error
  }
}

/** Nối trực tiếp lệnh từ công cụ của Chatbot vào usePlayerStore hiện có của web */
function executeClientPlayerAction(action: { type: string; payload: Record<string, any> }) {
  const player = usePlayerStore.getState();

  if (action.type === 'play_song' && action.payload?.track) {
    const queue = Array.isArray(action.payload.queue)
      ? action.payload.queue
      : [action.payload.track];
    player.playTrack(action.payload.track, queue);
    return;
  }

  if (action.type === 'add_to_queue' && action.payload?.track) {
    player.addToQueue(action.payload.track);
    return;
  }

  if (action.type === 'control_player') {
    const cmd = action.payload?.action;
    switch (cmd) {
      case 'play':
        if (!player.isPlaying) player.togglePlay();
        break;
      case 'pause':
        if (player.isPlaying) player.togglePlay();
        break;
      case 'toggle':
        player.togglePlay();
        break;
      case 'next':
        player.next();
        break;
      case 'previous':
        player.previous();
        break;
      case 'repeat_off':
        player.setRepeatMode('off');
        break;
      case 'repeat_all':
        player.setRepeatMode('all');
        break;
      case 'repeat_one':
        player.setRepeatMode('one');
        break;
      case 'shuffle_on':
        if (!player.isShuffle) player.toggleShuffle();
        break;
      case 'shuffle_off':
        if (player.isShuffle) player.toggleShuffle();
        break;
      case 'volume': {
        const pct = Number(action.payload?.volumePercent ?? 70);
        player.setVolume(Math.max(0, Math.min(1, pct / 100)));
        break;
      }
      case 'open_lyrics':
        if (!player.isLyricsOpen) player.toggleLyrics();
        break;
      case 'close_lyrics':
        if (player.isLyricsOpen) player.toggleLyrics();
        break;
      case 'open_queue':
        if (!player.isQueueOpen) player.toggleQueue();
        break;
      default:
        break;
    }
  }
}

export const useChatStore = create<ChatState>((set, get) => ({
  isOpen: false,
  messages: loadSavedMessages(),
  isStreaming: false,
  activeToolStatus: null,
  lastUserPrompt: null,
  abortController: null,

  setOpen: (open) => set({ isOpen: open }),
  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),

  clearConversation: () => {
    get().abortController?.abort();
    saveMessages([]);
    set({
      messages: [],
      isStreaming: false,
      activeToolStatus: null,
      lastUserPrompt: null,
      abortController: null,
    });
  },

  stopStreaming: () => {
    const ctrl = get().abortController;
    if (ctrl) ctrl.abort();
    set((s) => {
      const updated = s.messages.map((m) =>
        m.isStreaming ? { ...m, isStreaming: false } : m
      );
      saveMessages(updated);
      return {
        messages: updated,
        isStreaming: false,
        activeToolStatus: null,
        abortController: null,
      };
    });
  },

  retryLastMessage: async (currentPath) => {
    const lastPrompt = get().lastUserPrompt;
    if (!lastPrompt || get().isStreaming) return;
    // Xóa tin nhắn lỗi cuối cùng trước khi thử lại
    set((s) => {
      const filtered = s.messages.filter((m, idx) => !(idx === s.messages.length - 1 && m.isError));
      return { messages: filtered };
    });
    await get().sendMessage(lastPrompt, currentPath);
  },

  sendMessage: async (rawPrompt, currentPath = '/') => {
    const prompt = rawPrompt.trim().slice(0, CHAT_UI_CONFIG.maxInputLength);
    if (!prompt || get().isStreaming) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      createdAt: new Date().toISOString(),
    };

    const botMsgId = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const botMsg: ChatMessage = {
      id: botMsgId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      isStreaming: true,
    };

    const historyForApi = get()
      .messages.filter((m) => !m.isError && m.content.trim())
      .slice(-CHAT_UI_CONFIG.maxContextMessages)
      .map((m) => ({ role: m.role, content: m.content }));

    const player = usePlayerStore.getState();
    const context = {
      currentTrack: player.currentTrack,
      isPlaying: player.isPlaying,
      isShuffle: player.isShuffle,
      repeatMode: player.repeatMode,
      volume: Math.round((player.volume ?? 0.8) * 100),
      currentPath,
      queue: (player.queue || []).slice(0, 10).map((t) => ({
        id: t.id,
        title: t.title,
        artists: t.artists,
        source: t.source,
      })),
    };

    const controller = new AbortController();
    const nextMessages = [...get().messages, userMsg, botMsg];
    saveMessages(nextMessages);

    set({
      messages: nextMessages,
      isStreaming: true,
      activeToolStatus: null,
      lastUserPrompt: prompt,
      abortController: controller,
    });

    try {
      const token = useAuthStore.getState().token;
      const baseURL = api.defaults.baseURL || '/api';
      const response = await fetch(`${baseURL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: [...historyForApi, { role: 'user', content: prompt }],
          context,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        let errText = 'Không thể kết nối tới Trợ lý âm nhạc. Vui lòng thử lại.';
        try {
          const errJson = await response.json();
          if (errJson?.message) errText = errJson.message;
        } catch {
          // ignore
        }
        throw new Error(errText);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() || '';

        for (const block of blocks) {
          const lines = block.split('\n');
          let eventName = 'message';
          let dataLine = '';
          for (const line of lines) {
            if (line.startsWith('event:')) eventName = line.slice(6).trim();
            if (line.startsWith('data:')) dataLine += line.slice(5).trim();
          }
          if (!dataLine) continue;

          try {
            const parsed = JSON.parse(dataLine);
            if (eventName === 'status') {
              set({ activeToolStatus: parsed.text || null });
            } else if (eventName === 'tracks') {
              set((s) => ({
                messages: s.messages.map((m) =>
                  m.id === botMsgId ? { ...m, tracks: parsed.tracks || [] } : m
                ),
              }));
            } else if (eventName === 'client_action') {
              executeClientPlayerAction(parsed);
            } else if (eventName === 'confirmation') {
              set((s) => ({
                messages: s.messages.map((m) =>
                  m.id === botMsgId
                    ? { ...m, confirmation: { ...parsed, status: 'pending' } }
                    : m
                ),
              }));
            } else if (eventName === 'token') {
              set((s) => ({
                activeToolStatus: null,
                messages: s.messages.map((m) =>
                  m.id === botMsgId
                    ? { ...m, content: m.content + (parsed.text || '') }
                    : m
                ),
              }));
            } else if (eventName === 'error') {
              throw new Error(parsed.message || 'Lỗi xử lý phản hồi.');
            }
          } catch (innerErr: any) {
            if (eventName === 'error') throw innerErr;
          }
        }
      }

      set((s) => {
        const completed = s.messages.map((m) =>
          m.id === botMsgId ? { ...m, isStreaming: false } : m
        );
        saveMessages(completed);
        return {
          messages: completed,
          isStreaming: false,
          activeToolStatus: null,
          abortController: null,
        };
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      set((s) => {
        const failed = s.messages.map((m) =>
          m.id === botMsgId
            ? {
                ...m,
                content:
                  err?.message ||
                  'Kết nối gián đoạn hoặc vượt quá giới hạn yêu cầu. Bạn vui lòng bấm Thử lại nhé.',
                isStreaming: false,
                isError: true,
              }
            : m
        );
        saveMessages(failed);
        return {
          messages: failed,
          isStreaming: false,
          activeToolStatus: null,
          abortController: null,
        };
      });
    }
  },

  confirmAction: async (messageId, onSuccessInvalidate) => {
    const auth = useAuthStore.getState();
    if (!auth.isAuthenticated) {
      useAuthModalStore.getState().openAuthModal({
        title: 'Đăng nhập để quản lý Playlist',
        message: 'Bạn cần đăng nhập để Trợ lý âm nhạc lưu hoặc chỉnh sửa playlist trong thư viện.',
        iconType: 'playlist',
      });
      return;
    }

    const targetMsg = get().messages.find((m) => m.id === messageId);
    const confirmation = targetMsg?.confirmation;
    if (!confirmation || confirmation.status === 'confirming' || confirmation.status === 'confirmed') {
      return;
    }

    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === messageId && m.confirmation
          ? { ...m, confirmation: { ...m.confirmation, status: 'confirming' } }
          : m
      ),
    }));

    try {
      const res = await api.post('/chat/confirm', {
        actionId: (confirmation as any).actionId || confirmation.id,
        actionType: confirmation.actionType,
        payload: confirmation.payload,
      });

      set((s) => {
        const updated = s.messages.map((m) =>
          m.id === messageId && m.confirmation
            ? {
                ...m,
                confirmation: {
                  ...m.confirmation,
                  status: 'confirmed' as const,
                  resultMessage: res.data?.message || 'Đã thực hiện thành công!',
                },
              }
            : m
        );
        saveMessages(updated);
        return { messages: updated };
      });
      onSuccessInvalidate?.();
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message || err?.message || 'Không thể thực hiện thao tác.';
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === messageId && m.confirmation
            ? {
                ...m,
                confirmation: {
                  ...m.confirmation,
                  status: 'error',
                  resultMessage: errMsg,
                },
              }
            : m
        ),
      }));
    }
  },

  cancelAction: (messageId) => {
    set((s) => {
      const updated = s.messages.map((m) =>
        m.id === messageId && m.confirmation
          ? {
              ...m,
              confirmation: {
                ...m.confirmation,
                status: 'cancelled' as const,
                resultMessage: 'Đã hủy thao tác.',
              },
            }
          : m
      );
      saveMessages(updated);
      return { messages: updated };
    });
  },
}));
