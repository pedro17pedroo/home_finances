import { TransactionRepository } from "../repositories/transaction.repository.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { logger } from "../../core/utils/logger.js";
import { NotificationService } from "./notification.service.js";
import { db } from "../../core/database/db.js";
import { sql } from "drizzle-orm";
import type { InsertTransaction } from "../../core/database/schema.js";

export interface RecurringTransactionConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  dayOfMonth?: number;
  dayOfWeek?: number;
  monthOfYear?: number;
  startDate: Date;
  endDate?: Date;
  maxOccurrences?: number;
  notifyBeforeDays?: number;
  notificationChannels?: ('app' | 'email' | 'sms')[];
}

export interface RecurringTransaction {
  id: number;
  userId: number;
  organizationId: number | null;
  accountId: number;
  type: 'receita' | 'despesa';
  description: string;
  amount: string;
  category: string;
  frequency: string;
  interval: number;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  monthOfYear: number | null;
  startDate: Date;
  endDate: Date | null;
  nextExecutionDate: Date;
  lastExecutionDate: Date | null;
  isActive: boolean;
  maxOccurrences: number | null;
  executionCount: number;
  notifyBeforeDays: number;
  notificationChannels: string[];
  lastNotificationSent: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class RecurringTransactionService {
  static async createRecurringTransaction(
    userId: number,
    organizationId: number | null,
    accountId: number,
    type: 'receita' | 'despesa',
    description: string,
    amount: string,
    category: string,
    config: RecurringTransactionConfig
  ): Promise<RecurringTransaction> {
    try {
      const nextExecutionDate = this.calculateNextExecutionDate(config.startDate, config);

      const result = await db.execute(sql`
        INSERT INTO recurring_transactions (
          user_id, organization_id, account_id, type, description, amount, category,
          frequency, interval, day_of_week, day_of_month, month_of_year,
          start_date, end_date, next_execution_date, max_occurrences,
          notify_before_days, notification_channels, is_active
        ) VALUES (
          ${userId}, ${organizationId}, ${accountId}, ${type}, ${description}, ${amount}, ${category},
          ${config.frequency}, ${config.interval || 1}, ${config.dayOfWeek || null}, 
          ${config.dayOfMonth || null}, ${config.monthOfYear || null},
          ${config.startDate}, ${config.endDate || null}, ${nextExecutionDate}, ${config.maxOccurrences || null},
          ${config.notifyBeforeDays || 1}, ${JSON.stringify(config.notificationChannels || ['app'])}, true
        )
        RETURNING *
      `);

      const row: any = result.rows[0];
      
      logger.info(`Transação recorrente criada: ${row.id}`);
      
      // Map snake_case to camelCase
      return {
        id: row.id,
        userId: row.user_id,
        organizationId: row.organization_id,
        accountId: row.account_id,
        type: row.type,
        description: row.description,
        amount: row.amount,
        category: row.category,
        frequency: row.frequency,
        interval: row.interval,
        dayOfWeek: row.day_of_week,
        dayOfMonth: row.day_of_month,
        monthOfYear: row.month_of_year,
        startDate: row.start_date,
        endDate: row.end_date,
        nextExecutionDate: row.next_execution_date,
        lastExecutionDate: row.last_execution_date,
        isActive: row.is_active,
        maxOccurrences: row.max_occurrences,
        executionCount: row.execution_count,
        notifyBeforeDays: row.notify_before_days,
        notificationChannels: typeof row.notification_channels === 'string' 
          ? JSON.parse(row.notification_channels) 
          : row.notification_channels,
        lastNotificationSent: row.last_notification_sent,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      } as RecurringTransaction;
    } catch (error) {
      logger.error("Erro ao criar transação recorrente:", error);
      throw error;
    }
  }

  static async updateRecurringTransaction(
    id: number,
    userId: number,
    updates: Partial<RecurringTransactionConfig> & { description?: string; amount?: string; category?: string }
  ): Promise<RecurringTransaction> {
    try {
      const existing = await this.getRecurringTransactionById(id, userId);
      if (!existing) {
        throw new Error("Transação recorrente não encontrada");
      }

      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        values.push(updates.description);
      }
      if (updates.amount !== undefined) {
        updateFields.push(`amount = $${paramIndex++}`);
        values.push(updates.amount);
      }
      if (updates.category !== undefined) {
        updateFields.push(`category = $${paramIndex++}`);
        values.push(updates.category);
      }
      if (updates.frequency !== undefined) {
        updateFields.push(`frequency = $${paramIndex++}`);
        values.push(updates.frequency);
      }
      if (updates.interval !== undefined) {
        updateFields.push(`interval = $${paramIndex++}`);
        values.push(updates.interval);
      }
      if (updates.dayOfWeek !== undefined) {
        updateFields.push(`day_of_week = $${paramIndex++}`);
        values.push(updates.dayOfWeek);
      }
      if (updates.dayOfMonth !== undefined) {
        updateFields.push(`day_of_month = $${paramIndex++}`);
        values.push(updates.dayOfMonth);
      }
      if (updates.monthOfYear !== undefined) {
        updateFields.push(`month_of_year = $${paramIndex++}`);
        values.push(updates.monthOfYear);
      }
      if (updates.endDate !== undefined) {
        updateFields.push(`end_date = $${paramIndex++}`);
        values.push(updates.endDate);
      }
      if (updates.maxOccurrences !== undefined) {
        updateFields.push(`max_occurrences = $${paramIndex++}`);
        values.push(updates.maxOccurrences);
      }
      if (updates.notifyBeforeDays !== undefined) {
        updateFields.push(`notify_before_days = $${paramIndex++}`);
        values.push(updates.notifyBeforeDays);
      }
      if (updates.notificationChannels !== undefined) {
        updateFields.push(`notification_channels = $${paramIndex++}`);
        values.push(JSON.stringify(updates.notificationChannels));
      }

      updateFields.push(`updated_at = NOW()`);

      if (updates.frequency || updates.interval || updates.dayOfWeek || updates.dayOfMonth || updates.monthOfYear) {
        const config: RecurringTransactionConfig = {
          frequency: updates.frequency || existing.frequency as any,
          interval: updates.interval || existing.interval,
          dayOfWeek: updates.dayOfWeek !== undefined ? updates.dayOfWeek : existing.dayOfWeek || undefined,
          dayOfMonth: updates.dayOfMonth !== undefined ? updates.dayOfMonth : existing.dayOfMonth || undefined,
          monthOfYear: updates.monthOfYear !== undefined ? updates.monthOfYear : existing.monthOfYear || undefined,
          startDate: existing.startDate,
        };
        const nextExecutionDate = this.calculateNextExecutionDate(new Date(), config);
        updateFields.push(`next_execution_date = $${paramIndex++}`);
        values.push(nextExecutionDate);
      }

      values.push(id);
      values.push(userId);

      const queryText = `
        UPDATE recurring_transactions
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
        RETURNING *
      `;

      const result = await db.execute(sql.raw(queryText));

      logger.info(`Transação recorrente atualizada: ${id}`);
      return result.rows[0] as any as RecurringTransaction;
    } catch (error) {
      logger.error(`Erro ao atualizar transação recorrente ${id}:`, error);
      throw error;
    }
  }

  static async getRecurringTransactionById(id: number, userId: number): Promise<RecurringTransaction | null> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM recurring_transactions
        WHERE id = ${id} AND user_id = ${userId}
      `);

      if (!result.rows[0]) return null;

      const row: any = result.rows[0];
      
      // Map snake_case to camelCase
      return {
        id: row.id,
        userId: row.user_id,
        organizationId: row.organization_id,
        accountId: row.account_id,
        type: row.type,
        description: row.description,
        amount: row.amount,
        category: row.category,
        frequency: row.frequency,
        interval: row.interval,
        dayOfWeek: row.day_of_week,
        dayOfMonth: row.day_of_month,
        monthOfYear: row.month_of_year,
        startDate: row.start_date,
        endDate: row.end_date,
        nextExecutionDate: row.next_execution_date,
        lastExecutionDate: row.last_execution_date,
        isActive: row.is_active,
        maxOccurrences: row.max_occurrences,
        executionCount: row.execution_count,
        notifyBeforeDays: row.notify_before_days,
        notificationChannels: typeof row.notification_channels === 'string' 
          ? JSON.parse(row.notification_channels) 
          : row.notification_channels,
        lastNotificationSent: row.last_notification_sent,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      } as RecurringTransaction;
    } catch (error) {
      logger.error(`Erro ao buscar transação recorrente ${id}:`, error);
      throw error;
    }
  }

  static async getRecurringTransactionsByUser(userId: number, organizationId?: number | null): Promise<RecurringTransaction[]> {
    try {
      let query = sql`
        SELECT * FROM recurring_transactions
        WHERE user_id = ${userId}
      `;

      if (organizationId !== undefined) {
        query = sql`${query} AND organization_id = ${organizationId}`;
      }

      query = sql`${query} ORDER BY next_execution_date ASC`;

      const result = await db.execute(query);
      
      // Map snake_case to camelCase
      return result.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        organizationId: row.organization_id,
        accountId: row.account_id,
        type: row.type,
        description: row.description,
        amount: row.amount,
        category: row.category,
        frequency: row.frequency,
        interval: row.interval,
        dayOfWeek: row.day_of_week,
        dayOfMonth: row.day_of_month,
        monthOfYear: row.month_of_year,
        startDate: row.start_date,
        endDate: row.end_date,
        nextExecutionDate: row.next_execution_date,
        lastExecutionDate: row.last_execution_date,
        isActive: row.is_active,
        maxOccurrences: row.max_occurrences,
        executionCount: row.execution_count,
        notifyBeforeDays: row.notify_before_days,
        notificationChannels: typeof row.notification_channels === 'string' 
          ? JSON.parse(row.notification_channels) 
          : row.notification_channels,
        lastNotificationSent: row.last_notification_sent,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })) as RecurringTransaction[];
    } catch (error) {
      logger.error("Erro ao listar transações recorrentes:", error);
      throw error;
    }
  }

  static async activateRecurringTransaction(id: number, userId: number): Promise<void> {
    try {
      await db.execute(sql`
        UPDATE recurring_transactions
        SET is_active = true, updated_at = NOW()
        WHERE id = ${id} AND user_id = ${userId}
      `);

      logger.info(`Transação recorrente ativada: ${id}`);
    } catch (error) {
      logger.error(`Erro ao ativar transação recorrente ${id}:`, error);
      throw error;
    }
  }

  static async deactivateRecurringTransaction(id: number, userId: number): Promise<void> {
    try {
      await db.execute(sql`
        UPDATE recurring_transactions
        SET is_active = false, updated_at = NOW()
        WHERE id = ${id} AND user_id = ${userId}
      `);

      logger.info(`Transação recorrente desativada: ${id}`);
    } catch (error) {
      logger.error(`Erro ao desativar transação recorrente ${id}:`, error);
      throw error;
    }
  }

  static async deleteRecurringTransaction(id: number, userId: number): Promise<void> {
    try {
      await db.execute(sql`
        DELETE FROM recurring_transactions
        WHERE id = ${id} AND user_id = ${userId}
      `);

      logger.info(`Transação recorrente excluída: ${id}`);
    } catch (error) {
      logger.error(`Erro ao excluir transação recorrente ${id}:`, error);
      throw error;
    }
  }

  static async processRecurringTransactions(): Promise<void> {
    try {
      logger.info("Iniciando processamento de transações recorrentes");

      const today = new Date();
      const result = await db.execute(sql`
        SELECT * FROM recurring_transactions
        WHERE is_active = true
        AND next_execution_date <= ${today}
        AND (end_date IS NULL OR end_date >= ${today})
        AND (max_occurrences IS NULL OR execution_count < max_occurrences)
      `);

      const transactions = result.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        organizationId: row.organization_id,
        accountId: row.account_id,
        type: row.type,
        description: row.description,
        amount: row.amount,
        category: row.category,
        frequency: row.frequency,
        interval: row.interval,
        dayOfWeek: row.day_of_week,
        dayOfMonth: row.day_of_month,
        monthOfYear: row.month_of_year,
        startDate: row.start_date,
        endDate: row.end_date,
        nextExecutionDate: row.next_execution_date,
        lastExecutionDate: row.last_execution_date,
        isActive: row.is_active,
        maxOccurrences: row.max_occurrences,
        executionCount: row.execution_count,
        notifyBeforeDays: row.notify_before_days,
        notificationChannels: typeof row.notification_channels === 'string' 
          ? JSON.parse(row.notification_channels) 
          : row.notification_channels,
        lastNotificationSent: row.last_notification_sent,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })) as RecurringTransaction[];
      
      let processedCount = 0;

      for (const recurringTx of transactions) {
        try {
          await this.executeRecurringTransaction(recurringTx);
          processedCount++;
        } catch (error) {
          logger.error(`Erro ao processar transação recorrente ${recurringTx.id}:`, error);
        }
      }

      logger.info(`Processamento concluído: ${processedCount} transações executadas`);
    } catch (error) {
      logger.error("Erro no processamento de transações recorrentes:", error);
      throw error;
    }
  }

  static async executeRecurringTransaction(recurringTx: RecurringTransaction): Promise<any> {
    try {
      const account = await AccountRepository.findById(recurringTx.accountId);
      if (!account) {
        throw new Error(`Conta não encontrada: ${recurringTx.accountId}`);
      }

      if (recurringTx.type === 'despesa') {
        const currentBalance = parseFloat(account.balance);
        const amount = parseFloat(recurringTx.amount);

        if (currentBalance < amount) {
          logger.warn(`Saldo insuficiente para transação recorrente ${recurringTx.id}`);
          
          await db.execute(sql`
            INSERT INTO recurring_transaction_executions (
              recurring_transaction_id, scheduled_date, status, error_message, amount
            ) VALUES (
              ${recurringTx.id}, ${recurringTx.nextExecutionDate}, 'failed', 
              'Saldo insuficiente', ${recurringTx.amount}
            )
          `);

          return null;
        }
      }

      const balanceBefore = parseFloat(account.balance);
      const amount = parseFloat(recurringTx.amount);
      const balanceAfter = recurringTx.type === 'receita' 
        ? balanceBefore + amount 
        : balanceBefore - amount;

      const newTransaction: InsertTransaction = {
        userId: recurringTx.userId,
        organizationId: recurringTx.organizationId,
        accountId: recurringTx.accountId,
        amount: recurringTx.amount,
        description: `${recurringTx.description} (Recorrente)`,
        category: recurringTx.category,
        type: recurringTx.type,
        date: new Date(),
        balanceBefore: balanceBefore.toString(),
        balanceAfter: balanceAfter.toString(),
        isRecurring: false,
        recurringFrequency: null,
        recurringParentId: null,
      };

      const createdTransaction = await TransactionRepository.create(newTransaction);
      await AccountRepository.updateBalance(recurringTx.accountId, balanceAfter);

      await db.execute(sql`
        INSERT INTO recurring_transaction_executions (
          recurring_transaction_id, transaction_id, scheduled_date, executed_date,
          status, amount, account_balance_before, account_balance_after
        ) VALUES (
          ${recurringTx.id}, ${createdTransaction.id}, ${recurringTx.nextExecutionDate}, NOW(),
          'completed', ${recurringTx.amount}, ${balanceBefore}, ${balanceAfter}
        )
      `);

      const config: RecurringTransactionConfig = {
        frequency: recurringTx.frequency as any,
        interval: recurringTx.interval,
        dayOfWeek: recurringTx.dayOfWeek || undefined,
        dayOfMonth: recurringTx.dayOfMonth || undefined,
        monthOfYear: recurringTx.monthOfYear || undefined,
        startDate: recurringTx.nextExecutionDate,
      };
      const nextExecutionDate = this.calculateNextExecutionDate(recurringTx.nextExecutionDate, config);

      await db.execute(sql`
        UPDATE recurring_transactions
        SET 
          last_execution_date = NOW(),
          next_execution_date = ${nextExecutionDate},
          execution_count = execution_count + 1,
          updated_at = NOW()
        WHERE id = ${recurringTx.id}
      `);

      await this.sendExecutionNotification(recurringTx, createdTransaction);

      logger.info(`Transação recorrente executada: ${recurringTx.id} -> ${createdTransaction.id}`);
      return createdTransaction;
    } catch (error) {
      logger.error(`Erro ao executar transação recorrente ${recurringTx.id}:`, error);
      
      await db.execute(sql`
        INSERT INTO recurring_transaction_executions (
          recurring_transaction_id, scheduled_date, status, error_message, amount
        ) VALUES (
          ${recurringTx.id}, ${recurringTx.nextExecutionDate}, 'failed', 
          ${error instanceof Error ? error.message : 'Erro desconhecido'}, ${recurringTx.amount}
        )
      `);

      throw error;
    }
  }

  static async sendUpcomingNotifications(): Promise<void> {
    try {
      logger.info("Enviando notificações de transações recorrentes próximas");

      const result = await db.execute(sql`
        SELECT * FROM recurring_transactions
        WHERE is_active = true
        AND next_execution_date <= NOW() + (notify_before_days || ' days')::interval
        AND next_execution_date > NOW()
        AND (last_notification_sent IS NULL OR last_notification_sent < NOW() - interval '12 hours')
      `);

      const transactions = result.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        organizationId: row.organization_id,
        accountId: row.account_id,
        type: row.type,
        description: row.description,
        amount: row.amount,
        category: row.category,
        frequency: row.frequency,
        interval: row.interval,
        dayOfWeek: row.day_of_week,
        dayOfMonth: row.day_of_month,
        monthOfYear: row.month_of_year,
        startDate: row.start_date,
        endDate: row.end_date,
        nextExecutionDate: row.next_execution_date,
        lastExecutionDate: row.last_execution_date,
        isActive: row.is_active,
        maxOccurrences: row.max_occurrences,
        executionCount: row.execution_count,
        notifyBeforeDays: row.notify_before_days,
        notificationChannels: typeof row.notification_channels === 'string' 
          ? JSON.parse(row.notification_channels) 
          : row.notification_channels,
        lastNotificationSent: row.last_notification_sent,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })) as RecurringTransaction[];

      for (const tx of transactions) {
        try {
          await this.sendUpcomingNotification(tx);
        } catch (error) {
          logger.error(`Erro ao enviar notificação para transação ${tx.id}:`, error);
        }
      }

      logger.info(`Notificações enviadas para ${transactions.length} transações`);
    } catch (error) {
      logger.error("Erro ao enviar notificações:", error);
    }
  }

  private static async sendUpcomingNotification(tx: RecurringTransaction): Promise<void> {
    try {
      const channels = Array.isArray(tx.notificationChannels) 
        ? tx.notificationChannels 
        : JSON.parse(tx.notificationChannels as any);

      const daysUntil = Math.ceil(
        (tx.nextExecutionDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      const message = `A transação recorrente "${tx.description}" será processada em ${daysUntil} dia(s). Valor: ${this.formatCurrency(tx.amount)}`;

      for (const channel of channels) {
        if (channel === 'app') {
          await NotificationService.sendInAppNotification(tx.userId, {
            title: '📅 Transação Recorrente Próxima',
            message,
            data: {
              type: tx.type,
              amount: parseFloat(tx.amount),
              nextExecutionDate: tx.nextExecutionDate.toISOString(),
            },
          } as any);
        } else if (channel === 'email') {
          await NotificationService.sendEmailNotification(tx.userId, {
            title: '📅 Transação Recorrente Próxima',
            message,
            data: {
              type: tx.type,
              amount: parseFloat(tx.amount),
              nextExecutionDate: tx.nextExecutionDate.toISOString(),
            },
          } as any);
        } else if (channel === 'sms') {
          await NotificationService.sendSMSNotification(tx.userId, {
            title: '📅 Transação Recorrente Próxima',
            message,
            data: {
              type: tx.type,
              amount: parseFloat(tx.amount),
              nextExecutionDate: tx.nextExecutionDate.toISOString(),
            },
          } as any);
        }

        await db.execute(sql`
          INSERT INTO recurring_transaction_notifications (
            recurring_transaction_id, user_id, scheduled_execution_date,
            notification_type, channel, status, sent_at
          ) VALUES (
            ${tx.id}, ${tx.userId}, ${tx.nextExecutionDate},
            'upcoming', ${channel}, 'sent', NOW()
          )
        `);
      }

      await db.execute(sql`
        UPDATE recurring_transactions
        SET last_notification_sent = NOW()
        WHERE id = ${tx.id}
      `);

      logger.info(`Notificação enviada para transação recorrente ${tx.id}`);
    } catch (error) {
      logger.error(`Erro ao enviar notificação para transação ${tx.id}:`, error);
      throw error;
    }
  }

  private static async sendExecutionNotification(tx: RecurringTransaction, transaction: any): Promise<void> {
    try {
      const channels = Array.isArray(tx.notificationChannels) 
        ? tx.notificationChannels 
        : JSON.parse(tx.notificationChannels as any);

      const message = `A transação recorrente "${tx.description}" foi processada com sucesso. Valor: ${this.formatCurrency(tx.amount)}`;

      for (const channel of channels) {
        if (channel === 'app') {
          await NotificationService.sendInAppNotification(tx.userId, {
            title: '✅ Transação Recorrente Executada',
            message,
            data: {
              type: tx.type,
              amount: parseFloat(tx.amount),
            },
          } as any);
        }

        await db.execute(sql`
          INSERT INTO recurring_transaction_notifications (
            recurring_transaction_id, user_id, scheduled_execution_date,
            notification_type, channel, status, sent_at
          ) VALUES (
            ${tx.id}, ${tx.userId}, ${tx.nextExecutionDate},
            'executed', ${channel}, 'sent', NOW()
          )
        `);
      }
    } catch (error) {
      logger.error(`Erro ao enviar notificação de execução para transação ${tx.id}:`, error);
    }
  }

  static async getUpcomingRecurringTransactions(userId: number, days: number = 30): Promise<any[]> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const result = await db.execute(sql`
        SELECT * FROM recurring_transactions
        WHERE user_id = ${userId}
        AND is_active = true
        AND next_execution_date <= ${futureDate}
        AND (end_date IS NULL OR end_date >= NOW())
        ORDER BY next_execution_date ASC
      `);

      return result.rows;
    } catch (error) {
      logger.error("Erro ao buscar próximas execuções:", error);
      throw error;
    }
  }

  private static calculateNextExecutionDate(fromDate: Date, config: RecurringTransactionConfig): Date {
    const nextDate = new Date(fromDate);
    const interval = config.interval || 1;

    switch (config.frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + interval);
        break;

      case 'weekly':
        if (config.dayOfWeek !== undefined) {
          const currentDay = nextDate.getDay();
          const daysToAdd = (config.dayOfWeek - currentDay + 7) % 7 || 7;
          nextDate.setDate(nextDate.getDate() + daysToAdd);
        } else {
          nextDate.setDate(nextDate.getDate() + (7 * interval));
        }
        break;

      case 'monthly':
        if (config.dayOfMonth !== undefined) {
          nextDate.setMonth(nextDate.getMonth() + interval);
          const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
          nextDate.setDate(Math.min(config.dayOfMonth, lastDayOfMonth));
        } else {
          nextDate.setMonth(nextDate.getMonth() + interval);
        }
        break;

      case 'yearly':
        if (config.monthOfYear !== undefined && config.dayOfMonth !== undefined) {
          nextDate.setFullYear(nextDate.getFullYear() + interval);
          nextDate.setMonth(config.monthOfYear - 1);
          const lastDayOfMonth = new Date(nextDate.getFullYear(), config.monthOfYear, 0).getDate();
          nextDate.setDate(Math.min(config.dayOfMonth, lastDayOfMonth));
        } else {
          nextDate.setFullYear(nextDate.getFullYear() + interval);
        }
        break;
    }

    return nextDate;
  }

  private static formatCurrency(amount: string | number): string {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA'
    }).format(value);
  }

  static async getExecutionHistory(recurringTransactionId: number, userId: number): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT e.*, t.description as transaction_description
        FROM recurring_transaction_executions e
        LEFT JOIN transactions t ON e.transaction_id = t.id
        WHERE e.recurring_transaction_id = ${recurringTransactionId}
        AND EXISTS (
          SELECT 1 FROM recurring_transactions rt
          WHERE rt.id = e.recurring_transaction_id AND rt.user_id = ${userId}
        )
        ORDER BY e.scheduled_date DESC
      `);

      // Map snake_case to camelCase
      return result.rows.map((row: any) => ({
        id: row.id,
        recurringTransactionId: row.recurring_transaction_id,
        transactionId: row.transaction_id,
        scheduledDate: row.scheduled_date,
        executedDate: row.executed_date,
        status: row.status,
        amount: row.amount,
        accountBalanceBefore: row.account_balance_before,
        accountBalanceAfter: row.account_balance_after,
        errorMessage: row.error_message,
        transactionDescription: row.transaction_description,
        createdAt: row.created_at,
      }));
    } catch (error) {
      logger.error("Erro ao buscar histórico de execuções:", error);
      throw error;
    }
  }
}
