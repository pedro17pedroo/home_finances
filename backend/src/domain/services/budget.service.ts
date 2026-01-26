import { BudgetRepository } from "../repositories/budget.repository.js";
import { 
  NotFoundError, 
  BadRequestError, 
} from "../../core/errors/app-error.js";
import type { 
  Budget, 
  InsertBudget,
  BudgetAlert,
  InsertBudgetAlert
} from "../../core/database/schema.js";
import type {
  CreateBudgetDTO,
  UpdateBudgetDTO,
  BudgetWithStatus,
  BudgetFilters,
  SpendingCalculation,
  PeriodDates,
  AlertConfig,
  TimePeriodType,
  BudgetStatus,
  Alert,
  ThresholdType,
  AlertPosition,
  AlertChannel
} from "../entities/budget.types.js";

export class BudgetService {
  /**
   * Create a new budget
   * Validates input, sets default status to 'active', and creates associated alerts
   * 
   * @param data - Budget creation data
   * @param organizationId - Organization ID for multi-tenant isolation
   * @param currency - Organization's currency
   * @returns Created budget
   */
  static async createBudget(
    data: CreateBudgetDTO,
    organizationId: number,
    currency: string
  ): Promise<Budget> {
    // Validate required fields
    if (!data.categoryId || data.amount === undefined || data.amount === null || !data.timePeriod) {
      throw new BadRequestError("Budget creation requires category, time period, and amount");
    }

    // Validate amount
    if (data.amount <= 0) {
      throw new BadRequestError("Budget amount must be greater than zero");
    }

    // Validate time period
    const validTimePeriods = ['daily', 'weekly', 'monthly', 'annual', 'custom'];
    if (!validTimePeriods.includes(data.timePeriod)) {
      throw new BadRequestError("Time period must be one of: daily, weekly, monthly, annual, custom");
    }

    // Validate custom date range
    if (data.timePeriod === 'custom') {
      if (!data.customStartDate || !data.customEndDate) {
        throw new BadRequestError("Custom budget requires start and end dates");
      }
      if (new Date(data.customEndDate) <= new Date(data.customStartDate)) {
        throw new BadRequestError("Custom budget end date must be after start date");
      }
    }

    // Prepare budget data
    const budgetData: InsertBudget = {
      organizationId,
      categoryId: Number(data.categoryId),
      amount: String(data.amount),
      currency,
      timePeriod: data.timePeriod,
      customStartDate: data.customStartDate ? new Date(data.customStartDate) : undefined,
      customEndDate: data.customEndDate ? new Date(data.customEndDate) : undefined,
      status: data.status || 'active', // Default to 'active'
    };

    // Create budget
    const budget = await BudgetRepository.create(budgetData);

    // Create alerts if provided
    if (data.alerts && data.alerts.length > 0) {
      await this.validateAndCreateAlerts(budget.id, data.alerts, data.amount);
    }

    return budget;
  }

  /**
   * Update an existing budget
   * Handles recalculations when budget amount or time period changes
   * 
   * @param id - Budget ID
   * @param data - Budget update data
   * @param organizationId - Organization ID for multi-tenant isolation
   * @returns Updated budget
   */
  static async updateBudget(
    id: number,
    data: UpdateBudgetDTO,
    organizationId: number
  ): Promise<Budget> {
    // Verify budget exists and belongs to organization
    const existingBudget = await BudgetRepository.findByIdAndOrganization(id, organizationId);
    if (!existingBudget) {
      throw new NotFoundError("Budget");
    }

    // Validate custom date range if provided
    if (data.timePeriod === 'custom' || existingBudget.timePeriod === 'custom') {
      const startDate = data.customStartDate || existingBudget.customStartDate;
      const endDate = data.customEndDate || existingBudget.customEndDate;
      
      if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
        throw new BadRequestError("Custom budget end date must be after start date");
      }
    }

    // Validate amount if provided
    if (data.amount !== undefined && data.amount <= 0) {
      throw new BadRequestError("Budget amount must be greater than zero");
    }

    // Prepare update data
    const updateData: Partial<InsertBudget> = {};
    
    if (data.amount !== undefined) updateData.amount = String(data.amount);
    if (data.timePeriod !== undefined) updateData.timePeriod = data.timePeriod;
    if (data.customStartDate !== undefined) updateData.customStartDate = new Date(data.customStartDate);
    if (data.customEndDate !== undefined) updateData.customEndDate = new Date(data.customEndDate);
    if (data.status !== undefined) updateData.status = data.status;

    // Update budget
    const updatedBudget = await BudgetRepository.update(id, updateData);

    // Handle budget amount changes - recalculate percentage-based alert thresholds
    // Requirement 6.3: When a budget amount is changed, recalculate all percentage-based alert thresholds
    if (data.amount !== undefined) {
      await this.recalculatePercentageAlerts(id, data.amount);
    }

    // Handle alert configuration updates if provided
    // Requirement 6.2: Allow modification of alert configurations
    if (data.alerts !== undefined) {
      const { AlertService } = await import("./alert.service.js");
      const newAmount = data.amount !== undefined ? data.amount : Number(existingBudget.amount);
      await AlertService.configureAlerts(id, data.alerts, newAmount);
    }

    // Note: Time period changes automatically trigger spending recalculation
    // Requirement 6.4: When time period changes, spending is recalculated for new period
    // This happens automatically when calculateSpending is called with the updated budget
    // because getBudgetPeriodDates uses the budget's current timePeriod setting

    return updatedBudget;
  }

  /**
   * Recalculate percentage-based alert thresholds when budget amount changes
   * Fixed amount alerts remain unchanged
   * 
   * @param budgetId - Budget ID
   * @param newAmount - New budget amount
   */
  private static async recalculatePercentageAlerts(
    budgetId: number,
    newAmount: number
  ): Promise<void> {
    // Get all alerts for this budget
    const alerts = await BudgetRepository.findAlertsByBudgetId(budgetId);

    // Filter percentage-based alerts
    const percentageAlerts = alerts.filter(alert => alert.thresholdType === 'percentage');

    // No percentage alerts to recalculate
    if (percentageAlerts.length === 0) {
      return;
    }

    // Import AlertService for validation
    const { AlertService } = await import("./alert.service.js");

    // Update each percentage alert's threshold value
    // Note: The threshold value (percentage) stays the same, but we need to validate
    // it against the new budget amount to ensure it's still valid
    for (const alert of percentageAlerts) {
      const thresholdValue = Number(alert.thresholdValue);
      
      // Validate the threshold is still valid with the new budget amount
      // This ensures that before-limit alerts are still < 100% and after-limit > 100%
      try {
        // The validation happens in AlertService, but we don't need to update
        // the alert itself since the percentage value doesn't change
        // The actual threshold amount will be recalculated dynamically when checking alerts
        
        // We just need to ensure the alert is still valid with the new amount
        if (alert.thresholdType === 'percentage') {
          if (alert.position === 'before_limit' && (thresholdValue <= 0 || thresholdValue > 100)) {
            throw new BadRequestError("Before-limit percentage alerts must be between 0 and 100");
          } else if (alert.position === 'after_limit' && thresholdValue <= 100) {
            throw new BadRequestError("After-limit percentage alerts must be greater than 100");
          }
        }
      } catch (error) {
        // If validation fails, the alert configuration is no longer valid
        // This shouldn't happen in normal operation, but we handle it gracefully
        throw new BadRequestError(
          `Alert ${alert.id} is no longer valid with the new budget amount: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Note: We don't need to update the alert records themselves because:
    // 1. Percentage values remain the same (e.g., 80% stays 80%)
    // 2. The actual threshold amount is calculated dynamically in AlertService.calculateThresholdAmount()
    // 3. When alerts are checked, they use the current budget amount to calculate the threshold
  }

  /**
   * Delete a budget or archive it if it has historical data
   * Requirements 6.5, 6.6:
   * - Check for historical data before deletion
   * - Archive budget if history exists, otherwise delete
   * - Cascade delete alerts and triggers
   * 
   * @param id - Budget ID
   * @param organizationId - Organization ID for multi-tenant isolation
   */
  static async deleteBudget(id: number, organizationId: number): Promise<void> {
    // Verify budget exists and belongs to organization
    const budget = await BudgetRepository.findByIdAndOrganization(id, organizationId);
    if (!budget) {
      throw new NotFoundError("Budget");
    }

    // Check if budget has historical data
    const hasHistory = await BudgetRepository.hasHistoricalData(id);

    if (hasHistory) {
      // Requirement 6.6: Archive budget instead of deleting if history exists
      // Set status to 'archived' to preserve the budget and its history
      await BudgetRepository.update(id, { status: 'archived' });
    } else {
      // Requirement 6.5: Delete budget and cascade delete all associated data
      // This will cascade delete:
      // - budget_alerts (via ON DELETE CASCADE)
      // - alert_triggers (via ON DELETE CASCADE through budget_alerts)
      await BudgetRepository.delete(id);
    }
  }

  /**
   * Get a budget by ID with current status
   * 
   * @param id - Budget ID
   * @param organizationId - Organization ID for multi-tenant isolation
   * @returns Budget with current spending status
   */
  static async getBudget(id: number, organizationId: number): Promise<BudgetWithStatus> {
    // Get budget
    const budget = await BudgetRepository.findByIdAndOrganization(id, organizationId);
    if (!budget) {
      throw new NotFoundError("Budget");
    }

    // Get alerts
    const alerts = await BudgetRepository.findAlertsByBudgetId(id);

    // Calculate current spending
    const spending = await this.calculateSpending(id);

    // Convert alerts to proper format
    const convertedAlerts: Alert[] = alerts.map(alert => ({
      ...alert,
      thresholdValue: Number(alert.thresholdValue),
      thresholdType: alert.thresholdType as ThresholdType,
      position: alert.position as AlertPosition,
      channels: alert.channels as AlertChannel[],
      createdAt: alert.createdAt || new Date(),
      updatedAt: alert.updatedAt || new Date(),
    }));

    // Return budget with status
    return {
      ...budget,
      amount: Number(budget.amount),
      timePeriod: budget.timePeriod as TimePeriodType,
      status: budget.status as BudgetStatus,
      customStartDate: budget.customStartDate || undefined,
      customEndDate: budget.customEndDate || undefined,
      createdAt: budget.createdAt || new Date(),
      updatedAt: budget.updatedAt || new Date(),
      currentSpending: spending.totalSpent,
      percentageUsed: spending.percentageUsed,
      remainingAmount: spending.remainingAmount,
      exceededAmount: spending.exceededAmount,
      isExceeded: spending.isExceeded,
      alerts: convertedAlerts,
    };
  }

  /**
   * List all budgets for an organization with optional filters
   * 
   * @param organizationId - Organization ID for multi-tenant isolation
   * @param filters - Optional filters (status, categoryId, timePeriod)
   * @returns List of budgets with current spending status
   */
  static async listBudgets(
    organizationId: number,
    filters?: BudgetFilters
  ): Promise<BudgetWithStatus[]> {
    // Get budgets with filters
    const budgets = await BudgetRepository.findByOrganizationWithFilters(
      organizationId,
      filters ? {
        status: filters.status,
        categoryId: filters.categoryId ? Number(filters.categoryId) : undefined,
        timePeriod: filters.timePeriod,
      } : undefined
    );

    // Get alerts and spending for each budget
    const budgetsWithStatus = await Promise.all(
      budgets.map(async (budget) => {
        const alerts = await BudgetRepository.findAlertsByBudgetId(budget.id);

        // Calculate current spending
        const spending = await this.calculateSpending(budget.id);

        // Convert alerts to proper format
        const convertedAlerts: Alert[] = alerts.map(alert => ({
          ...alert,
          thresholdValue: Number(alert.thresholdValue),
          thresholdType: alert.thresholdType as ThresholdType,
          position: alert.position as AlertPosition,
          channels: alert.channels as AlertChannel[],
          createdAt: alert.createdAt || new Date(),
          updatedAt: alert.updatedAt || new Date(),
        }));

        return {
          ...budget,
          amount: Number(budget.amount),
          timePeriod: budget.timePeriod as TimePeriodType,
          status: budget.status as BudgetStatus,
          customStartDate: budget.customStartDate || undefined,
          customEndDate: budget.customEndDate || undefined,
          createdAt: budget.createdAt || new Date(),
          updatedAt: budget.updatedAt || new Date(),
          currentSpending: spending.totalSpent,
          percentageUsed: spending.percentageUsed,
          remainingAmount: spending.remainingAmount,
          exceededAmount: spending.exceededAmount,
          isExceeded: spending.isExceeded,
          alerts: convertedAlerts,
        };
      })
    );

    return budgetsWithStatus;
  }

  /**
   * Calculate spending for a budget
   * Queries transactions filtered by category, organization, and date range
   * 
   * @param budgetId - Budget ID
   * @returns Spending calculation with metrics
   */
  static async calculateSpending(budgetId: number): Promise<SpendingCalculation> {
    // Get budget
    const budget = await BudgetRepository.findById(budgetId);
    if (!budget) {
      throw new NotFoundError("Budget");
    }

    // Get budget period dates
    const periodDates = await this.getBudgetPeriodDates(budget, new Date());

    // Query transactions filtered by:
    // - Category (budget's category)
    // - Organization (budget's organization)
    // - Date range (within budget period)
    // - Type (only expenses count towards budget spending)
    const { TransactionRepository } = await import("../repositories/transaction.repository.js");
    const { CategoryRepository } = await import("../repositories/category.repository.js");
    
    const transactions = await TransactionRepository.findByOrganizationId(
      budget.organizationId,
      {
        startDate: periodDates.startDate,
        endDate: periodDates.endDate,
        type: 'despesa', // Only expenses count towards budget
      }
    );

    // Get the category name for this budget's categoryId
    const category = await CategoryRepository.findById(budget.categoryId);
    const categoryName = category?.name;

    // Filter transactions by category
    // Note: transactions.category is stored as a string (category name)
    // We need to match by either category name or category ID (for backward compatibility)
    const categoryTransactions = transactions.filter(t => {
      // Try matching by name first (current implementation)
      if (categoryName && t.category === categoryName) {
        return true;
      }
      
      // Fallback: try matching by ID (for backward compatibility)
      const transactionCategoryId = Number(t.category);
      return !isNaN(transactionCategoryId) && transactionCategoryId === budget.categoryId;
    });

    // Calculate total spending
    const totalSpent = categoryTransactions.reduce((sum, transaction) => {
      return sum + Number(transaction.amount);
    }, 0);

    // Calculate budget metrics
    const budgetAmount = Number(budget.amount);
    const percentageUsed = budgetAmount > 0 ? (totalSpent / budgetAmount) * 100 : 0;
    const isExceeded = totalSpent > budgetAmount;
    const remainingAmount = isExceeded ? 0 : budgetAmount - totalSpent;
    const exceededAmount = isExceeded ? totalSpent - budgetAmount : 0;

    return {
      totalSpent,
      budgetAmount,
      percentageUsed,
      remainingAmount,
      exceededAmount,
      isExceeded,
    };
  }

  /**
   * Get budget period dates based on budget time period type
   * Calculates period boundaries using organization timezone
   * 
   * @param budget - Budget entity
   * @param referenceDate - Reference date for period calculation
   * @returns Period start and end dates
   */
  static async getBudgetPeriodDates(
    budget: Budget,
    referenceDate: Date
  ): Promise<PeriodDates> {
    // TODO: Fetch organization timezone from database
    // For now, using UTC as default
    const timezone = 'UTC';
    
    // TODO: Fetch organization week start day from database
    // For now, using Monday (1) as default (0 = Sunday, 1 = Monday, etc.)
    const weekStartDay = 1;

    // Create a date in the organization's timezone
    const refDate = new Date(referenceDate);

    switch (budget.timePeriod) {
      case 'daily':
        return this.getDailyPeriod(refDate, timezone);
      
      case 'weekly':
        return this.getWeeklyPeriod(refDate, timezone, weekStartDay);
      
      case 'monthly':
        return this.getMonthlyPeriod(refDate, timezone);
      
      case 'annual':
        return this.getAnnualPeriod(refDate, timezone);
      
      case 'custom':
        return this.getCustomPeriod(budget);
      
      default:
        throw new BadRequestError(`Invalid time period: ${budget.timePeriod}`);
    }
  }

  /**
   * Calculate daily period boundaries (midnight to midnight)
   * 
   * @param referenceDate - Reference date
   * @param timezone - Organization timezone
   * @returns Period dates
   */
  private static getDailyPeriod(referenceDate: Date, timezone: string): PeriodDates {
    // Start of day: 00:00:00
    const startDate = new Date(referenceDate);
    startDate.setHours(0, 0, 0, 0);

    // End of day: 23:59:59.999
    const endDate = new Date(referenceDate);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
  }

  /**
   * Calculate weekly period boundaries based on organization's week start day
   * 
   * @param referenceDate - Reference date
   * @param timezone - Organization timezone
   * @param weekStartDay - Day of week that starts the week (0 = Sunday, 1 = Monday, etc.)
   * @returns Period dates
   */
  private static getWeeklyPeriod(
    referenceDate: Date,
    timezone: string,
    weekStartDay: number
  ): PeriodDates {
    const refDate = new Date(referenceDate);
    const currentDay = refDate.getDay();

    // Calculate days to subtract to get to week start
    let daysToSubtract = currentDay - weekStartDay;
    if (daysToSubtract < 0) {
      daysToSubtract += 7;
    }

    // Start of week
    const startDate = new Date(refDate);
    startDate.setDate(refDate.getDate() - daysToSubtract);
    startDate.setHours(0, 0, 0, 0);

    // End of week (6 days after start)
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
  }

  /**
   * Calculate monthly period boundaries (first to last day of month)
   * 
   * @param referenceDate - Reference date
   * @param timezone - Organization timezone
   * @returns Period dates
   */
  private static getMonthlyPeriod(referenceDate: Date, timezone: string): PeriodDates {
    const refDate = new Date(referenceDate);

    // First day of month at 00:00:00
    const startDate = new Date(refDate.getFullYear(), refDate.getMonth(), 1, 0, 0, 0, 0);

    // Last day of month at 23:59:59.999
    const endDate = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0, 23, 59, 59, 999);

    return { startDate, endDate };
  }

  /**
   * Calculate annual period boundaries (first to last day of year)
   * 
   * @param referenceDate - Reference date
   * @param timezone - Organization timezone
   * @returns Period dates
   */
  private static getAnnualPeriod(referenceDate: Date, timezone: string): PeriodDates {
    const refDate = new Date(referenceDate);

    // First day of year at 00:00:00
    const startDate = new Date(refDate.getFullYear(), 0, 1, 0, 0, 0, 0);

    // Last day of year at 23:59:59.999
    const endDate = new Date(refDate.getFullYear(), 11, 31, 23, 59, 59, 999);

    return { startDate, endDate };
  }

  /**
   * Get custom period boundaries from budget configuration
   * 
   * @param budget - Budget entity with custom dates
   * @returns Period dates
   */
  private static getCustomPeriod(budget: Budget): PeriodDates {
    if (!budget.customStartDate || !budget.customEndDate) {
      throw new BadRequestError("Custom budget requires start and end dates");
    }

    // Return the custom dates as-is
    return {
      startDate: new Date(budget.customStartDate),
      endDate: new Date(budget.customEndDate),
    };
  }

  /**
   * Archive a budget period with final spending data and alert history
   * Requirements 9.1, 9.2:
   * - Store final spending amount, percentage used, and triggered alerts
   * - Create archive record in budget_history table
   * 
   * @param budgetId - Budget ID
   * @returns void
   */
  static async archiveBudgetPeriod(budgetId: number): Promise<void> {
    // Get budget
    const budget = await BudgetRepository.findById(budgetId);
    if (!budget) {
      throw new NotFoundError("Budget");
    }

    // Get current period dates
    const periodDates = await this.getBudgetPeriodDates(budget, new Date());

    // Calculate final spending for the period
    const spending = await this.calculateSpending(budgetId);

    // Get all triggered alerts for this period
    const { AlertService } = await import("./alert.service.js");
    
    // Generate budget period ID using a minimal budget object
    const budgetPeriodId = `${budget.id}-${budget.timePeriod}-${periodDates.startDate.toISOString().split('T')[0]}`;
    const triggeredAlerts = await AlertService.getTriggeredAlertsForPeriod(budgetId, budgetPeriodId);

    // Create archive record
    await BudgetRepository.createBudgetHistory({
      budgetId,
      periodStartDate: periodDates.startDate,
      periodEndDate: periodDates.endDate,
      finalSpendingAmount: String(spending.totalSpent),
      percentageUsed: String(spending.percentageUsed),
      alertsTriggered: triggeredAlerts.map(alert => String(alert.id)),
    });

    // Reset alert triggers for the new period
    await AlertService.resetAlertTriggers(budgetId);
  }

  /**
   * Create the next period for a recurring budget
   * Requirement 9.4:
   * - Automatically create a new period with the same configuration
   * - Only applies to recurring budgets (daily, weekly, monthly, annual)
   * 
   * @param budgetId - Budget ID
   * @returns The updated budget (same budget, new period)
   */
  static async createNextPeriod(budgetId: number): Promise<Budget> {
    // Get budget
    const budget = await BudgetRepository.findById(budgetId);
    if (!budget) {
      throw new NotFoundError("Budget");
    }

    // Only recurring budgets can have next periods
    // Custom budgets have fixed date ranges and don't recur
    if (budget.timePeriod === 'custom') {
      throw new BadRequestError("Custom budgets do not have recurring periods");
    }

    // For recurring budgets, the period automatically advances based on the current date
    // We don't need to modify the budget itself - the period calculation in
    // getBudgetPeriodDates will automatically use the current date to determine
    // the active period.
    
    // However, we should reset alert triggers for the new period
    const { AlertService } = await import("./alert.service.js");
    await AlertService.resetAlertTriggers(budgetId);

    // Return the budget unchanged (the period is calculated dynamically)
    return budget;
  }

  /**
   * Get archived periods for a budget
   * Requirement 9.3:
   * - Allow users to view archived budget periods
   * - Filter by organization for multi-tenant isolation
   * 
   * @param budgetId - Budget ID
   * @param organizationId - Organization ID for multi-tenant isolation
   * @returns List of archived budget periods
   */
  static async getArchivedPeriods(budgetId: number, organizationId: number) {
    // Verify budget exists and belongs to organization
    const budget = await BudgetRepository.findByIdAndOrganization(budgetId, organizationId);
    if (!budget) {
      throw new NotFoundError("Budget");
    }

    // Get archived periods for this budget
    const archivedPeriods = await BudgetRepository.findBudgetHistoryByBudgetId(budgetId);

    // Convert to proper format
    return archivedPeriods.map(period => ({
      ...period,
      finalSpendingAmount: Number(period.finalSpendingAmount),
      percentageUsed: Number(period.percentageUsed),
      alertsTriggered: period.alertsTriggered as number[],
    }));
  }

  /**
   * Validate and create alerts for a budget
   * 
   * @param budgetId - Budget ID
   * @param alerts - Alert configurations
   * @param budgetAmount - Budget amount for validation
   */
  private static async validateAndCreateAlerts(
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

    // Validate and create each alert
    for (const alertConfig of alerts) {
      // Validate threshold type
      if (!['fixed_amount', 'percentage'].includes(alertConfig.thresholdType)) {
        throw new BadRequestError("Alert threshold type must be 'fixed_amount' or 'percentage'");
      }

      // Validate threshold value based on type and position
      if (alertConfig.thresholdType === 'percentage') {
        if (alertConfig.position === 'before_limit') {
          if (alertConfig.thresholdValue <= 0 || alertConfig.thresholdValue > 100) {
            throw new BadRequestError("Before-limit percentage alerts must be between 0 and 100");
          }
        } else if (alertConfig.position === 'after_limit') {
          if (alertConfig.thresholdValue <= 100) {
            throw new BadRequestError("After-limit percentage alerts must be greater than 100");
          }
        }
      } else if (alertConfig.thresholdType === 'fixed_amount') {
        if (alertConfig.position === 'before_limit') {
          if (alertConfig.thresholdValue >= budgetAmount) {
            throw new BadRequestError("Before-limit fixed alerts must be less than budget amount");
          }
        } else if (alertConfig.position === 'after_limit') {
          if (alertConfig.thresholdValue <= budgetAmount) {
            throw new BadRequestError("After-limit fixed alerts must be greater than budget amount");
          }
        }
      }

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
}
