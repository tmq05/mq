import { prisma } from '../config/prisma.js';
import { MusicSource, UnifiedTrack } from '../providers/music-provider.interface.js';
import { spotifyProvider } from '../providers/spotify.provider.js';
import { zingMp3Provider } from '../providers/zingmp3.provider.js';
import { audiusProvider } from '../providers/audius.provider.js';

export interface ForYouInput {
  userId?: string;
  genres?: string[];
  guestArtists?: string[];
  guestRecentTrackIds?: string[];
  dismissedTrackIds?: string[];
  dismissedArtists?: string[];
  useHistory?: boolean;
  refresh?: boolean;
}

export interface RecommendedTrackItem {
  track: UnifiedTrack;
  reason: string;
  isDiscovery?: boolean;
}

export interface RecommendedArtistItem {
  id: string;
  name: string;
  imageUrl?: string | null;
  followersCount: number;
  reason: string;
}

export interface ForYouResult {
  isColdStart: boolean;
  forYouTracks: RecommendedTrackItem[];
  becauseYouListened: {
    artistName: string | null;
    tracks: RecommendedTrackItem[];
  };
  recommendedArtists: RecommendedArtistItem[];
}

interface CacheEntry {
  data: ForYouResult;
  expiresAt: number;
}

const CACHE_TTL_MS = 3 * 60 * 1000; // 3 phút
const forYouCache = new Map<string, CacheEntry>();
const genreTracksCache = new Map<string, { tracks: UnifiedTrack[]; expiresAt: number }>();

const GENRE_SEARCH_QUERIES: Record<string, string> = {
  'v-pop': 'V-Pop hay nhất',
  'indie việt': 'Indie Việt hay nhất',
  'rap việt': 'Rap Việt hay nhất',
  ballad: 'Ballad Việt hay nhất',
  'lo-fi': 'Lo-Fi Chill beats',
  pop: 'Pop Hits',
  edm: 'EDM Electronic Dance',
  acoustic: 'Acoustic Chill',
};

function normalizeGenreText(val: string): string {
  return val
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function trackDedupeKey(track: UnifiedTrack): string {
  const title = track.title
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const artist = (track.artists?.[0] || '').toLowerCase().trim();
  return `${title}::${artist}`;
}

async function fetchTracksForGenre(genre: string): Promise<UnifiedTrack[]> {
  const key = normalizeGenreText(genre);
  const cached = genreTracksCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.tracks;
  }

  const query = GENRE_SEARCH_QUERIES[genre.toLowerCase()] || `${genre} music`;
  const isVietnameseGenre = /viet|v-pop|ballad/i.test(key);
  const results = await Promise.allSettled([
    isVietnameseGenre
      ? zingMp3Provider.search(query, 'track').then((r) => r.tracks)
      : Promise.resolve([]),
    spotifyProvider.search(query, 'track').then((r) => r.tracks),
    key === 'lo-fi' || key === 'edm' || key === 'acoustic'
      ? audiusProvider.search(query, 'track').then((r) => r.tracks)
      : Promise.resolve([]),
  ]);

  const collected: UnifiedTrack[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      collected.push(...r.value);
    }
  }

  const seen = new Set<string>();
  const deduped: UnifiedTrack[] = [];
  for (const t of collected) {
    const dk = trackDedupeKey(t);
    if (!seen.has(dk)) {
      seen.add(dk);
      deduped.push(t);
    }
  }

  const top = deduped.slice(0, 12);
  if (top.length > 0) {
    genreTracksCache.set(key, { tracks: top, expiresAt: Date.now() + 5 * 60 * 1000 });
  }
  return top;
}

function toUnifiedTrack(song: any): UnifiedTrack {
  return {
    id: song.source === 'local' ? `local:${song.id}` : `${song.source}:${song.sourceId}`,
    source: song.source as MusicSource,
    sourceId: song.sourceId,
    title: song.title,
    artists: song.artists || [],
    album: song.album || undefined,
    coverUrl: song.coverUrl || undefined,
    durationMs: song.durationMs || 0,
    playbackType: (song.playbackType || 'audio') as UnifiedTrack['playbackType'],
    streamUrl: song.streamUrl || undefined,
    embedId: song.embedId || undefined,
    previewUrl: song.previewUrl || undefined,
    isFullLength: song.isFullLength !== false,
  };
}

function inferGenreFromSong(song: { title: string; artists: string[]; genre?: { name: string } | null }): string {
  if (song.genre?.name) return song.genre.name;
  const text = `${song.title} ${(song.artists || []).join(' ')}`.toLowerCase();
  if (/(lofi|lo-fi|chill|study|rain)/.test(text)) return 'Lo-Fi';
  if (/(rap|hiphop|hip-hop|đen vâu|den vau|karik|binz|mck|tlinh|hieuthuhai)/.test(text)) return 'Rap Việt';
  if (/(indie|vũ\.|vu\.|ngọt|ngot|cá hồi hoang|thịnh suy|trang|madihu)/.test(text)) return 'Indie Việt';
  if (/(edm|remix|dj|house|techno|vinahouse)/.test(text)) return 'EDM';
  if (/(acoustic|guitar|piano|unplugged)/.test(text)) return 'Acoustic';
  if (/(ballad|buồn|mưa|nhớ|hà anh tuấn|bùi anh tuấn)/.test(text)) return 'Ballad';
  return 'V-Pop';
}

export class RecommendationService {
  async getForYou(input: ForYouInput): Promise<ForYouResult> {
    const dismissedTracks = new Set(input.dismissedTrackIds || []);
    const dismissedArtists = new Set((input.dismissedArtists || []).map((a) => a.toLowerCase()));
    const preferredGenres = (input.genres || []).map((g) => g.trim()).filter(Boolean);
    const useHistory = input.useHistory !== false;

    const cacheKey = JSON.stringify({
      u: input.userId || 'guest',
      g: preferredGenres.slice().sort(),
      ga: useHistory ? (input.guestArtists || []).slice(0, 5) : [],
      dt: Array.from(dismissedTracks).slice(0, 15).sort(),
      da: Array.from(dismissedArtists).slice(0, 10).sort(),
      uh: useHistory,
    });

    if (!input.refresh) {
      const cached = forYouCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
      }
    }

    const artistWeights = new Map<string, number>();
    const genreWeights = new Map<string, number>();
    const recentTrackIds = new Set<string>(useHistory ? input.guestRecentTrackIds || [] : []);
    const likedTrackIds = new Set<string>();
    const followedArtistIds = new Set<string>();

    const addArtistWeight = (name: string, w: number) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      artistWeights.set(trimmed, (artistWeights.get(trimmed) || 0) + w);
    };

    const addGenreWeight = (genre: string, w: number) => {
      const trimmed = genre.trim();
      if (!trimmed) return;
      genreWeights.set(trimmed, (genreWeights.get(trimmed) || 0) + w);
    };

    // Thêm sở thích thể loại khởi đầu do người dùng chọn
    const normalizedPreferred = preferredGenres.map((g) => ({
      raw: g,
      norm: normalizeGenreText(g),
    }));
    for (const g of preferredGenres) {
      addGenreWeight(g, 12);
    }

    // Khách chưa đăng nhập dùng nghệ sĩ từ lịch sử localStorage
    if (!input.userId && useHistory) {
      for (const a of input.guestArtists || []) {
        addArtistWeight(a, 4);
      }
    }

    // Người dùng đã đăng nhập: tổng hợp từ PlayHistory, Like, Follow
    if (input.userId) {
      const [histories, likes, follows] = await Promise.all([
        useHistory
          ? prisma.playHistory.findMany({
              where: { userId: input.userId },
              orderBy: { playedAt: 'desc' },
              take: 80,
              include: { song: { include: { genre: { select: { name: true } } } } },
            })
          : Promise.resolve([]),
        prisma.like.findMany({
          where: { userId: input.userId },
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { song: { include: { genre: { select: { name: true } } } } },
        }),
        prisma.follow.findMany({
          where: { userId: input.userId },
          include: { artist: { select: { id: true, name: true } } },
        }),
      ]);

      histories.forEach((h, idx) => {
        const trackId =
          h.song.source === 'local' ? `local:${h.song.id}` : `${h.song.source}:${h.song.sourceId}`;
        if (idx < 15) {
          recentTrackIds.add(trackId);
        }
        const genre = inferGenreFromSong(h.song);
        addGenreWeight(genre, 2);
        for (const a of h.song.artists || []) {
          addArtistWeight(a, 2);
        }
      });

      for (const l of likes) {
        const trackId =
          l.song.source === 'local' ? `local:${l.song.id}` : `${l.song.source}:${l.song.sourceId}`;
        likedTrackIds.add(trackId);
        const genre = inferGenreFromSong(l.song);
        addGenreWeight(genre, 3.5);
        for (const a of l.song.artists || []) {
          addArtistWeight(a, 3);
        }
      }

      for (const f of follows) {
        followedArtistIds.add(f.artistId);
        addArtistWeight(f.artist.name, 5);
      }
    }

    const isColdStart = artistWeights.size === 0 && genreWeights.size === 0;

    // Lấy tập ứng viên bài hát từ DB (sắp theo playCount & mới nhất)
    // Nếu người dùng chọn thể loại, tải thêm bài hát đúng thể loại đó từ provider
    const [candidateSongs, externalGenreLists] = await Promise.all([
      prisma.song.findMany({
        where: { isHidden: false },
        include: { genre: { select: { name: true } } },
        orderBy: [{ playCount: 'desc' }, { createdAt: 'desc' }],
        take: 120,
      }),
      preferredGenres.length > 0
        ? Promise.all(preferredGenres.map((g) => fetchTracksForGenre(g).then((tracks) => ({ genre: g, tracks }))))
        : Promise.resolve([]),
    ]);

    const maxPlayCount = Math.max(1, ...candidateSongs.map((s) => s.playCount || 0));

    const scoredCandidates: Array<{
      track: UnifiedTrack;
      score: number;
      genre: string;
      reason: string;
      isFamiliar: boolean;
    }> = [];

    for (const { genre: selectedGenre, tracks } of externalGenreLists) {
      tracks.forEach((track, idx) => {
        if (dismissedTracks.has(track.id)) return;
        if ((track.artists || []).some((a) => dismissedArtists.has(a.toLowerCase()))) return;
        scoredCandidates.push({
          track,
          score: 48 - idx * 0.8,
          genre: selectedGenre,
          reason: `Theo thể loại ${selectedGenre}`,
          isFamiliar: true,
        });
      });
    }

    for (const song of candidateSongs) {
      const track = toUnifiedTrack(song);
      if (dismissedTracks.has(track.id)) continue;
      if ((song.artists || []).some((a) => dismissedArtists.has(a.toLowerCase()))) continue;

      const genre = inferGenreFromSong(song);
      const genreScore = genreWeights.get(genre) || 0;
      const normGenre = normalizeGenreText(genre);
      const matchedPreferred = normalizedPreferred.find(
        (p) => normGenre === p.norm || normGenre.includes(p.norm) || p.norm.includes(normGenre)
      );
      const preferredBonus = matchedPreferred ? 38 : 0;

      let bestArtistScore = 0;
      let matchedArtist = '';
      for (const a of song.artists || []) {
        const w = artistWeights.get(a) || 0;
        if (w > bestArtistScore) {
          bestArtistScore = w;
          matchedArtist = a;
        }
      }

      const popularityScore = ((song.playCount || 0) / maxPlayCount) * 4;
      const likedBonus = likedTrackIds.has(track.id) ? 1.5 : 0;
      const recentPenalty = recentTrackIds.has(track.id) ? -8 : 0;

      const totalScore =
        preferredBonus +
        genreScore * 1.4 +
        bestArtistScore * 1.8 +
        popularityScore +
        likedBonus +
        recentPenalty;
      const isFamiliar = preferredBonus > 0 || genreScore > 0 || bestArtistScore > 0;

      let reason = 'Thịnh hành trên mq';
      if (matchedPreferred) {
        reason = `Theo thể loại ${matchedPreferred.raw}`;
      } else if (matchedArtist) {
        reason = `Vì bạn hay nghe ${matchedArtist}`;
      } else if (genreScore > 0) {
        reason = `Vì bạn hay nghe ${genre}`;
      } else if (!isColdStart) {
        reason = `Khám phá mới · ${genre}`;
      }

      scoredCandidates.push({
        track,
        score: totalScore,
        genre,
        reason,
        isFamiliar,
      });
    }

    scoredCandidates.sort((a, b) => b.score - a.score);

    // Chọn ~80% bài hợp gu + ~20% bài ngoài vùng quen thuộc để khám phá
    const familiarPool = scoredCandidates.filter((c) => c.isFamiliar && !recentTrackIds.has(c.track.id));
    const discoveryPool = scoredCandidates.filter((c) => !c.isFamiliar && !recentTrackIds.has(c.track.id));
    const fallbackPool = scoredCandidates.filter((c) => !familiarPool.includes(c) && !discoveryPool.includes(c));

    const forYouTracks: RecommendedTrackItem[] = [];
    const usedIds = new Set<string>();
    const usedContentKeys = new Set<string>();

    const pushCandidate = (c: (typeof scoredCandidates)[number], isDiscovery = false) => {
      const contentKey = trackDedupeKey(c.track);
      if (usedIds.has(c.track.id) || usedContentKeys.has(contentKey)) return;
      usedIds.add(c.track.id);
      usedContentKeys.add(contentKey);
      forYouTracks.push({
        track: c.track,
        reason: isDiscovery && !isColdStart ? `Khám phá mới · ${c.genre}` : c.reason,
        isDiscovery,
      });
    };

    const TARGET_COUNT = 10;
    const discoveryTarget = isColdStart ? 0 : 2; // ~20% khám phá
    const mainTarget = TARGET_COUNT - discoveryTarget;

    for (const c of familiarPool) {
      if (forYouTracks.length >= mainTarget) break;
      pushCandidate(c, false);
    }

    // Chèn ~20% bài khám phá ngoài vùng quen thuộc
    let discoveryAdded = 0;
    for (const c of discoveryPool) {
      if (discoveryAdded >= discoveryTarget) break;
      pushCandidate(c, true);
      discoveryAdded++;
    }

    // Bổ sung nếu vẫn chưa đủ 10 bài (ví dụ người dùng mới)
    for (const c of [...discoveryPool, ...familiarPool, ...fallbackPool]) {
      if (forYouTracks.length >= TARGET_COUNT) break;
      pushCandidate(c, false);
    }

    // Nhóm 2: "Vì bạn đã nghe {nghệ sĩ}"
    const topArtistEntry = Array.from(artistWeights.entries())
      .filter(([name]) => !dismissedArtists.has(name.toLowerCase()))
      .sort((a, b) => b[1] - a[1])[0];

    const topArtistName = topArtistEntry?.[0] || null;
    const becauseTracks: RecommendedTrackItem[] = [];

    if (topArtistName) {
      const topArtistLower = topArtistName.toLowerCase();
      for (const c of scoredCandidates) {
        if (becauseTracks.length >= 6) break;
        if (c.track.artists.some((a) => a.toLowerCase().includes(topArtistLower))) {
          becauseTracks.push({
            track: c.track,
            reason: `Cùng nghệ sĩ ${topArtistName}`,
          });
        }
      }
    }

    // Nhóm 3: "Nghệ sĩ có thể bạn thích"
    const allArtists = await prisma.artist.findMany({
      include: { _count: { select: { followers: true } } },
      orderBy: { followers: { _count: 'desc' } },
      take: 30,
    });

    const recommendedArtists: RecommendedArtistItem[] = allArtists
      .filter((a) => !followedArtistIds.has(a.id) && !dismissedArtists.has(a.name.toLowerCase()))
      .slice(0, 8)
      .map((a) => {
        const w = artistWeights.get(a.name) || 0;
        const reason =
          w > 0
            ? 'Bạn đã nghe nhiều bài của nghệ sĩ này'
            : topArtistName
              ? `Tương tự gu ${topArtistName}`
              : 'Nghệ sĩ nổi bật trên mq';
        return {
          id:
            a.source === 'spotify' && a.sourceId
              ? `spotify:${a.sourceId}`
              : a.source === 'itunes' && a.sourceId
                ? `itunes:${a.sourceId}`
                : a.id,
          name: a.name,
          imageUrl: a.imageUrl,
          followersCount: a._count.followers,
          reason,
        };
      });

    const result: ForYouResult = {
      isColdStart,
      forYouTracks,
      becauseYouListened: {
        artistName: topArtistName,
        tracks: becauseTracks,
      },
      recommendedArtists,
    };

    forYouCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return result;
  }
}

export const recommendationService = new RecommendationService();
