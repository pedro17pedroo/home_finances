import { Router } from 'express';
import { AccountController } from '../controllers/AccountController';
import { isAuthenticated, requireActiveSubscription } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(isAuthenticated);
router.use(requireActiveSubscription);

// Account routes
router.get('/', AccountController.getAll);
router.post('/', AccountController.create);
router.get('/stats', AccountController.getStats);
router.get('/:id', AccountController.getById);
router.put('/:id', AccountController.update);
router.delete('/:id', AccountController.delete);
router.post('/:id/recalculate-balance', AccountController.recalculateBalance);

export default router;