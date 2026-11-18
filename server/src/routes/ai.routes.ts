import { Router } from 'express';
import { optionalAuth } from '../middlewares/auth.middleware.js';
import { aiMoodController } from '../controllers/aiMood.controller.js';

const router = Router();

router.post('/mood-recommend', optionalAuth, (req, res, next) =>
  aiMoodController.moodRecommend(req, res, next)
);

export default router;
