import { db } from '../../core/database/db.js';
import { users, subscriptions, plans, organizations } from '../../core/database/schema.js';
import { eq, desc, and } from 'drizzle-orm';
import { TransactionRepository } from '../repositories/transaction.repository.js';
import { AccountRepository } from '../repositories/account.repository.js';

export interface PlanLimits {
  maxAccounts: number;
  maxTransactions: number;
  maxUsers: number;
  features: string[];
}

export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number;
}

export interface AccessInfo {
  limits: PlanLimits;
  planType: string;
  planName: string;
  subscription: {
    status: string;
    planName: string;
    planType: string;
    daysRemaining: number | null;
    isTrialActive: boolean;
  } | null;
}

// Standard feature keys that can be used across the application
export const PLAN_FEATURES = {
  // Reports
  REPORTS_BASIC: 'reports_basic',
  REPORTS_ADVANCED: 'reports_advanced',
  REPORTS_EXPORT: 'reports_export',
  
  // Transactions
  TRANSACTIONS_RECURRING: 'transactions_recurring',
  TRANSACTIONS_BULK_IMPORT: 'transactions_bulk_import',
  
  // Categories
  CATEGORIES_CUSTOM: 'categories_custom',
  CATEGORIES_UNLIMITED: 'categories_unlimited',
  
  // Goals
  GOALS_BASIC: 'goals_basic',
  GOALS_UNLIMITED: 'goals_unlimited',
  
  // Loans & Debts
  LOANS_MANAGEMENT: 'loans_management',
  
  // Team
  TEAM_MEMBERS: 'team_members',
  TEAM_UNLIMITED: 'team_unlimited',
  
  // WhatsApp
  WHATSAPP_INTEGRATION: 'whatsapp_integration',
  WHATSAPP_AI: 'whatsapp_ai',
  
  // Support
  SUPPORT_PRIORITY: 'support_priority',
  SUPPORT_DEDICATED: 'support_dedicated',
  
  // API
  API_ACCESS: 'api_access',
  
  // Notifications
  NOTIFICATIONS_EMAIL: 'notifications_email',
  NOTIFICATIONS_SMS: 'notifications_sms',
  NOTIFICATIONS_PUSH: 'notifications_push',
} as const;

// Default free plan limits (matches "Teste Gratis" plan in database)
const FREE_PLAN_LIMITS: PlanLimits = {
  maxAccounts: 1,
  maxTransactions: 50,
  maxUsers: 1,
  features: [],
};

export class PlanAccessService {
  /**
   * Get the current plan limits for an organization
   */
  static async getOrganizationPlanLimits(organizationId: number): Promise<PlanLimits> {
    // First, try to get organization's active subscription by organizationId
    let [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    // If no subscription found by organizationId, try to find by userId of organization members
    if (!subscription || !['active', 'trial'].includes(subscription.status)) {
      // Get organization owner/members
      const orgUsers = await db
        .select()
        .from(users)
        .where(eq(users.organizationId, organizationId));
      
      // Try to find active subscription from any organization member
      for (const orgUser of orgUsers) {
        const [userSub] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.userId, orgUser.id))
          .orderBy(desc(subscriptions.createdAt))
          .limit(1);
        
        if (userSub && ['active', 'trial'].includes(userSub.status)) {
          subscription = userSub;
          break;
        }
      }
    }

    if (!subscription || !['active', 'trial'].includes(subscription.status)) {
      return FREE_PLAN_LIMITS;
    }

    // Get plan details
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, parseInt(subscription.planId)));

    if (!plan) {
      return FREE_PLAN_LIMITS;
    }

    return {
      maxAccounts: plan.maxAccounts || 5,
      maxTransactions: plan.maxTransactions || 100,
      maxUsers: plan.maxUsers || 1,
      features: (plan.features as string[]) || [],
    };
  }

  /**
   * Get the current plan limits for a user (backward compatibility)
   */
  static async getUserPlanLimits(userId: number): Promise<PlanLimits> {
    // Get user's organization
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (user?.organizationId) {
      return this.getOrganizationPlanLimits(user.organizationId);
    }

    // Fallback to user-based subscription
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    if (!subscription || !['active', 'trial'].includes(subscription.status)) {
      return FREE_PLAN_LIMITS;
    }

    // Get plan details
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, parseInt(subscription.planId)));

    if (!plan) {
      return FREE_PLAN_LIMITS;
    }

    return {
      maxAccounts: plan.maxAccounts || 5,
      maxTransactions: plan.maxTransactions || 100,
      maxUsers: plan.maxUsers || 1,
      features: (plan.features as string[]) || [],
    };
  }

  /**
   * Check if organization can create more accounts
   */
  static async canCreateAccount(organizationId: number): Promise<boolean> {
    const limits = await this.getOrganizationPlanLimits(organizationId);
    
    // -1 means unlimited
    if (limits.maxAccounts === -1) {
      return true;
    }

    const currentCount = await AccountRepository.countByOrganizationId(organizationId);
    return currentCount < limits.maxAccounts;
  }

  /**
   * Check if organization can create more transactions this month
   */
  static async canCreateTransaction(organizationId: number): Promise<boolean> {
    const limits = await this.getOrganizationPlanLimits(organizationId);
    
    // -1 means unlimited
    if (limits.maxTransactions === -1) {
      return true;
    }

    const currentCount = await TransactionRepository.countThisMonthByOrganizationId(organizationId);
    return currentCount < limits.maxTransactions;
  }

  /**
   * Check if organization has access to a specific feature
   */
  static async hasFeature(organizationId: number, featureKey: string): Promise<boolean> {
    const limits = await this.getOrganizationPlanLimits(organizationId);
    
    // Check if feature is in the plan's features array
    return limits.features.some(f => 
      f.toLowerCase().includes(featureKey.toLowerCase()) ||
      featureKey.toLowerCase().includes(f.toLowerCase())
    );
  }

  /**
   * Get all access information for an organization
   */
  static async getAccessInfo(organizationId: number): Promise<AccessInfo> {
    const limits = await this.getOrganizationPlanLimits(organizationId);
    
    // Get subscription details - first try by organizationId
    let [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    // If no subscription found by organizationId, try by userId of organization members
    if (!subscription || !['active', 'trial'].includes(subscription.status)) {
      const orgUsers = await db
        .select()
        .from(users)
        .where(eq(users.organizationId, organizationId));
      
      for (const orgUser of orgUsers) {
        const [userSub] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.userId, orgUser.id))
          .orderBy(desc(subscriptions.createdAt))
          .limit(1);
        
        if (userSub && ['active', 'trial'].includes(userSub.status)) {
          subscription = userSub;
          break;
        }
      }
    }

    if (!subscription) {
      return {
        limits,
        planType: 'free',
        planName: 'Gratuito',
        subscription: null,
      };
    }

    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, parseInt(subscription.planId)));

    // Calculate days remaining
    let daysRemaining: number | null = null;
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
      limits,
      planType: plan?.type || 'basic',
      planName: plan?.name || 'Gratuito',
      subscription: {
        status: subscription.status,
        planName: plan?.name || 'Gratuito',
        planType: plan?.type || 'basic',
        daysRemaining,
        isTrialActive,
      },
    };
  }

  /**
   * Get access info for a user (backward compatibility)
   */
  static async getUserAccessInfo(userId: number): Promise<AccessInfo> {
    // Get user's organization
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (user?.organizationId) {
      return this.getAccessInfo(user.organizationId);
    }

    // Fallback to user-based logic
    const limits = await this.getUserPlanLimits(userId);
    
    // Get subscription details
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    if (!subscription) {
      return {
        limits,
        planType: 'free',
        planName: 'Gratuito',
        subscription: null,
      };
    }

    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, parseInt(subscription.planId)));

    // Calculate days remaining
    let daysRemaining: number | null = null;
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
      limits,
      planType: plan?.type || 'basic',
      planName: plan?.name || 'Gratuito',
      subscription: {
        status: subscription.status,
        planName: plan?.name || 'Gratuito',
        planType: plan?.type || 'basic',
        daysRemaining,
        isTrialActive,
      },
    };
  }
}

// Export instance for backward compatibility
export const planAccessService = {
  getUserPlanLimits: (userId: number) => PlanAccessService.getUserPlanLimits(userId),
  canCreateAccount: async (userId: number, currentAccountCount: number) => {
    const limits = await PlanAccessService.getUserPlanLimits(userId);
    if (limits.maxAccounts === -1) return { allowed: true };
    return {
      allowed: currentAccountCount < limits.maxAccounts,
      currentUsage: currentAccountCount,
      limit: limits.maxAccounts,
    };
  },
  canCreateTransaction: async (userId: number, currentMonthTransactionCount: number) => {
    const limits = await PlanAccessService.getUserPlanLimits(userId);
    if (limits.maxTransactions === -1) return { allowed: true };
    return {
      allowed: currentMonthTransactionCount < limits.maxTransactions,
      currentUsage: currentMonthTransactionCount,
      limit: limits.maxTransactions,
    };
  },
  hasFeature: async (userId: number, featureKey: string) => {
    const limits = await PlanAccessService.getUserPlanLimits(userId);
    return limits.features.some(f => 
      f.toLowerCase().includes(featureKey.toLowerCase()) ||
      featureKey.toLowerCase().includes(f.toLowerCase())
    );
  },
  checkFeatureAccess: async (userId: number, featureKey: string, featureName: string) => {
    const limits = await PlanAccessService.getUserPlanLimits(userId);
    const hasAccess = limits.features.some(f => 
      f.toLowerCase().includes(featureKey.toLowerCase()) ||
      featureKey.toLowerCase().includes(f.toLowerCase())
    );
    if (!hasAccess) {
      return {
        allowed: false,
        reason: `A funcionalidade "${featureName}" não está disponível no seu plano atual. Faça upgrade para ter acesso.`,
      };
    }
    return { allowed: true };
  },
  getUserAccessInfo: (userId: number) => PlanAccessService.getUserAccessInfo(userId),
};

export default planAccessService;
