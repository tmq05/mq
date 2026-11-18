/**
 * Cấu hình tách riêng cho Trợ lý âm nhạc mq (Frontend)
 * Dễ dàng tinh chỉnh thời lượng animation, kích thước khung, giới hạn tin nhắn, màu sắc và gợi ý nhanh.
 */

export const CHAT_UI_CONFIG = {
  /** Khóa lưu trữ lịch sử hội thoại trong localStorage */
  storageKey: 'mq_music_assistant_chat_v1',
  tooltipSeenKey: 'mq_music_assistant_tooltip_seen_v1',

  /** Kích thước khung chat trên Desktop */
  desktopWidthPx: 400,
  desktopHeightPx: 600,
  maxHeightVh: 75,
  borderRadiusPx: 20,
  mobileBreakpointPx: 640,
  swipeCloseThresholdPx: 90,

  /** Thời lượng & Easing chuyển động */
  openDurationMs: 300,
  closeDurationMs: 180,
  messageFadeMs: 200,
  messageSlidePx: 8,
  songCardStaggerMs: 50,
  easing: [0.32, 0.72, 0, 1] as const,

  /** Giới hạn đầu vào & ngữ cảnh */
  maxInputLength: 800,
  maxContextMessages: 10,
  maxTextareaRows: 4,

  /** 4 gợi ý bấm nhanh trên màn hình chào */
  welcomePrompts: [
    'Nhạc chill để học bài',
    'Tạo playlist chạy bộ',
    'Gợi ý giống bài đang phát',
    'Vì sao bài này chỉ nghe 30 giây?',
  ],
} as const;
