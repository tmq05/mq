import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ALBUMS_CATALOG, AlbumMeta } from '../utils/albums-data.js';

export class AlbumController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const categoryParam = ((req.query.category as string) || 'all').toLowerCase().trim();

      // 1. Fetch DB albums
      const dbAlbums = await prisma.album.findMany({
        take: 30,
        orderBy: { createdAt: 'desc' },
        include: {
          artist: true,
          _count: { select: { songs: true } },
        },
      });

      const formattedDb = dbAlbums.map((album) => ({
        id: `local:${album.id}`,
        dbId: album.id,
        title: album.title,
        coverUrl: album.coverUrl,
        releaseDate: album.releaseDate,
        year: album.releaseDate ? new Date(album.releaseDate).getFullYear() : 2024,
        artist: album.artist?.name || 'Nhiều nghệ sĩ',
        artistId: album.artistId ? `local:${album.artistId}` : undefined,
        tracksCount: album._count?.songs || 0,
        playCount: 15400000,
        genre: 'v-pop',
        category: 'vietnam' as const,
        isFeatured: true,
        featuredOrder: 10,
      }));

      // 2. Format catalog albums
      const formattedCatalog = ALBUMS_CATALOG.map((cat) => ({
        id: cat.id,
        dbId: cat.id,
        title: cat.title,
        coverUrl: cat.coverUrl,
        releaseDate: cat.releaseDate,
        year: cat.year,
        artist: cat.artist,
        artistId: cat.artistId,
        artistSlug: cat.artistSlug,
        genre: cat.genre,
        category: cat.category,
        tracksCount: cat.tracks.length,
        playCount: cat.playCount,
        isFeatured: cat.isFeatured,
        featuredOrder: cat.featuredOrder,
      }));

      // 3. Merge: Catalog first, then DB albums that aren't duplicate titles
      const catalogTitles = new Set(formattedCatalog.map((a) => a.title.toLowerCase().trim()));
      const combined = [
        ...formattedCatalog,
        ...formattedDb.filter((a) => !catalogTitles.has(a.title.toLowerCase().trim())),
      ];

      // 4. Apply filtering / sorting based on category parameter
      let filtered = combined;
      if (categoryParam === 'vietnam') {
        filtered = combined.filter((a) => a.category === 'vietnam');
      } else if (categoryParam === 'international') {
        filtered = combined.filter((a) => a.category === 'international');
      } else if (categoryParam === 'v-pop') {
        filtered = combined.filter((a) => a.genre === 'v-pop');
      } else if (categoryParam === 'indie-viet') {
        filtered = combined.filter((a) => a.genre === 'indie-viet');
      } else if (categoryParam === 'rap-viet') {
        filtered = combined.filter((a) => a.genre === 'rap-viet');
      } else if (categoryParam === 'newest') {
        filtered = [...combined].sort((a, b) => {
          const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
          const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
          return dateB - dateA;
        });
      } else if (categoryParam === 'popular') {
        filtered = [...combined].sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
      }

      res.json({ albums: filtered });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const cleanId = id.replace(/^local:/, '').trim().toLowerCase();

      // 1. Check curated catalog first
      const catalogAlbum = ALBUMS_CATALOG.find(
        (a) =>
          a.id.toLowerCase() === cleanId ||
          a.id.replace(/^album-/, '').toLowerCase() === cleanId ||
          a.title.toLowerCase() === cleanId
      );

      if (catalogAlbum) {
        const formattedTracks = catalogAlbum.tracks.map((t, idx) => {
          const trackId = t.id || `${catalogAlbum.id}-${idx + 1}`;
          const has11CharEmbed = typeof t.embedId === 'string' && t.embedId.length === 11;
          const effectivePlaybackType = has11CharEmbed ? 'youtube' : (t.playbackType || 'audio');

          return {
            id: trackId,
            source: t.source || (has11CharEmbed ? 'youtube' : 'spotify'),
            sourceId: t.sourceId || t.embedId || `${catalogAlbum.id}-${idx + 1}`,
            title: t.title || '',
            artists: t.artists || [catalogAlbum.artist],
            album: catalogAlbum.title,
            coverUrl: t.coverUrl || catalogAlbum.coverUrl,
            durationMs: t.durationMs || 220000,
            playbackType: effectivePlaybackType,
            streamUrl: t.streamUrl || `/api/songs/${trackId}/stream`,
            embedId: has11CharEmbed ? t.embedId : undefined,
            previewUrl: t.previewUrl || t.streamUrl || `/api/songs/${trackId}/stream`,
            isFullLength: true,
          };
        });

        res.json({
          id: catalogAlbum.id,
          title: catalogAlbum.title,
          coverUrl: catalogAlbum.coverUrl,
          releaseDate: catalogAlbum.releaseDate,
          year: catalogAlbum.year,
          artist: catalogAlbum.artist,
          artistId: catalogAlbum.artistId,
          artistSlug: catalogAlbum.artistSlug,
          genre: catalogAlbum.genre,
          category: catalogAlbum.category,
          tracksCount: formattedTracks.length,
          playCount: catalogAlbum.playCount,
          tracks: formattedTracks,
        });
        return;
      }

      // 2. Fall back to Prisma DB
      const album = await prisma.album.findUnique({
        where: { id: id.replace(/^local:/, '') },
        include: {
          artist: true,
          songs: {
            include: { artist: true },
          },
        },
      });

      if (!album) {
        res.status(404).json({ message: 'Không tìm thấy album' });
        return;
      }

      const formattedSongs = album.songs.map((s) => ({
        id: `local:${s.id}`,
        dbId: s.id,
        source: s.source,
        sourceId: s.sourceId,
        title: s.title,
        artists: s.artists,
        album: album.title,
        coverUrl: s.coverUrl || album.coverUrl,
        durationMs: s.durationMs,
        playbackType: s.playbackType,
        streamUrl: s.streamUrl || `/api/songs/${s.id}/stream`,
        embedId: s.embedId,
        previewUrl: s.previewUrl,
        isFullLength: s.isFullLength,
      }));

      res.json({
        id: `local:${album.id}`,
        title: album.title,
        coverUrl: album.coverUrl,
        releaseDate: album.releaseDate,
        artist: album.artist?.name || 'Various Artists',
        tracksCount: formattedSongs.length,
        tracks: formattedSongs,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const albumController = new AlbumController();

