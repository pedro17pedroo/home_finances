import { TransactionRepository } from "../repositories/transaction.repository.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
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
    userId: number
  ): Promise<Transaction> {
    const transaction = await TransactionRepository.findById(id);
    
    if (!transaction) {
      throw new NotFoundError("Transaction");
    }
    
    if (transaction.userId !== userId) {
      throw new ForbiddenError("Access denied to this transaction");
    }
    
    return transaction;
  }

  static async createTransaction(
    data: CreateTransactionRequest,
    userId: number
  ): Promise<Transaction> {
    // Verify account exists and belongs to user
    const account = await AccountRepository.findById(data.accountId);
    
    if (!account) {
      throw new NotFoundError("Account");
    }
    
    if (account.userId !== userId) {
      throw new ForbiddenError("Access denied to this account");
    }

    // Check plan limits
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User");
    }

    const transactionCount = await TransactionRepository.countByUserId(userId);
    
    // Basic plan limit: 1000 transactions per month
    if (user.planType === 'basic' && transactionCount >= 1000) {
      throw new BadRequestError("Transaction limit reached for your plan. Upgrade to continue.");
    }

    // Create transaction
    const transactionData: InsertTransaction = {
      userId,
      accountId: data.accountId,
      amount: data.amount.toString(),
      type: data.type,
      category: data.category,
      description: data.description,
      date: new Date(data.date),
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
    const currentBalance = Number(account.balance);
    const newBalance = data.type === 'receita'
      ? currentBalance + data.amount
      : currentBalance - data.amount;
    
    await AccountRepository.updateBalance(account.id, newBalance);

    return transaction;
  }

  static async updateTransaction(
    id: number,
    data: Partial<CreateTransactionRequest>,
    userId: number
  ): Promise<Transaction> {
    const transaction = await this.getTransactionById(id, userId);
    
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
    userId: number
  ): Promise<void> {
    const transaction = await this.getTransactionById(id, userId);
    
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
    endDate?: string
  ) {
    const parsedStartDate = startDate ? new Date(startDate) : undefined;
    const parsedEndDate = endDate ? new Date(endDate) : undefined;

    return TransactionRepository.getSummaryByUserId(
      userId,
      parsedStartDate,
      parsedEndDate
    );
  }
}