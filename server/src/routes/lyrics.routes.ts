import { Router } from 'express';
import { lyricsController } from '../controllers/lyrics.controller.js';

const router = Router();

router.get('/', lyricsController.getLyrics);

export default router;
