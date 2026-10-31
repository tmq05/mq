import { Router } from 'express';
import { songController } from '../controllers/song.controller.js';
import { optionalAuth, requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/trending', songController.getTrending);
router.get('/vpop', songController.getVietnameseHits);
router.get('/:id', songController.getSong);
router.get('/:id/stream', songController.streamSong);
router.get('/stream-info/:source/:sourceId', songController.getStreamInfo);
router.post('/like', requireAuth, songController.toggleLike);
router.post('/record-play', optionalAuth, songController.recordPlay);

export default router;
