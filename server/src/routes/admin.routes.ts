import { Router } from 'express';
import multer from 'multer';
import { adminController } from '../controllers/admin.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireAdmin, requireModerator } from '../middlewares/role.middleware.js';
import adminChatbotRoutes from './admin-chatbot.routes.js';

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

// Require authenticated user with at least MODERATOR role to view admin dashboard
router.use(requireAuth, requireModerator);

// Dashboard & Metrics
router.get('/stats', adminController.getDashboardStats);
router.get('/system-health', adminController.getSystemHealth);
router.get('/providers', adminController.getProvidersStatus);

// User Management (requireAdmin for role change & delete)
router.get('/users', adminController.getUsers);
router.get('/users/:id/details', adminController.getUserDetails);
router.patch('/users/:id/lock', adminController.toggleLockUser);
router.patch('/users/:id/role', requireAdmin, adminController.changeUserRole);
router.delete('/users/:id', requireAdmin, adminController.deleteUser);

// Upload
router.post('/upload/audio', upload.single('audio'), adminController.uploadAudio);
router.post('/upload/cover', upload.single('cover'), adminController.uploadCover);

// Songs Management
router.get('/songs', adminController.getSongs);
router.post('/songs', adminController.createSong);
router.post('/songs/batch', adminController.batchSongAction);
router.patch('/songs/:id/visibility', adminController.toggleSongVisibility);
router.patch('/songs/:id', adminController.updateSong);
router.delete('/songs/:id', adminController.deleteSong);

// Albums Management
router.get('/albums', adminController.getAlbums);
router.patch('/albums/:id/cover', adminController.updateAlbumCover);

// Artists Management (CRUD)
router.get('/artists', adminController.getArtists);
router.post('/artists', adminController.createArtist);
router.patch('/artists/:id', adminController.updateArtist);
router.patch('/artists/:id/verify', adminController.toggleArtistVerified);
router.delete('/artists/:id', adminController.deleteArtist);

// Playlists Management (Public moderation)
router.get('/playlists', adminController.getPlaylists);
router.get('/playlists/:id', adminController.getPlaylistDetails);
router.patch('/playlists/:id/pin', adminController.togglePlaylistPin);
router.patch('/playlists/:id/ban', adminController.togglePlaylistBan);
router.delete('/playlists/:id', adminController.deletePlaylist);

// Copyright & Reports Management
router.get('/reports', adminController.getReports);
router.patch('/reports/:id', adminController.updateReport);
router.post('/reports/:id/takedown', adminController.quickTakedownReport);
router.delete('/reports/:id', adminController.deleteReport);

// Locked Account Support Notifications (Accessible to ADMIN and MODERATOR)
router.get('/support-alerts', adminController.getSupportAlerts);
router.post('/support-alerts/:id/resolve', adminController.resolveSupportAlert);

// Providers Management & Quota
router.patch('/providers/:name/toggle', requireAdmin, adminController.toggleProvider);
router.post('/providers/:name/test', adminController.testProviderConnection);

// Audit Logs (Strictly require ADMIN)
router.get('/audit-logs', requireAdmin, adminController.getAuditLogs);
router.get('/audit-logs/export', requireAdmin, adminController.exportAuditLogsCsv);

// System Settings (Strictly require ADMIN)
router.get('/settings', adminController.getSystemSettings);
router.patch('/settings', requireAdmin, adminController.updateSystemSettings);

// Chatbot Management System (Accessible to ADMIN and MODERATOR via router-level requireModerator)
router.use('/chatbot', adminChatbotRoutes);

export default router;


