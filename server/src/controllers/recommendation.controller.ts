import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { recommendationService } from '../services/recommendation.service.js';

function parseCsvParam(val: unknown): string[] {
  if (typeof val !== 'string' || !val.trim()) return [];
  return val
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);
}

export class RecommendationController {
  async getForYou(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await recommendationService.getForYou({
        userId: req.user?.userId,
        genres: parseCsvParam(req.query.genres),
        guestArtists: parseCsvParam(req.query.guestArtists),
        guestRecentTrackIds: parseCsvParam(req.query.guestRecentTrackIds),
        dismissedTrackIds: parseCsvParam(req.query.dismissedTrackIds),
        dismissedArtists: parseCsvParam(req.query.dismissedArtists),
        useHistory: req.query.useHistory !== 'false',
        refresh: req.query.refresh === '1',
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const recommendationController = new RecommendationController();
