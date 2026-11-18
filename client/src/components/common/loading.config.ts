/**
 * Cấu hình tách riêng cho hệ thống Loading / Skeleton / Spinner / TopLoadingBar
 * Dễ dàng tinh chỉnh chu kỳ shimmer, thời gian giữ tối thiểu, độ trễ chống nháy và stagger.
 */

export const LOADING_CONFIG = {
  /** Chu kỳ quét shimmer (giây) */
  shimmerDurationSec: 1.6,

  /** Chu kỳ xoay vòng tải spinner (giây) */
  spinnerDurationSec: 1,

  /** Thời lượng fade-out skeleton (ms) */
  skeletonFadeOutMs: 200,

  /** Thời lượng fade-in + trượt lên nội dung thật (ms) */
  contentFadeInMs: 300,

  /** Khoảng trượt dọc khi nội dung thật xuất hiện (px) */
  contentSlidePx: 8,

  /** Độ trễ stagger giữa các khối nội dung thật (ms) */
  contentStaggerMs: 40,

  /** Nếu dữ liệu về nhanh hơn ngưỡng này (ms) thì không hiện skeleton */
  delayShowMs: 200,

  /** Nếu đã hiện skeleton thì giữ tối thiểu (ms) để tránh chớp nháy */
  minDisplayMs: 400,

  /** Ngưỡng timeout (ms) chuyển sang thông báo lỗi kèm nút Thử lại */
  timeoutMs: 10000,

  /** Easing mượt kiểu iOS */
  easing: [0.32, 0.72, 0, 1] as const,
} as const;
