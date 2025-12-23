import { TransactionRepository } from "../repositories/transaction.repository.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { PlanAccessService } from "./plan-access.service.js";
import { 
  NotFoundError, 
  BadRequestError, 
  ForbiddenError 
} from "../../core/errors/app-error.js";
import type { Transaction, InsertTransaction } from "../../core/database/schema.js";

export interface CreateTransactionRequest {
  accountId: number;
  amount: number;
  type: 'receita' | 'despesa';
  category: string;
  description?: string;
  date: string;
  isRecurring?: boolean;
  recurringFrequency?: string;
  // Suporte para recibos
  receiptPath?: string;
  receiptMimeType?: string;
  receiptOriginalName?: string;
  receiptFileSize?: number;
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  type?: 'receita' | 'despesa';
  accountId?: number;
}

export class TransactionService {
  // Get transactions by organization (multi-tenant)
  static async getOrganizationTransactions(
    organizationId: number,
    filters?: TransactionFilters
  ): Promise<Transaction[]> {
    const parsedFilters = {
      startDate: filters?.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters?.endDate ? new Date(filters.endDate) : undefined,
      type: filters?.type,
      accountId: filters?.accountId,
    };

    return TransactionRepository.findByOrganizationId(organizationId, parsedFilters);
  }

  // Get transactions by organization or user (for migration period)
  static async getTransactions(
    organizationId: number | null,
    userId: number,
    filters?: TransactionFilters
  ): Promise<Transaction[]> {
    const parsedFilters = {
      startDate: filters?.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters?.endDate ? new Date(filters.endDate) : undefined,
      type: filters?.type,
      accountId: filters?.accountId,
    };

    return TransactionRepository.findByOrganizationOrUser(organizationId, userId, parsedFilters);
  }

  static async getUserTransactions(
    userId: number,
    filters?: TransactionFilters
  ): Promise<Transaction[]> {
    const parsedFilters = {
      startDate: filters?.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters?.endDate ? new Date(filters.endDate) : undefined,
      type: filters?.type,
      accountId: filters?.accountId,
    };

    return TransactionRepository.findByUserId(userId, parsedFilters);
  }

  static async getTransactionById(
    id: number,
    userId: number,
    organizationId?: number | null
  ): Promise<Transaction> {
    const transaction = await TransactionRepository.findById(id);
    
    if (!transaction) {
      throw new NotFoundError("Transaction");
    }
    
    // Check access by organization or user
    if (organizationId) {
      if (transaction.organizationId !== organizationId) {
        throw new ForbiddenError("Access denied to this transaction");
      }
    } else if (transaction.userId !== userId) {
      throw new ForbiddenError("Access denied to this transaction");
    }
    
    return transaction;
  }

  static async createTransaction(
    data: CreateTransactionRequest,
    userId: number,
    organizationId?: number | null
  ): Promise<Transaction> {
    // Verify account exists and belongs to user/organization
    const account = await AccountRepository.findById(data.accountId);
    
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

    // Check plan limits using PlanAccessService
    if (organizationId) {
      const canCreate = await PlanAccessService.canCreateTransaction(organizationId);
      if (!canCreate) {
        throw new BadRequestError("Limite de transações do mês atingido para o seu plano. Faça upgrade para continuar.");
      }
    } else {
      // Fallback to old logic for backward compatibility
      const user = await UserRepository.findById(userId);
      if (!user) {
        throw new NotFoundError("User");
      }

      const transactionCount = await TransactionRepository.countByUserId(userId);
      
      // Basic plan limit: 1000 transactions per month
      if (user.planType === 'basic' && transactionCount >= 1000) {
        throw new BadRequestError("Limite de transações atingido para o seu plano. Faça upgrade para continuar.");
      }
    }

    // Calculate balance before and after
    const currentBalance = Number(account.balance);
    const newBalance = data.type === 'receita'
      ? currentBalance + data.amount
      : currentBalance - data.amount;

    // Create transaction with balance info
    const transactionData: InsertTransaction = {
      userId,
      organizationId: organizationId || undefined,
      accountId: data.accountId,
      amount: data.amount.toString(),
      type: data.type,
      category: data.category,
      description: data.description,
      date: new Date(data.date),
      balanceBefore: currentBalance.toString(),
      balanceAfter: newBalance.toString(),
      isRecurring: data.isRecurring || false,
      recurringFrequency: data.recurringFrequency,
      // Adicionar dados do recibo se fornecidos
      receiptPath: data.receiptPath,
      receiptMimeType: data.receiptMimeType,
      receiptOriginalName: data.receiptOriginalName,
      receiptFileSize: data.receiptFileSize,
    };

    const transaction = await TransactionRepository.create(transactionData);

    // Update account balance
    await AccountRepository.updateBalance(account.id, newBalance);

    return transaction;
  }

  static async updateTransaction(
    id: number,
    data: Partial<CreateTransactionRequest>,
    userId: number,
    organizationId?: number | null
  ): Promise<Transaction> {
    const transaction = await this.getTransactionById(id, userId, organizationId);
    
    // If amount or type changed, update account balance
    if (data.amount !== undefined || data.type !== undefined) {
      const account = await AccountRepository.findById(transaction.accountId!);
      if (!account) {
        throw new NotFoundError("Account");
      }
      
      // Revert old transaction from balance
      const currentBalance = Number(account.balance);
      const oldAmount = Number(transaction.amount);
      const revertedBalance = transaction.type === 'receita'
        ? currentBalance - oldAmount
        : currentBalance + oldAmount;
      
      // Apply new transaction to balance
      const newAmount = data.amount !== undefined ? data.amount : oldAmount;
      const newType = data.type !== undefined ? data.type : transaction.type;
      const newBalance = newType === 'receita'
        ? revertedBalance + newAmount
        : revertedBalance - newAmount;
      
      await AccountRepository.updateBalance(account.id, newBalance);
    }

    // Update transaction
    const updateData: Partial<InsertTransaction> = {};
    
    if (data.amount !== undefined) updateData.amount = data.amount.toString();
    if (data.type !== undefined) updateData.type = data.type;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring;
    if (data.recurringFrequency !== undefined) updateData.recurringFrequency = data.recurringFrequency;
    // Atualizar dados do recibo se fornecidos
    if (data.receiptPath !== undefined) updateData.receiptPath = data.receiptPath;
    if (data.receiptMimeType !== undefined) updateData.receiptMimeType = data.receiptMimeType;
    if (data.receiptOriginalName !== undefined) updateData.receiptOriginalName = data.receiptOriginalName;
    if (data.receiptFileSize !== undefined) updateData.receiptFileSize = data.receiptFileSize;

    return TransactionRepository.update(id, updateData);
  }

  static async deleteTransaction(
    id: number,
    userId: number,
    organizationId?: number | null
  ): Promise<void> {
    const transaction = await this.getTransactionById(id, userId, organizationId);
    
    // Revert transaction from account balance
    const account = await AccountRepository.findById(transaction.accountId!);
    if (!account) {
      throw new NotFoundError("Account");
    }

    const currentBalance = Number(account.balance);
    const transactionAmount = Number(transaction.amount);
    const newBalance = transaction.type === 'receita'
      ? currentBalance - transactionAmount
      : currentBalance + transactionAmount;
    
    await AccountRepository.updateBalance(account.id, newBalance);
    await TransactionRepository.delete(id);
  }

  static async getTransactionSummary(
    userId: number,
    startDate?: string,
    endDate?: string,
    organizationId?: number | null
  ) {
    const parsedStartDate = startDate ? new Date(startDate) : undefined;
    const parsedEndDate = endDate ? new Date(endDate) : undefined;

    if (organizationId) {
      return TransactionRepository.getSummaryByOrganizationId(
        organizationId,
        parsedStartDate,
        parsedEndDate
      );
    }

    return TransactionRepository.getSummaryByUserId(
      userId,
      parsedStartDate,
      parsedEndDate
    );
  }
}