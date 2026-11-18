import { UnifiedTrack } from '../providers/music-provider.interface.js';

/**
 * Cấu hình tách riêng cho hệ thống Khám phá ngẫu nhiên có kiểm soát
 * ("Thịnh hành hôm nay" & "Giai điệu nhạc Việt")
 */
export const EXPLORE_CONFIG = {
  /** Số bài trả về cho mỗi mục */
  sectionSize: 12,

  /** Kích thước pool ứng viên mục tiêu trước khi lọc & chọn */
  targetPoolSize: 50,

  /** Thời gian cache pool (ms) — 7 phút (chỉ cache pool, bước xáo trộn chạy mỗi request) */
  poolCacheTtlMs: 7 * 60 * 1000,

  /** Timeout cho mỗi nguồn nhạc khi lấy pool (ms) */
  providerTimeoutMs: 3000,

  /** Số bài tối đa của cùng một nghệ sĩ trong một mục */
  maxPerArtist: 2,

  /** Tỉ lệ bài Full tối thiểu trong mỗi mục nếu pool đủ */
  minFullRatio: 0.6,

  /** Số bài vừa hiện ở lần trước được ưu tiên loại trừ để tránh lặp */
  recentExcludeLimit: 8,

  /** Bật/tắt ngẫu nhiên có trọng số cho mục "Thịnh hành hôm nay" */
  weightedTrending: true,

  /** Danh sách ID bài hát Admin ghim ở đầu mỗi mục (tùy chọn) */
  pinnedTrendingIds: [] as string[],
  pinnedVietnameseIds: [] as string[],

  /** Từ khóa truy vấn xây dựng Pool "Giai điệu nhạc Việt" */
  vietnamesePoolQueries: [
    'V-Pop hay nhất',
    'nhạc Việt thịnh hành',
    'Sơn Tùng M-TP',
    'Indie Việt Vũ tlinh',
    'Rap Việt Đen Vâu HIEUTHUHAI',
  ],

  /** Từ khóa truy vấn xây dựng Pool "Thịnh hành hôm nay" */
  trendingPoolQueries: [
    'Top Hits Vietnam',
    'thịnh hành',
    'bài hát hot nhất',
    'Top Global Hits',
  ],
} as const;

/** Danh sách dự phòng cố định khi toàn bộ nguồn bên ngoài gặp sự cố */
export const EXPLORE_FALLBACK_TRACKS: {
  trending: UnifiedTrack[];
  vietnamese: UnifiedTrack[];
} = {
  trending: [
    {
      id: 'fallback:trending-1',
      source: 'zingmp3',
      sourceId: 'ZW7O6I8F',
      title: 'Nơi Này Có Anh',
      artists: ['Sơn Tùng M-TP'],
      album: 'm-tp M-TP',
      coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/13/5c/57/135c57dd-5297-81f3-0f56-1ac5dad47f8c/23UM1IM10890.rgb.jpg/600x600bb.jpg',
      durationMs: 260000,
      playbackType: 'zingmp3',
      isFullLength: true,
      playCount: 28100000,
    },
    {
      id: 'fallback:trending-2',
      source: 'zingmp3',
      sourceId: 'ZW8I7A2D',
      title: 'Chúng Ta Của Tương Lai',
      artists: ['Sơn Tùng M-TP'],
      album: 'Single',
      coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/19/c5/b4/19c5b46f-62a3-e9aa-f9a1-ca3af338c1eb/24UMGIM48787.rgb.jpg/600x600bb.jpg',
      durationMs: 249000,
      playbackType: 'zingmp3',
      isFullLength: true,
      playCount: 19500000,
    },
    {
      id: 'fallback:trending-3',
      source: 'zingmp3',
      sourceId: 'ZW9B3C1E',
      title: 'Không Thể Say',
      artists: ['HIEUTHUHAI'],
      album: 'Ai Cũng Phải Bắt Đầu Từ Đâu Đó',
      coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/28/fa/35/28fa35d2-5d80-cbd8-690e-a1313a4c3c34/602455711786_Cover.jpg/600x600bb.jpg',
      durationMs: 215000,
      playbackType: 'zingmp3',
      isFullLength: true,
      playCount: 14700000,
    },
    {
      id: 'fallback:trending-4',
      source: 'zingmp3',
      sourceId: 'ZW7K2M9A',
      title: 'Lạ Lùng',
      artists: ['Vũ.'],
      album: 'Single',
      coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music113/v4/69/60/4d/69604d44-d64b-a140-2baa-8afff0c4d4d5/190295287191.jpg/600x600bb.jpg',
      durationMs: 261000,
      playbackType: 'zingmp3',
      isFullLength: true,
      playCount: 11200000,
    },
    {
      id: 'fallback:trending-5',
      source: 'zingmp3',
      sourceId: 'ZW6P4N1B',
      title: 'nếu lúc đó',
      artists: ['tlinh'],
      album: 'ái',
      coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/ff/17/ec/ff17ec15-efc2-060b-dddd-a4eae2430270/00602455486226_Cover.jpg/600x600bb.jpg',
      durationMs: 264000,
      playbackType: 'zingmp3',
      isFullLength: true,
      playCount: 13800000,
    },
    {
      id: 'fallback:trending-6',
      source: 'zingmp3',
      sourceId: 'ZW5Q8R2C',
      title: 'Đi Về Nhà',
      artists: ['Đen Vâu', 'JustaTee'],
      album: 'Single',
      coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/cb/6f/ad/cb6fad6d-03c3-8eb9-6f69-64e4e61240cf/cover.jpg/600x600bb.jpg',
      durationMs: 200000,
      playbackType: 'zingmp3',
      isFullLength: true,
      playCount: 16400000,
    },
  ],
  vietnamese: [
    {
      id: 'fallback:vn-1',
      source: 'zingmp3',
      sourceId: 'ZW7F1A2B',
      title: 'Bước Qua Nhau',
      artists: ['Vũ.'],
      album: 'Một Vạn Năm',
      coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/08/a5/f6/08a5f654-e62a-704f-db92-eedca8fea651/190296352317.jpg/600x600bb.jpg',
      durationMs: 257000,
      playbackType: 'zingmp3',
      isFullLength: true,
      playCount: 9800000,
    },
    {
      id: 'fallback:vn-2',
      source: 'zingmp3',
      sourceId: 'ZW8G2B3C',
      title: 'Nấu Ăn Cho Em',
      artists: ['Đen Vâu', 'PiaLinh'],
      album: 'Single',
      coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/cb/6f/ad/cb6fad6d-03c3-8eb9-6f69-64e4e61240cf/cover.jpg/600x600bb.jpg',
      durationMs: 245000,
      playbackType: 'zingmp3',
      isFullLength: true,
      playCount: 12100000,
    },
    {
      id: 'fallback:vn-3',
      source: 'zingmp3',
      sourceId: 'ZW9H3C4D',
      title: 'Ngủ Một Mình',
      artists: ['HIEUTHUHAI', 'Negav'],
      album: 'Single',
      coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/8e/bb/ff/8ebbff69-0b36-118d-6dab-d2b3a9c3d677/602448945051_Cover.jpg/600x600bb.jpg',
      durationMs: 198000,
      playbackType: 'zingmp3',
      isFullLength: true,
      playCount: 16900000,
    },
    {
      id: 'fallback:vn-4',
      source: 'zingmp3',
      sourceId: 'ZW6J4D5E',
      title: 'Chờ Đợi Có Đáng Sợ',
      artists: ['Andiez'],
      album: 'Single',
      coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/f6/c3/07/f6c30790-864b-c859-dc66-7683e3ae98fc/190296441318.jpg/600x600bb.jpg',
      durationMs: 274000,
      playbackType: 'zingmp3',
      isFullLength: true,
      playCount: 8400000,
    },
    {
      id: 'fallback:vn-5',
      source: 'zingmp3',
      sourceId: 'ZW5K5E6F',
      title: 'Tháng Tư Là Lời Nói Dối Của Em',
      artists: ['Hà Anh Tuấn'],
      album: 'Fragile',
      coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/a4/1e/87/a41e8763-8d49-e47a-2dc2-598f7fee8218/190296317842.jpg/600x600bb.jpg',
      durationMs: 305000,
      playbackType: 'zingmp3',
      isFullLength: true,
      playCount: 15200000,
    },
    {
      id: 'fallback:vn-6',
      source: 'zingmp3',
      sourceId: 'ZW4L6F7G',
      title: 'Có Chàng Trai Viết Lên Cây',
      artists: ['Phan Mạnh Quỳnh'],
      album: 'Mắt Biếc OST',
      coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/c1/41/ce/c141ce00-f9eb-6d9e-0420-640d5f9b0518/5034644707082.jpg/600x600bb.jpg',
      durationMs: 310000,
      playbackType: 'zingmp3',
      isFullLength: true,
      playCount: 14100000,
    },
  ],
};
