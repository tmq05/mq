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
import chatRoutes from './chat.routes.js';
import exploreRoutes from './explore.routes.js';
import aiRoutes from './ai.routes.js';
import recommendationRoutes from './recommendation.routes.js';
import spotifyAuthRoutes from './spotify-auth.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/spotify-auth', spotifyAuthRoutes);
router.use('/search', searchRoutes);
router.use('/songs', songRoutes);
router.use('/lyrics', lyricsRoutes);
router.use('/playlists', playlistRoutes);
router.use('/users', userRoutes);
router.use('/genres', genreRoutes);
router.use('/artists', artistRoutes);
router.use('/albums', albumRoutes);
router.use('/admin', adminRoutes);
router.use('/chat', chatRoutes);
router.use('/explore', exploreRoutes);
router.use('/ai', aiRoutes);
router.use('/recommendations', recommendationRoutes);

export default router;

