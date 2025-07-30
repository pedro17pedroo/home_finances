import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController';
import { isAuthenticated, requireActiveSubscription } from '../middleware/auth';
import { isAdminAuthenticated, requireAdminPermission, ADMIN_PERMISSIONS } from '../middleware/adminAuth';

const router = Router();

// User payment routes
router.use(isAuthenticated);

router.post('/initiate', PaymentController.initiatePayment);
router.post('/transactions/:transactionId/upload', PaymentController.uploadConfirmation);
router.get('/transactions/:transactionId/status', PaymentController.getPaymentStatus);
router.get('/history', PaymentController.getPaymentHistory);

// Admin payment routes
router.get('/admin/pending', isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.PAYMENTS_READ), PaymentController.getPendingPayments);
router.post('/admin/transactions/:transactionId/process', isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.PAYMENTS_WRITE), PaymentController.processPayment);

export default router;