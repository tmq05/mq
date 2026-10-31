import { Router } from 'express';
import authRoutes from './auth.routes.js';
import searchRoutes from './search.routes.js';
import songRoutes from './song.routes.js';
import lyricsRoutes from './lyrics.routes.js';
import playlistRoutes from './playlist.routes.js';
import userRoutes from './user.routes.js';
import genreRoutes from './genre.routes.js';
import artistRoutes from './artist.routes.js';
import albumRoutes from './album.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/search', searchRoutes);
router.use('/songs', songRoutes);
router.use('/lyrics', lyricsRoutes);
router.use('/playlists', playlistRoutes);
router.use('/users', userRoutes);
router.use('/genres', genreRoutes);
router.use('/artists', artistRoutes);
router.use('/albums', albumRoutes);
router.use('/admin', adminRoutes);

export default router;
