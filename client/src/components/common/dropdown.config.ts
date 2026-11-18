/**
 * Cấu hình tách riêng cho hệ thống SelectDropdown dùng chung
 * Tinh chỉnh thời lượng, easing, stagger, kích thước và điểm ngắt mobile tại đây.
 */

export const DROPDOWN_CONFIG = {
  /** Thời lượng mở panel (ms) */
  durationOpenMs: 220,
  /** Thời lượng đóng panel (ms) */
  durationCloseMs: 150,
  /** Độ trễ stagger mỗi mục khi mở (ms) */
  staggerDelayMs: 26,
  /** Độ trễ tối đa cho danh sách dài để không bị chờ lâu (ms) */
  maxTotalStaggerMs: 220,
  /** Thời lượng xoay chevron & cross-fade chữ nút (ms) */
  durationTriggerMs: 200,
  /** Easing mượt kiểu iOS/macOS */
  easing: [0.32, 0.72, 0, 1] as const,
  /** Độ co nhẹ khi nhấn nút kích hoạt */
  pressScale: 0.97,
  /** Chiều cao tối đa danh sách trước khi cuộn (px) */
  maxHeightPx: 264,
  /** Khoảng cách giữa nút và panel (px) */
  offsetPx: 6,
  /** Chiều rộng màn hình chuyển sang Bottom Sheet trên mobile (px) */
  mobileBreakpointPx: 640,
  /** Thời gian reset bộ đệm gõ phím tìm nhanh (ms) */
  typeaheadTimeoutMs: 600,
} as const;
