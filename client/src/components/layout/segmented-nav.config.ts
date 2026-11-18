/**
 * Cấu hình tách riêng cho thanh điều hướng Segmented Control kiểu iOS
 * Có thể tinh chỉnh thời lượng, easing/spring, độ co nhấn, khoảng trượt nội dung và danh sách tab tại đây.
 */

export interface NavTabItem {
  id: string;
  label: string;
  to: string;
  /** Các tiền tố route phụ vẫn được tính là thuộc tab này */
  matchPrefixes?: string[];
}

export const NAV_TABS: NavTabItem[] = [
  { id: 'discover', label: 'Khám phá', to: '/' },
  { id: 'search', label: 'Tìm kiếm', to: '/search' },
  { id: 'artists', label: 'Nghệ sĩ', to: '/artists', matchPrefixes: ['/artists/'] },
  { id: 'library', label: 'Thư viện', to: '/library', matchPrefixes: ['/playlists/'] },
  { id: 'credits', label: 'Bản quyền', to: '/credits' },
];

export const SEGMENTED_NAV_CONFIG = {
  /** Thời lượng trượt thumb (ms) nếu dùng tween easing */
  durationThumbMs: 350,
  /** Thời lượng chuyển màu chữ tab (ms) */
  durationTextMs: 200,
  /** Thời lượng chuyển nội dung trang (ms) */
  durationContentMs: 260,

  /** Easing kiểu iOS / Apple */
  iosEasing: [0.32, 0.72, 0, 1] as const,

  /** Cấu hình Spring vật lý kiểu iOS cho Framer Motion */
  spring: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 30,
    mass: 0.9,
  },

  /** Độ co nhẹ khi nhấn giữ tab */
  pressScale: 0.96,

  /** Khoảng cách trượt ngang khi chuyển nội dung tab (px) */
  contentSlidePx: 24,

  /** Ngưỡng di chuyển (px) để phân biệt kéo thumb và click thường */
  dragThresholdPx: 5,
} as const;

/**
 * Xác định index tab đang active dựa trên pathname hiện tại.
 * Trả về -1 nếu đang ở route ngoài 5 tab chính (VD: /admin, /profile, /auth).
 */
export function getActiveTabIndex(pathname: string): number {
  return NAV_TABS.findIndex((tab) => {
    if (tab.to === '/') {
      return pathname === '/';
    }
    if (pathname === tab.to) return true;
    return Boolean(tab.matchPrefixes?.some((prefix) => pathname.startsWith(prefix)));
  });
}
