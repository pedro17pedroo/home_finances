import { SavingsGoalRepository } from "../repositories/savings-goal.repository.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { 
  NotFoundError, 
  BadRequestError, 
  ForbiddenError 
} from "../../core/errors/app-error.js";
import type { SavingsGoal, InsertSavingsGoal } from "../../core/database/schema.js";

export interface CreateSavingsGoalRequest {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate: string;
  description?: string;
}

export interface UpdateSavingsGoalRequest {
  name?: string;
  targetAmount?: number;
  currentAmount?: number;
  targetDate?: string;
  description?: string;
}

export interface AddToGoalRequest {
  amount: number;
  description?: string;
}

export class SavingsGoalService {
  static async getUserSavingsGoals(userId: number): Promise<SavingsGoal[]> {
    return SavingsGoalRepository.findByUserId(userId);
  }

  static async getSavingsGoalById(
    id: number,
    userId: number
  ): Promise<SavingsGoal> {
    const goal = await SavingsGoalRepository.findById(id);
    
    if (!goal) {
      throw new NotFoundError("Savings Goal");
    }
    
    if (goal.userId !== userId) {
      throw new ForbiddenError("Access denied to this savings goal");
    }
    
    return goal;
  }

  static async createSavingsGoal(
    data: CreateSavingsGoalRequest,
    userId: number
  ): Promise<SavingsGoal> {
    // Check plan limits
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User");
    }

    const goalCount = await SavingsGoalRepository.countByUserId(userId);
    
    // Basic plan limit: 3 savings goals
    if (user.planType === 'basic' && goalCount >= 3) {
      throw new BadRequestError("Savings goal limit reached for your plan. Upgrade to continue.");
    }

    // Premium plan limit: 15 savings goals
    if (user.planType === 'premium' && goalCount >= 15) {
      throw new BadRequestError("Savings goal limit reached for your plan. Upgrade to continue.");
    }

    // Validate target date is in the future
    const targetDate = new Date(data.targetDate);
    if (targetDate <= new Date()) {
      throw new BadRequestError("Target date must be in the future");
    }

    // Validate target amount is positive
    if (data.targetAmount <= 0) {
      throw new BadRequestError("Target amount must be greater than zero");
    }

    // Validate current amount if provided
    if (data.currentAmount !== undefined && data.currentAmount < 0) {
      throw new BadRequestError("Current amount cannot be negative");
    }



    const goalData: InsertSavingsGoal = {
      userId,
      name: data.name,
      targetAmount: data.targetAmount.toString(),
      currentAmount: (data.currentAmount || 0).toString(),
      targetDate,
      description: data.description,
    };

    return SavingsGoalRepository.create(goalData);
  }

  static async updateSavingsGoal(
    id: number,
    data: UpdateSavingsGoalRequest,
    userId: number
  ): Promise<SavingsGoal> {
    // Verify goal exists and belongs to user
    await this.getSavingsGoalById(id, userId);

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
    if (data.targetAmount !== undefined) updateData.targetAmount = data.targetAmount.toString();
    if (data.currentAmount !== undefined) updateData.currentAmount = data.currentAmount.toString();
    if (data.targetDate !== undefined) updateData.targetDate = new Date(data.targetDate);
    if (data.description !== undefined) updateData.description = data.description;

    return SavingsGoalRepository.update(id, updateData);
  }

  static async addToSavingsGoal(
    id: number,
    data: AddToGoalRequest,
    userId: number
  ): Promise<SavingsGoal> {
    const goal = await this.getSavingsGoalById(id, userId);

    if (data.amount <= 0) {
      throw new BadRequestError("Amount must be greater than zero");
    }

    const currentAmount = Number(goal.currentAmount);
    const newAmount = currentAmount + data.amount;
    
    return SavingsGoalRepository.update(id, {
      currentAmount: newAmount.toString(),
    });
  }

  static async deleteSavingsGoal(
    id: number,
    userId: number
  ): Promise<void> {
    // Verify goal exists and belongs to user
    await this.getSavingsGoalById(id, userId);
    
    await SavingsGoalRepository.delete(id);
  }

  static async getSavingsGoalsSummary(userId: number) {
    const goals = await SavingsGoalRepository.findByUserId(userId);
    
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
      const currentAmount = Number(goal.currentAmount);
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

  static async getGoalProgress(id: number, userId: number) {
    const goal = await this.getSavingsGoalById(id, userId);
    
    const targetAmount = Number(goal.targetAmount);
    const currentAmount = Number(goal.currentAmount);
    const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
    
    const now = new Date();
    const targetDate = new Date(goal.targetDate);
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
    };
  }
}