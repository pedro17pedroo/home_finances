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

export class AccountService {
  static async getUserAccounts(userId: number): Promise<Account[]> {
    return AccountRepository.findByUserId(userId);
  }

  static async getSavingsAccounts(userId: number): Promise<Account[]> {
    return AccountRepository.findByUserIdAndType(userId, 'poupanca');
  }

  static async getAccountById(
    id: number,
    userId: number
  ): Promise<Account> {
    const account = await AccountRepository.findById(id);
    
    if (!account) {
      throw new NotFoundError("Account");
    }
    
    if (account.userId !== userId) {
      throw new ForbiddenError("Access denied to this account");
    }
    
    return account;
  }

  static async createAccount(
    data: CreateAccountRequest,
    userId: number
  ): Promise<Account> {
    // Check plan limits
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User");
    }

    const accountCount = await AccountRepository.countByUserId(userId);
    
    // Basic plan limit: 5 accounts
    if (user.planType === 'basic' && accountCount >= 5) {
      throw new BadRequestError("Account limit reached for your plan. Upgrade to continue.");
    }

    // Premium plan limit: 20 accounts
    if (user.planType === 'premium' && accountCount >= 20) {
      throw new BadRequestError("Account limit reached for your plan. Upgrade to continue.");
    }

    // Validate interest rate for savings accounts
    if (data.type === 'poupanca' && data.interestRate !== undefined) {
      if (data.interestRate < 0 || data.interestRate > 100) {
        throw new BadRequestError("Interest rate must be between 0 and 100");
      }
    }

    const accountData: InsertAccount = {
      userId,
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
    userId: number
  ): Promise<Account> {
    // Verify account exists and belongs to user
    await this.getAccountById(id, userId);

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
    userId: number
  ): Promise<void> {
    const account = await this.getAccountById(id, userId);
    
    // Check if account has balance
    const balance = Number(account.balance);
    if (balance !== 0) {
      throw new BadRequestError("Cannot delete account with non-zero balance");
    }

    // Check if account has transactions (should be handled by foreign key constraints)
    // This is a business rule - we might want to allow deletion and cascade
    
    await AccountRepository.delete(id);
  }

  static async getAccountSummary(userId: number) {
    const accounts = await AccountRepository.findByUserId(userId);
    
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