import { AccountRepository } from "../repositories/account.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { 
  NotFoundError, 
  BadRequestError, 
  ForbiddenError 
} from "../../core/errors/app-error.js";
import type { Account, InsertAccount } from "../../core/database/schema.js";

export interface CreateAccountRequest {
  name: string;
  type: 'corrente' | 'poupanca';
  bank: string;
  balance: number;
  interestRate?: number;
}

export interface UpdateAccountRequest {
  name?: string;
  type?: 'corrente' | 'poupanca';
  bank?: string;
  interestRate?: number;
}

export interface AccountContext {
  userId: number;
  organizationId?: number | null;
}

export class AccountService {
  // Get accounts by organization (preferred) or user (fallback)
  static async getAccounts(ctx: AccountContext): Promise<Account[]> {
    if (ctx.organizationId) {
      return AccountRepository.findByOrganizationId(ctx.organizationId);
    }
    return AccountRepository.findByUserId(ctx.userId);
  }

  // Legacy method for backward compatibility
  static async getUserAccounts(userId: number): Promise<Account[]> {
    return AccountRepository.findByUserId(userId);
  }

  // Get savings accounts by organization or user
  static async getSavingsAccounts(userId: number, organizationId?: number | null): Promise<Account[]> {
    if (organizationId) {
      return AccountRepository.findByOrganizationIdAndType(organizationId, 'poupanca');
    }
    return AccountRepository.findByUserIdAndType(userId, 'poupanca');
  }

  static async getAccountById(
    id: number,
    userId: number,
    organizationId?: number | null
  ): Promise<Account> {
    const account = await AccountRepository.findById(id);
    
    if (!account) {
      throw new NotFoundError("Account");
    }
    
    // Check access: either by organization or by user
    if (organizationId) {
      if (account.organizationId !== organizationId) {
        throw new ForbiddenError("Access denied to this account");
      }
    } else {
      if (account.userId !== userId) {
        throw new ForbiddenError("Access denied to this account");
      }
    }
    
    return account;
  }

  static async createAccount(
    data: CreateAccountRequest,
    userId: number,
    organizationId?: number | null
  ): Promise<Account> {
    // Check plan limits using dynamic plan access service
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User");
    }

    // Count accounts by organization or user
    const accountCount = organizationId 
      ? await AccountRepository.countByOrganizationId(organizationId)
      : await AccountRepository.countByUserId(userId);
    
    // Use plan access service for dynamic limits
    const { planAccessService } = await import('./plan-access.service.js');
    const accessCheck = await planAccessService.canCreateAccount(userId, accountCount);
    
    if (!accessCheck.allowed) {
      throw new BadRequestError(accessCheck.reason || "Limite de contas atingido para o seu plano. Faça upgrade para continuar.");
    }

    // Validate interest rate for savings accounts
    if (data.type === 'poupanca' && data.interestRate !== undefined) {
      if (data.interestRate < 0 || data.interestRate > 100) {
        throw new BadRequestError("Interest rate must be between 0 and 100");
      }
    }

    const accountData: InsertAccount = {
      userId,
      organizationId: organizationId || user.organizationId || undefined,
      name: data.name,
      type: data.type,
      bank: data.bank,
      balance: data.balance.toString(),
      interestRate: data.interestRate?.toString(),
    };

    return AccountRepository.create(accountData);
  }

  static async updateAccount(
    id: number,
    data: UpdateAccountRequest,
    userId: number,
    organizationId?: number | null
  ): Promise<Account> {
    // Verify account exists and user has access
    await this.getAccountById(id, userId, organizationId);

    // Validate interest rate for savings accounts
    if (data.interestRate !== undefined) {
      if (data.interestRate < 0 || data.interestRate > 100) {
        throw new BadRequestError("Interest rate must be between 0 and 100");
      }
    }

    const updateData: Partial<InsertAccount> = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.bank !== undefined) updateData.bank = data.bank;
    if (data.interestRate !== undefined) updateData.interestRate = data.interestRate.toString();

    return AccountRepository.update(id, updateData);
  }

  static async deleteAccount(
    id: number,
    userId: number,
    organizationId?: number | null
  ): Promise<void> {
    const account = await this.getAccountById(id, userId, organizationId);
    
    // Check if account has balance
    const balance = Number(account.balance);
    if (balance !== 0) {
      throw new BadRequestError("Não é possível eliminar conta com saldo diferente de zero. Transfira ou ajuste o saldo primeiro.");
    }
    
    // Check if account has transactions
    const { TransactionRepository } = await import("../repositories/transaction.repository.js");
    const transactions = await TransactionRepository.findByUserId(userId, { accountId: id });
    if (transactions.length > 0) {
      throw new BadRequestError(`Esta conta possui ${transactions.length} transação(ões) associada(s). Elimine as transações primeiro ou transfira-as para outra conta.`);
    }
    
    // Check if account is linked to savings goals
    const { SavingsGoalRepository } = await import("../repositories/savings-goal.repository.js");
    const goals = organizationId 
      ? await SavingsGoalRepository.findByOrganizationId(organizationId)
      : await SavingsGoalRepository.findByUserId(userId);
    const linkedGoals = goals.filter(g => g.accountId === id);
    if (linkedGoals.length > 0) {
      throw new BadRequestError(`Esta conta está vinculada a ${linkedGoals.length} meta(s) de poupança. Desvincule as metas primeiro.`);
    }
    
    await AccountRepository.delete(id);
  }

  static async getAccountSummary(userId: number, organizationId?: number | null) {
    const accounts = organizationId 
      ? await AccountRepository.findByOrganizationId(organizationId)
      : await AccountRepository.findByUserId(userId);
    
    const summary = {
      totalAccounts: accounts.length,
      totalBalance: 0,
      savingsBalance: 0,
      currentBalance: 0,
      accountsByType: {
        corrente: 0,
        poupanca: 0,
      },
    };

    accounts.forEach(account => {
      const balance = Number(account.balance);
      summary.totalBalance += balance;
      
      if (account.type === 'poupanca') {
        summary.savingsBalance += balance;
        summary.accountsByType.poupanca++;
      } else {
        summary.currentBalance += balance;
        summary.accountsByType.corrente++;
      }
    });

    return summary;
  }
}