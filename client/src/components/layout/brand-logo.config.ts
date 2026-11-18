/**
 * Cấu hình tách riêng cho BrandLogo ("mq" + chấm xanh trạng thái)
 * Hỗ trợ 2 phương án:
 * - 'subtle' (Tinh tế): chỉ tinh chỉnh chữ, gradient nhẹ và chấm xanh phát sáng tĩnh.
 * - 'balanced' (Nổi bật vừa phải): thêm hiệu ứng tải trang, nhịp thở 3s, phản hồi khi phát nhạc và hover.
 */

export type BrandLogoVariant = 'subtle' | 'balanced';

export const BRAND_LOGO_CONFIG = {
  /** Phương án mặc định đang áp dụng trên thanh điều hướng */
  defaultVariant: 'balanced' as BrandLogoVariant,

  /** Chữ logo */
  wordmark: 'mq',

  /** Thời lượng hiệu ứng tải trang cho chữ (ms) */
  enterDurationMs: 500,
  /** Độ trễ xuất hiện của chấm xanh sau chữ (ms) */
  dotEnterDelayMs: 150,
  /** Khoảng trượt ngang khi tải trang (px) */
  enterSlidePx: 8,

  /** Spring nảy nhẹ khi chấm xanh xuất hiện */
  dotEnterSpring: {
    type: 'spring' as const,
    stiffness: 420,
    damping: 22,
    mass: 0.7,
  },

  /** Easing mượt kiểu Apple/iOS */
  easing: [0.32, 0.72, 0, 1] as const,

  /** Chu kỳ nhịp thở khi rảnh (giây) */
  pulseIdleDurationSec: 3,
  /** Chu kỳ nhịp nhẹ khi đang phát nhạc (giây) */
  pulsePlayingDurationSec: 1.15,

  /** Tỉ lệ phóng to chấm xanh khi hover */
  hoverDotScale: 1.25,
  /** Độ nhích ngang của chữ khi hover (px) */
  hoverWordmarkShiftPx: 1,
} as const;
