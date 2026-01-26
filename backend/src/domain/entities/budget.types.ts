/**
 * Budget Management Data Models
 * 
 * This file contains TypeScript interfaces and enums for the budget management system.
 * These types match the database schema and design document specifications.
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Time period types for budget duration
 */
export enum TimePeriodType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
  CUSTOM = 'custom'
}

/**
 * Budget status values
 */
export enum BudgetStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived'
}

/**
 * Alert threshold types
 */
export enum ThresholdType {
  FIXED_AMOUNT = 'fixed_amount',
  PERCENTAGE = 'percentage'
}

/**
 * Alert position relative to budget limit
 */
export enum AlertPosition {
  BEFORE_LIMIT = 'before_limit',
  AFTER_LIMIT = 'after_limit'
}

/**
 * Notification channel types
 */
export enum ChannelType {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms'
}

// ============================================================================
// Core Data Models
// ============================================================================

/**
 * Budget entity representing a spending limit for a category
 */
export interface Budget {
  id: number;
  organizationId: number;
  categoryId: number;
  amount: number;
  currency: string;
  timePeriod: TimePeriodType;
  customStartDate?: Date;
  customEndDate?: Date;
  status: BudgetStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Alert channel configuration
 */
export interface AlertChannel {
  type: ChannelType;
  enabled: boolean;
}

/**
 * Alert entity representing a notification trigger at a spending threshold
 */
export interface Alert {
  id: number;
  budgetId: number;
  thresholdType: ThresholdType;
  thresholdValue: number;
  position: AlertPosition;
  channels: AlertChannel[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Alert trigger record for deduplication tracking
 */
export interface AlertTrigger {
  id: number;
  alertId: number;
  budgetPeriodId: string;
  triggeredAt: Date;
  spendingAmount: number;
}

/**
 * Budget history record for archiving past budget periods
 */
export interface BudgetHistory {
  id: number;
  budgetId: number;
  periodStartDate: Date;
  periodEndDate: Date;
  finalSpendingAmount: number;
  percentageUsed: number;
  alertsTriggered: string[]; // Array of alert IDs
  createdAt: Date;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * Alert configuration for budget creation/update
 */
export interface AlertConfig {
  thresholdType: ThresholdType;
  thresholdValue: number;
  position: AlertPosition;
  channels: AlertChannel[];
}

/**
 * DTO for creating a new budget
 */
export interface CreateBudgetDTO {
  categoryId: string | number;
  amount: number;
  timePeriod: TimePeriodType;
  customStartDate?: Date;
  customEndDate?: Date;
  status?: BudgetStatus;
  alerts?: AlertConfig[];
}

/**
 * DTO for updating an existing budget
 */
export interface UpdateBudgetDTO {
  amount?: number;
  timePeriod?: TimePeriodType;
  customStartDate?: Date;
  customEndDate?: Date;
  status?: BudgetStatus;
  alerts?: AlertConfig[];
}

/**
 * DTO for updating an alert
 */
export interface UpdateAlertDTO {
  thresholdType?: ThresholdType;
  thresholdValue?: number;
  position?: AlertPosition;
  channels?: AlertChannel[];
}

/**
 * Spending calculation result
 */
export interface SpendingCalculation {
  totalSpent: number;
  budgetAmount: number;
  percentageUsed: number;
  remainingAmount: number;
  exceededAmount: number;
  isExceeded: boolean;
}

/**
 * Budget period date boundaries
 */
export interface PeriodDates {
  startDate: Date;
  endDate: Date;
}

/**
 * Budget with current status and spending information
 */
export interface BudgetWithStatus extends Budget {
  currentSpending: number;
  percentageUsed: number;
  remainingAmount: number;
  exceededAmount: number;
  isExceeded: boolean;
  alerts: Alert[];
}

/**
 * Budget filters for listing/querying
 */
export interface BudgetFilters {
  status?: BudgetStatus;
  categoryId?: string | number;
  timePeriod?: TimePeriodType;
}

/**
 * Triggered alert information
 */
export interface TriggeredAlert {
  alert: Alert;
  thresholdAmount: number;
  currentSpending: number;
}

/**
 * Notification payload for budget alerts
 */
export interface NotificationPayload {
  title: string;
  message: string;
  data: {
    categoryName: string;
    currentSpending: number;
    budgetLimit: number;
    percentageUsed: number;
    remainingAmount?: number;
    exceededAmount?: number;
  };
}
