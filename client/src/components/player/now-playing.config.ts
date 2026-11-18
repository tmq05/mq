/**
 * Cấu hình tách riêng cho khung "ĐANG PHÁT" (NowPlayingHero) và thanh PlayerBar
 * Dễ dàng tinh chỉnh thời lượng, độ trễ stagger, easing, offset cuộn và màu glow tại đây.
 */

export const NOW_PLAYING_CONFIG = {
  /** Thời lượng mở khung lần đầu (height 0 -> auto, ms) */
  durationOpenMs: 500,
  /** Thời lượng xuất hiện từng thành phần con khi mở lần đầu (ms) */
  durationItemMs: 280,
  /** Độ trễ stagger giữa các thành phần con (ms) */
  staggerDelayMs: 60,
  /** Thời lượng cross-fade ảnh bìa khi chuyển bài (ms) */
  durationCoverCrossfadeMs: 300,
  /** Thời lượng trượt chữ tên bài & nghệ sĩ khi chuyển bài (ms) */
  durationTextSwapMs: 250,
  /** Easing mượt kiểu iOS */
  easing: [0.32, 0.72, 0, 1] as const,

  /** Thời lượng trượt thanh PlayerBar ở đáy màn hình (ms) */
  durationPlayerBarMs: 360,

  /** Thời lượng cuộn mượt tự động tới khung Đang phát (ms) */
  scrollDurationMs: 650,
  /** Khoảng hở bổ sung phía dưới header cố định khi cuộn tới (px) */
  scrollExtraOffsetPx: 20,
  /** Nếu người dùng vừa tự cuộn trong khoảng thời gian này (ms) -> hủy auto-scroll */
  userScrollCancelWindowMs: 1000,

  /** Thời lượng nháy sáng viền/glow khi cuộn tới nơi (ms) */
  glowDurationMs: 800,
  /** Màu RGB chủ đạo mặc định (xanh lá traffic-green) nếu không trích được từ ảnh */
  defaultAccentRgb: '39, 201, 63',
} as const;
