import axios from 'axios';
import { prisma } from '../config/prisma.js';
import { ASSISTANT_CONFIG } from '../lib/assistant/config.js';
import { sanitizeChatText } from '../lib/assistant/context.js';
import { expandMoodOrNaturalQuery } from '../lib/assistant/tools/types.js';
import { MusicSource, UnifiedTrack } from '../providers/music-provider.interface.js';
import { searchService } from './search.service.js';

export interface MoodRecommendInput {
  prompt: string;
  sources?: MusicSource[];
  limit?: number;
  refresh?: boolean;
}

export interface MoodRecommendResult {
  summary: string;
  tracks: UnifiedTrack[];
  prompt: string;
  cached: boolean;
}

interface CacheEntry {
  data: MoodRecommendResult;
  expiresAt: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 phút
const AI_TIMEOUT_MS = 15_000; // 15 giây
const MIN_TRACKS = 5;

const moodCache = new Map<string, CacheEntry>();

function normalizePrompt(prompt: string): string {
  return prompt
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toUnifiedTrackFromDb(song: any): UnifiedTrack {
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

function isPlayableTrack(track: UnifiedTrack | null | undefined): track is UnifiedTrack {
  if (!track || !track.id || !track.title) return false;
  return Boolean(track.embedId || track.streamUrl || track.previewUrl || track.source === 'spotify');
}

async function askGeminiForMoodSuggestions(
  cleanPrompt: string,
  count: number,
  signal: AbortSignal
): Promise<{ summary: string; items: Array<{ title: string; artist: string }> }> {
  const apiKey = ASSISTANT_CONFIG.apiKey;
  if (!apiKey) {
    throw new Error('NO_AI_KEY');
  }

  const model = ASSISTANT_CONFIG.fastModel || ASSISTANT_CONFIG.chatModel;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const systemInstruction = `Bạn là chuyên gia tuyển chọn nhạc cho web nghe nhạc mq (Việt Nam & Quốc tế).
Nhiệm vụ: Dựa vào tâm trạng hoặc hoạt động người dùng nhập, gợi ý ${count} bài hát phù hợp (ưu tiên bài hát quen thuộc, dễ tìm trên Spotify/Zing/YouTube/Apple Music).
BẮT BUỘC chỉ trả về JSON hợp lệ theo đúng cấu trúc sau, không thêm markdown hay văn bản ngoài JSON:
{
  "summary": "Một câu mô tả ngắn gọn, ấm áp bằng tiếng Việt (tối đa 25 từ) giải thích vì sao danh sách này hợp với tâm trạng người dùng.",
  "items": [
    { "title": "Tên bài hát", "artist": "Tên nghệ sĩ chính" }
  ]
}`;

  const payload = {
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: `Tâm trạng / mong muốn: "${cleanPrompt}"` }],
      },
    ],
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 700,
      responseMimeType: 'application/json',
    },
  };

  const res = await axios.post(url, payload, {
    signal,
    timeout: AI_TIMEOUT_MS,
  });

  const rawText: string =
    res.data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text || '')
      .join('') || '';

  const cleanedJson = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const parsed = JSON.parse(cleanedJson);
  const summary =
    typeof parsed?.summary === 'string' && parsed.summary.trim()
      ? parsed.summary.trim()
      : `Danh sách gợi ý dành riêng cho tâm trạng "${cleanPrompt}".`;

  const items = Array.isArray(parsed?.items)
    ? parsed.items
        .filter((it: any) => typeof it?.title === 'string' && it.title.trim())
        .map((it: any) => ({
          title: String(it.title).trim(),
          artist: typeof it?.artist === 'string' ? it.artist.trim() : '',
        }))
    : [];

  return { summary, items };
}

async function matchTrackInCatalog(
  title: string,
  artist: string,
  sources?: MusicSource[]
): Promise<UnifiedTrack | null> {
  const normTitle = normalizeForMatch(title);
  const normArtist = normalizeForMatch(artist);
  if (!normTitle) return null;

  // 1. Tìm trực tiếp trong kho PostgreSQL của web trước
  const dbCandidates = await prisma.song.findMany({
    where: {
      isHidden: false,
      ...(sources && sources.length > 0 ? { source: { in: sources } } : {}),
      title: { contains: title.slice(0, 40), mode: 'insensitive' },
    },
    orderBy: { playCount: 'desc' },
    take: 5,
  });

  if (dbCandidates.length > 0) {
    const exactMatch =
      dbCandidates.find((s) => {
        const sTitle = normalizeForMatch(s.title);
        const sArtists = normalizeForMatch((s.artists || []).join(' '));
        const titleOk = sTitle.includes(normTitle) || normTitle.includes(sTitle);
        const artistOk = !normArtist || sArtists.includes(normArtist) || normArtist.includes(sArtists);
        return titleOk && artistOk;
      }) || dbCandidates[0];

    const mapped = toUnifiedTrackFromDb(exactMatch);
    if (isPlayableTrack(mapped)) return mapped;
  }

  // 2. Nếu chưa có trong DB, tìm qua searchService (kho đa nguồn của web)
  try {
    const query = artist ? `${title} ${artist}` : title;
    const searchRes = await searchService.search({
      query,
      type: 'track',
      sources,
      includeYouTube: true,
    });
    const candidates = (searchRes.tracks || []).filter(isPlayableTrack);
    const matched = candidates.find((t) => {
      const tTitle = normalizeForMatch(t.title);
      const tArtists = normalizeForMatch((t.artists || []).join(' '));
      const titleOk = tTitle.includes(normTitle) || normTitle.includes(tTitle);
      const artistOk = !normArtist || tArtists.includes(normArtist) || normArtist.includes(tArtists);
      return titleOk && artistOk;
    });
    if (matched) return matched;
  } catch {
    // ignore single item search failure
  }

  return null;
}

export class AiMoodService {
  async recommend(input: MoodRecommendInput): Promise<MoodRecommendResult> {
    const cleanPrompt = sanitizeChatText(input.prompt || '').slice(0, 200);
    if (!cleanPrompt) {
      throw new Error('EMPTY_PROMPT');
    }

    const limit = Math.max(MIN_TRACKS, Math.min(12, Number(input.limit) || 8));
    const sourcesKey = (input.sources || []).slice().sort().join(',');
    const cacheKey = `${normalizePrompt(cleanPrompt)}::${sourcesKey}::${limit}`;

    if (!input.refresh) {
      const cached = moodCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return { ...cached.data, cached: true };
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    let aiSummary = `Gợi ý âm nhạc phù hợp với tâm trạng "${cleanPrompt}".`;
    let aiItems: Array<{ title: string; artist: string }> = [];

    try {
      const aiRes = await askGeminiForMoodSuggestions(cleanPrompt, Math.max(8, limit), controller.signal);
      aiSummary = aiRes.summary;
      aiItems = aiRes.items;
    } catch {
      // Fallback sang tìm kiếm kho nhạc theo mood mở rộng nếu AI timeout/lỗi
      aiSummary = `Tuyển chọn bài hát phù hợp cho tâm trạng "${cleanPrompt}" từ kho nhạc mq.`;
    } finally {
      clearTimeout(timeoutId);
    }

    // Khớp từng bài AI gợi ý với kho nhạc thực của web (chạy song song giới hạn)
    const matchedTracks: UnifiedTrack[] = [];
    const seenIds = new Set<string>();
    const seenTitleArtist = new Set<string>();

    const addIfUnique = (track: UnifiedTrack | null) => {
      if (!isPlayableTrack(track)) return;
      const key = `${normalizeForMatch(track.title)}::${normalizeForMatch(track.artists[0] || '')}`;
      if (seenIds.has(track.id) || seenTitleArtist.has(key)) return;
      seenIds.add(track.id);
      seenTitleArtist.add(key);
      matchedTracks.push(track);
    };

    if (aiItems.length > 0) {
      const matchResults = await Promise.allSettled(
        aiItems.slice(0, 10).map((item) => matchTrackInCatalog(item.title, item.artist, input.sources))
      );
      for (const r of matchResults) {
        if (r.status === 'fulfilled' && r.value) {
          addIfUnique(r.value);
        }
      }
    }

    // Nếu khớp ít hơn 5 bài, bổ sung bằng bài cùng thể loại/mood từ kho nhạc có sẵn
    if (matchedTracks.length < MIN_TRACKS) {
      try {
        const expandedQuery = expandMoodOrNaturalQuery(cleanPrompt, cleanPrompt);
        const searchSupplement = await searchService.search({
          query: expandedQuery,
          type: 'track',
          sources: input.sources,
          includeYouTube: true,
        });
        for (const t of searchSupplement.tracks || []) {
          if (matchedTracks.length >= limit) break;
          addIfUnique(t);
        }
      } catch {
        // ignore supplement error
      }
    }

    if (matchedTracks.length < MIN_TRACKS) {
      const dbFallback = await prisma.song.findMany({
        where: {
          isHidden: false,
          ...(input.sources && input.sources.length > 0 ? { source: { in: input.sources } } : {}),
        },
        orderBy: { playCount: 'desc' },
        take: 25,
      });
      for (const s of dbFallback) {
        if (matchedTracks.length >= limit) break;
        addIfUnique(toUnifiedTrackFromDb(s));
      }
    }

    const result: MoodRecommendResult = {
      summary: aiSummary,
      tracks: matchedTracks.slice(0, limit),
      prompt: cleanPrompt,
      cached: false,
    };

    moodCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return result;
  }
}

export const aiMoodService = new AiMoodService();
