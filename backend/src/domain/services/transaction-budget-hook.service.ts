import { BudgetService } from "./budget.service.js";
import { AlertService } from "./alert.service.js";
import { NotificationService } from "./notification.service.js";
import { BudgetRepository } from "../repositories/budget.repository.js";
import { CategoryRepository } from "../repositories/category.repository.js";
import { logger } from "../../core/utils/logger.js";
import type { Transaction } from "../../core/database/schema.js";
import type { Budget, Alert } from "../entities/budget.types.js";
import { TimePeriodType, BudgetStatus } from "../entities/budget.types.js";

/**
 * Transaction Budget Hook Service
 * 
 * Integrates budget tracking into the transaction flow.
 * Called synchronously after transaction create/update to:
 * - Identify active budgets for the transaction's category
 * - Calculate current spending for affected budgets
 * - Check alert thresholds and trigger notifications
 * 
 * This ensures real-time budget tracking and immediate alert delivery.
 */
export class TransactionBudgetHook {
  /**
   * Main hook method called after transaction create/update
   * Processes all affected budgets synchronously before transaction API returns
   * 
   * @param transaction - The transaction that was created or updated
   */
  static async onTransactionChange(transaction: Transaction): Promise<void> {
    try {
      // Only process expense transactions (receitas don't count towards budgets)
      if (transaction.type !== 'despesa') {
        logger.debug(`Transaction ${transaction.id} is not an expense, skipping budget processing`);
        return;
      }

      // Find all active budgets affected by this transaction
      const affectedBudgets = await this.findAffectedBudgets(transaction);

      if (affectedBudgets.length === 0) {
        logger.debug(`No active budgets found for transaction ${transaction.id}`);
        return;
      }

      logger.info(`Processing ${affectedBudgets.length} affected budgets for transaction ${transaction.id}`);

      // Process each affected budget
      await this.processAffectedBudgets(affectedBudgets, transaction);

      logger.info(`Successfully processed budgets for transaction ${transaction.id}`);
    } catch (error) {
      // Log error but don't throw - budget processing failures should not block transactions
      logger.error(`Error processing budgets for transaction ${transaction.id}:`, error);
    }
  }

  /**
   * Find all active budgets that are affected by this transaction
   * A budget is affected if:
   * - It belongs to the same organization as the transaction
   * - It is for the same category as the transaction
   * - It has status 'active'
   * - The transaction date falls within the budget's period
   * 
   * @param transaction - The transaction to check
   * @returns List of affected budgets
   */
  static async findAffectedBudgets(transaction: Transaction): Promise<Budget[]> {
    try {
      // Validate transaction has required fields
      if (!transaction.organizationId) {
        logger.warn(`Transaction ${transaction.id} has no organizationId, cannot find budgets`);
        return [];
      }

      if (!transaction.category) {
        logger.warn(`Transaction ${transaction.id} has no category, cannot find budgets`);
        return [];
      }

      // Transaction.category is stored as a string (category name), not ID
      // We need to look up the category by name to get its ID
      let categoryId: number;
      
      // First try to parse as number (for backward compatibility)
      const parsedId = Number(transaction.category);
      if (!isNaN(parsedId)) {
        categoryId = parsedId;
        logger.debug(`Transaction ${transaction.id} category is numeric: ${categoryId}`);
      } else {
        // Look up category by name
        const category = await CategoryRepository.findByNameAndOrganization(
          transaction.category,
          transaction.organizationId
        );
        
        if (!category) {
          logger.warn(`Transaction ${transaction.id} has category "${transaction.category}" which doesn't exist in organization ${transaction.organizationId}`);
          return [];
        }
        
        categoryId = category.id;
        logger.debug(`Transaction ${transaction.id} category "${transaction.category}" resolved to ID: ${categoryId}`);
      }

      // Get all active budgets for this organization and category
      const budgets = await BudgetRepository.findByOrganizationWithFilters(
        transaction.organizationId,
        {
          status: 'active',
          categoryId: categoryId,
        }
      );

      logger.debug(`Found ${budgets.length} active budgets for category ${categoryId} in organization ${transaction.organizationId}`);

      // Filter budgets by date - only include budgets whose period contains the transaction date
      const transactionDate = new Date(transaction.date);
      const affectedBudgets: Budget[] = [];

      for (const dbBudget of budgets) {
        // Use database budget directly for period calculation (it expects the DB type)
        const periodDates = await BudgetService.getBudgetPeriodDates(dbBudget as any, transactionDate);
        
        // Check if transaction date falls within budget period
        if (transactionDate >= periodDates.startDate && transactionDate <= periodDates.endDate) {
          // Convert database budget to Budget type for return
          const budget: Budget = {
            ...dbBudget,
            amount: Number(dbBudget.amount),
            timePeriod: dbBudget.timePeriod as TimePeriodType,
            status: dbBudget.status as BudgetStatus,
            customStartDate: dbBudget.customStartDate || undefined,
            customEndDate: dbBudget.customEndDate || undefined,
            createdAt: dbBudget.createdAt || new Date(),
            updatedAt: dbBudget.updatedAt || new Date(),
          };
          affectedBudgets.push(budget);
          logger.debug(`Budget ${budget.id} period ${periodDates.startDate.toISOString()} to ${periodDates.endDate.toISOString()} contains transaction date ${transactionDate.toISOString()}`);
        } else {
          logger.debug(`Budget ${dbBudget.id} period ${periodDates.startDate.toISOString()} to ${periodDates.endDate.toISOString()} does NOT contain transaction date ${transactionDate.toISOString()}`);
        }
      }

      logger.info(`Found ${affectedBudgets.length} affected budgets for transaction ${transaction.id} (category: ${transaction.category}, categoryId: ${categoryId})`);
      return affectedBudgets;
    } catch (error) {
      logger.error(`Error finding affected budgets for transaction ${transaction.id}:`, error);
      return [];
    }
  }

  /**
   * Process all affected budgets for a transaction
   * For each budget:
   * - Calculate current spending
   * - Check alert thresholds
   * - Trigger notifications for crossed thresholds
   * 
   * @param budgets - List of affected budgets
   * @param transaction - The transaction that triggered the processing
   */
  static async processAffectedBudgets(
    budgets: Budget[],
    transaction: Transaction
  ): Promise<void> {
    // Process all budgets in parallel for better performance
    await Promise.all(
      budgets.map(budget => this.processSingleBudget(budget, transaction))
    );
  }

  /**
   * Process a single budget
   * - Calculate current spending
   * - Check alert thresholds
   * - Trigger notifications for crossed thresholds
   * 
   * @param budget - The budget to process
   * @param transaction - The transaction that triggered the processing
   */
  private static async processSingleBudget(
    budget: Budget,
    transaction: Transaction
  ): Promise<void> {
    try {
      logger.debug(`Processing budget ${budget.id} for transaction ${transaction.id}`);

      // Calculate current spending for this budget
      const spending = await BudgetService.calculateSpending(budget.id);

      logger.debug(`Budget ${budget.id} spending: ${spending.totalSpent} / ${spending.budgetAmount} (${spending.percentageUsed.toFixed(1)}%)`);

      // Generate budget period ID for alert deduplication
      const periodDates = await BudgetService.getBudgetPeriodDates(budget as any, new Date(transaction.date));
      const budgetPeriodId = this.generateBudgetPeriodId(budget.id, periodDates.startDate, periodDates.endDate);

      // Check which alerts should be triggered
      const triggeredAlerts = await AlertService.checkAlerts(
        budget.id,
        spending.totalSpent,
        Number(budget.amount),
        budgetPeriodId
      );

      if (triggeredAlerts.length === 0) {
        logger.debug(`No alerts triggered for budget ${budget.id}`);
        return;
      }

      logger.info(`${triggeredAlerts.length} alerts triggered for budget ${budget.id}`);

      // Trigger each alert (send notifications)
      for (const triggeredAlert of triggeredAlerts) {
        await this.triggerAlertNotification(
          triggeredAlert.alert,
          budget,
          spending,
          budgetPeriodId,
          transaction.userId
        );
      }
    } catch (error) {
      logger.error(`Error processing budget ${budget.id}:`, error);
      // Don't throw - continue processing other budgets
    }
  }

  /**
   * Trigger an alert by marking it as triggered and sending notifications
   * 
   * @param alert - The alert to trigger
   * @param budget - The budget that triggered the alert
   * @param spending - Current spending calculation
   * @param budgetPeriodId - Budget period identifier for deduplication
   * @param userId - User ID to send notifications to
   */
  private static async triggerAlertNotification(
    alert: Alert,
    budget: Budget,
    spending: any,
    budgetPeriodId: string,
    userId: number
  ): Promise<void> {
    try {
      logger.info(`Triggering alert ${alert.id} for budget ${budget.id}`);

      // Mark alert as triggered to prevent duplicates
      await AlertService.markAlertTriggered(alert.id, budgetPeriodId, spending.totalSpent);

      // Send notifications through all enabled channels
      await NotificationService.sendBudgetAlert(userId, alert, budget, spending);

      logger.info(`Alert ${alert.id} triggered successfully`);
    } catch (error) {
      logger.error(`Error triggering alert ${alert.id}:`, error);
      // Don't throw - notification failures should not block transaction processing
    }
  }

  /**
   * Generate a unique budget period identifier for alert deduplication
   * Format: budgetId-startDate-endDate
   * 
   * @param budgetId - Budget ID
   * @param startDate - Period start date
   * @param endDate - Period end date
   * @returns Budget period identifier
   */
  private static generateBudgetPeriodId(
    budgetId: number,
    startDate: Date,
    endDate: Date
  ): string {
    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    };

    return `${budgetId}-${formatDate(startDate)}-${formatDate(endDate)}`;
  }
}
