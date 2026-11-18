export const PRESET_AVATAR_URL_MAP: Record<string, string> = {
  'animal-01': 'https://api.dicebear.com/9.x/thumbs/svg?seed=OrangeCat&backgroundColor=f59e0b,fbbf24&size=256',
  'animal-02': 'https://api.dicebear.com/9.x/thumbs/svg?seed=RedFox&backgroundColor=ea580c,f97316&size=256',
  'animal-03': 'https://api.dicebear.com/9.x/thumbs/svg?seed=PandaChill&backgroundColor=10b981,34d399&size=256',
  'animal-04': 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=NightOwl&backgroundColor=312e81,4338ca&size=256',
  'animal-05': 'https://api.dicebear.com/9.x/thumbs/svg?seed=ShibaInu&backgroundColor=d97706,f59e0b&size=256',
  'animal-06': 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=WhiteRabbit&backgroundColor=ec4899,f472b6&size=256',

  'character-01': 'https://api.dicebear.com/9.x/adventurer/svg?seed=IndieTraveler&backgroundColor=b6e3f4&size=256',
  'character-02': 'https://api.dicebear.com/9.x/lorelei/svg?seed=LofiGirl&backgroundColor=ffd5dc&size=256',
  'character-03': 'https://api.dicebear.com/9.x/adventurer/svg?seed=MidnightDJ&backgroundColor=c0aede&size=256',
  'character-04': 'https://api.dicebear.com/9.x/notionists/svg?seed=AcousticSoul&backgroundColor=d1d4f9&size=256',
  'character-05': 'https://api.dicebear.com/9.x/lorelei/svg?seed=Daydreamer&backgroundColor=d1fae5&size=256',
  'character-06': 'https://api.dicebear.com/9.x/adventurer/svg?seed=VietRapper&backgroundColor=fde68a&size=256',

  'music-01': 'https://api.dicebear.com/9.x/bottts/svg?seed=SynthwaveBot&backgroundColor=0f172a,1e293b&size=256',
  'music-02': 'https://api.dicebear.com/9.x/bottts/svg?seed=VinylSpinner&backgroundColor=14532d,166534&size=256',
  'music-03': 'https://api.dicebear.com/9.x/bottts/svg?seed=BassDrop&backgroundColor=3b0764,581c87&size=256',
  'music-04': 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=JazzNote&backgroundColor=78350f,92400e&size=256',
  'music-05': 'https://api.dicebear.com/9.x/bottts/svg?seed=LofiStudio&backgroundColor=1e3a8a,1d4ed8&size=256',
  'music-06': 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=HappyBeat&backgroundColor=065f46,059669&size=256',

  'abstract-01': 'https://api.dicebear.com/9.x/shapes/svg?seed=NeonWave&backgroundColor=09090b&size=256',
  'abstract-02': 'https://api.dicebear.com/9.x/shapes/svg?seed=GreenPrism&backgroundColor=064e3b&size=256',
  'abstract-03': 'https://api.dicebear.com/9.x/shapes/svg?seed=MinimalGeo&backgroundColor=18181b&size=256',
  'abstract-04': 'https://api.dicebear.com/9.x/rings/svg?seed=LoopRing&backgroundColor=1e1b4b&size=256',
  'abstract-05': 'https://api.dicebear.com/9.x/identicon/svg?seed=PulseGrid&backgroundColor=0f172a&size=256',

  'nature-01': 'https://api.dicebear.com/9.x/shapes/svg?seed=PineForest&backgroundColor=14532d&size=256',
  'nature-02': 'https://api.dicebear.com/9.x/rings/svg?seed=MidnightOcean&backgroundColor=0c4a6e&size=256',
  'nature-03': 'https://api.dicebear.com/9.x/shapes/svg?seed=WarmSunset&backgroundColor=7c2d12&size=256',
  'nature-04': 'https://api.dicebear.com/9.x/rings/svg?seed=AuroraSky&backgroundColor=064e3b&size=256',
  'nature-05': 'https://api.dicebear.com/9.x/shapes/svg?seed=FirstRain&backgroundColor=1e293b&size=256',
};

const SAFE_LOCAL_AVATAR_RE = /^\/avatars\/[a-z0-9._-]+\.(webp|png|jpg|jpeg|svg)$/i;
const SAFE_DATA_IMAGE_RE = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i;

export function resolveSafeAvatarUrl(input: {
  presetId?: string;
  avatarUrl?: string | null;
}): string | null | undefined {
  if (input.presetId !== undefined) {
    const presetUrl = PRESET_AVATAR_URL_MAP[input.presetId];
    if (!presetUrl) {
      throw Object.assign(new Error('Mã ảnh đại diện có sẵn không hợp lệ'), { statusCode: 400 });
    }
    return presetUrl;
  }

  if (input.avatarUrl === undefined) {
    return undefined;
  }

  if (input.avatarUrl === null || input.avatarUrl.trim() === '') {
    return null;
  }

  const trimmed = input.avatarUrl.trim();
  if (SAFE_LOCAL_AVATAR_RE.test(trimmed) || SAFE_DATA_IMAGE_RE.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return trimmed;
    }
  } catch {
    // fall through
  }

  throw Object.assign(new Error('Đường dẫn ảnh đại diện không hợp lệ hoặc không an toàn'), {
    statusCode: 400,
  });
}
