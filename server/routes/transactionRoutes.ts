import { Router } from 'express';
import { TransactionController } from '../controllers/TransactionController';
import { isAuthenticated, requireActiveSubscription } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(isAuthenticated);
router.use(requireActiveSubscription);

// Transaction routes
router.get('/', TransactionController.getAll);
router.post('/', TransactionController.create);
router.get('/stats', TransactionController.getStats);
router.get('/:id', TransactionController.getById);
router.put('/:id', TransactionController.update);
router.delete('/:id', TransactionController.delete);

export default router;