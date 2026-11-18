/**
 * Cấu hình bật/tắt các khối tính năng bổ sung cho trang cá nhân.
 * Khi đặt false ở bất kỳ cờ nào, khối tương ứng sẽ ẩn hoàn toàn và giữ nguyên giao diện cũ.
 */
export const PROFILE_ENHANCEMENTS_CONFIG = {
  enabled: true,
  headerMetaAndCopy: true,
  completenessBar: true,
  extendedStats: true,
  listeningChart: true,
  playlistCreateAndCollage: true,
  unlikeAndUnfollowButtons: true,
  achievementsAndActivity: true,
} as const;
