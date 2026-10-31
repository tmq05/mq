import { Router } from 'express';
import { albumController } from '../controllers/album.controller.js';

const router = Router();

router.get('/', albumController.getAll);
router.get('/:id', albumController.getById);

export default router;

