import { Router } from 'express';
import { artistController } from '../controllers/artist.controller.js';
import { optionalAuth, requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', (req, res, next) => artistController.getAll(req, res, next));
router.get('/:id', optionalAuth, (req: any, res, next) => artistController.getById(req, res, next));
router.post('/:id/follow', requireAuth, (req: any, res, next) => artistController.toggleFollow(req, res, next));

export default router;

