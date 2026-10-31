import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { cache } from '../config/redis.js';
import { GENRES_CATALOG } from '../utils/genres-data.js';
import { spotifyProvider } from '../providers/spotify.provider.js';
import { zingMp3Provider } from '../providers/zingmp3.provider.js';
import { searchService } from '../services/search.service.js';
import { UnifiedTrack } from '../providers/music-provider.interface.js';

export class GenreController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      // Return full rich 18-genre catalog spanning Vietnam, International, and Moods
      res.json({ genres: GENRES_CATALOG });
    } catch (err) {
      next(err);
    }
  }

  async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const genre = GENRES_CATALOG.find((g) => g.slug === slug);

      if (!genre) {
        // Fallback to local DB if custom genre
        const dbGenre = await prisma.genre.findUnique({
          where: { slug },
          include: {
            songs: {
              take: 30,
              include: { artist: true },
            },
          },
        });

        if (!dbGenre) {
          res.status(404).json({ message: 'Không tìm thấy thể loại nhạc' });
          return;
        }

        const formattedSongs = dbGenre.songs.map((s) => ({
          id: `local:${s.id}`,
          dbId: s.id,
          source: s.source,
          sourceId: s.sourceId,
          title: s.title,
          artists: s.artists,
          album: s.album,
          coverUrl: s.coverUrl,
          durationMs: s.durationMs,
          playbackType: s.playbackType,
          streamUrl: s.streamUrl || `/api/songs/${s.id}/stream`,
          embedId: s.embedId,
          previewUrl: s.previewUrl,
          isFullLength: s.isFullLength,
        }));

        res.json({
          genre: {
            id: dbGenre.id,
            name: dbGenre.name,
            slug: dbGenre.slug,
            imageUrl: dbGenre.imageUrl,
            description: `Tuyển tập âm nhạc thể loại ${dbGenre.name}.`,
            color: '#10b981',
            gradient: 'from-emerald-500 to-teal-700',
          },
          songs: formattedSongs,
          artists: [],
        });
        return;
      }

      // Check cache first (TTL 10 mins = 600s)
      const cacheKey = `genre:detail:${slug}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        try {
          res.json(JSON.parse(cached));
          return;
        } catch {
          // ignore cache parse error
        }
      }

      // Query Spotify and Zing MP3 in parallel using genre's dedicated search queries
      const queries = genre.searchQueries;
      const searchPromises: Promise<any>[] = [];

      for (const q of queries.slice(0, 3)) {
        searchPromises.push(spotifyProvider.search(q, 'all'));
        searchPromises.push(zingMp3Provider.search(q, 'track'));
      }

      const settled = await Promise.allSettled(searchPromises);
      const rawTracks: UnifiedTrack[] = [];
      const rawArtists: Array<{ id: string; name: string; imageUrl?: string; followers?: number }> = [];

      settled.forEach((res) => {
        if (res.status === 'fulfilled' && res.value) {
          if (Array.isArray(res.value.tracks)) {
            rawTracks.push(...res.value.tracks);
          }
          if (Array.isArray(res.value.artists)) {
            res.value.artists.forEach((a: any) => {
              if (a.name && !rawArtists.some((x) => x.name.toLowerCase() === a.name.toLowerCase())) {
                rawArtists.push({
                  id: a.id,
                  name: a.name,
                  imageUrl: a.imageUrl,
                  followers: Math.floor(Math.random() * 800000) + 150000,
                });
              }
            });
          }
        }
      });

      // Deduplicate tracks and filter out unwanted sources
      const songs = searchService
        .deduplicateTracks(rawTracks)
        .filter((t) => t.source !== 'local' && t.source !== 'deezer')
        .slice(0, 30);

      // Extract unique artists from song list if artist list is sparse
      songs.forEach((s) => {
        const artistName = s.artists[0];
        if (artistName && !rawArtists.some((a) => a.name.toLowerCase() === artistName.toLowerCase())) {
          rawArtists.push({
            id: `artist-${artistName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            name: artistName,
            imageUrl: s.coverUrl,
            followers: Math.floor(Math.random() * 600000) + 120000,
          });
        }
      });

      const responsePayload = {
        genre,
        songs,
        artists: rawArtists.slice(0, 10),
      };

      // Cache for 600 seconds
      await cache.set(cacheKey, JSON.stringify(responsePayload), 'EX', 600);

      res.json(responsePayload);
    } catch (err) {
      next(err);
    }
  }
}

export const genreController = new GenreController();
