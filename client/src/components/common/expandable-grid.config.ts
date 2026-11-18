/**
 * Cấu hình tách riêng cho hiệu ứng mở rộng / thu gọn lưới thẻ ("Xem thêm" / "Thu gọn")
 * Có thể tinh chỉnh thời lượng, độ trễ stagger, easing và khoảng cách trượt tại đây.
 */

export const EXPANDABLE_GRID_CONFIG = {
  /** Thời lượng mở rộng / thu gọn chiều cao vùng chứa (ms) */
  durationHeightMs: 450,

  /** Thời lượng hiệu ứng xuất hiện của từng thẻ mới (ms) */
  durationCardMs: 320,

  /** Thời lượng xoay icon chevron & cross-fade chữ nút (ms) */
  durationButtonMs: 250,

  /** Độ trễ xuất hiện lần lượt giữa các thẻ (stagger, ms) */
  staggerDelayMs: 65,

  /** Độ trễ khi thu gọn ngược lại (ms) */
  staggerReverseDelayMs: 35,

  /** Easing mượt kiểu iOS: cubic-bezier(0.32, 0.72, 0, 1) */
  easing: [0.32, 0.72, 0, 1] as const,

  /** Khoảng cách trượt từ dưới lên của từng thẻ (px) */
  cardSlideY: 20,

  /** Tỉ lệ phóng to ban đầu -> hoàn chỉnh của thẻ */
  cardInitialScale: 0.95,

  /** Độ co nhẹ khi nhấn giữ nút "Xem thêm / Thu gọn" */
  buttonPressScale: 0.97,
} as const;
