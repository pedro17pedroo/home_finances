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
    paymentMethod: PaymentMethod
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

    // Create payment for paid plans
    const paymentResult = await tpagamentoService.createPayment(
      paymentMethod,
      plan.price,
      {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email || '',
        phone: user.phone || '',
      },
      `Assinatura ${plan.name} - FinanceControl`
    );

    if (!paymentResult.success) {
      throw new Error(paymentResult.message || 'Erro ao criar pagamento');
    }

    // Create pending subscription
    const [subscription] = await db
      .insert(subscriptions)
      .values({
        userId,
        planId: plan.id.toString(),
        status: 'pending',
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
        paymentId: paymentResult.paymentId,
        referenceCode: paymentResult.referenceCode,
        status: 'pending',
      })
      .returning();

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
    const [payment] = await db
      .select()
      .from(subscriptionPayments)
      .where(eq(subscriptionPayments.id, paymentId));

    if (!payment) throw new Error('Pagamento não encontrado');

    const method = payment.paymentMethod as PaymentMethod;
    const idOrCode = method === 'ekwanza' ? payment.referenceCode! : payment.paymentId!;

    const statusResult = await tpagamentoService.getPaymentStatus(method, idOrCode);

    if (statusResult.status === 'paid' && payment.status !== 'paid') {
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
