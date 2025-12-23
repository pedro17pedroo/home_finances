import { db } from '../../core/database/db.js';
import {
  subscriptions,
  subscriptionPayments,
  subscriptionNotifications,
  users,
  plans,
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

        expiredCount++;
      }
    }

    return expiredCount;
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
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;
