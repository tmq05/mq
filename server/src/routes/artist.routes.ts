import { Router } from 'express';
import { artistController } from '../controllers/artist.controller.js';

const router = Router();

router.get('/', artistController.getAll);
router.get('/:id', artistController.getById);

export default router;

