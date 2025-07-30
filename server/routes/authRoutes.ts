import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { isAuthenticated } from '../middleware/auth';
import { checkBlockedIP, rateLimitLogin } from '../middleware/security';

const router = Router();

// Apply security middleware to auth routes
router.use(checkBlockedIP);

// Public routes
router.post('/login', rateLimitLogin, AuthController.login);
router.post('/register', AuthController.register);
router.post('/logout', AuthController.logout);
router.get('/user', AuthController.getCurrentUser);

// Protected routes
router.get('/profile', isAuthenticated, AuthController.getProfile);
router.put('/profile', isAuthenticated, AuthController.updateProfile);

export default router;