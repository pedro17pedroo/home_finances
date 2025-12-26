import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import subscriptionService from '../../domain/services/subscription.service.js';
import campaignService from '../../domain/services/campaign.service.js';
import planAccessService from '../../domain/services/plan-access.service.js';
import { db } from '../../core/database/db.js';
import { paymentMethods } from '../../core/database/schema.js';
import { eq, asc } from 'drizzle-orm';

const router = Router();

// Get active payment methods (public - for checkout)
router.get('/payment-methods', async (req, res) => {
  try {
    const methods = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.isActive, true))
      .orderBy(asc(paymentMethods.displayOrder));
    
    res.json({ 
      success: true, 
      paymentMethods: methods.map(m => ({
        id: m.id,
        code: m.code,
        name: m.name,
        displayName: m.displayName,
        description: m.description,
        isInstant: m.isInstant,
        waitTimeSeconds: m.waitTimeSeconds,
        maxWaitTimeSeconds: m.maxWaitTimeSeconds,
        requiresPhone: m.requiresPhone,
        requiresEmail: m.requiresEmail,
        requiresReference: m.requiresReference,
        processingTime: m.processingTime,
        icon: m.icon,
        logoUrl: m.logoUrl,
        displayOrder: m.displayOrder,
      }))
    });
  } catch (error: any) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

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

// Get user's plan access info (limits and features)
// Requirements: 4.3, 4.5 - Use active organization's subscription for feature access
router.get('/access-info', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const organizationId = (req as any).user.organizationId; // activeOrganizationId from auth middleware
    
    // Use organization-based access if available (multi-organization support)
    const accessInfo = await planAccessService.getAccessInfoFromContext(userId, organizationId);
    res.json({ success: true, ...accessInfo });
  } catch (error: any) {
    console.error('Get access info error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Check if user has access to a specific feature
// Requirements: 4.3, 4.5 - Apply limits based on active org's plan
router.get('/check-feature/:featureKey', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const organizationId = (req as any).user.organizationId; // activeOrganizationId from auth middleware
    const { featureKey } = req.params;
    
    // Use organization-based feature check if available (multi-organization support)
    const hasAccess = await planAccessService.hasFeatureFromContext(userId, organizationId, featureKey);
    res.json({ success: true, hasAccess, featureKey });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// Validate coupon code (public)
router.post('/validate-coupon', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { couponCode, planId, amount } = req.body;

    if (!couponCode || !planId || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Código do cupão, plano e valor são obrigatórios',
      });
    }

    const result = await campaignService.validateCoupon(
      couponCode,
      userId,
      parseInt(planId),
      parseFloat(amount)
    );

    res.json({
      success: true,
      valid: result.valid,
      message: result.message,
      discountAmount: result.discountAmount,
      finalPrice: result.finalPrice,
      campaign: result.campaign ? {
        id: result.campaign.id,
        name: result.campaign.name,
        discountType: result.campaign.discountType,
        discountValue: result.campaign.discountValue,
      } : null,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get my subscription details
router.get('/my-subscription', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const subscription = await subscriptionService.getMySubscription(userId);

    if (!subscription) {
      return res.json({ success: true, subscription: null });
    }

    res.json({ success: true, subscription });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Renew subscription
router.post('/renew', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { paymentMethod, payerPhone, payerName, payerEmail } = req.body;

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Método de pagamento é obrigatório',
      });
    }

    const result = await subscriptionService.renewSubscription(
      userId,
      paymentMethod,
      payerPhone,
      payerName,
      payerEmail
    );

    res.json({
      success: true,
      subscription: result.subscription,
      payment: result.payment,
      plan: result.plan,
      message: 'Renovação iniciada. Aguardando confirmação do pagamento.',
    });
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
    
    // First try to get user's own subscription
    let subscription = await subscriptionService.getUserSubscription(userId);

    // If no subscription found, check if user belongs to an organization
    // and get the organization's subscription
    if (!subscription) {
      const { users } = await import('../../core/database/schema.js');
      const { eq, desc } = await import('drizzle-orm');
      const { db } = await import('../../core/database/db.js');
      const { subscriptions } = await import('../../core/database/schema.js');
      
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      
      if (user?.organizationId) {
        const [orgSubscription] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.organizationId, user.organizationId))
          .orderBy(desc(subscriptions.createdAt))
          .limit(1);
        
        if (orgSubscription) {
          subscription = orgSubscription;
        }
      }
    }

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
    const { planId, paymentType, paymentMethod, payerPhone, payerName, payerEmail, couponCode, startTrial } = req.body;

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

    // Check if user wants to start trial
    const wantsTrial = startTrial && plan.trialDays && plan.trialDays > 0;

    // For free plans or trial, payment method is not required
    if (plan.price > 0 && !wantsTrial && !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'paymentMethod é obrigatório para planos pagos',
      });
    }

    // For E-Kwanza and GPO, phone is required (unless starting trial)
    if (plan.price > 0 && !wantsTrial && (paymentMethod === 'ekwanza' || paymentMethod === 'gpo') && !payerPhone) {
      return res.status(400).json({
        success: false,
        message: 'Número de telefone é obrigatório para este método de pagamento',
      });
    }

    // Validate and apply coupon if provided
    let discountAmount = 0;
    let finalPrice = plan.price;
    let appliedCampaign = null;

    if (couponCode && plan.price > 0 && !wantsTrial) {
      const couponResult = await campaignService.validateCoupon(
        couponCode,
        userId,
        planId,
        plan.price
      );

      if (!couponResult.valid) {
        return res.status(400).json({
          success: false,
          message: couponResult.message,
        });
      }

      discountAmount = couponResult.discountAmount || 0;
      finalPrice = couponResult.finalPrice || plan.price;
      appliedCampaign = couponResult.campaign;
    }

    const result = await subscriptionService.createSubscription(
      userId,
      planId,
      paymentType || 'one_time',
      paymentMethod || 'gpo',
      payerPhone,
      payerName,
      payerEmail,
      wantsTrial // skipPayment for trial
    );

    // Record coupon usage if applied
    if (appliedCampaign && result.payment) {
      await campaignService.applyCoupon(
        appliedCampaign.id,
        userId,
        plan.type as 'basic' | 'premium' | 'enterprise',
        plan.price,
        discountAmount,
        finalPrice
      );
    }

    res.json({
      success: true,
      subscription: result.subscription,
      payment: result.payment,
      plan: result.plan,
      isTrial: (result as any).isTrial || false,
      discount: appliedCampaign ? {
        campaignName: appliedCampaign.name,
        discountAmount,
        finalPrice,
      } : null,
      message:
        (result as any).isTrial
          ? `Período de teste de ${plan.trialDays} dias iniciado`
          : plan.price === 0
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
