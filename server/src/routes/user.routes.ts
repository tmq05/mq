import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/likes', requireAuth, userController.getLikes);
router.get('/history', requireAuth, userController.getHistory);
router.get('/playlists', requireAuth, userController.getPlaylists);

export default router;
