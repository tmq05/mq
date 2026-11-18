import { Router, Request, Response, NextFunction } from 'express';
import { getExploreSections } from '../services/explore.service.js';

const router = Router();

function parseExcludeIds(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x)).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/** GET /api/explore — Trả về cả 2 mục Khám phá với danh sách ngẫu nhiên từ pool server */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    const excludeIds = parseExcludeIds(req.query.excludeIds);
    const seed = typeof req.query.seed === 'string' ? req.query.seed : undefined;

    const result = await getExploreSections({
      excludeIds,
      seed,
      section: 'all',
      isShuffle: false,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** POST /api/explore/shuffle — Làm mới một mục hoặc cả hai mục khi bấm nút "Làm mới" */
router.post('/shuffle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    const excludeIds = parseExcludeIds(req.body?.excludeIds);
    const seed = typeof req.body?.seed === 'string' ? req.body.seed : undefined;
    const section =
      req.body?.section === 'trending' || req.body?.section === 'vietnamese'
        ? req.body.section
        : 'all';
    const keepTrack = req.body?.keepTrack || null;

    const result = await getExploreSections({
      excludeIds,
      seed,
      section,
      keepTrack,
      isShuffle: true,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
