import { db } from '../../core/database/db.js';
import {
  subscriptions,
  subscriptionPayments,
  subscriptionNotifications,
  users,
  plans,
  planChanges,
} from '../../core/database/schema.js';
import { eq, desc, and, gte, lte, or, sql, count, inArray } from 'drizzle-orm';
import tpagamentoService, {
  PaymentMethod,
} from '../../infrastructure/payments/tpagamento.service.js';
import emailService from '../../infrastructure/email/email.service.js';

export type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'cancelled' | 'pending';
export type PaymentType = 'one_time' | 'recurring';

export interface PlanData {
  id: number;
  name: string;
  type: string;
  price: number;
  features: string[];
  maxAccounts: number;
  maxTransactions: number;
  maxUsers: number;
  isActive: boolean;
  durationDays?: number | null;
  trialDays?: number;
  trialOneTimeOnly?: boolean;
  maxFreeDays?: number | null;
  billingCycle?: string;
}

export interface SubscriptionDetails {
  id: number;
  userId: number;
  planId: string;
  status: string;
  paymentType: string;
  paymentMethod: string | null;
  startDate: Date;
  endDate: Date | null;
  trialEndsAt: Date | null;
  nextBillingDate: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt: Date | null;
  plan?: PlanData;
  user?: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  };
  daysRemaining?: number;
  isTrialActive?: boolean;
}

export interface SubscriptionFilters {
  status?: SubscriptionStatus | SubscriptionStatus[];
  planId?: number;
  startDateFrom?: Date;
  startDateTo?: Date;
  page?: number;
  limit?: number;
}

export interface SubscriptionStats {
  total: number;
  active: number;
  trial: number;
  pending: number;
  expired: number;
  cancelled: number;
  byPlan: { planId: string; planName: string; count: number }[];
}

export interface PlanChangePreview {
  changeType: 'upgrade' | 'downgrade';
  fromPlan: PlanData | null;
  toPlan: PlanData;
  daysRemaining: number;
  creditAmount: number;
  amountToPay: number;
  effectiveDate: Date;
  scheduledFor?: Date; // For downgrades
  message: string;
}

export interface PlanChangeResult {
  success: boolean;
  planChange: any;
  payment?: any;
  message: string;
}

class SubscriptionService {
  // Get all active plans from database
  async getPlans(): Promise<PlanData[]> {
    const dbPlans = await db
      .select()
      .from(plans)
      .where(eq(plans.isActive, true))
      .orderBy(plans.sortOrder, plans.price);

    return dbPlans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      type: plan.type,
      price: parseFloat(plan.price),
      features: (plan.features as string[]) || [],
      maxAccounts: plan.maxAccounts || 5,
      maxTransactions: plan.maxTransactions || 1000,
      maxUsers: plan.maxUsers || 1,
      isActive: plan.isActive ?? true,
      durationDays: plan.durationDays,
      trialDays: plan.trialDays || 0,
      trialOneTimeOnly: plan.trialOneTimeOnly !== false,
      maxFreeDays: plan.maxFreeDays,
      billingCycle: plan.billingCycle || 'monthly',
    }));
  }

  // Get a specific plan by ID
  async getPlanById(planId: number): Promise<PlanData | null> {
    const [plan] = await db.select().from(plans).where(eq(plans.id, planId));

    if (!plan) return null;

    return {
      id: plan.id,
      name: plan.name,
      type: plan.type,
      price: parseFloat(plan.price),
      features: (plan.features as string[]) || [],
      maxAccounts: plan.maxAccounts || 5,
      maxTransactions: plan.maxTransactions || 1000,
      maxUsers: plan.maxUsers || 1,
      isActive: plan.isActive ?? true,
      durationDays: plan.durationDays,
      trialDays: plan.trialDays || 0,
      trialOneTimeOnly: plan.trialOneTimeOnly !== false,
      maxFreeDays: plan.maxFreeDays,
      billingCycle: plan.billingCycle || 'monthly',
    };
  }

  // Get user's current subscription
  async getUserSubscription(userId: number) {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    return subscription;
  }

  // Create subscription (for onboarding or upgrade)
  async createSubscription(
    userId: number,
    planId: number,
    paymentType: PaymentType,
    paymentMethod: PaymentMethod,
    payerPhone?: string,
    payerName?: string,
    payerEmail?: string,
    skipPayment?: boolean // For trial subscriptions
  ) {
    const plan = await this.getPlanById(planId);
    if (!plan) throw new Error('Plano não encontrado');

    // Get user info
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error('Usuário não encontrado');

    // Check if this is user's first subscription (for trial eligibility)
    const existingSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));
    const isFirstSubscription = existingSubscriptions.length === 0;

    // Check if user has already used trial
    const hasUsedTrial = existingSubscriptions.some(s => s.trialUsed === true);

    // Get trial days from plan
    const trialDays = plan.trialDays || 0;
    const trialOneTimeOnly = plan.trialOneTimeOnly !== false; // Default true
    
    // Trial is available only if:
    // 1. Plan has trial days
    // 2. User wants to skip payment (use trial)
    // 3. Trial is not one-time-only OR user hasn't used trial before
    const canUseTrial = trialDays > 0 && skipPayment && (!trialOneTimeOnly || !hasUsedTrial);

    // For free plan (price = 0), activate immediately with max_free_days limit
    if (plan.price === 0) {
      const maxFreeDays = plan.maxFreeDays || null;
      const endDate = maxFreeDays ? new Date(Date.now() + maxFreeDays * 24 * 60 * 60 * 1000) : null;
      
      const [subscription] = await db
        .insert(subscriptions)
        .values({
          userId,
          organizationId: user.organizationId || undefined,
          planId: plan.id.toString(),
          status: 'active',
          paymentType: 'one_time',
          startDate: new Date(),
          endDate,
          isFirstSubscription,
        })
        .returning();

      // Update user's plan type
      await db
        .update(users)
        .set({
          planType: plan.type as any,
          subscriptionStatus: 'active',
        })
        .where(eq(users.id, userId));

      // Sync all organization members with the new plan
      if (user.organizationId) {
        await this.syncOrganizationMembers(user.organizationId, plan.type, 'active');
      }

      return { subscription, payment: null, plan };
    }

    // Handle trial subscription (user chose to start trial without paying)
    if (canUseTrial) {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

      const [subscription] = await db
        .insert(subscriptions)
        .values({
          userId,
          organizationId: user.organizationId || undefined,
          planId: plan.id.toString(),
          status: 'trial',
          paymentType,
          paymentMethod,
          startDate: new Date(),
          endDate: null,
          trialEndsAt,
          trialUsed: true, // Mark trial as used
          isFirstSubscription,
        })
        .returning();

      // Update user's plan type with trial status
      await db
        .update(users)
        .set({
          planType: plan.type as any,
          subscriptionStatus: 'trialing',
          trialEndsAt,
        })
        .where(eq(users.id, userId));

      // Sync all organization members with the trial status
      if (user.organizationId) {
        await this.syncOrganizationMembers(user.organizationId, plan.type, 'trial');
      }

      console.log(`[createSubscription] Trial subscription created:`, {
        subscriptionId: subscription.id,
        trialEndsAt,
        trialDays,
      });

      return { subscription, payment: null, plan, isTrial: true, trialDays };
    }

    // User is paying - calculate total days (billing cycle + bonus trial days if first subscription)
    const billingCycleDays = this.getBillingCycleDays(plan.billingCycle || 'monthly');
    const bonusTrialDays = (isFirstSubscription && trialDays > 0 && !hasUsedTrial) ? trialDays : 0;
    const totalDays = billingCycleDays + bonusTrialDays;

    // Use provided payer info or fall back to user info
    const customerName = payerName || `${user.firstName} ${user.lastName}`;
    const customerPhone = payerPhone || user.phone || '';
    const customerEmail = payerEmail || user.email || '';

    console.log(`[createSubscription] Creating payment:`, {
      method: paymentMethod,
      amount: plan.price,
      customerName,
      customerPhone,
      customerEmail,
      billingCycleDays,
      bonusTrialDays,
      totalDays,
    });

    // Create payment for paid plans
    const paymentResult = await tpagamentoService.createPayment(
      paymentMethod,
      plan.price,
      {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      },
      `Assinatura ${plan.name} - FinanceControl`
    );

    console.log(`[createSubscription] TPagamento response:`, paymentResult);

    if (!paymentResult.success) {
      throw new Error(paymentResult.message || 'Erro ao criar pagamento');
    }

    // Check if payment was already completed (instant payment)
    const isAlreadyPaid = paymentResult.status === 'paid';

    // Calculate end date based on total days (billing cycle + bonus trial)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + totalDays);

    // Create subscription (active if already paid, pending otherwise)
    const [subscription] = await db
      .insert(subscriptions)
      .values({
        userId,
        organizationId: user.organizationId || undefined,
        planId: plan.id.toString(),
        status: isAlreadyPaid ? 'active' : 'pending',
        paymentType,
        paymentMethod,
        startDate: new Date(),
        endDate,
        nextBillingDate: endDate,
        trialUsed: bonusTrialDays > 0, // Mark trial as used if bonus was applied
        isFirstSubscription,
      })
      .returning();

    // Record payment
    const [payment] = await db
      .insert(subscriptionPayments)
      .values({
        subscriptionId: subscription.id,
        userId,
        organizationId: user.organizationId || undefined,
        amount: plan.price.toString(),
        paymentMethod,
        paymentId: paymentResult.paymentId || null,
        referenceCode: paymentResult.referenceCode || null,
        status: isAlreadyPaid ? 'paid' : 'pending',
        paidAt: isAlreadyPaid ? new Date() : null,
      })
      .returning();

    // If already paid, update user's plan
    if (isAlreadyPaid) {
      console.log(`[createSubscription] Payment already completed, activating subscription`);
      await db
        .update(users)
        .set({
          planType: plan.type as any,
          subscriptionStatus: 'active',
        })
        .where(eq(users.id, userId));

      // Sync all organization members with the new plan
      if (user.organizationId) {
        await this.syncOrganizationMembers(user.organizationId, plan.type, 'active');
      }
    }

    console.log(`[createSubscription] Payment record created:`, {
      id: payment.id,
      paymentId: payment.paymentId,
      referenceCode: payment.referenceCode,
      status: payment.status,
      totalDays,
      billingCycleDays,
      bonusTrialDays,
    });

    return {
      subscription,
      payment: {
        ...payment,
        paymentData: paymentResult.data,
      },
      plan,
      // Include subscription duration info for frontend
      subscriptionDays: {
        total: totalDays,
        billingCycle: billingCycleDays,
        bonusTrial: bonusTrialDays,
        billingCycleName: plan.billingCycle || 'monthly',
      },
    };
  }

  // Get billing cycle days
  getBillingCycleDays(billingCycle: string): number {
    switch (billingCycle) {
      case 'weekly': return 7;
      case 'monthly': return 30;
      case 'quarterly': return 90;
      case 'yearly': return 365;
      case 'one_time': return 30; // Default to 30 days for one-time
      default: return 30;
    }
  }

  // Check payment status and activate subscription if paid
  async checkPaymentStatus(paymentId: number) {
    console.log(`[checkPaymentStatus] Checking payment ID: ${paymentId}`);
    
    const [payment] = await db
      .select()
      .from(subscriptionPayments)
      .where(eq(subscriptionPayments.id, paymentId));

    if (!payment) {
      console.log(`[checkPaymentStatus] Payment not found: ${paymentId}`);
      throw new Error('Pagamento não encontrado');
    }

    console.log(`[checkPaymentStatus] Payment found:`, {
      id: payment.id,
      method: payment.paymentMethod,
      paymentId: payment.paymentId,
      referenceCode: payment.referenceCode,
      status: payment.status
    });

    const method = payment.paymentMethod as PaymentMethod;
    
    // For ekwanza, use referenceCode; for others, use paymentId
    let idOrCode: string;
    if (method === 'ekwanza') {
      idOrCode = payment.referenceCode || '';
    } else {
      idOrCode = payment.paymentId || '';
    }

    if (!idOrCode) {
      console.log(`[checkPaymentStatus] No payment ID or reference code found for payment ${paymentId}`);
      return {
        ...payment,
        currentStatus: payment.status,
        statusData: null,
      };
    }

    console.log(`[checkPaymentStatus] Checking status with TPagamento: method=${method}, idOrCode=${idOrCode}`);
    
    const statusResult = await tpagamentoService.getPaymentStatus(method, idOrCode);
    
    console.log(`[checkPaymentStatus] TPagamento response:`, statusResult);

    if (statusResult.status === 'paid' && payment.status !== 'paid') {
      console.log(`[checkPaymentStatus] Payment confirmed as paid, activating subscription`);
      
      // Update payment status
      await db
        .update(subscriptionPayments)
        .set({ status: 'paid', paidAt: new Date() })
        .where(eq(subscriptionPayments.id, paymentId));

      // Get subscription to find plan
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, payment.subscriptionId));

      // Activate subscription
      await db
        .update(subscriptions)
        .set({ status: 'active' })
        .where(eq(subscriptions.id, payment.subscriptionId));

      // Update user's plan and send confirmation email
      if (subscription) {
        const plan = await this.getPlanById(parseInt(subscription.planId));
        if (plan) {
          await db
            .update(users)
            .set({
              planType: plan.type as any,
              subscriptionStatus: 'active',
            })
            .where(eq(users.id, payment.userId));

          // Sync all organization members with the new plan
          if (subscription.organizationId) {
            await this.syncOrganizationMembers(subscription.organizationId, plan.type, 'active');
          }

          // Send subscription confirmation email
          const [user] = await db.select().from(users).where(eq(users.id, payment.userId));
          if (user?.email) {
            emailService.sendSubscriptionConfirmationEmail(
              user.email,
              user.firstName || 'Utilizador',
              plan.name,
              plan.price,
              subscription.endDate
            ).catch(err => console.error('Error sending subscription email:', err));
          }
        }
      }
    } else if (statusResult.status === 'failed' || statusResult.status === 'expired') {
      console.log(`[checkPaymentStatus] Payment status: ${statusResult.status}`);
      await db
        .update(subscriptionPayments)
        .set({ status: statusResult.status })
        .where(eq(subscriptionPayments.id, paymentId));
    }

    return {
      ...payment,
      currentStatus: statusResult.status,
      statusData: statusResult.data,
    };
  }

  // Get payment history with subscription and plan details
  async getPaymentHistory(userId: number) {
    // First, get user to check organization
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    // Get payments - either by userId or by organizationId
    let payments;
    if (user?.organizationId) {
      // Get all payments for the organization
      payments = await db
        .select()
        .from(subscriptionPayments)
        .where(eq(subscriptionPayments.organizationId, user.organizationId))
        .orderBy(desc(subscriptionPayments.createdAt));
      
      // If no organization payments, fall back to user payments
      if (payments.length === 0) {
        payments = await db
          .select()
          .from(subscriptionPayments)
          .where(eq(subscriptionPayments.userId, userId))
          .orderBy(desc(subscriptionPayments.createdAt));
      }
    } else {
      payments = await db
        .select()
        .from(subscriptionPayments)
        .where(eq(subscriptionPayments.userId, userId))
        .orderBy(desc(subscriptionPayments.createdAt));
    }

    // Enrich payments with subscription and plan info
    const enrichedPayments = await Promise.all(
      payments.map(async (payment) => {
        let subscriptionInfo = null;
        let planInfo = null;

        if (payment.subscriptionId) {
          const [subscription] = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.id, payment.subscriptionId));

          if (subscription) {
            subscriptionInfo = {
              id: subscription.id,
              status: subscription.status,
              paymentType: subscription.paymentType,
              startDate: subscription.startDate,
              endDate: subscription.endDate,
            };

            const plan = await this.getPlanById(parseInt(subscription.planId));
            if (plan) {
              planInfo = {
                id: plan.id,
                name: plan.name,
                type: plan.type,
                price: plan.price,
              };
            }
          }
        }

        return {
          ...payment,
          subscription: subscriptionInfo,
          plan: planInfo,
        };
      })
    );

    return enrichedPayments;
  }

  // Cancel subscription
  async cancelSubscription(userId: number, reason?: string) {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) throw new Error('Assinatura não encontrada');

    await db
      .update(subscriptions)
      .set({ 
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: reason || null,
      })
      .where(eq(subscriptions.id, subscription.id));

    // Downgrade user to free/basic
    await db
      .update(users)
      .set({
        subscriptionStatus: 'canceled',
      })
      .where(eq(users.id, userId));

    return { success: true };
  }

  // Get subscription details with plan and user info
  async getSubscriptionDetails(subscriptionId: number): Promise<SubscriptionDetails | null> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId));

    if (!subscription) return null;

    const plan = await this.getPlanById(parseInt(subscription.planId));
    const [user] = await db.select().from(users).where(eq(users.id, subscription.userId));

    // Calculate days remaining
    let daysRemaining = 0;
    let isTrialActive = false;

    if (subscription.status === 'trial' && subscription.trialEndsAt) {
      const now = new Date();
      const trialEnd = new Date(subscription.trialEndsAt);
      daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      isTrialActive = daysRemaining > 0;
    } else if (subscription.endDate) {
      const now = new Date();
      const endDate = new Date(subscription.endDate);
      daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    return {
      id: subscription.id,
      userId: subscription.userId,
      planId: subscription.planId,
      status: subscription.status,
      paymentType: subscription.paymentType,
      paymentMethod: subscription.paymentMethod,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      trialEndsAt: subscription.trialEndsAt,
      nextBillingDate: subscription.nextBillingDate,
      cancelledAt: subscription.cancelledAt,
      cancellationReason: subscription.cancellationReason,
      createdAt: subscription.createdAt,
      plan: plan || undefined,
      user: user ? {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
      } : undefined,
      daysRemaining,
      isTrialActive,
    };
  }

  // Get user's subscription details (or organization's subscription for members)
  async getMySubscription(userId: number): Promise<SubscriptionDetails | null> {
    // First, check if user has their own subscription
    let subscription = await this.getUserSubscription(userId);
    
    // If no subscription found, check if user belongs to an organization
    // and get the organization's subscription
    if (!subscription) {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      
      if (user?.organizationId) {
        // Get organization's subscription (subscription of the owner)
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
    
    if (!subscription) return null;
    return this.getSubscriptionDetails(subscription.id);
  }

  // Renew subscription
  async renewSubscription(
    userId: number,
    paymentMethod: PaymentMethod,
    payerPhone?: string,
    payerName?: string,
    payerEmail?: string
  ) {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) throw new Error('Assinatura não encontrada');

    const plan = await this.getPlanById(parseInt(subscription.planId));
    if (!plan) throw new Error('Plano não encontrado');

    // Create new payment
    return this.createSubscription(
      userId,
      plan.id,
      subscription.paymentType as PaymentType,
      paymentMethod,
      payerPhone,
      payerName,
      payerEmail
    );
  }

  // Extend subscription (admin)
  async extendSubscription(subscriptionId: number, days: number): Promise<SubscriptionDetails | null> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId));

    if (!subscription) return null;

    const currentEndDate = subscription.endDate || new Date();
    const newEndDate = new Date(currentEndDate);
    newEndDate.setDate(newEndDate.getDate() + days);

    await db
      .update(subscriptions)
      .set({
        endDate: newEndDate,
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscriptionId));

    // Also update user status if needed
    await db
      .update(users)
      .set({ subscriptionStatus: 'active' })
      .where(eq(users.id, subscription.userId));

    // Sync all organization members with active status
    if (subscription.organizationId) {
      const plan = await this.getPlanById(parseInt(subscription.planId));
      await this.syncOrganizationMembers(subscription.organizationId, plan?.type || 'basic', 'active');
    }

    return this.getSubscriptionDetails(subscriptionId);
  }

  // Update subscription status (admin)
  async updateSubscriptionStatus(subscriptionId: number, status: SubscriptionStatus): Promise<SubscriptionDetails | null> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId));

    if (!subscription) return null;

    await db
      .update(subscriptions)
      .set({
        status,
        updatedAt: new Date(),
        cancelledAt: status === 'cancelled' ? new Date() : subscription.cancelledAt,
      })
      .where(eq(subscriptions.id, subscriptionId));

    // Update user subscription status
    const userStatus = status === 'active' ? 'active' : 
                       status === 'trial' ? 'trialing' :
                       status === 'cancelled' ? 'canceled' : 'past_due';
    
    await db
      .update(users)
      .set({ subscriptionStatus: userStatus as any })
      .where(eq(users.id, subscription.userId));

    // Sync all organization members with the new status
    if (subscription.organizationId) {
      const plan = await this.getPlanById(parseInt(subscription.planId));
      await this.syncOrganizationMembers(subscription.organizationId, plan?.type || 'basic', status);
    }

    return this.getSubscriptionDetails(subscriptionId);
  }

  // Get all subscriptions for admin with filters
  async getSubscriptionsForAdmin(filters: SubscriptionFilters = {}): Promise<{
    subscriptions: SubscriptionDetails[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    // Build query conditions
    let query = db.select().from(subscriptions);

    // Get all subscriptions first, then filter in memory for complex conditions
    const allSubs = await query.orderBy(desc(subscriptions.createdAt));

    let filteredSubs = allSubs;

    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      filteredSubs = filteredSubs.filter(s => statuses.includes(s.status as SubscriptionStatus));
    }

    if (filters.planId) {
      filteredSubs = filteredSubs.filter(s => s.planId === filters.planId!.toString());
    }

    if (filters.startDateFrom) {
      filteredSubs = filteredSubs.filter(s => s.startDate >= filters.startDateFrom!);
    }

    if (filters.startDateTo) {
      filteredSubs = filteredSubs.filter(s => s.startDate <= filters.startDateTo!);
    }

    const total = filteredSubs.length;
    const paginatedSubs = filteredSubs.slice(offset, offset + limit);

    // Get details for each subscription
    const subscriptionDetails = await Promise.all(
      paginatedSubs.map(s => this.getSubscriptionDetails(s.id))
    );

    return {
      subscriptions: subscriptionDetails.filter(s => s !== null) as SubscriptionDetails[],
      total,
      page,
      limit,
    };
  }

  // Get subscription statistics
  async getSubscriptionStats(): Promise<SubscriptionStats> {
    const allSubs = await db.select().from(subscriptions);
    const allPlans = await db.select().from(plans);

    const stats: SubscriptionStats = {
      total: allSubs.length,
      active: allSubs.filter(s => s.status === 'active').length,
      trial: allSubs.filter(s => s.status === 'trial').length,
      pending: allSubs.filter(s => s.status === 'pending').length,
      expired: allSubs.filter(s => s.status === 'expired').length,
      cancelled: allSubs.filter(s => s.status === 'cancelled').length,
      byPlan: [],
    };

    // Count by plan
    const planCounts = new Map<string, number>();
    allSubs.forEach(s => {
      const count = planCounts.get(s.planId) || 0;
      planCounts.set(s.planId, count + 1);
    });

    stats.byPlan = Array.from(planCounts.entries()).map(([planId, count]) => {
      const plan = allPlans.find(p => p.id.toString() === planId);
      return {
        planId,
        planName: plan?.name || 'Unknown',
        count,
      };
    });

    return stats;
  }

  // Get subscriptions expiring soon (for job)
  async getExpiringSubscriptions(daysAhead: number): Promise<SubscriptionDetails[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const allSubs = await db.select().from(subscriptions);

    const expiringSubs = allSubs.filter(s => {
      if (s.status !== 'active') return false;
      if (!s.endDate) return false;
      const endDate = new Date(s.endDate);
      return endDate >= now && endDate <= futureDate;
    });

    const details = await Promise.all(
      expiringSubs.map(s => this.getSubscriptionDetails(s.id))
    );

    return details.filter(s => s !== null) as SubscriptionDetails[];
  }

  // Get trials ending soon (for job)
  async getExpiringTrials(daysAhead: number): Promise<SubscriptionDetails[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const allSubs = await db.select().from(subscriptions);

    const expiringTrials = allSubs.filter(s => {
      if (s.status !== 'trial') return false;
      if (!s.trialEndsAt) return false;
      const trialEnd = new Date(s.trialEndsAt);
      return trialEnd >= now && trialEnd <= futureDate;
    });

    const details = await Promise.all(
      expiringTrials.map(s => this.getSubscriptionDetails(s.id))
    );

    return details.filter(s => s !== null) as SubscriptionDetails[];
  }

  // Mark expired subscriptions
  async markExpiredSubscriptions(): Promise<number> {
    const now = new Date();
    const allSubs = await db.select().from(subscriptions);

    let expiredCount = 0;

    for (const sub of allSubs) {
      let shouldExpire = false;

      if (sub.status === 'trial' && sub.trialEndsAt) {
        shouldExpire = new Date(sub.trialEndsAt) < now;
      } else if (sub.status === 'active' && sub.endDate) {
        shouldExpire = new Date(sub.endDate) < now;
      }

      if (shouldExpire) {
        await db
          .update(subscriptions)
          .set({ status: 'expired', updatedAt: new Date() })
          .where(eq(subscriptions.id, sub.id));

        await db
          .update(users)
          .set({ subscriptionStatus: 'past_due' })
          .where(eq(users.id, sub.userId));

        // Sync all organization members with expired status
        if (sub.organizationId) {
          // Get the plan to know the type
          const plan = await this.getPlanById(parseInt(sub.planId));
          await this.syncOrganizationMembers(sub.organizationId, plan?.type || 'basic', 'expired');
        }

        expiredCount++;
      }
    }

    return expiredCount;
  }

  /**
   * Sync organization members with the organization's subscription status
   * This should be called whenever a subscription is activated, updated, or expires
   */
  async syncOrganizationMembers(organizationId: number, planType: string, subscriptionStatus: string): Promise<void> {
    // Map subscription status to user subscription status
    let userSubscriptionStatus: 'active' | 'trialing' | 'past_due' | 'canceled' = 'active';
    if (subscriptionStatus === 'active') {
      userSubscriptionStatus = 'active';
    } else if (subscriptionStatus === 'trial') {
      userSubscriptionStatus = 'trialing';
    } else if (subscriptionStatus === 'expired') {
      userSubscriptionStatus = 'past_due';
    } else if (subscriptionStatus === 'cancelled') {
      userSubscriptionStatus = 'canceled';
    }

    // Update all members of the organization
    await db
      .update(users)
      .set({
        planType: planType as any,
        subscriptionStatus: userSubscriptionStatus,
        updatedAt: new Date(),
      })
      .where(eq(users.organizationId, organizationId));

    // Also update the organization itself
    const { organizations } = await import('../../core/database/schema.js');
    await db
      .update(organizations)
      .set({
        planType: planType as any,
        subscriptionStatus: userSubscriptionStatus,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId));

    console.log(`[syncOrganizationMembers] Synced organization ${organizationId} members with plan ${planType} and status ${subscriptionStatus}`);
  }

  /**
   * Get the count of members in an organization
   */
  async getOrganizationMemberCount(organizationId: number): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.organizationId, organizationId));
    
    return result[0]?.count || 0;
  }

  private calculateEndDate(startDate: Date): Date {
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    return endDate;
  }

  private calculateEndDateFromDays(startDate: Date, days: number): Date {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days);
    return endDate;
  }

  /**
   * Start trial while payment is pending
   * This allows users to use the system while waiting for payment confirmation
   */
  async startTrialWhilePending(userId: number, planId: number): Promise<{
    subscription: any;
    trialDays: number;
  }> {
    // Get the plan
    const plan = await this.getPlanById(planId);
    if (!plan) {
      throw new Error('Plano não encontrado');
    }

    // Check if plan has trial days
    const trialDays = plan.trialDays || 0;
    if (trialDays === 0) {
      throw new Error('Este plano não oferece período de teste');
    }

    // Get user
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Check if user already has an active subscription
    const existingSubscription = await this.getUserSubscription(userId);
    if (existingSubscription && existingSubscription.status === 'active') {
      throw new Error('Você já possui uma assinatura ativa');
    }

    // Check if user has already used trial for this plan type
    const existingSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));
    const hasUsedTrial = existingSubscriptions.some(s => s.trialUsed === true);
    if (hasUsedTrial) {
      throw new Error('Você já utilizou o período de teste para este tipo de plano');
    }

    // Calculate trial end date
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    // Update existing pending subscription to trial status or create new one
    if (existingSubscription && existingSubscription.status === 'pending') {
      // Update existing subscription to trial
      const [updatedSubscription] = await db
        .update(subscriptions)
        .set({
          status: 'trial',
          trialEndsAt,
          trialUsed: true,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, existingSubscription.id))
        .returning();

      // Update user's plan type with trial status
      await db
        .update(users)
        .set({
          planType: plan.type as any,
          subscriptionStatus: 'trialing',
          trialEndsAt,
        })
        .where(eq(users.id, userId));

      // Sync organization members if applicable
      if (user.organizationId) {
        await this.syncOrganizationMembers(user.organizationId, plan.type, 'trial');
      }

      console.log(`[startTrialWhilePending] Updated subscription to trial:`, {
        subscriptionId: updatedSubscription.id,
        trialEndsAt,
        trialDays,
      });

      return { subscription: updatedSubscription, trialDays };
    }

    // Create new trial subscription
    const [subscription] = await db
      .insert(subscriptions)
      .values({
        userId,
        organizationId: user.organizationId || undefined,
        planId: plan.id.toString(),
        status: 'trial',
        paymentType: 'one_time',
        paymentMethod: 'gpo',
        startDate: new Date(),
        endDate: null,
        trialEndsAt,
        trialUsed: true,
        isFirstSubscription: true,
      })
      .returning();

    // Update user's plan type with trial status
    await db
      .update(users)
      .set({
        planType: plan.type as any,
        subscriptionStatus: 'trialing',
        trialEndsAt,
      })
      .where(eq(users.id, userId));

    // Sync organization members if applicable
    if (user.organizationId) {
      await this.syncOrganizationMembers(user.organizationId, plan.type, 'trial');
    }

    console.log(`[startTrialWhilePending] Created trial subscription:`, {
      subscriptionId: subscription.id,
      trialEndsAt,
      trialDays,
    });

    return { subscription, trialDays };
  }

  // ==========================================
  // UPGRADE / DOWNGRADE METHODS
  // ==========================================

  /**
   * Preview a plan change (upgrade or downgrade)
   * Shows the user what will happen before they confirm
   */
  async previewPlanChange(userId: number, newPlanId: number): Promise<PlanChangePreview> {
    // Get user and current subscription
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error('Utilizador não encontrado');

    const currentSubscription = await this.getUserSubscription(userId);
    const newPlan = await this.getPlanById(newPlanId);
    
    if (!newPlan) throw new Error('Plano não encontrado');
    if (!newPlan.isActive) throw new Error('Este plano não está disponível');

    // Get current plan if exists
    let currentPlan: PlanData | null = null;
    let daysRemaining = 0;
    let creditAmount = 0;

    if (currentSubscription && currentSubscription.status === 'active') {
      currentPlan = await this.getPlanById(parseInt(currentSubscription.planId));
      
      // Calculate days remaining
      if (currentSubscription.endDate) {
        const now = new Date();
        const endDate = new Date(currentSubscription.endDate);
        daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      }
    } else if (currentSubscription && currentSubscription.status === 'trial') {
      currentPlan = await this.getPlanById(parseInt(currentSubscription.planId));
      
      // For trial, calculate days remaining from trial end
      if (currentSubscription.trialEndsAt) {
        const now = new Date();
        const trialEnd = new Date(currentSubscription.trialEndsAt);
        daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      }
    }

    // Determine change type
    const currentPrice = currentPlan?.price || 0;
    const newPrice = newPlan.price;
    const isUpgrade = newPrice > currentPrice;
    const changeType = isUpgrade ? 'upgrade' : 'downgrade';

    // Calculate proration for upgrades
    if (isUpgrade && currentPlan && daysRemaining > 0) {
      // Calculate daily rate of current plan
      const billingCycleDays = this.getBillingCycleDays(currentPlan.billingCycle || 'monthly');
      const dailyRate = currentPrice / billingCycleDays;
      creditAmount = Math.round(dailyRate * daysRemaining * 100) / 100;
    }

    // Calculate amount to pay
    let amountToPay = newPrice;
    let effectiveDate = new Date();
    let scheduledFor: Date | undefined;
    let message = '';

    if (isUpgrade) {
      // Upgrade: Apply credit and charge difference immediately
      amountToPay = Math.max(0, newPrice - creditAmount);
      message = creditAmount > 0 
        ? `Upgrade imediato. Crédito de ${creditAmount.toFixed(2)} AOA aplicado dos ${daysRemaining} dias restantes do plano atual.`
        : `Upgrade imediato para o plano ${newPlan.name}.`;
    } else {
      // Downgrade: Schedule for end of current cycle
      amountToPay = 0; // No payment needed for downgrade
      if (currentSubscription?.endDate) {
        scheduledFor = new Date(currentSubscription.endDate);
        effectiveDate = scheduledFor;
        message = `Downgrade agendado para ${scheduledFor.toLocaleDateString('pt-AO')}. Continuará com o plano atual até essa data.`;
      } else {
        message = `Downgrade para o plano ${newPlan.name}. Será aplicado imediatamente.`;
      }
    }

    return {
      changeType,
      fromPlan: currentPlan,
      toPlan: newPlan,
      daysRemaining,
      creditAmount,
      amountToPay,
      effectiveDate,
      scheduledFor,
      message,
    };
  }

  /**
   * Execute a plan upgrade
   * Applies proration credit and creates payment for the difference
   */
  async upgradePlan(
    userId: number,
    newPlanId: number,
    paymentMethod: PaymentMethod,
    payerPhone?: string,
    payerName?: string,
    payerEmail?: string
  ): Promise<PlanChangeResult> {
    // Get preview to validate and calculate amounts
    const preview = await this.previewPlanChange(userId, newPlanId);
    
    if (preview.changeType !== 'upgrade') {
      throw new Error('Esta operação é um downgrade. Use o método de downgrade.');
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error('Utilizador não encontrado');

    const currentSubscription = await this.getUserSubscription(userId);

    // Create plan change record
    const [planChange] = await db
      .insert(planChanges)
      .values({
        userId,
        organizationId: user.organizationId || undefined,
        subscriptionId: currentSubscription?.id,
        fromPlanId: preview.fromPlan?.id,
        toPlanId: preview.toPlan.id,
        changeType: 'upgrade',
        fromPlanPrice: preview.fromPlan?.price.toString(),
        toPlanPrice: preview.toPlan.price.toString(),
        daysRemaining: preview.daysRemaining,
        creditAmount: preview.creditAmount.toString(),
        amountToPay: preview.amountToPay.toString(),
        status: 'pending',
        effectiveDate: preview.effectiveDate,
      })
      .returning();

    let payment = null;

    // If there's an amount to pay, create payment
    if (preview.amountToPay > 0) {
      const customerName = payerName || `${user.firstName} ${user.lastName}`;
      const customerPhone = payerPhone || user.phone || '';
      const customerEmail = payerEmail || user.email || '';

      const paymentResult = await tpagamentoService.createPayment(
        paymentMethod,
        preview.amountToPay,
        {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
        },
        `Upgrade para ${preview.toPlan.name} - FinanceControl`
      );

      if (!paymentResult.success) {
        // Mark plan change as cancelled
        await db
          .update(planChanges)
          .set({ status: 'cancelled', updatedAt: new Date() })
          .where(eq(planChanges.id, planChange.id));
        
        throw new Error(paymentResult.message || 'Erro ao criar pagamento');
      }

      const isAlreadyPaid = paymentResult.status === 'paid';

      // Calculate new end date
      const billingCycleDays = this.getBillingCycleDays(preview.toPlan.billingCycle || 'monthly');
      const newEndDate = new Date();
      newEndDate.setDate(newEndDate.getDate() + billingCycleDays);

      // Create or update subscription
      let subscription;
      if (currentSubscription) {
        // Update existing subscription
        [subscription] = await db
          .update(subscriptions)
          .set({
            planId: preview.toPlan.id.toString(),
            status: isAlreadyPaid ? 'active' : 'pending',
            startDate: new Date(),
            endDate: newEndDate,
            nextBillingDate: newEndDate,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, currentSubscription.id))
          .returning();
      } else {
        // Create new subscription
        [subscription] = await db
          .insert(subscriptions)
          .values({
            userId,
            organizationId: user.organizationId || undefined,
            planId: preview.toPlan.id.toString(),
            status: isAlreadyPaid ? 'active' : 'pending',
            paymentType: 'one_time',
            paymentMethod,
            startDate: new Date(),
            endDate: newEndDate,
            nextBillingDate: newEndDate,
          })
          .returning();
      }

      // Record payment
      const [paymentRecord] = await db
        .insert(subscriptionPayments)
        .values({
          subscriptionId: subscription.id,
          userId,
          organizationId: user.organizationId || undefined,
          amount: preview.amountToPay.toString(),
          paymentMethod,
          paymentId: paymentResult.paymentId || null,
          referenceCode: paymentResult.referenceCode || null,
          status: isAlreadyPaid ? 'paid' : 'pending',
          paidAt: isAlreadyPaid ? new Date() : null,
        })
        .returning();

      // Update plan change with payment info
      await db
        .update(planChanges)
        .set({
          subscriptionId: subscription.id,
          paymentId: paymentRecord.id,
          status: isAlreadyPaid ? 'completed' : 'pending',
          processedAt: isAlreadyPaid ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(planChanges.id, planChange.id));

      // If already paid, update user's plan
      if (isAlreadyPaid) {
        await db
          .update(users)
          .set({
            planType: preview.toPlan.type as any,
            subscriptionStatus: 'active',
          })
          .where(eq(users.id, userId));

        // Sync organization members
        if (user.organizationId) {
          await this.syncOrganizationMembers(user.organizationId, preview.toPlan.type, 'active');
        }

        // Send confirmation email
        if (user.email) {
          emailService.sendSubscriptionConfirmationEmail(
            user.email,
            user.firstName || 'Utilizador',
            preview.toPlan.name,
            preview.amountToPay,
            newEndDate
          ).catch(err => console.error('Error sending upgrade email:', err));
        }
      }

      payment = {
        ...paymentRecord,
        paymentData: paymentResult.data,
      };
    } else {
      // No payment needed (full credit covers the upgrade)
      const billingCycleDays = this.getBillingCycleDays(preview.toPlan.billingCycle || 'monthly');
      const newEndDate = new Date();
      newEndDate.setDate(newEndDate.getDate() + billingCycleDays);

      // Update subscription
      if (currentSubscription) {
        await db
          .update(subscriptions)
          .set({
            planId: preview.toPlan.id.toString(),
            status: 'active',
            startDate: new Date(),
            endDate: newEndDate,
            nextBillingDate: newEndDate,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, currentSubscription.id));
      }

      // Update plan change as completed
      await db
        .update(planChanges)
        .set({
          status: 'completed',
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(planChanges.id, planChange.id));

      // Update user's plan
      await db
        .update(users)
        .set({
          planType: preview.toPlan.type as any,
          subscriptionStatus: 'active',
        })
        .where(eq(users.id, userId));

      // Sync organization members
      if (user.organizationId) {
        await this.syncOrganizationMembers(user.organizationId, preview.toPlan.type, 'active');
      }
    }

    console.log(`[upgradePlan] Plan upgrade completed:`, {
      userId,
      fromPlan: preview.fromPlan?.name,
      toPlan: preview.toPlan.name,
      creditAmount: preview.creditAmount,
      amountToPay: preview.amountToPay,
    });

    return {
      success: true,
      planChange,
      payment,
      message: preview.message,
    };
  }

  /**
   * Schedule a plan downgrade
   * Downgrade takes effect at the end of the current billing cycle
   */
  async downgradePlan(userId: number, newPlanId: number, reason?: string): Promise<PlanChangeResult> {
    // Get preview to validate
    const preview = await this.previewPlanChange(userId, newPlanId);
    
    if (preview.changeType !== 'downgrade') {
      throw new Error('Esta operação é um upgrade. Use o método de upgrade.');
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error('Utilizador não encontrado');

    const currentSubscription = await this.getUserSubscription(userId);

    // Check if there's already a scheduled downgrade
    const existingDowngrade = await db
      .select()
      .from(planChanges)
      .where(and(
        eq(planChanges.userId, userId),
        eq(planChanges.status, 'scheduled'),
        eq(planChanges.changeType, 'downgrade')
      ))
      .limit(1);

    if (existingDowngrade.length > 0) {
      throw new Error('Já existe um downgrade agendado. Cancele-o primeiro para agendar outro.');
    }

    // Create plan change record
    const [planChange] = await db
      .insert(planChanges)
      .values({
        userId,
        organizationId: user.organizationId || undefined,
        subscriptionId: currentSubscription?.id,
        fromPlanId: preview.fromPlan?.id,
        toPlanId: preview.toPlan.id,
        changeType: 'downgrade',
        fromPlanPrice: preview.fromPlan?.price.toString(),
        toPlanPrice: preview.toPlan.price.toString(),
        daysRemaining: preview.daysRemaining,
        creditAmount: '0',
        amountToPay: '0',
        status: preview.scheduledFor ? 'scheduled' : 'completed',
        effectiveDate: preview.effectiveDate,
        scheduledFor: preview.scheduledFor,
        reason,
      })
      .returning();

    // If no scheduled date (immediate downgrade), apply now
    if (!preview.scheduledFor) {
      await this.applyDowngrade(planChange.id);
    }

    console.log(`[downgradePlan] Plan downgrade ${preview.scheduledFor ? 'scheduled' : 'applied'}:`, {
      userId,
      fromPlan: preview.fromPlan?.name,
      toPlan: preview.toPlan.name,
      scheduledFor: preview.scheduledFor,
    });

    return {
      success: true,
      planChange,
      message: preview.message,
    };
  }

  /**
   * Apply a scheduled downgrade
   * Called by a job when the scheduled date arrives
   */
  async applyDowngrade(planChangeId: number): Promise<void> {
    const [planChange] = await db
      .select()
      .from(planChanges)
      .where(eq(planChanges.id, planChangeId));

    if (!planChange) throw new Error('Mudança de plano não encontrada');
    if (planChange.status === 'completed') return; // Already applied

    const newPlan = await this.getPlanById(planChange.toPlanId);
    if (!newPlan) throw new Error('Plano não encontrado');

    const [user] = await db.select().from(users).where(eq(users.id, planChange.userId));
    if (!user) throw new Error('Utilizador não encontrado');

    // Calculate new end date
    const billingCycleDays = this.getBillingCycleDays(newPlan.billingCycle || 'monthly');
    const newEndDate = new Date();
    newEndDate.setDate(newEndDate.getDate() + billingCycleDays);

    // Update subscription
    if (planChange.subscriptionId) {
      await db
        .update(subscriptions)
        .set({
          planId: newPlan.id.toString(),
          status: 'active',
          startDate: new Date(),
          endDate: newEndDate,
          nextBillingDate: newEndDate,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, planChange.subscriptionId));
    }

    // Update user's plan
    await db
      .update(users)
      .set({
        planType: newPlan.type as any,
        subscriptionStatus: 'active',
      })
      .where(eq(users.id, planChange.userId));

    // Sync organization members
    if (user.organizationId) {
      await this.syncOrganizationMembers(user.organizationId, newPlan.type, 'active');
    }

    // Mark plan change as completed
    await db
      .update(planChanges)
      .set({
        status: 'completed',
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(planChanges.id, planChangeId));

    // Send notification email
    if (user.email) {
      emailService.sendEmail({
        to: user.email,
        subject: 'Plano Alterado - FinanceControl',
        html: emailService['getEmailTemplate']('Plano Alterado', `
          <h2>Olá ${user.firstName || 'Utilizador'},</h2>
          <p>O seu plano foi alterado para <strong>${newPlan.name}</strong>.</p>
          <p>O novo plano está agora ativo e válido até ${newEndDate.toLocaleDateString('pt-AO')}.</p>
        `)
      }).catch(err => console.error('Error sending downgrade email:', err));
    }

    console.log(`[applyDowngrade] Downgrade applied:`, {
      planChangeId,
      userId: planChange.userId,
      newPlan: newPlan.name,
    });
  }

  /**
   * Cancel a scheduled downgrade
   */
  async cancelScheduledDowngrade(userId: number): Promise<void> {
    const [scheduledDowngrade] = await db
      .select()
      .from(planChanges)
      .where(and(
        eq(planChanges.userId, userId),
        eq(planChanges.status, 'scheduled'),
        eq(planChanges.changeType, 'downgrade')
      ))
      .limit(1);

    if (!scheduledDowngrade) {
      throw new Error('Nenhum downgrade agendado encontrado');
    }

    await db
      .update(planChanges)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(planChanges.id, scheduledDowngrade.id));

    console.log(`[cancelScheduledDowngrade] Downgrade cancelled:`, {
      planChangeId: scheduledDowngrade.id,
      userId,
    });
  }

  /**
   * Get pending/scheduled plan changes for a user
   */
  async getPendingPlanChanges(userId: number): Promise<any[]> {
    const changes = await db
      .select()
      .from(planChanges)
      .where(and(
        eq(planChanges.userId, userId),
        or(
          eq(planChanges.status, 'pending'),
          eq(planChanges.status, 'scheduled')
        )
      ))
      .orderBy(desc(planChanges.createdAt));

    // Enrich with plan info
    const enrichedChanges = await Promise.all(
      changes.map(async (change) => {
        const fromPlan = change.fromPlanId ? await this.getPlanById(change.fromPlanId) : null;
        const toPlan = await this.getPlanById(change.toPlanId);
        return {
          ...change,
          fromPlan,
          toPlan,
        };
      })
    );

    return enrichedChanges;
  }

  /**
   * Get plan change history for a user
   */
  async getPlanChangeHistory(userId: number): Promise<any[]> {
    const changes = await db
      .select()
      .from(planChanges)
      .where(eq(planChanges.userId, userId))
      .orderBy(desc(planChanges.createdAt));

    // Enrich with plan info
    const enrichedChanges = await Promise.all(
      changes.map(async (change) => {
        const fromPlan = change.fromPlanId ? await this.getPlanById(change.fromPlanId) : null;
        const toPlan = await this.getPlanById(change.toPlanId);
        return {
          ...change,
          fromPlan,
          toPlan,
        };
      })
    );

    return enrichedChanges;
  }

  /**
   * Process all scheduled downgrades that are due
   * Should be called by a cron job daily
   */
  async processScheduledDowngrades(): Promise<number> {
    const now = new Date();
    
    const dueDowngrades = await db
      .select()
      .from(planChanges)
      .where(and(
        eq(planChanges.status, 'scheduled'),
        eq(planChanges.changeType, 'downgrade'),
        lte(planChanges.scheduledFor, now)
      ));

    let processedCount = 0;

    for (const downgrade of dueDowngrades) {
      try {
        await this.applyDowngrade(downgrade.id);
        processedCount++;
      } catch (error) {
        console.error(`[processScheduledDowngrades] Error processing downgrade ${downgrade.id}:`, error);
      }
    }

    console.log(`[processScheduledDowngrades] Processed ${processedCount} scheduled downgrades`);
    return processedCount;
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;
