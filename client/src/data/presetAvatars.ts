export type PresetAvatarCategory =
  | 'Tất cả'
  | 'Động vật'
  | 'Nhân vật'
  | 'Âm nhạc'
  | 'Trừu tượng'
  | 'Thiên nhiên';

export interface PresetAvatar {
  id: string;
  name: string;
  category: Exclude<PresetAvatarCategory, 'Tất cả'>;
  url: string;
}

export const PRESET_AVATAR_CATEGORIES: PresetAvatarCategory[] = [
  'Tất cả',
  'Động vật',
  'Nhân vật',
  'Âm nhạc',
  'Trừu tượng',
  'Thiên nhiên',
];

/**
 * Thư viện ảnh đại diện có sẵn cho trang Hồ sơ (/profile).
 * Ghi chú: Hiện đang dùng placeholder từ DiceBear v9 (256x256 SVG nhẹ).
 * Khi có bộ ảnh WebP riêng, đặt vào `client/public/avatars/` (ví dụ `animal-01.webp`)
 * và thay URL tương ứng tại đây + đồng bộ ở `server/src/config/preset-avatars.ts`.
 */
export const PRESET_AVATARS: PresetAvatar[] = [
  // Động vật (6)
  {
    id: 'animal-01',
    name: 'Mèo cam',
    category: 'Động vật',
    url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=OrangeCat&backgroundColor=f59e0b,fbbf24&size=256',
  },
  {
    id: 'animal-02',
    name: 'Cáo đỏ',
    category: 'Động vật',
    url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=RedFox&backgroundColor=ea580c,f97316&size=256',
  },
  {
    id: 'animal-03',
    name: 'Gấu trúc',
    category: 'Động vật',
    url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=PandaChill&backgroundColor=10b981,34d399&size=256',
  },
  {
    id: 'animal-04',
    name: 'Cú đêm',
    category: 'Động vật',
    url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=NightOwl&backgroundColor=312e81,4338ca&size=256',
  },
  {
    id: 'animal-05',
    name: 'Chó Shiba',
    category: 'Động vật',
    url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=ShibaInu&backgroundColor=d97706,f59e0b&size=256',
  },
  {
    id: 'animal-06',
    name: 'Thỏ trắng',
    category: 'Động vật',
    url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=WhiteRabbit&backgroundColor=ec4899,f472b6&size=256',
  },

  // Nhân vật (6)
  {
    id: 'character-01',
    name: 'Lữ khách Indie',
    category: 'Nhân vật',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=IndieTraveler&backgroundColor=b6e3f4&size=256',
  },
  {
    id: 'character-02',
    name: 'Cô gái Lo-Fi',
    category: 'Nhân vật',
    url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=LofiGirl&backgroundColor=ffd5dc&size=256',
  },
  {
    id: 'character-03',
    name: 'DJ Đêm khuya',
    category: 'Nhân vật',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=MidnightDJ&backgroundColor=c0aede&size=256',
  },
  {
    id: 'character-04',
    name: 'Nghệ sĩ Acoustic',
    category: 'Nhân vật',
    url: 'https://api.dicebear.com/9.x/notionists/svg?seed=AcousticSoul&backgroundColor=d1d4f9&size=256',
  },
  {
    id: 'character-05',
    name: 'Người mơ mộng',
    category: 'Nhân vật',
    url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Daydreamer&backgroundColor=d1fae5&size=256',
  },
  {
    id: 'character-06',
    name: 'Chàng Rapper',
    category: 'Nhân vật',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=VietRapper&backgroundColor=fde68a&size=256',
  },

  // Âm nhạc (6)
  {
    id: 'music-01',
    name: 'Robot Synthwave',
    category: 'Âm nhạc',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=SynthwaveBot&backgroundColor=0f172a,1e293b&size=256',
  },
  {
    id: 'music-02',
    name: 'Đĩa than Vinyl',
    category: 'Âm nhạc',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=VinylSpinner&backgroundColor=14532d,166534&size=256',
  },
  {
    id: 'music-03',
    name: 'Nhịp Bass',
    category: 'Âm nhạc',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=BassDrop&backgroundColor=3b0764,581c87&size=256',
  },
  {
    id: 'music-04',
    name: 'Giai điệu Jazz',
    category: 'Âm nhạc',
    url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=JazzNote&backgroundColor=78350f,92400e&size=256',
  },
  {
    id: 'music-05',
    name: 'Phòng thu Lo-Fi',
    category: 'Âm nhạc',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=LofiStudio&backgroundColor=1e3a8a,1d4ed8&size=256',
  },
  {
    id: 'music-06',
    name: 'Nốt nhạc vui',
    category: 'Âm nhạc',
    url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=HappyBeat&backgroundColor=065f46,059669&size=256',
  },

  // Trừu tượng (5)
  {
    id: 'abstract-01',
    name: 'Sóng âm Neon',
    category: 'Trừu tượng',
    url: 'https://api.dicebear.com/9.x/shapes/svg?seed=NeonWave&backgroundColor=09090b&size=256',
  },
  {
    id: 'abstract-02',
    name: 'Lăng kính xanh',
    category: 'Trừu tượng',
    url: 'https://api.dicebear.com/9.x/shapes/svg?seed=GreenPrism&backgroundColor=064e3b&size=256',
  },
  {
    id: 'abstract-03',
    name: 'Hình học tối giản',
    category: 'Trừu tượng',
    url: 'https://api.dicebear.com/9.x/shapes/svg?seed=MinimalGeo&backgroundColor=18181b&size=256',
  },
  {
    id: 'abstract-04',
    name: 'Vòng lặp',
    category: 'Trừu tượng',
    url: 'https://api.dicebear.com/9.x/rings/svg?seed=LoopRing&backgroundColor=1e1b4b&size=256',
  },
  {
    id: 'abstract-05',
    name: 'Nhịp điện tử',
    category: 'Trừu tượng',
    url: 'https://api.dicebear.com/9.x/identicon/svg?seed=PulseGrid&backgroundColor=0f172a&size=256',
  },

  // Thiên nhiên (5)
  {
    id: 'nature-01',
    name: 'Rừng thông',
    category: 'Thiên nhiên',
    url: 'https://api.dicebear.com/9.x/shapes/svg?seed=PineForest&backgroundColor=14532d&size=256',
  },
  {
    id: 'nature-02',
    name: 'Biển đêm',
    category: 'Thiên nhiên',
    url: 'https://api.dicebear.com/9.x/rings/svg?seed=MidnightOcean&backgroundColor=0c4a6e&size=256',
  },
  {
    id: 'nature-03',
    name: 'Hoàng hôn',
    category: 'Thiên nhiên',
    url: 'https://api.dicebear.com/9.x/shapes/svg?seed=WarmSunset&backgroundColor=7c2d12&size=256',
  },
  {
    id: 'nature-04',
    name: 'Cực quang',
    category: 'Thiên nhiên',
    url: 'https://api.dicebear.com/9.x/rings/svg?seed=AuroraSky&backgroundColor=064e3b&size=256',
  },
  {
    id: 'nature-05',
    name: 'Mưa đầu mùa',
    category: 'Thiên nhiên',
    url: 'https://api.dicebear.com/9.x/shapes/svg?seed=FirstRain&backgroundColor=1e293b&size=256',
  },
];
