import { api } from './api';

/**
 * Budget Management API Client Service
 * 
 * This service provides API calls to the budget management backend endpoints.
 * It handles authentication and organization context automatically through the
 * base API client.
 * 
 * Requirements: 7.1 - Multi-platform support for mobile app
 */

// ============================================================================
// Type Definitions
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

/**
 * Alert channel configuration
 */
export interface AlertChannel {
  type: ChannelType;
  enabled: boolean;
}

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
 * Budget entity
 */
export interface Budget {
  id: number;
  organizationId: number;
  categoryId: number;
  amount: number;
  currency: string;
  timePeriod: TimePeriodType;
  customStartDate?: string;
  customEndDate?: string;
  status: BudgetStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Alert entity
 */
export interface Alert {
  id: number;
  budgetId: number;
  thresholdType: ThresholdType;
  thresholdValue: number;
  position: AlertPosition;
  channels: AlertChannel[];
  createdAt: string;
  updatedAt: string;
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
 * Budget history record
 */
export interface BudgetHistory {
  id: number;
  budgetId: number;
  periodStartDate: string;
  periodEndDate: string;
  finalSpendingAmount: number;
  percentageUsed: number;
  alertsTriggered: string[];
  createdAt: string;
}

/**
 * DTO for creating a new budget
 */
export interface CreateBudgetRequest {
  categoryId: string | number;
  amount: number;
  timePeriod: TimePeriodType;
  customStartDate?: string;
  customEndDate?: string;
  status?: BudgetStatus;
  alerts?: AlertConfig[];
}

/**
 * DTO for updating an existing budget
 */
export interface UpdateBudgetRequest {
  amount?: number;
  timePeriod?: TimePeriodType;
  customStartDate?: string;
  customEndDate?: string;
  status?: BudgetStatus;
  alerts?: AlertConfig[];
}

/**
 * DTO for updating an alert
 */
export interface UpdateAlertRequest {
  thresholdType?: ThresholdType;
  thresholdValue?: number;
  position?: AlertPosition;
  channels?: AlertChannel[];
}

/**
 * Budget filters for listing/querying
 */
export interface BudgetFilters {
  status?: BudgetStatus;
  categoryId?: string | number;
  timePeriod?: TimePeriodType;
}

// ============================================================================
// Budget API Functions
// ============================================================================

/**
 * Create a new budget
 * 
 * POST /api/budgets
 * 
 * Requirements:
 * - 7.1: Provide budget creation functionality in mobile app
 * - 1.1: Require category, time period, and budget amount
 * - 1.4: Set budget status to active by default
 * - 1.6: Associate budget with user's organization
 * 
 * @param data - Budget creation data
 * @returns Created budget with status
 */
export async function createBudget(data: CreateBudgetRequest): Promise<BudgetWithStatus> {
  const response = await api.post('/budgets', data);
  return response.data.data || response.data;
}

/**
 * List all budgets for the user's organization
 * 
 * GET /api/budgets
 * 
 * Requirements:
 * - 7.1: Provide budget viewing functionality in mobile app
 * - 5.1: Display all budgets for user's organization
 * 
 * @param filters - Optional filters for status, category, or time period
 * @returns Array of budgets with current status
 */
export async function getBudgets(filters?: BudgetFilters): Promise<BudgetWithStatus[]> {
  const response = await api.get('/budgets', {
    params: filters,
  });
  return response.data.data || response.data;
}

/**
 * Get budget detail with current status
 * 
 * GET /api/budgets/:id
 * 
 * Requirements:
 * - 7.1: Provide budget viewing functionality in mobile app
 * - 5.2: Display budget with category, amount, period, status
 * - 5.3: Show current spending amount and percentage used
 * 
 * @param id - Budget ID
 * @returns Budget with current status and spending information
 */
export async function getBudget(id: number): Promise<BudgetWithStatus> {
  const response = await api.get(`/budgets/${id}`);
  return response.data.data || response.data;
}

/**
 * Update an existing budget
 * 
 * PUT /api/budgets/:id
 * 
 * Requirements:
 * - 7.1: Provide budget editing functionality in mobile app
 * - 6.1: Allow modification of budget amount, time period, and status
 * 
 * @param id - Budget ID
 * @param data - Budget update data
 * @returns Updated budget with status
 */
export async function updateBudget(id: number, data: UpdateBudgetRequest): Promise<BudgetWithStatus> {
  const response = await api.put(`/budgets/${id}`, data);
  return response.data.data || response.data;
}

/**
 * Delete or archive a budget
 * 
 * DELETE /api/budgets/:id
 * 
 * Requirements:
 * - 7.1: Provide budget management functionality in mobile app
 * - 6.5: Remove all associated alerts and notification history
 * - 6.6: Archive budgets with historical data instead of deleting
 * 
 * @param id - Budget ID
 */
export async function deleteBudget(id: number): Promise<void> {
  await api.delete(`/budgets/${id}`);
}

/**
 * Configure alerts for a budget
 * 
 * POST /api/budgets/:id/alerts
 * 
 * Requirements:
 * - 7.1: Provide alert configuration functionality in mobile app
 * - 2.1: Allow up to 3 alerts per budget
 * - 2.2: Validate alert distribution (2 before, 1 after)
 * 
 * @param budgetId - Budget ID
 * @param alerts - Array of alert configurations
 */
export async function configureAlerts(budgetId: number, alerts: AlertConfig[]): Promise<void> {
  await api.post(`/budgets/${budgetId}/alerts`, { alerts });
}

/**
 * Update an alert
 * 
 * PUT /api/alerts/:id
 * 
 * Requirements:
 * - 7.1: Provide alert editing functionality in mobile app
 * - 6.2: Allow modification of alert configurations
 * 
 * @param alertId - Alert ID
 * @param data - Alert update data
 * @returns Updated alert
 */
export async function updateAlert(alertId: number, data: UpdateAlertRequest): Promise<Alert> {
  const response = await api.put(`/alerts/${alertId}`, data);
  return response.data.data || response.data;
}

/**
 * Delete an alert
 * 
 * DELETE /api/alerts/:id
 * 
 * Requirements:
 * - 7.1: Provide alert management functionality in mobile app
 * 
 * @param alertId - Alert ID
 */
export async function deleteAlert(alertId: number): Promise<void> {
  await api.delete(`/alerts/${alertId}`);
}

/**
 * Get current budget status with spending
 * 
 * GET /api/budgets/:id/status
 * 
 * Requirements:
 * - 7.1: Provide budget status viewing functionality in mobile app
 * - 5.2: Display budget with category, amount, period, status
 * - 5.3: Show current spending amount and percentage used
 * 
 * @param id - Budget ID
 * @returns Budget with current status and spending information
 */
export async function getBudgetStatus(id: number): Promise<BudgetWithStatus> {
  const response = await api.get(`/budgets/${id}/status`);
  return response.data.data || response.data;
}

/**
 * Get archived periods for a budget
 * 
 * GET /api/budgets/:id/history
 * 
 * Requirements:
 * - 7.1: Provide budget history viewing functionality in mobile app
 * - 9.3: Allow users to view archived budget periods
 * 
 * @param id - Budget ID
 * @returns Array of archived budget periods
 */
export async function getBudgetHistory(id: number): Promise<BudgetHistory[]> {
  const response = await api.get(`/budgets/${id}/history`);
  return response.data.data || response.data;
}
