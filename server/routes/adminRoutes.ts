import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { isAdminAuthenticated, requireAdminPermission, ADMIN_PERMISSIONS } from '../middleware/adminAuth';

const router = Router();

// Auth routes (no authentication required)
router.post('/auth/login', AdminController.login);
router.post('/auth/logout', AdminController.logout);

// Protected routes (require admin authentication)
router.get('/auth/me', isAdminAuthenticated, AdminController.getCurrentAdmin);
router.get('/dashboard/metrics', isAdminAuthenticated, AdminController.getDashboardMetrics);

// User management routes
router.get('/users', isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.USERS_READ), AdminController.getUsers);
router.post('/users', isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.USERS_WRITE), AdminController.createUser);
router.put('/users/:id', isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.USERS_WRITE), AdminController.updateUser);
router.delete('/users/:id', isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.USERS_WRITE), AdminController.deleteUser);

export default router;