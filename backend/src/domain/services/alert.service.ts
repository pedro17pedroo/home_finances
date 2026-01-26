import { BudgetRepository } from "../repositories/budget.repository.js";
import { db } from "../../core/database/db.js";
import { alertTriggers, budgetAlerts } from "../../core/database/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { 
  NotFoundError, 
  BadRequestError, 
} from "../../core/errors/app-error.js";
import { NotificationService } from "./notification.service.js";
import type { 
  BudgetAlert,
  InsertBudgetAlert,
  AlertTrigger,
  InsertAlertTrigger
} from "../../core/database/schema.js";
import type {
  Alert,
  AlertConfig,
  UpdateAlertDTO,
  TriggeredAlert,
  SpendingCalculation,
  ThresholdType,
  AlertPosition,
  AlertChannel,
  Budget
} from "../entities/budget.types.js";

/**
 * Alert Service
 * 
 * Manages alert configuration and threshold checking for budgets.
 * Handles alert validation, triggering, and deduplication tracking.
 */
export class AlertService {
  /**
   * Configure alerts for a budget
   * Validates alert count, distribution, and threshold values
   * 
   * @param budgetId - Budget ID
   * @param alerts - Alert configurations
   * @param budgetAmount - Budget amount for validation
   */
  static async configureAlerts(
    budgetId: number,
    alerts: AlertConfig[],
    budgetAmount: number
  ): Promise<void> {
    // Validate alert count (max 3)
    if (alerts.length > 3) {
      throw new BadRequestError("Maximum 3 alerts allowed per budget");
    }

    // Validate alert distribution (2 before, 1 after when all 3 are configured)
    if (alerts.length === 3) {
      const beforeCount = alerts.filter(a => a.position === 'before_limit').length;
      const afterCount = alerts.filter(a => a.position === 'after_limit').length;
      
      if (beforeCount !== 2 || afterCount !== 1) {
        throw new BadRequestError("Budget must have exactly 2 before-limit alerts and 1 after-limit alert when fully configured");
      }
    }

    // Delete existing alerts for this budget
    await BudgetRepository.deleteAlertsByBudgetId(budgetId);

    // Validate and create each alert
    for (const alertConfig of alerts) {
      // Validate threshold type
      if (!['fixed_amount', 'percentage'].includes(alertConfig.thresholdType)) {
        throw new BadRequestError("Alert threshold type must be 'fixed_amount' or 'percentage'");
      }

      // Validate threshold value based on type and position
      this.validateThresholdValue(
        alertConfig.thresholdType,
        alertConfig.thresholdValue,
        alertConfig.position,
        budgetAmount
      );

      // Create alert
      const alertData: InsertBudgetAlert = {
        budgetId,
        thresholdType: alertConfig.thresholdType,
        thresholdValue: String(alertConfig.thresholdValue),
        position: alertConfig.position,
        channels: alertConfig.channels,
      };

      await BudgetRepository.createAlert(alertData);
    }
  }

  /**
   * Update an existing alert
   * 
   * @param alertId - Alert ID
   * @param data - Alert update data
   * @param budgetAmount - Budget amount for validation
   * @returns Updated alert
   */
  static async updateAlert(
    alertId: number,
    data: UpdateAlertDTO,
    budgetAmount: number
  ): Promise<Alert> {
    // Get existing alert
    const existingAlert = await this.getAlertById(alertId);
    if (!existingAlert) {
      throw new NotFoundError("Alert");
    }

    // Prepare update data
    const thresholdType = data.thresholdType || existingAlert.thresholdType;
    const thresholdValue = data.thresholdValue !== undefined ? data.thresholdValue : existingAlert.thresholdValue;
    const position = data.position || existingAlert.position;

    // Validate threshold value if changed
    if (data.thresholdType || data.thresholdValue !== undefined || data.position) {
      this.validateThresholdValue(
        thresholdType as ThresholdType,
        thresholdValue,
        position as AlertPosition,
        budgetAmount
      );
    }

    // Update alert in database
    const updateData: Partial<InsertBudgetAlert> = {};
    if (data.thresholdType) updateData.thresholdType = data.thresholdType;
    if (data.thresholdValue !== undefined) updateData.thresholdValue = String(data.thresholdValue);
    if (data.position) updateData.position = data.position;
    if (data.channels) updateData.channels = data.channels;

    const updated = await db
      .update(budgetAlerts)
      .set({
        ...updateData,
        updatedAt: sql`NOW()`,
      })
      .where(eq(budgetAlerts.id, alertId))
      .returning();

    // Convert to Alert type
    return this.convertBudgetAlertToAlert(updated[0]);
  }

  /**
   * Delete an alert
   * 
   * @param alertId - Alert ID
   */
  static async deleteAlert(alertId: number): Promise<void> {
    // Verify alert exists
    const alert = await this.getAlertById(alertId);
    if (!alert) {
      throw new NotFoundError("Alert");
    }

    // Delete alert (triggers will be cascade deleted)
    await db
      .delete(budgetAlerts)
      .where(eq(budgetAlerts.id, alertId));
  }

  /**
   * Check alerts for a budget and identify which ones should be triggered
   * Filters out already-triggered alerts for the current period
   * 
   * @param budgetId - Budget ID
   * @param currentSpending - Current spending amount
   * @param budgetAmount - Budget amount
   * @param budgetPeriodId - Budget period identifier for deduplication
   * @returns List of triggered alerts
   */
  static async checkAlerts(
    budgetId: number,
    currentSpending: number,
    budgetAmount: number,
    budgetPeriodId: string
  ): Promise<TriggeredAlert[]> {
    // Get all alerts for this budget
    const alerts = await BudgetRepository.findAlertsByBudgetId(budgetId);

    const triggeredAlerts: TriggeredAlert[] = [];

    for (const alert of alerts) {
      // Calculate threshold amount based on type
      const thresholdAmount = this.calculateThresholdAmount(
        alert.thresholdType as ThresholdType,
        Number(alert.thresholdValue),
        budgetAmount
      );

      // Check if spending has crossed this threshold
      const isTriggered = currentSpending >= thresholdAmount;

      if (isTriggered) {
        // Check if this alert has already been triggered in this period
        const alreadyTriggered = await this.hasAlertBeenTriggered(alert.id, budgetPeriodId);

        if (!alreadyTriggered) {
          // Convert to Alert type
          const convertedAlert = this.convertBudgetAlertToAlert(alert);

          triggeredAlerts.push({
            alert: convertedAlert,
            thresholdAmount,
            currentSpending,
          });
        }
      }
    }

    return triggeredAlerts;
  }

  /**
   * Mark an alert as triggered for a specific budget period
   * 
   * @param alertId - Alert ID
   * @param budgetPeriodId - Budget period identifier
   * @param spendingAmount - Spending amount when triggered
   */
  static async markAlertTriggered(
    alertId: number,
    budgetPeriodId: string,
    spendingAmount: number
  ): Promise<void> {
    const triggerData: InsertAlertTrigger = {
      alertId,
      budgetPeriodId,
      spendingAmount: String(spendingAmount),
    };

    await db.insert(alertTriggers).values(triggerData);
  }

  /**
   * Check if an alert has been triggered in a specific budget period
   * 
   * @param alertId - Alert ID
   * @param budgetPeriodId - Budget period identifier
   * @returns True if alert has been triggered
   */
  static async hasAlertBeenTriggered(
    alertId: number,
    budgetPeriodId: string
  ): Promise<boolean> {
    const result = await db
      .select()
      .from(alertTriggers)
      .where(
        and(
          eq(alertTriggers.alertId, alertId),
          eq(alertTriggers.budgetPeriodId, budgetPeriodId)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * Reset alert triggers for a budget (called when a new period begins)
   * 
   * @param budgetId - Budget ID
   */
  static async resetAlertTriggers(budgetId: number): Promise<void> {
    // Get all alerts for this budget
    const alerts = await BudgetRepository.findAlertsByBudgetId(budgetId);

    // Delete all triggers for these alerts
    for (const alert of alerts) {
      await db
        .delete(alertTriggers)
        .where(eq(alertTriggers.alertId, alert.id));
    }
  }

  /**
   * Generate a budget period identifier for alert deduplication
   * Format: "budgetId-YYYY-MM-DD-to-YYYY-MM-DD"
   * 
   * @param budget - Budget entity
   * @param startDate - Period start date
   * @returns Budget period identifier
   */
  static generateBudgetPeriodId(budget: Budget, startDate: Date): string {
    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    };

    return `${budget.id}-${budget.timePeriod}-${formatDate(startDate)}`;
  }

  /**
   * Get all triggered alerts for a specific budget period
   * Used for archiving alert history
   * 
   * @param budgetId - Budget ID
   * @param budgetPeriodId - Budget period identifier
   * @returns List of alerts that were triggered in this period
   */
  static async getTriggeredAlertsForPeriod(
    budgetId: number,
    budgetPeriodId: string
  ): Promise<Alert[]> {
    // Get all alerts for this budget
    const alerts = await BudgetRepository.findAlertsByBudgetId(budgetId);

    // Filter to only those that have been triggered in this period
    const triggeredAlerts: Alert[] = [];

    for (const alert of alerts) {
      const hasBeenTriggered = await this.hasAlertBeenTriggered(alert.id, budgetPeriodId);
      if (hasBeenTriggered) {
        triggeredAlerts.push(this.convertBudgetAlertToAlert(alert));
      }
    }

    return triggeredAlerts;
  }

  /**
   * Trigger an alert by sending notifications through enabled channels
   * This method is called by the transaction integration hook
   * 
   * @param alert - Alert to trigger
   * @param budget - Budget that triggered the alert
   * @param spending - Current spending calculation
   * @param budgetPeriodId - Budget period identifier
   */
  static async triggerAlert(
    alert: Alert,
    budget: Budget,
    spending: SpendingCalculation,
    budgetPeriodId: string
  ): Promise<void> {
    // Mark alert as triggered to prevent duplicates
    await this.markAlertTriggered(alert.id, budgetPeriodId, spending.totalSpent);

    // Send notifications through enabled channels
    // Get userId from budget's organization (we need to find the user)
    // For now, we'll need to get the user ID from the budget
    // This will be properly integrated when the transaction hook is implemented
    
    // TODO: Get userId from context when called from transaction hook
    // For now, this is a placeholder that will be properly wired in task 8
    // await NotificationService.sendBudgetAlert(userId, alert, budget, spending);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Validate threshold value based on type and position
   * 
   * @param thresholdType - Threshold type (fixed_amount or percentage)
   * @param thresholdValue - Threshold value
   * @param position - Alert position (before_limit or after_limit)
   * @param budgetAmount - Budget amount
   */
  private static validateThresholdValue(
    thresholdType: ThresholdType,
    thresholdValue: number,
    position: AlertPosition,
    budgetAmount: number
  ): void {
    if (thresholdType === 'percentage') {
      if (position === 'before_limit') {
        if (thresholdValue <= 0 || thresholdValue > 100) {
          throw new BadRequestError("Before-limit percentage alerts must be between 0 and 100");
        }
      } else if (position === 'after_limit') {
        // Allow >= 100 for after-limit alerts (100% means "when budget is reached/exceeded")
        if (thresholdValue < 100) {
          throw new BadRequestError("After-limit percentage alerts must be 100 or greater");
        }
      }
    } else if (thresholdType === 'fixed_amount') {
      if (position === 'before_limit') {
        if (thresholdValue >= budgetAmount) {
          throw new BadRequestError("Before-limit fixed alerts must be less than budget amount");
        }
      } else if (position === 'after_limit') {
        if (thresholdValue < budgetAmount) {
          throw new BadRequestError("After-limit fixed alerts must be equal to or greater than budget amount");
        }
      }
    }
  }

  /**
   * Calculate the actual threshold amount based on type
   * 
   * @param thresholdType - Threshold type (fixed_amount or percentage)
   * @param thresholdValue - Threshold value
   * @param budgetAmount - Budget amount
   * @returns Calculated threshold amount
   */
  private static calculateThresholdAmount(
    thresholdType: ThresholdType,
    thresholdValue: number,
    budgetAmount: number
  ): number {
    if (thresholdType === 'percentage') {
      return (thresholdValue / 100) * budgetAmount;
    } else {
      return thresholdValue;
    }
  }

  /**
   * Get an alert by ID
   * 
   * @param alertId - Alert ID
   * @returns Alert or null
   */
  private static async getAlertById(alertId: number): Promise<Alert | null> {
    const result = await db
      .select()
      .from(budgetAlerts)
      .where(eq(budgetAlerts.id, alertId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.convertBudgetAlertToAlert(result[0]);
  }

  /**
   * Get an alert by ID with budget information (public method for organization verification)
   * 
   * @param alertId - Alert ID
   * @returns Alert with budget ID
   */
  static async getAlertWithBudget(alertId: number): Promise<{ alert: Alert; budgetId: number } | null> {
    const alert = await this.getAlertById(alertId);
    if (!alert) {
      return null;
    }

    return {
      alert,
      budgetId: alert.budgetId,
    };
  }

  /**
   * Convert BudgetAlert to Alert type
   * 
   * @param budgetAlert - BudgetAlert from database
   * @returns Alert type
   */
  private static convertBudgetAlertToAlert(budgetAlert: BudgetAlert): Alert {
    return {
      id: budgetAlert.id,
      budgetId: budgetAlert.budgetId,
      thresholdType: budgetAlert.thresholdType as ThresholdType,
      thresholdValue: Number(budgetAlert.thresholdValue),
      position: budgetAlert.position as AlertPosition,
      channels: budgetAlert.channels as AlertChannel[],
      createdAt: budgetAlert.createdAt || new Date(),
      updatedAt: budgetAlert.updatedAt || new Date(),
    };
  }
}
