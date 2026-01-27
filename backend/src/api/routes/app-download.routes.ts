import { Router } from 'express';
import {
  getAppDownload,
  getAllAppDownloads,
  updateAppDownload,
  uploadAppFile,
  deleteAppFile,
  uploadStoreBadge,
  deleteStoreBadge,
  upload,
} from '../controllers/app-download.controller';
import { requireAdmin } from '../middlewares/auth';

const router = Router();

// Public routes
router.get('/public', getAllAppDownloads);
router.get('/public/:platform', getAppDownload);

// Admin routes
router.put('/:platform', requireAdmin, updateAppDownload);
router.post('/:platform/upload', requireAdmin, upload.single('file'), uploadAppFile);
router.delete('/:platform/file', requireAdmin, deleteAppFile);
router.post('/:platform/upload-badge', requireAdmin, upload.single('badge'), uploadStoreBadge);
router.delete('/:platform/badge', requireAdmin, deleteStoreBadge);

export default router;
