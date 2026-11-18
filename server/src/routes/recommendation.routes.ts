import { Router } from 'express';
import { optionalAuth } from '../middlewares/auth.middleware.js';
import { recommendationController } from '../controllers/recommendation.controller.js';

const router = Router();

router.get('/for-you', optionalAuth, (req, res, next) =>
  recommendationController.getForYou(req, res, next)
);

export default router;
