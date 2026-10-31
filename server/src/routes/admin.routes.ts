import { Router } from 'express';
import multer from 'multer';
import { adminController } from '../controllers/admin.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/role.middleware.js';

const router = Router();

// Configure Multer for memory buffer uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'audio') {
      if (file.mimetype.startsWith('audio/') || file.originalname.endsWith('.mp3')) {
        cb(null, true);
      } else {
        cb(new Error('Chỉ chấp nhận tệp âm thanh (MP3, WAV, FLAC, OGG, M4A)'));
      }
    } else if (file.fieldname === 'cover') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Chỉ chấp nhận tệp hình ảnh (JPG, PNG, WEBP)'));
      }
    } else {
      cb(null, true);
    }
  },
});

router.use(requireAuth, requireAdmin);

router.get('/stats', adminController.getDashboardStats);
router.get('/providers', adminController.getProvidersStatus);

router.get('/users', adminController.getUsers);
router.patch('/users/:id/lock', adminController.toggleLockUser);
router.patch('/users/:id/role', adminController.changeUserRole);

router.post('/upload/audio', upload.single('audio'), adminController.uploadAudio);
router.post('/upload/cover', upload.single('cover'), adminController.uploadCover);

router.post('/songs', adminController.createSong);
router.patch('/songs/:id', adminController.updateSong);
router.delete('/songs/:id', adminController.deleteSong);

export default router;

