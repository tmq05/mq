import { Router } from 'express';
import { genreController } from '../controllers/genre.controller.js';

const router = Router();

router.get('/', genreController.getAll);
router.get('/:slug', genreController.getBySlug);

export default router;
