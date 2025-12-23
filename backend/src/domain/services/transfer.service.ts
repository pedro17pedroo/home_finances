import { TransferRepository } from "../repositories/transfer.repository.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { PlanAccessService } from "./plan-access.service.js";
import { 
  NotFoundError, 
  BadRequestError, 
  ForbiddenError 
} from "../../core/errors/app-error.js";
import type { Transfer, InsertTransfer } from "../../core/database/schema.js";

export interface CreateTransferRequest {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  description?: string;
}

export interface TransferFilters {
  startDate?: string;
  endDate?: string;
  accountId?: number; // Show transfers involving this account
}

export class TransferService {
  static async getUserTransfers(
    userId: number,
    filters?: TransferFilters
  ): Promise<Transfer[]> {
    const parsedFilters = {
      startDate: filters?.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters?.endDate ? new Date(filters.endDate) : undefined,
      accountId: filters?.accountId,
    };

    return TransferRepository.findByUserId(userId, parsedFilters);
  }

  static async getOrganizationTransfers(
    organizationId: number,
    filters?: TransferFilters
  ): Promise<Transfer[]> {
    const parsedFilters = {
      startDate: filters?.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters?.endDate ? new Date(filters.endDate) : undefined,
      accountId: filters?.accountId,
    };

    return TransferRepository.findByOrganizationId(organizationId, parsedFilters);
  }

  static async getTransfers(
    organizationId: number | null,
    userId: number,
    filters?: TransferFilters
  ): Promise<Transfer[]> {
    const parsedFilters = {
      startDate: filters?.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters?.endDate ? new Date(filters.endDate) : undefined,
      accountId: filters?.accountId,
    };

    return TransferRepository.findByOrganizationOrUser(organizationId, userId, parsedFilters);
  }

  static async getTransferById(
    id: number,
    userId: number,
    organizationId?: number | null
  ): Promise<Transfer> {
    const transfer = await TransferRepository.findById(id);
    
    if (!transfer) {
      throw new NotFoundError("Transfer");
    }
    
    // Check access by organization or user
    if (organizationId) {
      if (transfer.organizationId !== organizationId) {
        throw new ForbiddenError("Access denied to this transfer");
      }
    } else if (transfer.userId !== userId) {
      throw new ForbiddenError("Access denied to this transfer");
    }
    
    return transfer;
  }

  static async createTransfer(
    data: CreateTransferRequest,
    userId: number,
    organizationId?: number | null
  ): Promise<Transfer> {
    const { fromAccountId, toAccountId, amount, description } = data;

    // Validate amount
    if (amount <= 0) {
      throw new BadRequestError("Transfer amount must be greater than zero");
    }

    // Validate accounts are different
    if (fromAccountId === toAccountId) {
      throw new BadRequestError("Cannot transfer to the same account");
    }

    // Verify both accounts exist and belong to user/organization
    const fromAccount = await AccountRepository.findById(fromAccountId);
    const toAccount = await AccountRepository.findById(toAccountId);

    if (!fromAccount) {
      throw new NotFoundError("Source account not found");
    }
    if (!toAccount) {
      throw new NotFoundError("Destination account not found");
    }

    // Check access by organization or user
    if (organizationId) {
      if (fromAccount.organizationId !== organizationId) {
        throw new ForbiddenError("Access denied to source account");
      }
      if (toAccount.organizationId !== organizationId) {
        throw new ForbiddenError("Access denied to destination account");
      }
    } else {
      if (fromAccount.userId !== userId) {
        throw new ForbiddenError("Access denied to source account");
      }
      if (toAccount.userId !== userId) {
        throw new ForbiddenError("Access denied to destination account");
      }
    }

    // Check if source account has sufficient balance
    const fromBalance = Number(fromAccount.balance);
    if (fromBalance < amount) {
      throw new BadRequestError("Insufficient balance in source account");
    }

    // Check plan limits
    if (organizationId) {
      // Use PlanAccessService for organization-based limits
      const accessInfo = await PlanAccessService.getAccessInfo(organizationId);
      const transferCount = await TransferRepository.countByOrganizationId(organizationId);
      
      // Check based on plan type
      if (accessInfo.planType === 'basic' && transferCount >= 50) {
        throw new BadRequestError("Limite de transferências atingido para o seu plano. Faça upgrade para continuar.");
      }
      if (accessInfo.planType === 'premium' && transferCount >= 500) {
        throw new BadRequestError("Limite de transferências atingido para o seu plano. Faça upgrade para continuar.");
      }
    } else {
      // Fallback to old logic for backward compatibility
      const user = await UserRepository.findById(userId);
      if (!user) {
        throw new NotFoundError("User");
      }

      const transferCount = await TransferRepository.countByUserId(userId);
      
      // Basic plan limit: 50 transfers per month
      if (user.planType === 'basic' && transferCount >= 50) {
        throw new BadRequestError("Limite de transferências atingido para o seu plano. Faça upgrade para continuar.");
      }

      // Premium plan limit: 500 transfers per month
      if (user.planType === 'premium' && transferCount >= 500) {
        throw new BadRequestError("Limite de transferências atingido para o seu plano. Faça upgrade para continuar.");
      }
    }

    // Create transfer record
    const transferData: InsertTransfer = {
      userId,
      organizationId: organizationId || undefined,
      fromAccountId,
      toAccountId,
      amount: amount.toString(),
      description,
      date: new Date(),
    };

    const transfer = await TransferRepository.create(transferData);

    // Update account balances
    const newFromBalance = fromBalance - amount;
    const newToBalance = Number(toAccount.balance) + amount;

    await Promise.all([
      AccountRepository.updateBalance(fromAccountId, newFromBalance),
      AccountRepository.updateBalance(toAccountId, newToBalance),
    ]);

    return transfer;
  }

  static async deleteTransfer(
    id: number,
    userId: number,
    organizationId?: number | null
  ): Promise<void> {
    const transfer = await this.getTransferById(id, userId, organizationId);
    
    // Verify accounts still exist
    const fromAccount = await AccountRepository.findById(transfer.fromAccountId);
    const toAccount = await AccountRepository.findById(transfer.toAccountId);

    if (!fromAccount || !toAccount) {
      throw new BadRequestError("Cannot reverse transfer: one or both accounts no longer exist");
    }

    // Reverse the transfer by updating balances
    const transferAmount = Number(transfer.amount);
    const currentFromBalance = Number(fromAccount.balance);
    const currentToBalance = Number(toAccount.balance);

    // Check if destination account has sufficient balance to reverse
    if (currentToBalance < transferAmount) {
      throw new BadRequestError("Cannot reverse transfer: insufficient balance in destination account");
    }

    const newFromBalance = currentFromBalance + transferAmount;
    const newToBalance = currentToBalance - transferAmount;

    // Update balances and delete transfer
    await Promise.all([
      AccountRepository.updateBalance(transfer.fromAccountId, newFromBalance),
      AccountRepository.updateBalance(transfer.toAccountId, newToBalance),
      TransferRepository.delete(id),
    ]);
  }

  static async getTransferSummary(userId: number, organizationId?: number | null) {
    let transfers: Transfer[];
    
    if (organizationId) {
      transfers = await TransferRepository.findByOrganizationId(organizationId);
    } else {
      transfers = await TransferRepository.findByUserId(userId);
    }
    
    const summary = {
      totalTransfers: transfers.length,
      totalAmount: 0,
      thisMonth: 0,
      thisMonthAmount: 0,
    };

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    transfers.forEach(transfer => {
      const amount = Number(transfer.amount);
      summary.totalAmount += amount;
      
      const transferDate = new Date(transfer.createdAt);
      if (transferDate.getMonth() === currentMonth && transferDate.getFullYear() === currentYear) {
        summary.thisMonth++;
        summary.thisMonthAmount += amount;
      }
    });

    return summary;
  }

  static async getAccountTransferHistory(
    accountId: number,
    userId: number,
    organizationId?: number | null
  ): Promise<Transfer[]> {
    // Verify account belongs to user/organization
    const account = await AccountRepository.findById(accountId);
    if (!account) {
      throw new NotFoundError("Account");
    }
    
    // Check access by organization or user
    if (organizationId) {
      if (account.organizationId !== organizationId) {
        throw new ForbiddenError("Access denied to this account");
      }
    } else if (account.userId !== userId) {
      throw new ForbiddenError("Access denied to this account");
    }

    return TransferRepository.findByAccountId(accountId);
  }
}