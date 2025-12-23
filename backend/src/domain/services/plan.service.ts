import { db } from '../../core/database/db.js';
import { plans, subscriptions } from '../../core/database/schema.js';
import { eq, desc, asc, count } from 'drizzle-orm';

export type BillingCycle = 'monthly' | 'quarterly' | 'yearly' | 'one_time';

export interface PlanData {
  id: number;
  name: string;
  type: 'basic' | 'premium' | 'enterprise';
  price: number;
  features: string[];
  maxAccounts: number;
  maxTransactions: number;
  isActive: boolean;
  durationDays: number | null;
  trialDays: number;
  billingCycle: string;
  description: string | null;
  sortOrder: number;
  createdAt: Date | null;
}

export interface CreatePlanInput {
  name: string;
  type: 'basic' | 'premium' | 'enterprise';
  price: number;
  features: string[];
  maxAccounts?: number;
  maxTransactions?: number;
  durationDays?: number | null;
  trialDays?: number;
  billingCycle?: BillingCycle;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdatePlanInput extends Partial<CreatePlanInput> {}

class PlanService {
  // Get all plans (for admin - includes inactive)
  async getAllPlans(includeInactive = false): Promise<PlanData[]> {
    const query = includeInactive
      ? db.select().from(plans).orderBy(asc(plans.sortOrder), asc(plans.price))
      : db.select().from(plans).where(eq(plans.isActive, true)).orderBy(asc(plans.sortOrder), asc(plans.price));

    const dbPlans = await query;

    return dbPlans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      type: plan.type,
      price: parseFloat(plan.price),
      features: (plan.features as string[]) || [],
      maxAccounts: plan.maxAccounts || 5,
      maxTransactions: plan.maxTransactions || 1000,
      isActive: plan.isActive ?? true,
      durationDays: plan.durationDays,
      trialDays: plan.trialDays || 0,
      billingCycle: plan.billingCycle || 'monthly',
      description: plan.description,
      sortOrder: plan.sortOrder || 0,
      createdAt: plan.createdAt,
    }));
  }

  // Get active plans (for public)
  async getActivePlans(): Promise<PlanData[]> {
    return this.getAllPlans(false);
  }

  // Get plan by ID
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
      durationDays: plan.durationDays,
      trialDays: plan.trialDays || 0,
      billingCycle: plan.billingCycle || 'monthly',
      description: plan.description,
      sortOrder: plan.sortOrder || 0,
      createdAt: plan.createdAt,
    };
  }

  // Create new plan
  async createPlan(input: CreatePlanInput): Promise<PlanData> {
    const [plan] = await db
      .insert(plans)
      .values({
        name: input.name,
        type: input.type,
        price: input.price.toString(),
        features: input.features,
        maxAccounts: input.maxAccounts || 5,
        maxTransactions: input.maxTransactions || 1000,
        durationDays: input.durationDays,
        trialDays: input.trialDays || 0,
        billingCycle: input.billingCycle || 'monthly',
        description: input.description,
        sortOrder: input.sortOrder || 0,
        isActive: input.isActive ?? true,
      })
      .returning();

    return {
      id: plan.id,
      name: plan.name,
      type: plan.type,
      price: parseFloat(plan.price),
      features: (plan.features as string[]) || [],
      maxAccounts: plan.maxAccounts || 5,
      maxTransactions: plan.maxTransactions || 1000,
      isActive: plan.isActive ?? true,
      durationDays: plan.durationDays,
      trialDays: plan.trialDays || 0,
      billingCycle: plan.billingCycle || 'monthly',
      description: plan.description,
      sortOrder: plan.sortOrder || 0,
      createdAt: plan.createdAt,
    };
  }

  // Update plan
  async updatePlan(planId: number, input: UpdatePlanInput): Promise<PlanData | null> {
    const updateData: any = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.price !== undefined) updateData.price = input.price.toString();
    if (input.features !== undefined) updateData.features = input.features;
    if (input.maxAccounts !== undefined) updateData.maxAccounts = input.maxAccounts;
    if (input.maxTransactions !== undefined) updateData.maxTransactions = input.maxTransactions;
    if (input.durationDays !== undefined) updateData.durationDays = input.durationDays;
    if (input.trialDays !== undefined) updateData.trialDays = input.trialDays;
    if (input.billingCycle !== undefined) updateData.billingCycle = input.billingCycle;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    if (Object.keys(updateData).length === 0) {
      return this.getPlanById(planId);
    }

    const [plan] = await db
      .update(plans)
      .set(updateData)
      .where(eq(plans.id, planId))
      .returning();

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
      durationDays: plan.durationDays,
      trialDays: plan.trialDays || 0,
      billingCycle: plan.billingCycle || 'monthly',
      description: plan.description,
      sortOrder: plan.sortOrder || 0,
      createdAt: plan.createdAt,
    };
  }

  // Toggle plan status (activate/deactivate)
  async togglePlanStatus(planId: number): Promise<PlanData | null> {
    const plan = await this.getPlanById(planId);
    if (!plan) return null;

    return this.updatePlan(planId, { isActive: !plan.isActive });
  }

  // Delete plan (only if no active subscriptions)
  async deletePlan(planId: number): Promise<{ success: boolean; message: string }> {
    // Check for active subscriptions
    const [subscriptionCount] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.planId, planId.toString()));

    if (subscriptionCount && subscriptionCount.count > 0) {
      return {
        success: false,
        message: `Não é possível eliminar o plano. Existem ${subscriptionCount.count} assinaturas associadas.`,
      };
    }

    await db.delete(plans).where(eq(plans.id, planId));

    return {
      success: true,
      message: 'Plano eliminado com sucesso.',
    };
  }

  // Get plan statistics
  async getPlanStats(planId: number): Promise<{ totalSubscriptions: number; activeSubscriptions: number }> {
    const [total] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.planId, planId.toString()));

    const activeStatuses = ['active', 'trial'];
    // For active count, we need a different approach
    const allSubs = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.planId, planId.toString()));

    const activeCount = allSubs.filter(s => activeStatuses.includes(s.status)).length;

    return {
      totalSubscriptions: total?.count || 0,
      activeSubscriptions: activeCount,
    };
  }
}

export const planService = new PlanService();
export default planService;
