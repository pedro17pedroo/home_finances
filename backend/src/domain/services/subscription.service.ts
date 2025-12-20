import { db } from '../../core/database/db.js';
import {
  subscriptions,
  subscriptionPayments,
  users,
  plans,
} from '../../core/database/schema.js';
import { eq, desc } from 'drizzle-orm';
import tpagamentoService, {
  PaymentMethod,
} from '../../infrastructure/payments/tpagamento.service.js';

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
  isActive: boolean;
}

class SubscriptionService {
  // Get all active plans from database
  async getPlans(): Promise<PlanData[]> {
    const dbPlans = await db
      .select()
      .from(plans)
      .where(eq(plans.isActive, true))
      .orderBy(plans.price);

    return dbPlans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      type: plan.type,
      price: parseFloat(plan.price),
      features: (plan.features as string[]) || [],
      maxAccounts: plan.maxAccounts || 5,
      maxTransactions: plan.maxTransactions || 1000,
      isActive: plan.isActive ?? true,
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
      isActive: plan.isActive ?? true,
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
    payerEmail?: string
  ) {
    const plan = await this.getPlanById(planId);
    if (!plan) throw new Error('Plano não encontrado');

    // Get user info
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error('Usuário não encontrado');

    // For free plan (price = 0), activate immediately
    if (plan.price === 0) {
      const [subscription] = await db
        .insert(subscriptions)
        .values({
          userId,
          planId: plan.id.toString(),
          status: 'active',
          paymentType: 'one_time',
          startDate: new Date(),
          endDate: null,
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

    // Create subscription (active if already paid, pending otherwise)
    const [subscription] = await db
      .insert(subscriptions)
      .values({
        userId,
        planId: plan.id.toString(),
        status: isAlreadyPaid ? 'active' : 'pending',
        paymentType,
        paymentMethod,
        startDate: new Date(),
        endDate: paymentType === 'recurring' ? this.calculateEndDate(new Date()) : null,
      })
      .returning();

    // Record payment
    const [payment] = await db
      .insert(subscriptionPayments)
      .values({
        subscriptionId: subscription.id,
        userId,
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
    });

    return {
      subscription,
      payment: {
        ...payment,
        paymentData: paymentResult.data,
      },
      plan,
    };
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

      // Update user's plan
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

  // Get payment history
  async getPaymentHistory(userId: number) {
    return db
      .select()
      .from(subscriptionPayments)
      .where(eq(subscriptionPayments.userId, userId))
      .orderBy(desc(subscriptionPayments.createdAt));
  }

  // Cancel subscription
  async cancelSubscription(userId: number) {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) throw new Error('Assinatura não encontrada');

    await db
      .update(subscriptions)
      .set({ status: 'cancelled' })
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

  private calculateEndDate(startDate: Date): Date {
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    return endDate;
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;
