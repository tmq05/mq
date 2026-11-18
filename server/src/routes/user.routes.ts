import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/likes', requireAuth, userController.getLikes);
router.get('/history', requireAuth, userController.getHistory);
router.get('/playlists', requireAuth, userController.getPlaylists);
router.get('/following', requireAuth, userController.getFollowing);
router.get('/stats', requireAuth, userController.getStats);
router.get('/insights', requireAuth, userController.getInsights);
router.get('/continue-listening', requireAuth, userController.getContinueListening);
router.post('/continue-listening', requireAuth, userController.upsertContinueListening);
router.post('/continue-listening/merge', requireAuth, userController.mergeContinueListening);
router.delete('/continue-listening/:trackId', requireAuth, userController.removeContinueListening);
router.delete('/continue-listening', requireAuth, userController.clearContinueListening);

export default router;

