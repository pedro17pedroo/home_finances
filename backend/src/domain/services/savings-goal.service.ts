import { SavingsGoalRepository, type SavingsGoalWithAccount } from "../repositories/savings-goal.repository.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { PlanAccessService } from "./plan-access.service.js";
import { 
  NotFoundError, 
  BadRequestError, 
  ForbiddenError 
} from "../../core/errors/app-error.js";
import type { SavingsGoal, InsertSavingsGoal } from "../../core/database/schema.js";

export interface CreateSavingsGoalRequest {
  name: string;
  accountId: number;
  targetAmount: number;
  currentAmount?: number;
  targetDate?: string;
  description?: string;
}

export interface UpdateSavingsGoalRequest {
  name?: string;
  accountId?: number;
  targetAmount?: number;
  currentAmount?: number;
  targetDate?: string | null;
  description?: string;
}

export interface AddToGoalRequest {
  amount: number;
  description?: string;
}

export class SavingsGoalService {
  static async getUserSavingsGoals(userId: number): Promise<SavingsGoalWithAccount[]> {
    return SavingsGoalRepository.findByUserId(userId);
  }

  static async getOrganizationSavingsGoals(organizationId: number): Promise<SavingsGoalWithAccount[]> {
    return SavingsGoalRepository.findByOrganizationId(organizationId);
  }

  static async getSavingsGoals(organizationId: number | null, userId: number): Promise<SavingsGoalWithAccount[]> {
    return SavingsGoalRepository.findByOrganizationOrUser(organizationId, userId);
  }

  static async getSavingsGoalById(
    id: number,
    userId: number,
    organizationId?: number | null
  ): Promise<SavingsGoalWithAccount> {
    const goal = await SavingsGoalRepository.findById(id);
    
    if (!goal) {
      throw new NotFoundError("Savings Goal");
    }
    
    // Check access by organization or user
    if (organizationId) {
      if (goal.organizationId !== organizationId) {
        throw new ForbiddenError("Access denied to this savings goal");
      }
    } else if (goal.userId !== userId) {
      throw new ForbiddenError("Access denied to this savings goal");
    }
    
    return goal;
  }

  static async createSavingsGoal(
    data: CreateSavingsGoalRequest,
    userId: number,
    organizationId?: number | null
  ): Promise<SavingsGoal> {
    // Verify account exists and belongs to user/organization
    const account = await AccountRepository.findById(data.accountId);
    if (!account) {
      throw new NotFoundError("Account");
    }
    
    // Check account access
    if (organizationId) {
      if (account.organizationId !== organizationId) {
        throw new ForbiddenError("Access denied to this account");
      }
    } else if (account.userId !== userId) {
      throw new ForbiddenError("Access denied to this account");
    }

    // Check plan limits
    if (organizationId) {
      const accessInfo = await PlanAccessService.getAccessInfo(organizationId);
      const goalCount = await SavingsGoalRepository.countByOrganizationId(organizationId);
      
      // Check based on plan type
      if (accessInfo.planType === 'basic' && goalCount >= 3) {
        throw new BadRequestError("Limite de metas de poupança atingido para o seu plano. Faça upgrade para continuar.");
      }
      if (accessInfo.planType === 'premium' && goalCount >= 15) {
        throw new BadRequestError("Limite de metas de poupança atingido para o seu plano. Faça upgrade para continuar.");
      }
    } else {
      // Fallback to old logic for backward compatibility
      const user = await UserRepository.findById(userId);
      if (!user) {
        throw new NotFoundError("User");
      }

      const goalCount = await SavingsGoalRepository.countByUserId(userId);
      
      // Basic plan limit: 3 savings goals
      if (user.planType === 'basic' && goalCount >= 3) {
        throw new BadRequestError("Limite de metas de poupança atingido para o seu plano. Faça upgrade para continuar.");
      }

      // Premium plan limit: 15 savings goals
      if (user.planType === 'premium' && goalCount >= 15) {
        throw new BadRequestError("Limite de metas de poupança atingido para o seu plano. Faça upgrade para continuar.");
      }
    }

    // Validate target date is in the future (if provided)
    if (data.targetDate) {
      const targetDate = new Date(data.targetDate);
      if (targetDate <= new Date()) {
        throw new BadRequestError("Target date must be in the future");
      }
    }

    // Validate target amount is positive
    if (data.targetAmount <= 0) {
      throw new BadRequestError("Target amount must be greater than zero");
    }

    // Use account balance as initial current amount
    const initialAmount = data.currentAmount ?? Number(account.balance);

    const goalData: InsertSavingsGoal = {
      userId,
      organizationId: organizationId || undefined,
      accountId: data.accountId,
      name: data.name,
      targetAmount: data.targetAmount.toString(),
      currentAmount: initialAmount.toString(),
      targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      description: data.description,
    };

    return SavingsGoalRepository.create(goalData);
  }

  static async updateSavingsGoal(
    id: number,
    data: UpdateSavingsGoalRequest,
    userId: number,
    organizationId?: number | null
  ): Promise<SavingsGoal> {
    // Verify goal exists and belongs to user/organization
    await this.getSavingsGoalById(id, userId, organizationId);

    // If changing account, verify new account access
    if (data.accountId) {
      const account = await AccountRepository.findById(data.accountId);
      if (!account) {
        throw new NotFoundError("Account");
      }
      
      if (organizationId) {
        if (account.organizationId !== organizationId) {
          throw new ForbiddenError("Access denied to this account");
        }
      } else if (account.userId !== userId) {
        throw new ForbiddenError("Access denied to this account");
      }
    }

    // Validate target date if provided
    if (data.targetDate) {
      const targetDate = new Date(data.targetDate);
      if (targetDate <= new Date()) {
        throw new BadRequestError("Target date must be in the future");
      }
    }

    // Validate amounts if provided
    if (data.targetAmount !== undefined && data.targetAmount <= 0) {
      throw new BadRequestError("Target amount must be greater than zero");
    }

    if (data.currentAmount !== undefined && data.currentAmount < 0) {
      throw new BadRequestError("Current amount cannot be negative");
    }

    const updateData: Partial<InsertSavingsGoal> = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.accountId !== undefined) updateData.accountId = data.accountId;
    if (data.targetAmount !== undefined) updateData.targetAmount = data.targetAmount.toString();
    if (data.currentAmount !== undefined) updateData.currentAmount = data.currentAmount.toString();
    if (data.targetDate !== undefined) updateData.targetDate = data.targetDate ? new Date(data.targetDate) : undefined;
    if (data.description !== undefined) updateData.description = data.description;

    return SavingsGoalRepository.update(id, updateData);
  }

  static async addToSavingsGoal(
    id: number,
    data: AddToGoalRequest,
    userId: number,
    organizationId?: number | null
  ): Promise<SavingsGoal> {
    const goal = await this.getSavingsGoalById(id, userId, organizationId);

    if (data.amount <= 0) {
      throw new BadRequestError("Amount must be greater than zero");
    }

    // If goal has linked account, update account balance
    if (goal.accountId) {
      const account = await AccountRepository.findById(goal.accountId);
      if (account) {
        const newBalance = Number(account.balance) + data.amount;
        await AccountRepository.updateBalance(goal.accountId, newBalance);
      }
    }

    // Also update currentAmount for backward compatibility
    const currentAmount = Number(goal.currentAmount);
    const newAmount = currentAmount + data.amount;
    
    return SavingsGoalRepository.update(id, {
      currentAmount: newAmount.toString(),
    });
  }

  static async deleteSavingsGoal(
    id: number,
    userId: number,
    organizationId?: number | null
  ): Promise<void> {
    // Verify goal exists and belongs to user/organization
    await this.getSavingsGoalById(id, userId, organizationId);
    
    await SavingsGoalRepository.delete(id);
  }

  static async getSavingsGoalsSummary(userId: number, organizationId?: number | null) {
    let goals: SavingsGoalWithAccount[];
    
    if (organizationId) {
      goals = await SavingsGoalRepository.findByOrganizationId(organizationId);
    } else {
      goals = await SavingsGoalRepository.findByUserId(userId);
    }
    
    const summary = {
      totalGoals: goals.length,
      totalTargetAmount: 0,
      totalCurrentAmount: 0,
      totalProgress: 0,
      completedGoals: 0,
      activeGoals: 0,
      overdue: 0,
    };

    const now = new Date();

    goals.forEach(goal => {
      const targetAmount = Number(goal.targetAmount);
      // Use account balance if available, otherwise use currentAmount
      const currentAmount = goal.accountBalance ? Number(goal.accountBalance) : Number(goal.currentAmount);
      const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
      
      summary.totalTargetAmount += targetAmount;
      summary.totalCurrentAmount += currentAmount;
      
      if (progress >= 100) {
        summary.completedGoals++;
      } else {
        summary.activeGoals++;
        
        // Check if overdue
        if (goal.targetDate && new Date(goal.targetDate) < now) {
          summary.overdue++;
        }
      }
    });

    summary.totalProgress = summary.totalTargetAmount > 0 
      ? (summary.totalCurrentAmount / summary.totalTargetAmount) * 100 
      : 0;

    return summary;
  }

  static async getGoalProgress(id: number, userId: number, organizationId?: number | null) {
    const goal = await this.getSavingsGoalById(id, userId, organizationId);
    
    const targetAmount = Number(goal.targetAmount);
    // Use account balance if available, otherwise use currentAmount
    const currentAmount = goal.accountBalance ? Number(goal.accountBalance) : Number(goal.currentAmount);
    const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
    
    const now = new Date();
    const targetDate = goal.targetDate ? new Date(goal.targetDate) : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // Default 1 year
    const daysRemaining = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    const remainingAmount = Math.max(0, targetAmount - currentAmount);
    const monthlyTarget = daysRemaining > 0 ? (remainingAmount / (daysRemaining / 30)) : 0;
    
    return {
      goalId: goal.id,
      progress: Math.min(100, progress),
      currentAmount,
      targetAmount,
      remainingAmount,
      daysRemaining: Math.max(0, daysRemaining),
      monthlyTarget,
      isCompleted: progress >= 100,
      isOverdue: daysRemaining < 0 && progress < 100,
      accountId: goal.accountId,
      accountName: goal.accountName,
      accountBank: goal.accountBank,
    };
  }
}