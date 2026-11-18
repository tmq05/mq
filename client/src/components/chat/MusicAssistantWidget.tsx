import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'motion/react';
import {
  Sparkles,
  X,
  RotateCcw,
  Send,
  Square,
  Play,
  Pause,
  Plus,
  Check,
  Copy,
  ArrowDown,
  AlertCircle,
  ListMusic,
} from 'lucide-react';
import { useChatStore, ChatMessage } from '../../stores/chat-store.js';
import { usePlayerStore } from '../../stores/player-store.js';
import { usePlaylistModalStore } from '../../stores/playlist-modal-store.js';
import { SourceBadge } from '../common/Badge.js';
import { Spinner } from '../common/Loading.js';
import { cleanDisplayTitle, formatArtists } from '../../utils/format.js';
import { CHAT_UI_CONFIG } from './chat.config.js';
import './chat.css';

/** Render Markdown cơ bản (in đậm **text**, danh sách gạch đầu dòng, xuống dòng) an toàn */
const SimpleMarkdown: React.FC<{ text: string; showCursor?: boolean }> = ({
  text,
  showCursor = false,
}) => {
  const lines = text.split('\n');

  const renderInline = (line: string) => {
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-semibold text-ink dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={idx} className="italic">
            {part.slice(1, -1)}
          </em>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  return (
    <div className="space-y-1.5 leading-relaxed">
      {lines.map((line, idx) => {
        const isLast = idx === lines.length - 1;
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-traffic-green mt-1 text-[10px]">●</span>
              <span className="flex-1">
                {renderInline(trimmed.slice(2))}
                {isLast && showCursor && <span className="mq-chat-cursor" aria-hidden="true" />}
              </span>
            </div>
          );
        }
        return (
          <p key={idx}>
            {renderInline(line)}
            {isLast && showCursor && <span className="mq-chat-cursor" aria-hidden="true" />}
          </p>
        );
      })}
    </div>
  );
};

export const MusicAssistantWidget: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const shouldReduceMotion = useReducedMotion();

  const {
    isOpen,
    messages,
    isStreaming,
    activeToolStatus,
    setOpen,
    toggleOpen,
    clearConversation,
    sendMessage,
    stopStreaming,
    retryLastMessage,
    confirmAction,
    cancelAction,
  } = useChatStore();

  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const { openModal: openPlaylistModal } = usePlaylistModalStore();

  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < CHAT_UI_CONFIG.mobileBreakpointPx : false
  );
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [hasUnreadBelow, setHasUnreadBelow] = useState(false);

  const fabRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(isOpen);

  // Theo dõi kích thước màn hình (Desktop panel vs Mobile bottom sheet)
  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < CHAT_UI_CONFIG.mobileBreakpointPx);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Hiển thị tooltip hướng dẫn lần đầu
  useEffect(() => {
    try {
      const seen = window.localStorage.getItem(CHAT_UI_CONFIG.tooltipSeenKey);
      if (!seen) {
        const showTimer = window.setTimeout(() => setShowTooltip(true), 1200);
        const hideTimer = window.setTimeout(() => {
          setShowTooltip(false);
          window.localStorage.setItem(CHAT_UI_CONFIG.tooltipSeenKey, '1');
        }, 7500);
        return () => {
          window.clearTimeout(showTimer);
          window.clearTimeout(hideTimer);
        };
      }
    } catch {
      // ignore
    }
  }, []);

  // Phím tắt toàn cục Ctrl + / (hoặc Cmd + /) và Esc để đóng
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowTooltip(false);
        toggleOpen();
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setOpen, toggleOpen]);

  // Focus ô nhập khi mở & trả focus về nút mở khi đóng
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setShowTooltip(false);
      try {
        window.localStorage.setItem(CHAT_UI_CONFIG.tooltipSeenKey, '1');
      } catch {
        // ignore
      }
      setTimeout(() => textareaRef.current?.focus(), 80);
    } else if (!isOpen && wasOpenRef.current) {
      fabRef.current?.focus();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  // Tự động co giãn chiều cao textarea (tối đa 4 dòng)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = 20 * CHAT_UI_CONFIG.maxTextareaRows + 16;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [input]);

  // Tự động cuộn xuống cuối khi có tin nhắn mới (trừ khi người dùng đang cuộn lên đọc)
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (!userScrolledUp) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: shouldReduceMotion ? 'auto' : 'smooth',
      });
      setHasUnreadBelow(false);
    } else {
      setHasUnreadBelow(true);
    }
  }, [messages, activeToolStatus, userScrolledUp, shouldReduceMotion]);

  const handleListScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isUp = distanceFromBottom > 72;
    setUserScrolledUp(isUp);
    if (!isUp) setHasUnreadBelow(false);
  };

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    setUserScrolledUp(false);
    setHasUnreadBelow(false);
    el.scrollTo({
      top: el.scrollHeight,
      behavior: shouldReduceMotion ? 'auto' : 'smooth',
    });
  };

  const handleSend = async (customText?: string) => {
    const text = (customText ?? input).trim();
    if (!text || isStreaming) return;
    if (customText === undefined) setInput('');
    setUserScrolledUp(false);
    await sendMessage(text, location.pathname);
  };

  const handleCopy = (msg: ChatMessage) => {
    navigator.clipboard?.writeText(msg.content).catch(() => {});
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const handleMobileDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > CHAT_UI_CONFIG.swipeCloseThresholdPx || info.velocity.y > 420) {
      setOpen(false);
    }
  };

  return (
    <>
      {/* Nút tròn nổi mở Trợ lý âm nhạc (nằm trên thanh PlayerBar cố định) */}
      <div className="fixed bottom-24 right-3 sm:right-5 z-40 flex items-center gap-2.5 select-none pb-[env(safe-area-inset-bottom)]">
        <AnimatePresence>
          {showTooltip && !isOpen && (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 8, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 6, scale: 0.95 }}
              transition={{ duration: 0.2, ease: CHAT_UI_CONFIG.easing }}
              className="px-3 py-1.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-medium shadow-lg border border-white/10 whitespace-nowrap"
            >
              Trợ lý âm nhạc mq <span className="opacity-70 ml-1">(Ctrl + /)</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          ref={fabRef}
          type="button"
          onClick={toggleOpen}
          whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
          aria-label={isOpen ? 'Đóng Trợ lý âm nhạc mq' : 'Mở Trợ lý âm nhạc mq (Ctrl + /)'}
          aria-expanded={isOpen}
          title="Trợ lý âm nhạc mq (Ctrl + /)"
          className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-[#181818] text-ink dark:text-white border border-emerald-500/40 dark:border-traffic-green/50 shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:shadow-xl flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:focus-visible:ring-traffic-green transition-colors"
        >
          <span
            aria-hidden="true"
            className="mq-chat-fab-halo absolute -inset-1 rounded-full bg-emerald-500/15 dark:bg-traffic-green/20 pointer-events-none"
          />
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-traffic-green relative z-10" />
        </motion.button>
      </div>

      {/* Khung Chat (Desktop Panel 400x600 / Mobile Bottom Sheet) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="dialog"
            aria-modal="false"
            aria-label="Trợ lý âm nhạc mq"
            drag={isMobile && !shouldReduceMotion ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={isMobile ? handleMobileDragEnd : undefined}
            style={{ transformOrigin: isMobile ? 'bottom center' : 'bottom right' }}
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : isMobile
                  ? { opacity: 0, y: '100%' }
                  : { opacity: 0, scale: 0.9, y: 16 }
            }
            animate={
              shouldReduceMotion
                ? { opacity: 1, transition: { duration: 0.12 } }
                : isMobile
                  ? {
                      opacity: 1,
                      y: 0,
                      transition: {
                        duration: CHAT_UI_CONFIG.openDurationMs / 1000,
                        ease: CHAT_UI_CONFIG.easing,
                      },
                    }
                  : {
                      opacity: 1,
                      scale: 1,
                      y: 0,
                      transition: {
                        duration: CHAT_UI_CONFIG.openDurationMs / 1000,
                        ease: CHAT_UI_CONFIG.easing,
                      },
                    }
            }
            exit={
              shouldReduceMotion
                ? { opacity: 0, transition: { duration: 0.1 } }
                : isMobile
                  ? {
                      opacity: 0,
                      y: '100%',
                      transition: {
                        duration: CHAT_UI_CONFIG.closeDurationMs / 1000,
                        ease: CHAT_UI_CONFIG.easing,
                      },
                    }
                  : {
                      opacity: 0,
                      scale: 0.92,
                      y: 12,
                      transition: {
                        duration: CHAT_UI_CONFIG.closeDurationMs / 1000,
                        ease: CHAT_UI_CONFIG.easing,
                      },
                    }
            }
            className={`mq-chat-panel fixed z-50 flex flex-col overflow-hidden select-none will-change-transform ${
              isMobile
                ? 'inset-x-0 bottom-0 h-[85vh] rounded-t-[20px] rounded-b-none'
                : 'bottom-40 right-5 w-[400px] h-[600px] max-h-[75vh]'
            }`}
          >
            {/* Thanh kéo trên Mobile */}
            {isMobile && (
              <div className="pt-2 pb-1 flex justify-center shrink-0 cursor-grab active:cursor-grabbing">
                <span className="w-10 h-1 rounded-full bg-neutral-400/40" />
              </div>
            )}

            {/* Header */}
            <div className="px-4 py-3 border-b border-hairline dark:border-white/10 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-traffic-green/15 border border-traffic-green/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-traffic-green" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-display font-bold text-sm text-ink dark:text-white truncate">
                      Trợ lý mq
                    </h3>
                    <span className="w-2 h-2 rounded-full bg-traffic-green shrink-0" />
                  </div>
                  <p className="text-[11px] text-mute truncate">
                    Tìm nhạc, tạo playlist & điều khiển player
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={clearConversation}
                  className="p-1.5 rounded-full text-mute hover:text-ink dark:hover:text-white hover:bg-surface-soft dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title="Cuộc trò chuyện mới"
                  aria-label="Cuộc trò chuyện mới"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mq-modal-close-btn p-1.5 rounded-full text-mute hover:text-ink dark:hover:text-white hover:bg-surface-soft dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title="Đóng (Esc)"
                  aria-label="Đóng khung chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Danh sách tin nhắn */}
            <div
              ref={listRef}
              onScroll={handleListScroll}
              aria-live="polite"
              className="mq-modal-body relative flex-1 overflow-y-auto p-4 space-y-4 select-text"
            >
              {messages.length === 0 ? (
                /* Màn hình chào + 4 gợi ý bấm nhanh */
                <div className="py-6 space-y-5">
                  <div className="text-center space-y-2 px-2">
                    <div className="w-11 h-11 rounded-2xl bg-traffic-green/15 border border-traffic-green/30 flex items-center justify-center mx-auto">
                      <Sparkles className="w-5 h-5 text-traffic-green" />
                    </div>
                    <h4 className="font-display font-bold text-base text-ink dark:text-white">
                      Xin chào! Mình là Trợ lý âm nhạc mq
                    </h4>
                    <p className="text-xs text-mute leading-relaxed">
                      Mình có thể tìm và phát nhạc theo tâm trạng, tự tạo playlist, điều khiển trình
                      phát hoặc giải đáp về nguồn nhạc trên mq.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-mute px-1">
                      Gợi ý bấm nhanh
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {CHAT_UI_CONFIG.welcomePrompts.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => handleSend(prompt)}
                          className="text-left px-3.5 py-2.5 rounded-xl mq-chat-bot-card hover:border-traffic-green/40 text-xs font-medium text-ink dark:text-neutral-200 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-between gap-2"
                        >
                          <span>{prompt}</span>
                          <span className="text-traffic-green text-xs">→</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          if (window.location.pathname !== '/') {
                            navigate('/');
                            window.setTimeout(() => {
                              window.dispatchEvent(new CustomEvent('mq:mood-recommend', { detail: { focusOnly: true } }));
                            }, 320);
                          } else {
                            window.dispatchEvent(new CustomEvent('mq:mood-recommend', { detail: { focusOnly: true } }));
                          }
                        }}
                        className="text-left px-3.5 py-2.5 rounded-xl border border-traffic-green/40 bg-traffic-green/10 hover:bg-traffic-green/15 text-xs font-semibold text-emerald-700 dark:text-traffic-green transition-all active:scale-[0.98] cursor-pointer flex items-center justify-between gap-2"
                      >
                        <span>Hôm nay bạn thế nào? (Gợi ý nhanh theo tâm trạng)</span>
                        <span className="text-xs">✨</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isUser = msg.role === 'user';

                  return (
                    <motion.div
                      key={msg.id}
                      initial={
                        shouldReduceMotion
                          ? { opacity: 0 }
                          : { opacity: 0, y: CHAT_UI_CONFIG.messageSlidePx }
                      }
                      animate={{
                        opacity: 1,
                        y: 0,
                        transition: {
                          duration: shouldReduceMotion ? 0 : CHAT_UI_CONFIG.messageFadeMs / 1000,
                          ease: CHAT_UI_CONFIG.easing,
                        },
                      }}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start items-start gap-2.5'}`}
                    >
                      {!isUser && (
                        <div className="w-6 h-6 rounded-full bg-traffic-green/15 border border-traffic-green/30 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles className="w-3 h-3 text-traffic-green" />
                        </div>
                      )}

                      <div className={`max-w-[85%] space-y-2.5 ${isUser ? '' : 'flex-1 min-w-0'}`}>
                        {/* Nội dung chữ */}
                        {(msg.content || msg.isStreaming) && (
                          <div
                            className={`group relative text-xs ${
                              isUser
                                ? 'mq-chat-user-bubble px-3.5 py-2.5 rounded-2xl rounded-br-sm text-ink dark:text-white'
                                : msg.isError
                                  ? 'p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500'
                                  : 'mq-chat-bot-card px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-ink dark:text-neutral-200'
                            }`}
                          >
                            {msg.isStreaming && !msg.content ? (
                              <div className="flex items-center gap-1.5 py-1" aria-label="Đang suy nghĩ">
                                <span className="mq-chat-thinking-dot" />
                                <span className="mq-chat-thinking-dot" />
                                <span className="mq-chat-thinking-dot" />
                              </div>
                            ) : (
                              <SimpleMarkdown
                                text={msg.content}
                                showCursor={Boolean(msg.isStreaming)}
                              />
                            )}

                            {/* Nút Sao chép & Thử lại cho tin nhắn bot */}
                            {!isUser && !msg.isStreaming && msg.content && (
                              <div className="flex items-center justify-end gap-2 mt-1.5 pt-1 border-t border-black/5 dark:border-white/5">
                                {msg.isError && (
                                  <button
                                    type="button"
                                    onClick={() => retryLastMessage(location.pathname)}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-traffic-green hover:underline cursor-pointer"
                                  >
                                    <AlertCircle className="w-3 h-3" />
                                    Thử lại
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleCopy(msg)}
                                  className="inline-flex items-center gap-1 text-[10px] text-mute hover:text-ink dark:hover:text-white transition-colors cursor-pointer"
                                  title="Sao chép tin nhắn"
                                  aria-label="Sao chép tin nhắn"
                                >
                                  {copiedId === msg.id ? (
                                    <>
                                      <Check className="w-3 h-3 text-traffic-green" />
                                      <span className="text-traffic-green">Đã chép</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Sao chép</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Danh sách Thẻ bài hát (Stagger 50ms) */}
                        {msg.tracks && msg.tracks.length > 0 && (
                          <div className="space-y-1.5">
                            {msg.tracks.map((track, idx) => {
                              const isThisTrackPlaying =
                                currentTrack?.id === track.id && isPlaying;
                              const isThisTrackSelected = currentTrack?.id === track.id;

                              return (
                                <motion.div
                                  key={`${track.id}-${idx}`}
                                  initial={
                                    shouldReduceMotion ? false : { opacity: 0, y: 8 }
                                  }
                                  animate={{
                                    opacity: 1,
                                    y: 0,
                                    transition: {
                                      duration: shouldReduceMotion ? 0 : 0.22,
                                      delay: shouldReduceMotion
                                        ? 0
                                        : idx * (CHAT_UI_CONFIG.songCardStaggerMs / 1000),
                                      ease: CHAT_UI_CONFIG.easing,
                                    },
                                  }}
                                  className={`flex items-center justify-between gap-2.5 p-2 rounded-xl border transition-all hover:-translate-y-0.5 ${
                                    isThisTrackSelected
                                      ? 'border-traffic-green/40 bg-traffic-green/10'
                                      : 'mq-chat-bot-card hover:border-white/20'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <img
                                      src={
                                        track.coverUrl ||
                                        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&auto=format&fit=crop&q=80'
                                      }
                                      alt={track.title}
                                      className="w-10 h-10 rounded-lg object-cover shrink-0 bg-neutral-800"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-semibold text-ink dark:text-white truncate">
                                        {cleanDisplayTitle(track.title)}
                                      </p>
                                      <p className="text-[11px] text-mute truncate">
                                        {formatArtists(track.artists)}
                                      </p>
                                      <div className="mt-0.5">
                                        <SourceBadge
                                          source={track.source}
                                          isFullLength={track.isFullLength}
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isThisTrackSelected) togglePlay();
                                        else playTrack(track, msg.tracks);
                                      }}
                                      className={`px-2.5 py-1.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 transition-transform active:scale-95 cursor-pointer ${
                                        isThisTrackPlaying
                                          ? 'bg-traffic-green text-black'
                                          : 'bg-ink dark:bg-white text-white dark:text-black'
                                      }`}
                                      title={isThisTrackPlaying ? 'Đang phát (bấm để tạm dừng)' : 'Phát bài hát'}
                                    >
                                      {isThisTrackPlaying ? (
                                        <>
                                          <Pause className="w-3 h-3 fill-current" />
                                          <span>Đang phát</span>
                                        </>
                                      ) : (
                                        <>
                                          <Play className="w-3 h-3 fill-current" />
                                          <span>Phát</span>
                                        </>
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => openPlaylistModal(track)}
                                      className="p-1.5 rounded-full mq-chat-bot-card text-mute hover:text-ink dark:hover:text-white transition-transform active:scale-95 cursor-pointer"
                                      title="Thêm vào playlist"
                                      aria-label={`Thêm ${track.title} vào playlist`}
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}

                        {/* Thẻ Xác nhận hành động (Tạo / Thêm / Xóa Playlist) */}
                        {msg.confirmation && (
                          <div className="p-3 rounded-xl mq-chat-bot-card space-y-2.5">
                            <div className="flex items-start gap-2">
                              <ListMusic className="w-4 h-4 text-traffic-green shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-ink dark:text-white">
                                  {msg.confirmation.title}
                                </p>
                                <p className="text-[11px] text-mute mt-0.5">
                                  {msg.confirmation.description}
                                </p>
                              </div>
                            </div>

                            {msg.confirmation.status === 'confirmed' ? (
                              <motion.div
                                initial={shouldReduceMotion ? false : { scale: 0.85, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                                className="flex items-center gap-1.5 text-xs font-semibold text-traffic-green pt-1"
                              >
                                <Check className="w-4 h-4 stroke-[2.5]" />
                                <span>{msg.confirmation.resultMessage || 'Đã hoàn tất!'}</span>
                              </motion.div>
                            ) : msg.confirmation.status === 'cancelled' ? (
                              <p className="text-[11px] text-mute italic pt-1">
                                Đã hủy thao tác.
                              </p>
                            ) : (
                              <div className="space-y-1.5 pt-1">
                                {msg.confirmation.status === 'error' && (
                                  <p className="text-[11px] text-red-500">
                                    {msg.confirmation.resultMessage}
                                  </p>
                                )}
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    disabled={msg.confirmation.status === 'confirming'}
                                    onClick={() => cancelAction(msg.id)}
                                    className="px-3 py-1 rounded-full text-xs text-mute hover:text-ink dark:hover:text-white transition-colors cursor-pointer"
                                  >
                                    Hủy
                                  </button>
                                  <button
                                    type="button"
                                    disabled={msg.confirmation.status === 'confirming'}
                                    onClick={() =>
                                      confirmAction(msg.id, () => {
                                        queryClient.invalidateQueries({
                                          queryKey: ['user-playlists'],
                                        });
                                        queryClient.invalidateQueries({ queryKey: ['playlist'] });
                                      })
                                    }
                                    className="px-3.5 py-1 rounded-full bg-traffic-green text-black text-xs font-semibold inline-flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer disabled:opacity-60"
                                  >
                                    {msg.confirmation.status === 'confirming' ? (
                                      <>
                                        <Spinner size="xs" tone="current" />
                                        <span>Đang lưu...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Xác nhận</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}

              {/* Dòng trạng thái khi bot đang gọi công cụ */}
              {activeToolStatus && (
                <div className="flex items-center gap-2 text-[11px] text-mute pl-8">
                  <Spinner size="xs" />
                  <span>{activeToolStatus}</span>
                </div>
              )}
            </div>

            {/* Nút nổi "Tin mới ↓" khi người dùng đang cuộn lên đọc */}
            <AnimatePresence>
              {hasUnreadBelow && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  onClick={scrollToBottom}
                  className="absolute bottom-16 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-traffic-green text-black text-[11px] font-semibold shadow-lg inline-flex items-center gap-1 cursor-pointer z-20"
                >
                  <span>Tin mới</span>
                  <ArrowDown className="w-3 h-3" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Ô nhập liệu (Textarea tự giãn tối đa 4 dòng + Nút Gửi / Dừng) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 border-t border-hairline dark:border-white/10 flex items-end gap-2 shrink-0"
            >
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                maxLength={CHAT_UI_CONFIG.maxInputLength}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Hỏi bài hát, tâm trạng, tạo playlist..."
                aria-label="Nhập tin nhắn cho Trợ lý âm nhạc"
                className="flex-1 max-h-24 resize-none rounded-2xl px-3.5 py-2 text-xs bg-surface-soft dark:bg-white/5 border border-hairline dark:border-white/10 text-ink dark:text-white placeholder-mute focus:outline-none focus:border-traffic-green/60 leading-5"
              />

              {isStreaming ? (
                <button
                  type="button"
                  onClick={stopStreaming}
                  aria-label="Dừng trả lời"
                  title="Dừng trả lời"
                  className="w-9 h-9 rounded-full bg-red-500/15 border border-red-500/40 text-red-500 flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Gửi tin nhắn"
                  title="Gửi (Enter)"
                  className="w-9 h-9 rounded-full bg-traffic-green text-black flex items-center justify-center shrink-0 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MusicAssistantWidget;
