import { Router } from 'express';
import { searchController } from '../controllers/search.controller.js';
import { searchLimiter } from '../middlewares/rate-limit.middleware.js';

const router = Router();

router.get('/', searchLimiter, searchController.search);
router.get('/suggestions', searchLimiter, searchController.suggestions);

export default router;

