import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import subscriptionService from '../../domain/services/subscription.service.js';

const router = Router();

// Get all available plans (public - for landing page)
router.get('/plans', async (req, res) => {
  try {
    const plans = await subscriptionService.getPlans();
    res.json({ success: true, plans });
  } catch (error: any) {
    console.error('Get plans error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get specific plan by ID (public)
router.get('/plans/:id', async (req, res) => {
  try {
    const plan = await subscriptionService.getPlanById(parseInt(req.params.id));
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plano não encontrado' });
    }
    res.json({ success: true, plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get current user subscription
router.get('/current', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.json({ success: true, subscription: null, plan: null });
    }
    
    const subscription = await subscriptionService.getUserSubscription(userId);

    let plan = null;
    if (subscription && subscription.planId) {
      plan = await subscriptionService.getPlanById(parseInt(subscription.planId));
    }

    res.json({ success: true, subscription, plan });
  } catch (error: any) {
    console.error('Get current subscription error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Subscribe to a plan (authenticated users)
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { planId, paymentType, paymentMethod, payerPhone, payerName, payerEmail } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'planId é obrigatório',
      });
    }

    // Get plan to check if it's free
    const plan = await subscriptionService.getPlanById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plano não encontrado' });
    }

    // For free plans, payment method is not required
    if (plan.price > 0 && !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'paymentMethod é obrigatório para planos pagos',
      });
    }

    // For E-Kwanza and GPO, phone is required
    if (plan.price > 0 && (paymentMethod === 'ekwanza' || paymentMethod === 'gpo') && !payerPhone) {
      return res.status(400).json({
        success: false,
        message: 'Número de telefone é obrigatório para este método de pagamento',
      });
    }

    const result = await subscriptionService.createSubscription(
      userId,
      planId,
      paymentType || 'one_time',
      paymentMethod || 'gpo',
      payerPhone,
      payerName,
      payerEmail
    );

    res.json({
      success: true,
      subscription: result.subscription,
      payment: result.payment,
      plan: result.plan,
      message:
        plan.price === 0
          ? 'Plano gratuito ativado com sucesso'
          : 'Pagamento criado. Aguardando confirmação.',
    });
  } catch (error: any) {
    console.error('Subscribe error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Subscribe during onboarding (creates user + subscription)
router.post('/onboard', async (req, res) => {
  try {
    const { planId, paymentType, paymentMethod, user: userData } = req.body;

    if (!planId || !userData) {
      return res.status(400).json({
        success: false,
        message: 'planId e dados do usuário são obrigatórios',
      });
    }

    // This endpoint would be used after user registration
    // The actual user creation happens in auth routes
    // Here we just return the plan info for the frontend to proceed

    const plan = await subscriptionService.getPlanById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plano não encontrado' });
    }

    res.json({
      success: true,
      plan,
      requiresPayment: plan.price > 0,
    });
  } catch (error: any) {
    console.error('Onboard error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Check payment status
router.get('/payment/:paymentId/status', authenticate, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const result = await subscriptionService.checkPaymentStatus(parseInt(paymentId));

    res.json({
      success: true,
      payment: result,
      isPaid: result.currentStatus === 'paid',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get payment history
router.get('/payments', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.json({ success: true, payments: [] });
    }
    const payments = await subscriptionService.getPaymentHistory(userId);

    res.json({ success: true, payments: payments || [] });
  } catch (error: any) {
    console.error('Get payment history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cancel subscription
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    await subscriptionService.cancelSubscription(userId);

    res.json({ success: true, message: 'Assinatura cancelada com sucesso' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Webhook for payment notifications
router.post('/webhook', async (req, res) => {
  try {
    const { paymentId, status, referenceCode } = req.body;

    console.log('Payment webhook received:', { paymentId, status, referenceCode });

    // TODO: Implement webhook signature verification
    // TODO: Process the webhook and update payment status

    res.json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
