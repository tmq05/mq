import { Router } from 'express';
import { playlistController } from '../controllers/playlist.controller.js';
import { requireAuth, optionalAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', requireAuth, playlistController.getUserPlaylists);
router.post('/', requireAuth, playlistController.create);
router.get('/:id', optionalAuth, playlistController.getById);
router.patch('/:id', requireAuth, playlistController.update);
router.delete('/:id', requireAuth, playlistController.delete);
router.post('/:id/songs', requireAuth, playlistController.addSong);
router.delete('/:id/songs/:songId', requireAuth, playlistController.removeSong);

export default router;
