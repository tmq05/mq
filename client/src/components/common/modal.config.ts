/**
 * Cấu hình tách riêng cho hệ thống Modal / Dialog dùng chung
 * Dễ dàng tinh chỉnh thời lượng, easing/spring, độ mờ nền, stagger và ngưỡng vuốt mobile.
 */

export const MODAL_CONFIG = {
  /** Thời lượng hiện lớp phủ overlay (ms) */
  durationOverlayOpenMs: 250,
  /** Thời lượng ẩn lớp phủ overlay (ms) */
  durationOverlayCloseMs: 180,

  /** Thời lượng mở khung modal (ms) */
  durationPanelOpenMs: 300,
  /** Thời lượng đóng khung modal (ms) */
  durationPanelCloseMs: 190,

  /** Spring vật lý kiểu iOS cho modal */
  spring: {
    type: 'spring' as const,
    stiffness: 380,
    damping: 30,
    mass: 0.9,
  },

  /** Easing mượt kiểu iOS */
  easing: [0.32, 0.72, 0, 1] as const,

  /** Độ trễ trước khi bắt đầu stagger nội dung bên trong (ms) */
  staggerInitialDelayMs: 80,
  /** Khoảng cách stagger giữa các khối nội dung (ms) */
  staggerDelayMs: 40,
  /** Khoảng cách stagger giữa các mục trong danh sách (ms) */
  staggerListDelayMs: 30,

  /** Tỉ lệ thu nhỏ của modal bên dưới khi có modal thứ 2 chồng lên */
  nestedScale: 0.96,

  /** Điểm ngắt chuyển sang Bottom Sheet trên mobile (px) */
  mobileBreakpointPx: 640,
  /** Khoảng cách vuốt xuống tối thiểu để đóng Bottom Sheet trên mobile (px) */
  swipeCloseThresholdPx: 90,
} as const;
