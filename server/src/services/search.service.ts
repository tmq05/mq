import { providerRegistry } from '../providers/provider-registry.js';
import {
  SearchResult,
  UnifiedTrack,
  UnifiedArtist,
  UnifiedAlbum,
  UnifiedPlaylist,
} from '../providers/music-provider.interface.js';
import { cache } from '../config/redis.js';
import { removeAccents, stringSimilarity } from '../utils/unaccent.js';
import { logger } from '../config/logger.js';

interface SearchOptions {
  query: string;
  type?: 'track' | 'artist' | 'album' | 'playlist' | 'all';
  sources?: string[];
  page?: number;
  includeYouTube?: boolean;
}

export class SearchService {
  /**
   * Deduplicate tracks based on normalized title, artist, and duration similarity.
   * Priority: Full length / audio / local / audius > YouTube > Preview.
   */
  deduplicateTracks(tracks: UnifiedTrack[]): UnifiedTrack[] {
    const unique: UnifiedTrack[] = [];

    // Helper score: higher score is preferred
    const getTrackScore = (t: UnifiedTrack): number => {
      let score = 0;
      if (t.source === 'local') score += 100;
      if (t.isFullLength) score += 50;
      if (t.playbackType === 'audio') score += 30;
      if (t.playbackType === 'youtube') score += 20;
      if (t.coverUrl) score += 5;
      return score;
    };

    for (const track of tracks) {
      const matchIndex = unique.findIndex((existing) => {
        const titleSim = stringSimilarity(existing.title, track.title);
        if (titleSim < 0.82) return false;

        const artist1 = existing.artists[0] || '';
        const artist2 = track.artists[0] || '';
        const artistSim = stringSimilarity(artist1, artist2);

        // If artist matches well
        if (artistSim > 0.7) {
          // If duration is known for both, compare within 15s
          if (existing.durationMs > 0 && track.durationMs > 0) {
            const diff = Math.abs(existing.durationMs - track.durationMs);
            return diff <= 15000;
          }
          return true;
        }

        return false;
      });

      if (matchIndex === -1) {
        unique.push(track);
      } else {
        // Compare scores, replace if current track is better
        const existing = unique[matchIndex];
        if (getTrackScore(track) > getTrackScore(existing)) {
          unique[matchIndex] = track;
        }
      }
    }

    return unique;
  }

  async search(options: SearchOptions): Promise<SearchResult> {
    const {
      query,
      type = 'all',
      sources,
      page = 1,
      includeYouTube = false,
    } = options;

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return { tracks: [], artists: [], albums: [], playlists: [] };
    }

    // 1. Check Redis Cache
    const cacheKey = `search:${removeAccents(trimmedQuery)}:${type}:${sources?.join(',') || 'all'}:${includeYouTube}:${page}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // ignore parse error and fetch fresh
      }
    }

    // 2. Select providers
    let activeProviders = providerRegistry.getActiveProviders(sources);

    // YouTube quota protection: only call YouTube if explicit in sources or includeYouTube=true
    if (!includeYouTube && (!sources || !sources.includes('youtube'))) {
      activeProviders = activeProviders.filter((p) => p.name !== 'youtube');
    }

    // 3. Parallel execution with Promise.allSettled and 5s timeout
    const timeoutPromise = <T>(promise: Promise<T>, ms = 5000): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('Provider request timed out (5s)')), ms)
        ),
      ]);

    const promises = activeProviders.map((provider) =>
      timeoutPromise(provider.search(trimmedQuery, type, page))
    );

    const settled = await Promise.allSettled(promises);

    const mergedTracks: UnifiedTrack[] = [];
    const mergedArtists: UnifiedArtist[] = [];
    const mergedAlbums: UnifiedAlbum[] = [];
    const mergedPlaylists: UnifiedPlaylist[] = [];

    settled.forEach((res, index) => {
      const provider = activeProviders[index];
      if (res.status === 'fulfilled') {
        mergedTracks.push(...res.value.tracks);
        mergedArtists.push(...res.value.artists);
        mergedAlbums.push(...res.value.albums);
        mergedPlaylists.push(...res.value.playlists);
      } else {
        logger.warn(
          { provider: provider.name, error: res.reason?.message },
          'Provider failed during search'
        );
      }
    });

    // 4. Deduplicate tracks
    const finalTracks = this.deduplicateTracks(mergedTracks);

    // 5. Deduplicate artists by normalized name
    const uniqueArtists: UnifiedArtist[] = [];
    for (const a of mergedArtists) {
      if (!uniqueArtists.some((x) => removeAccents(x.name) === removeAccents(a.name))) {
        uniqueArtists.push(a);
      }
    }

    const finalResult: SearchResult = {
      tracks: finalTracks,
      artists: uniqueArtists,
      albums: mergedAlbums,
      playlists: mergedPlaylists,
    };

    // 6. Cache result (TTL 300s = 5 minutes)
    await cache.set(cacheKey, JSON.stringify(finalResult), 'EX', 300);

    return finalResult;
  }
}

export const searchService = new SearchService();

