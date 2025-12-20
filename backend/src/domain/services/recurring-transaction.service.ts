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
  private static async shouldProcessTransaction(transaction: any, today: Date): Promise<boolean> {
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
  private static async createRecurringTransaction(originalTransaction: any): Promise<void> {
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
        return;
      }
    }

    // Criar nova transação
    const newTransaction: InsertTransaction = {
      userId: originalTransaction.userId,
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

    // Registrar execução
    await TransactionRepository.recordRecurringExecution(originalTransaction.id, new Date());

    logger.info(`Transação recorrente criada: ${createdTransaction.id} para transação pai: ${originalTransaction.id}`);
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

    while (currentDate <= endDate) {
      if (this.shouldProcessTransaction(transaction, currentDate)) {
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
   * Desativa uma transação recorrente
   */
  static async deactivateRecurringTransaction(userId: number, transactionId: number): Promise<void> {
    const transaction = await TransactionRepository.findById(transactionId);
    
    if (!transaction || transaction.userId !== userId) {
      throw new Error("Transação não encontrada");
    }

    await TransactionRepository.update(transactionId, {
      isRecurring: false,
      recurringFrequency: null
    });

    logger.info(`Transação recorrente desativada: ${transactionId}`);
  }
}