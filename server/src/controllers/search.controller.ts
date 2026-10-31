import { Request, Response, NextFunction } from 'express';
import { searchService } from '../services/search.service.js';

export class SearchController {
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const q = String(req.query.q || '');
      const type = (req.query.type as any) || 'all';
      const sources = req.query.sources
        ? String(req.query.sources).split(',')
        : undefined;
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const includeYouTube = req.query.includeYouTube === 'true';

      const startTime = Date.now();
      const result = await searchService.search({
        query: q,
        type,
        sources,
        page,
        includeYouTube,
      });

      const tookMs = Date.now() - startTime;

      res.json({
        query: q,
        type,
        tookMs,
        tracksCount: result.tracks.length,
        artistsCount: result.artists.length,
        albumsCount: result.albums.length,
        playlistsCount: result.playlists.length,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async suggestions(req: Request, res: Response, next: NextFunction) {
    try {
      const q = String(req.query.q || '').trim();
      if (!q) {
        res.json({ suggestions: [] });
        return;
      }

      // Quick local search suggestions
      const result = await searchService.search({
        query: q,
        type: 'all',
        page: 1,
        includeYouTube: false,
      });

      const suggestions = [
        ...result.tracks.slice(0, 5).map((t) => ({
          type: 'track',
          title: t.title,
          subtitle: t.artists.join(', '),
          id: t.id,
          coverUrl: t.coverUrl,
        })),
        ...result.artists.slice(0, 3).map((a) => ({
          type: 'artist',
          title: a.name,
          subtitle: 'Nghệ sĩ',
          id: a.id,
          coverUrl: a.imageUrl,
        })),
      ];

      res.json({ suggestions });
    } catch (err) {
      next(err);
    }
  }
}

export const searchController = new SearchController();

