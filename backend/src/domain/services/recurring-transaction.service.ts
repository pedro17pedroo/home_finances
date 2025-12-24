import { TransactionRepository } from "../repositories/transaction.repository.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { logger } from "../../core/utils/logger.js";
import type { InsertTransaction } from "../../core/database/schema.js";

export interface RecurringTransactionConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  dayOfMonth?: number; // Para monthly (1-31)
  dayOfWeek?: number; // Para weekly (0-6, 0=domingo)
  endDate?: Date;
  maxOccurrences?: number;
}

export class RecurringTransactionService {
  /**
   * Processa todas as transações recorrentes que devem ser executadas hoje
   */
  static async processRecurringTransactions(): Promise<void> {
    try {
      logger.info("Iniciando processamento de transações recorrentes");
      
      const recurringTransactions = await TransactionRepository.findRecurring();
      const today = new Date();
      let processedCount = 0;

      for (const transaction of recurringTransactions) {
        try {
          const shouldProcess = await this.shouldProcessTransaction(transaction, today);
          
          if (shouldProcess) {
            await this.createRecurringTransaction(transaction);
            processedCount++;
            logger.info(`Transação recorrente processada: ${transaction.id}`);
          }
        } catch (error) {
          logger.error(`Erro ao processar transação recorrente ${transaction.id}:`, error);
        }
      }

      logger.info(`Processamento concluído: ${processedCount} transações criadas`);
    } catch (error) {
      logger.error("Erro no processamento de transações recorrentes:", error);
    }
  }

  /**
   * Verifica se uma transação recorrente deve ser processada hoje
   */
  static async shouldProcessTransaction(transaction: any, today: Date): Promise<boolean> {
    if (!transaction.isRecurring || !transaction.recurringFrequency) {
      return false;
    }

    // Verificar se já foi processada hoje
    const lastProcessed = await TransactionRepository.getLastRecurringExecution(transaction.id);
    if (lastProcessed && this.isSameDay(new Date(lastProcessed), today)) {
      return false;
    }

    const frequency = transaction.recurringFrequency;
    const transactionDate = new Date(transaction.date);

    switch (frequency) {
      case 'daily':
        return this.shouldProcessDaily(transactionDate, today);
      
      case 'weekly':
        return this.shouldProcessWeekly(transactionDate, today);
      
      case 'monthly':
        return this.shouldProcessMonthly(transactionDate, today);
      
      case 'yearly':
        return this.shouldProcessYearly(transactionDate, today);
      
      default:
        return false;
    }
  }

  private static shouldProcessDaily(originalDate: Date, today: Date): boolean {
    return today >= originalDate;
  }

  private static shouldProcessWeekly(originalDate: Date, today: Date): boolean {
    if (today < originalDate) return false;
    
    const daysDiff = Math.floor((today.getTime() - originalDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff % 7 === 0;
  }

  private static shouldProcessMonthly(originalDate: Date, today: Date): boolean {
    if (today < originalDate) return false;
    
    const originalDay = originalDate.getDate();
    const todayDay = today.getDate();
    
    // Processar no mesmo dia do mês
    return todayDay === originalDay || 
           (originalDay > 28 && todayDay === this.getLastDayOfMonth(today));
  }

  private static shouldProcessYearly(originalDate: Date, today: Date): boolean {
    if (today < originalDate) return false;
    
    return originalDate.getMonth() === today.getMonth() && 
           originalDate.getDate() === today.getDate();
  }

  private static getLastDayOfMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  private static isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  /**
   * Cria uma nova transação baseada na recorrente
   */
  private static async createRecurringTransaction(originalTransaction: any): Promise<any> {
    const account = await AccountRepository.findById(originalTransaction.accountId);
    if (!account) {
      throw new Error(`Conta não encontrada: ${originalTransaction.accountId}`);
    }

    // Verificar saldo para despesas
    if (originalTransaction.type === 'despesa') {
      const currentBalance = parseFloat(account.balance);
      const amount = parseFloat(originalTransaction.amount);
      
      if (currentBalance < amount) {
        logger.warn(`Saldo insuficiente para transação recorrente ${originalTransaction.id}`);
        return null;
      }
    }

    // Criar nova transação
    const newTransaction: InsertTransaction = {
      userId: originalTransaction.userId,
      organizationId: originalTransaction.organizationId,
      accountId: originalTransaction.accountId,
      amount: originalTransaction.amount,
      description: `${originalTransaction.description} (Recorrente)`,
      category: originalTransaction.category,
      type: originalTransaction.type,
      date: new Date(),
      isRecurring: false, // A nova transação não é recorrente
      recurringFrequency: null,
      recurringParentId: originalTransaction.id
    };

    const createdTransaction = await TransactionRepository.create(newTransaction);

    // Atualizar saldo da conta
    const currentBalance = parseFloat(account.balance);
    const amount = parseFloat(originalTransaction.amount);
    const newBalance = originalTransaction.type === 'receita' 
      ? currentBalance + amount 
      : currentBalance - amount;

    await AccountRepository.updateBalance(originalTransaction.accountId, newBalance);

    logger.info(`Transação recorrente criada: ${createdTransaction.id} para transação pai: ${originalTransaction.id}`);
    
    return createdTransaction;
  }

  /**
   * Obtém próximas execuções de transações recorrentes
   */
  static async getUpcomingRecurringTransactions(userId: number, days: number = 30) {
    const recurringTransactions = await TransactionRepository.findRecurringByUserId(userId);
    const upcoming = [];
    const today = new Date();

    for (const transaction of recurringTransactions) {
      const nextExecutions = this.getNextExecutions(transaction, today, days);
      upcoming.push(...nextExecutions);
    }

    return upcoming.sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());
  }

  private static getNextExecutions(transaction: any, fromDate: Date, days: number) {
    const executions = [];
    const frequency = transaction.recurringFrequency;
    let currentDate = new Date(fromDate);
    const endDate = new Date(fromDate.getTime() + (days * 24 * 60 * 60 * 1000));
    const transactionDate = new Date(transaction.date);

    while (currentDate <= endDate) {
      // Simple check without async - just check if the date matches the frequency pattern
      let shouldAdd = false;
      
      if (transaction.isRecurring && frequency) {
        switch (frequency) {
          case 'daily':
            shouldAdd = currentDate >= transactionDate;
            break;
          case 'weekly':
            if (currentDate >= transactionDate) {
              const daysDiff = Math.floor((currentDate.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24));
              shouldAdd = daysDiff % 7 === 0;
            }
            break;
          case 'monthly':
            if (currentDate >= transactionDate) {
              shouldAdd = currentDate.getDate() === transactionDate.getDate();
            }
            break;
          case 'yearly':
            if (currentDate >= transactionDate) {
              shouldAdd = currentDate.getMonth() === transactionDate.getMonth() && 
                         currentDate.getDate() === transactionDate.getDate();
            }
            break;
        }
      }

      if (shouldAdd) {
        executions.push({
          transactionId: transaction.id,
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.type,
          category: transaction.category,
          frequency,
          nextDate: new Date(currentDate)
        });
      }

      // Avançar para próxima verificação
      switch (frequency) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'yearly':
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
      }
    }

    return executions;
  }

  /**
   * Calcula a próxima execução de uma transação recorrente
   */
  static calculateNextExecution(transaction: any): string {
    if (!transaction.isRecurring || !transaction.recurringFrequency) {
      return new Date().toISOString();
    }

    const frequency = transaction.recurringFrequency;
    const transactionDate = new Date(transaction.date);
    const today = new Date();
    let nextDate = new Date(transactionDate);

    // Avançar até encontrar a próxima data futura
    while (nextDate <= today) {
      switch (frequency) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case 'yearly':
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
      }
    }

    return nextDate.toISOString();
  }

  /**
   * Conta quantas vezes uma transação recorrente foi executada
   */
  static async getExecutionCount(transactionId: number): Promise<number> {
    const lastExecution = await TransactionRepository.getLastRecurringExecution(transactionId);
    if (!lastExecution) return 0;
    
    // Contar transações filhas
    const transaction = await TransactionRepository.findById(transactionId);
    if (!transaction) return 0;
    
    const startDate = new Date(transaction.date);
    const today = new Date();
    const frequency = transaction.recurringFrequency;
    
    if (!frequency) return 0;
    
    const diffTime = today.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    switch (frequency) {
      case 'daily':
        return Math.max(0, diffDays);
      case 'weekly':
        return Math.max(0, Math.floor(diffDays / 7));
      case 'monthly':
        return Math.max(0, Math.floor(diffDays / 30));
      case 'yearly':
        return Math.max(0, Math.floor(diffDays / 365));
      default:
        return 0;
    }
  }

  /**
   * Ativa uma transação recorrente
   */
  static async activateRecurringTransaction(userId: number, transactionId: number): Promise<void> {
    const transaction = await TransactionRepository.findById(transactionId);
    
    if (!transaction || transaction.userId !== userId) {
      throw new Error("Transação não encontrada");
    }

    await TransactionRepository.update(transactionId, {
      isRecurring: true,
    });

    logger.info(`Transação recorrente ativada: ${transactionId}`);
  }

  /**
   * Desativa uma transação recorrente
   */
  static async deactivateRecurringTransaction(userId: number, transactionId: number): Promise<void> {
    const transaction = await TransactionRepository.findById(transactionId);
    
    if (!transaction || transaction.userId !== userId) {
      throw new Error("Transação não encontrada");
    }

    await TransactionRepository.update(transactionId, {
      isRecurring: false,
    });

    logger.info(`Transação recorrente desativada: ${transactionId}`);
  }

  /**
   * Executa uma transação recorrente imediatamente
   */
  static async executeRecurringTransactionNow(userId: number, transactionId: number): Promise<any> {
    const transaction = await TransactionRepository.findById(transactionId);
    
    if (!transaction || transaction.userId !== userId) {
      throw new Error("Transação não encontrada");
    }

    if (!transaction.isRecurring) {
      throw new Error("Transação não é recorrente");
    }

    const newTransaction = await this.createRecurringTransaction(transaction);
    
    if (!newTransaction) {
      throw new Error("Saldo insuficiente para executar a transação");
    }

    return newTransaction;
  }
}