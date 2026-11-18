import crypto from 'crypto';
import { UnifiedTrack } from '../providers/music-provider.interface.js';
import { spotifyProvider } from '../providers/spotify.provider.js';
import { zingMp3Provider } from '../providers/zingmp3.provider.js';
import { audiusProvider } from '../providers/audius.provider.js';
import { jamendoProvider } from '../providers/jamendo.provider.js';
import { youtubeProvider } from '../providers/youtube.provider.js';
import { itunesProvider } from '../providers/itunes.provider.js';
import { searchService } from './search.service.js';
import { prisma } from '../config/prisma.js';
import {
  EXPLORE_CONFIG,
  EXPLORE_FALLBACK_TRACKS,
} from '../config/explore.config.js';

interface CachedPool {
  tracks: UnifiedTrack[];
  expiresAt: number;
  updatedAt: number;
}

let trendingPoolCache: CachedPool | null = null;
let vietnamesePoolCache: CachedPool | null = null;

/** Băm chuỗi seed thành số nguyên 32-bit */
function hashSeedToUint32(seed: string): number {
  const digest = crypto.createHash('sha256').update(seed).digest();
  return digest.readUInt32BE(0);
}

/** PRNG Mulberry32 cho phép tái hiện kết quả chính xác khi truyền cùng seed */
export function createSeededRng(seed: string): () => number {
  let state = hashSeedToUint32(seed) || 1;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Thuật toán xáo trộn Fisher-Yates chuẩn (không lệch phân phối) */
export function fisherYatesShuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/** Kiểm tra bài hát đủ chất lượng để hiển thị trên trang Khám phá */
export function isValidExploreTrack(track: UnifiedTrack | null | undefined): boolean {
  if (!track || !track.id || !track.title?.trim()) return false;
  if (!Array.isArray(track.artists) || track.artists.length === 0) return false;
  if (!track.coverUrl || !track.coverUrl.trim()) return false;
  if (track.source === 'deezer') return false;

  const lower = track.title.toLowerCase();
  if (
    lower.includes('am remix') ||
    lower.includes('nhacpro') ||
    lower.includes('remix - am')
  ) {
    return false;
  }

  return true;
}

/** Xáo trộn có trọng số (bài hot/lượt nghe cao có xác suất đứng đầu cao hơn) */
export function weightedShuffleTracks(
  tracks: UnifiedTrack[],
  rng: () => number,
  daySeed?: string
): UnifiedTrack[] {
  if (tracks.length <= 1) return [...tracks];

  // Tạo điểm ổn định nhẹ theo ngày (nếu có daySeed) kết hợp yếu tố ngẫu nhiên theo lượt nghe
  const dayRng = daySeed ? createSeededRng(daySeed) : null;
  const scored = tracks.map((track, idx) => {
    const plays = Number(track.playCount || 0);
    const popularityWeight = Math.log10(plays + 10) + (track.isFullLength ? 1.4 : 0);
    const rankBonus = Math.max(0.2, 2.5 - idx * 0.04);
    const dailyAnchor = dayRng ? dayRng() * 0.6 : 0;
    const randomFactor = Math.max(0.0001, rng());
    // Efraimidis-Spirakis weighted random key: u^(1/w)
    const key = Math.pow(randomFactor, 1 / Math.max(0.5, popularityWeight + rankBonus + dailyAnchor));
    return { track, key };
  });

  scored.sort((a, b) => b.key - a.key);
  return scored.map((s) => s.track);
}

/**
 * Chọn ra danh sách bài cho một mục đảm bảo:
 * - Không trùng với `forbiddenIds` (để không trùng giữa 2 mục và tránh lặp lần trước).
 * - Tối đa `maxPerArtist` (2) bài của cùng một nghệ sĩ.
 * - Tỉ lệ bài Full >= `minFullRatio` (60%) nếu pool đủ.
 * - Cân bằng nguồn phát để tránh 1 nguồn chiếm toàn bộ danh sách.
 * - Luôn đủ `count` bài (tự bù nếu pool nhỏ).
 */
export function selectDiverseSectionTracks(params: {
  pool: UnifiedTrack[];
  count: number;
  rng: () => number;
  weighted?: boolean;
  daySeed?: string;
  excludeIds?: string[];
  forbiddenIds?: Set<string>;
  pinnedIds?: string[];
  fallbackPool?: UnifiedTrack[];
  maxPerArtist?: number;
  minFullRatio?: number;
}): UnifiedTrack[] {
  const {
    pool,
    count,
    rng,
    weighted = false,
    daySeed,
    excludeIds = [],
    forbiddenIds = new Set<string>(),
    pinnedIds = [],
    fallbackPool = [],
    maxPerArtist = EXPLORE_CONFIG.maxPerArtist,
    minFullRatio = EXPLORE_CONFIG.minFullRatio,
  } = params;

  const excludeSet = new Set(excludeIds);
  const validPool = searchService.deduplicateTracks(pool.filter(isValidExploreTrack));

  // Tách 2 nhóm: ưu tiên bài chưa xuất hiện lần trước, sau đó mới tới bài vừa hiện
  const freshPool = validPool.filter(
    (t) => !forbiddenIds.has(t.id) && !excludeSet.has(t.id)
  );
  const excludedBackupPool = validPool.filter(
    (t) => !forbiddenIds.has(t.id) && excludeSet.has(t.id)
  );

  const orderedFresh = weighted
    ? weightedShuffleTracks(freshPool, rng, daySeed)
    : fisherYatesShuffle(freshPool, rng);
  const orderedBackup = fisherYatesShuffle(excludedBackupPool, rng);
  const orderedFallback = fisherYatesShuffle(
    fallbackPool.filter((t) => !forbiddenIds.has(t.id)),
    rng
  );

  const selected: UnifiedTrack[] = [];
  const selectedIds = new Set<string>();
  const artistCounts = new Map<string, number>();
  const sourceCounts = new Map<string, number>();

  const canAdd = (track: UnifiedTrack, enforceDiversity: boolean): boolean => {
    if (selectedIds.has(track.id) || forbiddenIds.has(track.id)) return false;
    if (!enforceDiversity) return true;

    const primaryArtist = (track.artists[0] || '').toLowerCase().trim();
    if (primaryArtist && (artistCounts.get(primaryArtist) || 0) >= maxPerArtist) {
      return false;
    }

    // Cân bằng nguồn: không để 1 nguồn chiếm quá 60% số lượng
    const maxPerSource = Math.max(4, Math.ceil(count * 0.6));
    if ((sourceCounts.get(track.source) || 0) >= maxPerSource) {
      return false;
    }

    return true;
  };

  const pushTrack = (track: UnifiedTrack) => {
    selected.push(track);
    selectedIds.add(track.id);
    const primaryArtist = (track.artists[0] || '').toLowerCase().trim();
    if (primaryArtist) {
      artistCounts.set(primaryArtist, (artistCounts.get(primaryArtist) || 0) + 1);
    }
    sourceCounts.set(track.source, (sourceCounts.get(track.source) || 0) + 1);
  };

  // 1. Đưa bài được Admin ghim (nếu có) lên đầu
  if (pinnedIds.length > 0) {
    for (const pinId of pinnedIds) {
      const found = validPool.find((t) => t.id === pinId);
      if (found && selected.length < count && !selectedIds.has(found.id)) {
        pushTrack(found);
      }
    }
  }

  // 2. Ưu tiên chọn đủ tỉ lệ bài Full tối thiểu (60%) trước
  const minFullCount = Math.ceil(count * minFullRatio);
  const candidatesAll = [...orderedFresh, ...orderedBackup];

  for (const track of candidatesAll) {
    if (selected.length >= count) break;
    const currentFull = selected.filter((t) => t.isFullLength).length;
    if (currentFull >= minFullCount) break;
    if (track.isFullLength && canAdd(track, true)) {
      pushTrack(track);
    }
  }

  // 3. Điền tiếp các bài đa dạng nghệ sĩ và cân bằng nguồn
  for (const track of orderedFresh) {
    if (selected.length >= count) break;
    if (canAdd(track, true)) pushTrack(track);
  }

  // 4. Bù từ bài vừa hiện nếu sau khi lọc vẫn chưa đủ số lượng
  for (const track of orderedBackup) {
    if (selected.length >= count) break;
    if (canAdd(track, true)) pushTrack(track);
  }

  // 5. Nới lỏng ràng buộc nghệ sĩ/nguồn nếu pool quá nhỏ
  for (const track of candidatesAll) {
    if (selected.length >= count) break;
    if (canAdd(track, false)) pushTrack(track);
  }

  // 6. Cuối cùng bù từ danh sách dự phòng để không bao giờ trống hoặc thiếu
  for (const track of orderedFallback) {
    if (selected.length >= count) break;
    if (canAdd(track, false)) pushTrack(track);
  }

  return selected.slice(0, count);
}

/** Chạy một lời gọi provider với timeout 3 giây */
function withProviderTimeout<T>(promise: Promise<T>, ms = EXPLORE_CONFIG.providerTimeoutMs): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Provider timeout')), ms)
    ),
  ]);
}

const VIETNAMESE_DIACRITICS_RE =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

const KNOWN_VIETNAMESE_ARTISTS = [
  'son tung',
  'den vau',
  'hieuthuhai',
  'rpt mck',
  'mck',
  'mono',
  'amee',
  'low g',
  'grey d',
  'bich phuong',
  'b ray',
  'tlinh',
  'binz',
  'karik',
  'justatee',
  'rhymastic',
  'soobin',
  'erik',
  'duc phuc',
  'hoa minzy',
  'truc nhan',
  'noo phuoc thinh',
  'dong nhi',
  'my tam',
  'ha anh tuan',
  'phan manh quynh',
  'vu cat tuong',
  'tang duy tan',
  'hoang thuy linh',
  'van mai huong',
  'mr. siro',
  'mr siro',
  'dangrangto',
  'w/n',
  'madihu',
  'obito',
  'wxrdie',
  'da lab',
  'chillies',
  'suboi',
  'hoang dung',
  'hurrykng',
  'duong domic',
  'quang hung',
  'rhyder',
  'captain boy',
  'negav',
  'phap kieu',
  'min',
  'vu.',
];

const COMPILATION_NOISE_RE =
  /(nhạc trend tiktok|mashup|1\s*hour|1hours|tuyển tập|liên khúc|nonstop|lk nhạc)/i;

function isVietnameseTrack(track: UnifiedTrack): boolean {
  if (!isValidExploreTrack(track)) return false;
  if (COMPILATION_NOISE_RE.test(track.title)) return false;

  const combined = `${track.title} ${track.artists.join(' ')} ${track.album || ''}`;
  if (VIETNAMESE_DIACRITICS_RE.test(combined)) return true;

  const lowerArtists = track.artists.join(' ').toLowerCase();
  return KNOWN_VIETNAMESE_ARTISTS.some((artist) => lowerArtists.includes(artist));
}

async function fetchVietnamesePool(): Promise<{ tracks: UnifiedTrack[]; fromFallback: boolean }> {
  const now = Date.now();
  if (vietnamesePoolCache && now < vietnamesePoolCache.expiresAt) {
    return { tracks: vietnamesePoolCache.tracks, fromFallback: false };
  }

  const tasks: Array<Promise<UnifiedTrack[]>> = [
    ...EXPLORE_CONFIG.vietnamesePoolQueries.map((q) =>
      withProviderTimeout(zingMp3Provider.search(q, 'track').then((r) => r.tracks))
    ),
    withProviderTimeout(spotifyProvider.search('V-Pop hay nhất', 'track').then((r) => r.tracks)),
    withProviderTimeout(spotifyProvider.search('Vietnam Indie Rap', 'track').then((r) => r.tracks)),
    withProviderTimeout(youtubeProvider.search('nhạc Việt hay nhất', 'track').then((r) => r.tracks)),
    withProviderTimeout(itunesProvider.search('V-Pop', 'track').then((r) => r.tracks)),
    withProviderTimeout(
      prisma.song
        .findMany({
          where: { isHidden: false, source: { not: 'deezer' } },
          orderBy: { playCount: 'desc' },
          take: 25,
        })
        .then((rows) =>
          rows.map((s) => ({
            id: s.source === 'local' ? `local:${s.id}` : `${s.source}:${s.sourceId}`,
            source: s.source as any,
            sourceId: s.sourceId,
            title: s.title,
            artists: s.artists,
            album: s.album || undefined,
            coverUrl: s.coverUrl || undefined,
            durationMs: s.durationMs,
            playbackType: s.playbackType as any,
            streamUrl: s.streamUrl || undefined,
            embedId: s.embedId || undefined,
            previewUrl: s.previewUrl || undefined,
            isFullLength: s.isFullLength,
            playCount: s.playCount,
          }))
        )
    ),
  ];

  const results = await Promise.allSettled(tasks);
  const collected: UnifiedTrack[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      collected.push(...r.value);
    }
  }

  const valid = searchService
    .deduplicateTracks(collected.filter(isVietnameseTrack))
    .slice(0, EXPLORE_CONFIG.targetPoolSize);

  if (valid.length > 0) {
    vietnamesePoolCache = {
      tracks: valid,
      updatedAt: now,
      expiresAt: now + EXPLORE_CONFIG.poolCacheTtlMs,
    };
    return { tracks: valid, fromFallback: false };
  }

  if (vietnamesePoolCache?.tracks?.length) {
    return { tracks: vietnamesePoolCache.tracks, fromFallback: false };
  }

  return { tracks: EXPLORE_FALLBACK_TRACKS.vietnamese, fromFallback: true };
}

async function fetchTrendingPool(): Promise<{ tracks: UnifiedTrack[]; fromFallback: boolean }> {
  const now = Date.now();
  if (trendingPoolCache && now < trendingPoolCache.expiresAt) {
    return { tracks: trendingPoolCache.tracks, fromFallback: false };
  }

  const tasks: Array<Promise<UnifiedTrack[]>> = [
    ...EXPLORE_CONFIG.trendingPoolQueries.map((q) =>
      withProviderTimeout(zingMp3Provider.search(q, 'track').then((r) => r.tracks))
    ),
    withProviderTimeout(spotifyProvider.search('Top Hits Vietnam', 'track').then((r) => r.tracks)),
    withProviderTimeout(spotifyProvider.search('Today Top Hits', 'track').then((r) => r.tracks)),
    withProviderTimeout(audiusProvider.getTrending()),
    withProviderTimeout(jamendoProvider.getTrending()),
    withProviderTimeout(itunesProvider.search('Top Hits', 'track').then((r) => r.tracks)),
    withProviderTimeout(
      prisma.song
        .findMany({
          where: { isHidden: false, source: { not: 'deezer' } },
          orderBy: { playCount: 'desc' },
          take: 25,
        })
        .then((rows) =>
          rows.map((s) => ({
            id: s.source === 'local' ? `local:${s.id}` : `${s.source}:${s.sourceId}`,
            source: s.source as any,
            sourceId: s.sourceId,
            title: s.title,
            artists: s.artists,
            album: s.album || undefined,
            coverUrl: s.coverUrl || undefined,
            durationMs: s.durationMs,
            playbackType: s.playbackType as any,
            streamUrl: s.streamUrl || undefined,
            embedId: s.embedId || undefined,
            previewUrl: s.previewUrl || undefined,
            isFullLength: s.isFullLength,
            playCount: s.playCount,
          }))
        )
    ),
  ];

  const results = await Promise.allSettled(tasks);
  const collected: UnifiedTrack[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      collected.push(...r.value);
    }
  }

  const valid = searchService
    .deduplicateTracks(collected.filter(isVietnameseTrack))
    .slice(0, EXPLORE_CONFIG.targetPoolSize);

  if (valid.length > 0) {
    trendingPoolCache = {
      tracks: valid,
      updatedAt: now,
      expiresAt: now + EXPLORE_CONFIG.poolCacheTtlMs,
    };
    return { tracks: valid, fromFallback: false };
  }

  if (trendingPoolCache?.tracks?.length) {
    return { tracks: trendingPoolCache.tracks, fromFallback: false };
  }

  return { tracks: EXPLORE_FALLBACK_TRACKS.trending, fromFallback: true };
}

export interface GetExploreSectionsOptions {
  excludeIds?: string[];
  seed?: string;
  section?: 'all' | 'trending' | 'vietnamese';
  keepTrack?: UnifiedTrack | null;
  isShuffle?: boolean;
}

export interface ExploreSectionsResult {
  trending: UnifiedTrack[];
  vietnamese: UnifiedTrack[];
  seed: string;
  fromFallback: boolean;
  generatedAt: string;
}

function getVietnamDayKey(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function getVietnamStartOfDay(): Date {
  const dayKey = getVietnamDayKey();
  return new Date(`${dayKey}T00:00:00+07:00`);
}

async function overlayLiveWebPlayCounts(pool: UnifiedTrack[]): Promise<UnifiedTrack[]> {
  try {
    const startOfToday = getVietnamStartOfDay();
    const [todayCounts, topDbSongs] = await Promise.all([
      prisma.playHistory.groupBy({
        by: ['songId'],
        where: { playedAt: { gte: startOfToday } },
        _count: { songId: true },
        orderBy: { _count: { songId: 'desc' } },
        take: 40,
      }),
      prisma.song.findMany({
        where: { isHidden: false, source: { not: 'deezer' }, playCount: { gt: 0 } },
        orderBy: { playCount: 'desc' },
        take: 40,
      }),
    ]);

    const todayBySongId = new Map<string, number>();
    for (const row of todayCounts) {
      todayBySongId.set(row.songId, row._count.songId);
    }

    const dbIdsNeeded = Array.from(todayBySongId.keys()).filter(
      (id) => !topDbSongs.some((s) => s.id === id)
    );
    const extraSongs =
      dbIdsNeeded.length > 0
        ? await prisma.song.findMany({
            where: { id: { in: dbIdsNeeded }, isHidden: false, source: { not: 'deezer' } },
          })
        : [];

    const allPlayedSongs = [...topDbSongs, ...extraSongs];
    const scoreByTrackKey = new Map<string, { playCount: number; todayPlays: number }>();
    const dbTracks: UnifiedTrack[] = [];

    for (const s of allPlayedSongs) {
      const trackId = s.source === 'local' ? `local:${s.id}` : `${s.source}:${s.sourceId}`;
      const todayPlays = todayBySongId.get(s.id) || 0;
      const playCount = s.playCount || 0;
      scoreByTrackKey.set(trackId, { playCount, todayPlays });
      scoreByTrackKey.set(`${s.title.toLowerCase().trim()}`, { playCount, todayPlays });

      dbTracks.push({
        id: trackId,
        dbId: s.id,
        source: s.source as any,
        sourceId: s.sourceId,
        title: s.title,
        artists: s.artists,
        album: s.album || undefined,
        coverUrl: s.coverUrl || undefined,
        durationMs: s.durationMs,
        playbackType: s.playbackType as any,
        streamUrl: s.streamUrl || undefined,
        embedId: s.embedId || undefined,
        previewUrl: s.previewUrl || undefined,
        isFullLength: s.isFullLength,
        playCount,
        ...(todayPlays > 0 ? { _todayPlays: todayPlays } : {}),
      } as UnifiedTrack & { _todayPlays?: number });
    }

    const mergedPool = searchService.deduplicateTracks([...dbTracks, ...pool].filter(isValidExploreTrack));

    return mergedPool.map((t) => {
      const stats = scoreByTrackKey.get(t.id) || scoreByTrackKey.get(t.title.toLowerCase().trim());
      if (!stats) return t;
      return {
        ...t,
        playCount: Math.max(Number(t.playCount || 0), stats.playCount),
        ...(stats.todayPlays > 0 ? { _todayPlays: stats.todayPlays } : {}),
      } as UnifiedTrack & { _todayPlays?: number };
    });
  } catch {
    return pool;
  }
}

/**
 * Hàm dùng chung trả về 2 mục "Thịnh hành hôm nay" và "Giai điệu nhạc Việt":
 * - "Thịnh hành hôm nay" ổn định theo ngày (Asia/Ho_Chi_Minh) và cập nhật thứ hạng theo lượt nghe thực tế trên web.
 * - Khi bấm Làm mới (`isShuffle: true`), cho phép xáo trộn để khám phá thêm.
 * - Đảm bảo không trùng bài giữa 2 mục trong cùng 1 lần tải.
 */
export async function getExploreSections(
  options: GetExploreSectionsOptions = {}
): Promise<ExploreSectionsResult> {
  const isShuffle = Boolean(options.isShuffle);
  const dayKey = getVietnamDayKey();
  const seed = options.seed || (isShuffle ? crypto.randomUUID() : `daily:${dayKey}`);
  const excludeIds = (options.excludeIds || []).slice(-30);
  const section = options.section || 'all';

  const [trendingPoolRes, vietnamesePoolRes] = await Promise.all([
    fetchTrendingPool(),
    fetchVietnamesePool(),
  ]);

  const trendingRng = isShuffle
    ? createSeededRng(`${seed}:trending`)
    : createSeededRng(`daily:${dayKey}:trending`);
  const vietnameseRng = isShuffle
    ? createSeededRng(`${seed}:vietnamese`)
    : createSeededRng(`daily:${dayKey}:vietnamese`);

  let trending: UnifiedTrack[] = [];
  let vietnamese: UnifiedTrack[] = [];

  if (section === 'all' || section === 'trending') {
    const livePool = await overlayLiveWebPlayCounts(trendingPoolRes.tracks);

    if (!isShuffle) {
      // Ưu tiên các bài có lượt nghe thực tế trên web (lượt nghe hôm nay * 10 + tổng lượt nghe DB)
      const playedTracks = livePool
        .filter((t: any) => Number(t._todayPlays || 0) > 0 || Number(t.playCount || 0) > 0)
        .sort((a: any, b: any) => {
          const scoreA = Number(a._todayPlays || 0) * 10 + Number(a.playCount || 0);
          const scoreB = Number(b._todayPlays || 0) * 10 + Number(b.playCount || 0);
          return scoreB - scoreA;
        });

      const unplayedPool = livePool.filter(
        (t: any) => Number(t._todayPlays || 0) === 0 && Number(t.playCount || 0) === 0
      );

      const topPlayed = playedTracks.slice(0, EXPLORE_CONFIG.sectionSize).map((t: any) => {
        const { _todayPlays, ...clean } = t;
        return clean as UnifiedTrack;
      });

      const remainingCount = Math.max(0, EXPLORE_CONFIG.sectionSize - topPlayed.length);
      const dailyFill =
        remainingCount > 0
          ? selectDiverseSectionTracks({
              pool: unplayedPool,
              count: remainingCount,
              rng: trendingRng,
              weighted: EXPLORE_CONFIG.weightedTrending,
              daySeed: dayKey,
              excludeIds: [],
              forbiddenIds: new Set(topPlayed.map((t) => t.id)),
              pinnedIds: [...EXPLORE_CONFIG.pinnedTrendingIds],
              fallbackPool: EXPLORE_FALLBACK_TRACKS.trending,
            })
          : [];

      trending = [...topPlayed, ...dailyFill].slice(0, EXPLORE_CONFIG.sectionSize);
    } else {
      trending = selectDiverseSectionTracks({
        pool: livePool,
        count: EXPLORE_CONFIG.sectionSize,
        rng: trendingRng,
        weighted: EXPLORE_CONFIG.weightedTrending,
        daySeed: dayKey,
        excludeIds,
        pinnedIds: [...EXPLORE_CONFIG.pinnedTrendingIds],
        fallbackPool: EXPLORE_FALLBACK_TRACKS.trending,
      });
    }
  }

  // Không trùng bài giữa 2 mục trong cùng một lần tải
  const trendingIdSet = new Set(trending.map((t) => t.id));

  if (section === 'all' || section === 'vietnamese') {
    const liveVpopPool = (await overlayLiveWebPlayCounts(vietnamesePoolRes.tracks)).filter(
      isVietnameseTrack
    );

    if (!isShuffle) {
      const playedVpop = liveVpopPool
        .filter((t: any) => !trendingIdSet.has(t.id))
        .filter((t: any) => Number(t._todayPlays || 0) > 0 || Number(t.playCount || 0) > 0)
        .sort((a: any, b: any) => {
          const scoreA = Number(a._todayPlays || 0) * 10 + Number(a.playCount || 0);
          const scoreB = Number(b._todayPlays || 0) * 10 + Number(b.playCount || 0);
          return scoreB - scoreA;
        });

      const unplayedVpop = liveVpopPool.filter(
        (t: any) => Number(t._todayPlays || 0) === 0 && Number(t.playCount || 0) === 0
      );

      const topPlayedVpop = playedVpop.slice(0, EXPLORE_CONFIG.sectionSize).map((t: any) => {
        const { _todayPlays, ...clean } = t;
        return clean as UnifiedTrack;
      });

      const remainingCount = Math.max(0, EXPLORE_CONFIG.sectionSize - topPlayedVpop.length);
      const dailyFillVpop =
        remainingCount > 0
          ? selectDiverseSectionTracks({
              pool: unplayedVpop,
              count: remainingCount,
              rng: vietnameseRng,
              weighted: false,
              daySeed: dayKey,
              excludeIds: [],
              forbiddenIds: new Set([...trendingIdSet, ...topPlayedVpop.map((t) => t.id)]),
              pinnedIds: [...EXPLORE_CONFIG.pinnedVietnameseIds],
              fallbackPool: EXPLORE_FALLBACK_TRACKS.vietnamese,
            })
          : [];

      vietnamese = [...topPlayedVpop, ...dailyFillVpop].slice(0, EXPLORE_CONFIG.sectionSize);
    } else {
      vietnamese = selectDiverseSectionTracks({
        pool: liveVpopPool,
        count: EXPLORE_CONFIG.sectionSize,
        rng: vietnameseRng,
        weighted: false,
        excludeIds,
        forbiddenIds: trendingIdSet,
        pinnedIds: [...EXPLORE_CONFIG.pinnedVietnameseIds],
        fallbackPool: EXPLORE_FALLBACK_TRACKS.vietnamese,
      });
    }
  }

  // Nếu người dùng bấm Làm mới trong khi đang phát 1 bài thuộc mục đó -> giữ bài đang phát không bị biến mất đột ngột
  if (options.keepTrack && options.keepTrack.id) {
    const keep = options.keepTrack;
    if (section === 'trending' && !trending.some((t) => t.id === keep.id)) {
      trending = [keep, ...trending.slice(0, EXPLORE_CONFIG.sectionSize - 1)];
    }
    if (section === 'vietnamese' && !vietnamese.some((t) => t.id === keep.id)) {
      vietnamese = [keep, ...vietnamese.slice(0, EXPLORE_CONFIG.sectionSize - 1)];
    }
  }

  return {
    trending,
    vietnamese,
    seed,
    fromFallback: Boolean(trendingPoolRes.fromFallback && vietnamesePoolRes.fromFallback),
    generatedAt: new Date().toISOString(),
  };
}
