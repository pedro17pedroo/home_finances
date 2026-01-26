/**
 * Integration Tests for Transaction-Budget Flow
 * 
 * Feature: budget-management
 * 
 * These tests validate the complete flow from transaction creation to budget
 * calculation and alert triggering:
 * - Transaction triggering budget calculation (Requirements: 3.1, 4.1)
 * - Transaction triggering multiple alerts (Requirements: 4.1, 4.5)
 * - Transaction with no active budgets (Requirements: 3.1)
 * 
 * Requirements: 3.1, 4.1, 4.5
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock types to simulate the domain entities
interface Transaction {
  id: number;
  userId: number;
  organizationId: number;
  accountId: number;
  amount: number;
  type: 'receita' | 'despesa';
  category: number;
  description?: string;
  date: Date;
  balanceBefore: number;
  balanceAfter: number;
  isRecurring: boolean;
  recurringFrequency?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Budget {
  id: number;
  organizationId: number;
  categoryId: number;
  amount: number;
  currency: string;
  timePeriod: 'daily' | 'weekly' | 'monthly' | 'annual' | 'custom';
  customStartDate?: Date;
  customEndDate?: Date;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

interface Alert {
  id: number;
  budgetId: number;
  thresholdType: 'fixed_amount' | 'percentage';
  thresholdValue: number;
  position: 'before_limit' | 'after_limit';
  channels: Array<{
    type: 'in_app' | 'email' | 'sms';
    enabled: boolean;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

interface AlertTrigger {
  id: number;
  alertId: number;
  budgetPeriodId: string;
  triggeredAt: Date;
  spendingAmount: number;
}

interface SpendingCalculation {
  totalSpent: number;
  budgetAmount: number;
  percentageUsed: number;
  remainingAmount: number;
  exceededAmount: number;
  isExceeded: boolean;
}

interface NotificationPayload {
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

// In-memory stores for testing
class InMemoryTransactionStore {
  private transactions: Map<number, Transaction> = new Map();
  private transactionIdCounter = 1;

  create(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Transaction {
    const transaction: Transaction = {
      ...data,
      id: this.transactionIdCounter++,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  findById(id: number): Transaction | null {
    return this.transactions.get(id) ?? null;
  }

  findByOrganizationAndCategory(
    organizationId: number,
    categoryId: number,
    startDate: Date,
    endDate: Date
  ): Transaction[] {
    return Array.from(this.transactions.values()).filter(
      t =>
        t.organizationId === organizationId &&
        t.category === categoryId &&
        t.type === 'despesa' &&
        t.date >= startDate &&
        t.date <= endDate
    );
  }

  clear(): void {
    this.transactions.clear();
    this.transactionIdCounter = 1;
  }
}

class InMemoryBudgetStore {
  private budgets: Map<number, Budget> = new Map();
  private budgetIdCounter = 1;

  create(data: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>): Budget {
    const budget: Budget = {
      ...data,
      id: this.budgetIdCounter++,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.budgets.set(budget.id, budget);
    return budget;
  }

  findById(id: number): Budget | null {
    return this.budgets.get(id) ?? null;
  }

  findByOrganizationAndCategory(
    organizationId: number,
    categoryId: number,
    status: 'active' | 'inactive'
  ): Budget[] {
    return Array.from(this.budgets.values()).filter(
      b =>
        b.organizationId === organizationId &&
        b.categoryId === categoryId &&
        b.status === status
    );
  }

  clear(): void {
    this.budgets.clear();
    this.budgetIdCounter = 1;
  }
}

class InMemoryAlertStore {
  private alerts: Map<number, Alert> = new Map();
  private alertIdCounter = 1;

  create(data: Omit<Alert, 'id' | 'createdAt' | 'updatedAt'>): Alert {
    const alert: Alert = {
      ...data,
      id: this.alertIdCounter++,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.alerts.set(alert.id, alert);
    return alert;
  }

  findByBudgetId(budgetId: number): Alert[] {
    return Array.from(this.alerts.values()).filter(a => a.budgetId === budgetId);
  }

  clear(): void {
    this.alerts.clear();
    this.alertIdCounter = 1;
  }
}

class InMemoryAlertTriggerStore {
  private triggers: Map<string, AlertTrigger> = new Map();
  private triggerIdCounter = 1;

  private getKey(alertId: number, budgetPeriodId: string): string {
    return `${alertId}-${budgetPeriodId}`;
  }

  create(data: Omit<AlertTrigger, 'id' | 'triggeredAt'>): AlertTrigger {
    const key = this.getKey(data.alertId, data.budgetPeriodId);
    if (this.triggers.has(key)) {
      throw new Error('Alert already triggered for this period');
    }
    const trigger: AlertTrigger = {
      ...data,
      id: this.triggerIdCounter++,
      triggeredAt: new Date(),
    };
    this.triggers.set(key, trigger);
    return trigger;
  }

  hasBeenTriggered(alertId: number, budgetPeriodId: string): boolean {
    return this.triggers.has(this.getKey(alertId, budgetPeriodId));
  }

  clear(): void {
    this.triggers.clear();
    this.triggerIdCounter = 1;
  }
}

class InMemoryNotificationStore {
  private notifications: NotificationPayload[] = [];

  send(notification: NotificationPayload): void {
    this.notifications.push(notification);
  }

  getAll(): NotificationPayload[] {
    return [...this.notifications];
  }

  count(): number {
    return this.notifications.length;
  }

  clear(): void {
    this.notifications = [];
  }
}

// Simulated Budget Service
class BudgetServiceSimulator {
  constructor(
    private transactionStore: InMemoryTransactionStore,
    private budgetStore: InMemoryBudgetStore
  ) {}

  calculateSpending(budgetId: number, referenceDate: Date): SpendingCalculation {
    const budget = this.budgetStore.findById(budgetId);
    if (!budget) {
      throw new Error('Budget not found');
    }

    // Get period dates
    const periodDates = this.getBudgetPeriodDates(budget, referenceDate);

    // Get transactions for this budget
    const transactions = this.transactionStore.findByOrganizationAndCategory(
      budget.organizationId,
      budget.categoryId,
      periodDates.startDate,
      periodDates.endDate
    );

    // Calculate total spending
    const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);

    // Calculate metrics
    const budgetAmount = budget.amount;
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

  getBudgetPeriodDates(budget: Budget, referenceDate: Date): { startDate: Date; endDate: Date } {
    const refDate = new Date(referenceDate);

    switch (budget.timePeriod) {
      case 'daily':
        const startDate = new Date(refDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(refDate);
        endDate.setHours(23, 59, 59, 999);
        return { startDate, endDate };

      case 'monthly':
        const monthStart = new Date(refDate.getFullYear(), refDate.getMonth(), 1, 0, 0, 0, 0);
        const monthEnd = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0, 23, 59, 59, 999);
        return { startDate: monthStart, endDate: monthEnd };

      case 'custom':
        if (!budget.customStartDate || !budget.customEndDate) {
          throw new Error('Custom budget requires start and end dates');
        }
        return {
          startDate: new Date(budget.customStartDate),
          endDate: new Date(budget.customEndDate),
        };

      default:
        throw new Error(`Unsupported time period: ${budget.timePeriod}`);
    }
  }

  generateBudgetPeriodId(budgetId: number, startDate: Date, endDate: Date): string {
    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    };
    return `${budgetId}-${formatDate(startDate)}-${formatDate(endDate)}`;
  }
}

// Simulated Alert Service
class AlertServiceSimulator {
  constructor(
    private alertStore: InMemoryAlertStore,
    private alertTriggerStore: InMemoryAlertTriggerStore
  ) {}

  checkAlerts(
    budgetId: number,
    currentSpending: number,
    budgetAmount: number,
    budgetPeriodId: string
  ): Array<{ alert: Alert; thresholdAmount: number; currentSpending: number }> {
    const alerts = this.alertStore.findByBudgetId(budgetId);
    const triggeredAlerts: Array<{ alert: Alert; thresholdAmount: number; currentSpending: number }> = [];

    for (const alert of alerts) {
      // Calculate threshold amount
      const thresholdAmount =
        alert.thresholdType === 'percentage'
          ? (alert.thresholdValue / 100) * budgetAmount
          : alert.thresholdValue;

      // Check if spending has crossed this threshold
      const isTriggered = currentSpending >= thresholdAmount;

      if (isTriggered) {
        // Check if already triggered in this period
        const alreadyTriggered = this.alertTriggerStore.hasBeenTriggered(alert.id, budgetPeriodId);

        if (!alreadyTriggered) {
          triggeredAlerts.push({
            alert,
            thresholdAmount,
            currentSpending,
          });
        }
      }
    }

    return triggeredAlerts;
  }

  markAlertTriggered(alertId: number, budgetPeriodId: string, spendingAmount: number): void {
    this.alertTriggerStore.create({
      alertId,
      budgetPeriodId,
      spendingAmount,
    });
  }
}

// Simulated Notification Service
class NotificationServiceSimulator {
  constructor(private notificationStore: InMemoryNotificationStore) {}

  sendBudgetAlert(
    userId: number,
    alert: Alert,
    budget: Budget,
    spending: SpendingCalculation
  ): void {
    // Send notification through enabled channels
    const enabledChannels = alert.channels.filter(c => c.enabled);

    for (const channel of enabledChannels) {
      const notification: NotificationPayload = {
        title: 'Budget Alert',
        message: `Your spending has reached ${spending.percentageUsed.toFixed(1)}% of your budget`,
        data: {
          categoryName: `Category ${budget.categoryId}`,
          currentSpending: spending.totalSpent,
          budgetLimit: spending.budgetAmount,
          percentageUsed: spending.percentageUsed,
          remainingAmount: spending.isExceeded ? undefined : spending.remainingAmount,
          exceededAmount: spending.isExceeded ? spending.exceededAmount : undefined,
        },
      };

      this.notificationStore.send(notification);
    }
  }
}

// Simulated Transaction Budget Hook
class TransactionBudgetHookSimulator {
  constructor(
    private transactionStore: InMemoryTransactionStore,
    private budgetStore: InMemoryBudgetStore,
    private budgetService: BudgetServiceSimulator,
    private alertService: AlertServiceSimulator,
    private notificationService: NotificationServiceSimulator
  ) {}

  async onTransactionChange(transaction: Transaction): Promise<void> {
    // Only process expense transactions
    if (transaction.type !== 'despesa') {
      return;
    }

    // Find affected budgets
    const affectedBudgets = this.findAffectedBudgets(transaction);

    if (affectedBudgets.length === 0) {
      return;
    }

    // Process each affected budget
    for (const budget of affectedBudgets) {
      await this.processSingleBudget(budget, transaction);
    }
  }

  private findAffectedBudgets(transaction: Transaction): Budget[] {
    // Get all active budgets for this organization and category
    const budgets = this.budgetStore.findByOrganizationAndCategory(
      transaction.organizationId,
      transaction.category,
      'active'
    );

    // Filter budgets by date - only include budgets whose period contains the transaction date
    const affectedBudgets: Budget[] = [];

    for (const budget of budgets) {
      const periodDates = this.budgetService.getBudgetPeriodDates(budget, transaction.date);

      // Check if transaction date falls within budget period
      if (transaction.date >= periodDates.startDate && transaction.date <= periodDates.endDate) {
        affectedBudgets.push(budget);
      }
    }

    return affectedBudgets;
  }

  private async processSingleBudget(budget: Budget, transaction: Transaction): Promise<void> {
    // Calculate current spending
    const spending = this.budgetService.calculateSpending(budget.id, transaction.date);

    // Generate budget period ID
    const periodDates = this.budgetService.getBudgetPeriodDates(budget, transaction.date);
    const budgetPeriodId = this.budgetService.generateBudgetPeriodId(
      budget.id,
      periodDates.startDate,
      periodDates.endDate
    );

    // Check which alerts should be triggered
    const triggeredAlerts = this.alertService.checkAlerts(
      budget.id,
      spending.totalSpent,
      budget.amount,
      budgetPeriodId
    );

    // Trigger each alert
    for (const triggeredAlert of triggeredAlerts) {
      // Mark alert as triggered
      this.alertService.markAlertTriggered(
        triggeredAlert.alert.id,
        budgetPeriodId,
        spending.totalSpent
      );

      // Send notifications
      this.notificationService.sendBudgetAlert(
        transaction.userId,
        triggeredAlert.alert,
        budget,
        spending
      );
    }
  }
}

describe('Transaction-Budget Integration Tests', () => {
  let transactionStore: InMemoryTransactionStore;
  let budgetStore: InMemoryBudgetStore;
  let alertStore: InMemoryAlertStore;
  let alertTriggerStore: InMemoryAlertTriggerStore;
  let notificationStore: InMemoryNotificationStore;
  let budgetService: BudgetServiceSimulator;
  let alertService: AlertServiceSimulator;
  let notificationService: NotificationServiceSimulator;
  let transactionBudgetHook: TransactionBudgetHookSimulator;

  beforeEach(() => {
    transactionStore = new InMemoryTransactionStore();
    budgetStore = new InMemoryBudgetStore();
    alertStore = new InMemoryAlertStore();
    alertTriggerStore = new InMemoryAlertTriggerStore();
    notificationStore = new InMemoryNotificationStore();
    budgetService = new BudgetServiceSimulator(transactionStore, budgetStore);
    alertService = new AlertServiceSimulator(alertStore, alertTriggerStore);
    notificationService = new NotificationServiceSimulator(notificationStore);
    transactionBudgetHook = new TransactionBudgetHookSimulator(
      transactionStore,
      budgetStore,
      budgetService,
      alertService,
      notificationService
    );
  });

  /**
   * Test: Transaction triggering budget calculation
   * Requirements: 3.1, 4.1
   */
  describe('Transaction triggering budget calculation', () => {
    it('should calculate spending when transaction is created in category with active budget', async () => {
      // Create a monthly budget for category 1
      const budget = budgetStore.create({
        organizationId: 1,
        categoryId: 1,
        amount: 1000,
        currency: 'USD',
        timePeriod: 'monthly',
        status: 'active',
      });

      // Create an alert at 80%
      alertStore.create({
        budgetId: budget.id,
        thresholdType: 'percentage',
        thresholdValue: 80,
        position: 'before_limit',
        channels: [{ type: 'in_app', enabled: true }],
      });

      // Create first transaction (50% of budget)
      const transaction1 = transactionStore.create({
        userId: 1,
        organizationId: 1,
        accountId: 1,
        amount: 500,
        type: 'despesa',
        category: 1,
        description: 'First expense',
        date: new Date('2024-01-15'),
        balanceBefore: 2000,
        balanceAfter: 1500,
        isRecurring: false,
      });

      // Trigger budget hook
      await transactionBudgetHook.onTransactionChange(transaction1);

      // Calculate spending
      const spending1 = budgetService.calculateSpending(budget.id, transaction1.date);

      // Assertions for first transaction
      expect(spending1.totalSpent).toBe(500);
      expect(spending1.budgetAmount).toBe(1000);
      expect(spending1.percentageUsed).toBe(50);
      expect(spending1.remainingAmount).toBe(500);
      expect(spending1.isExceeded).toBe(false);

      // No alerts should be triggered yet (50% < 80%)
      expect(notificationStore.count()).toBe(0);

      // Create second transaction (total 85% of budget)
      const transaction2 = transactionStore.create({
        userId: 1,
        organizationId: 1,
        accountId: 1,
        amount: 350,
        type: 'despesa',
        category: 1,
        description: 'Second expense',
        date: new Date('2024-01-20'),
        balanceBefore: 1500,
        balanceAfter: 1150,
        isRecurring: false,
      });

      // Trigger budget hook
      await transactionBudgetHook.onTransactionChange(transaction2);

      // Calculate spending after second transaction
      const spending2 = budgetService.calculateSpending(budget.id, transaction2.date);

      // Assertions for second transaction
      expect(spending2.totalSpent).toBe(850);
      expect(spending2.budgetAmount).toBe(1000);
      expect(spending2.percentageUsed).toBe(85);
      expect(spending2.remainingAmount).toBe(150);
      expect(spending2.isExceeded).toBe(false);

      // Alert should be triggered now (85% >= 80%)
      expect(notificationStore.count()).toBe(1);

      const notification = notificationStore.getAll()[0];
      expect(notification.data.currentSpending).toBe(850);
      expect(notification.data.budgetLimit).toBe(1000);
      expect(notification.data.percentageUsed).toBe(85);
      expect(notification.data.remainingAmount).toBe(150);
    });

    it('should only count expense transactions towards budget spending', async () => {
      // Create a monthly budget
      const budget = budgetStore.create({
        organizationId: 1,
        categoryId: 1,
        amount: 1000,
        currency: 'USD',
        timePeriod: 'monthly',
        status: 'active',
      });

      // Create an expense transaction
      const expenseTransaction = transactionStore.create({
        userId: 1,
        organizationId: 1,
        accountId: 1,
        amount: 500,
        type: 'despesa',
        category: 1,
        description: 'Expense',
        date: new Date('2024-01-15'),
        balanceBefore: 2000,
        balanceAfter: 1500,
        isRecurring: false,
      });

      // Create an income transaction (should not count)
      const incomeTransaction = transactionStore.create({
        userId: 1,
        organizationId: 1,
        accountId: 1,
        amount: 300,
        type: 'receita',
        category: 1,
        description: 'Income',
        date: new Date('2024-01-16'),
        balanceBefore: 1500,
        balanceAfter: 1800,
        isRecurring: false,
      });

      // Trigger budget hook for both transactions
      await transactionBudgetHook.onTransactionChange(expenseTransaction);
      await transactionBudgetHook.onTransactionChange(incomeTransaction);

      // Calculate spending
      const spending = budgetService.calculateSpending(budget.id, new Date('2024-01-20'));

      // Only expense should count
      expect(spending.totalSpent).toBe(500);
      expect(spending.percentageUsed).toBe(50);
    });
  });

  /**
   * Test: Transaction triggering multiple alerts
   * Requirements: 4.1, 4.5
   */
  describe('Transaction triggering multiple alerts', () => {
    it('should trigger multiple alerts when single transaction crosses multiple thresholds', async () => {
      // Create a monthly budget
      const budget = budgetStore.create({
        organizationId: 1,
        categoryId: 1,
        amount: 1000,
        currency: 'USD',
        timePeriod: 'monthly',
        status: 'active',
      });

      // Create multiple alerts
      const alert1 = alertStore.create({
        budgetId: budget.id,
        thresholdType: 'percentage',
        thresholdValue: 50,
        position: 'before_limit',
        channels: [{ type: 'in_app', enabled: true }],
      });

      const alert2 = alertStore.create({
        budgetId: budget.id,
        thresholdType: 'percentage',
        thresholdValue: 80,
        position: 'before_limit',
        channels: [{ type: 'in_app', enabled: true }, { type: 'email', enabled: true }],
      });

      const alert3 = alertStore.create({
        budgetId: budget.id,
        thresholdType: 'percentage',
        thresholdValue: 110,
        position: 'after_limit',
        channels: [{ type: 'in_app', enabled: true }, { type: 'sms', enabled: true }],
      });

      // Create a large transaction that crosses all thresholds at once (90% of budget)
      const transaction = transactionStore.create({
        userId: 1,
        organizationId: 1,
        accountId: 1,
        amount: 900,
        type: 'despesa',
        category: 1,
        description: 'Large expense',
        date: new Date('2024-01-15'),
        balanceBefore: 2000,
        balanceAfter: 1100,
        isRecurring: false,
      });

      // Trigger budget hook
      await transactionBudgetHook.onTransactionChange(transaction);

      // Calculate spending
      const spending = budgetService.calculateSpending(budget.id, transaction.date);

      // Assertions
      expect(spending.totalSpent).toBe(900);
      expect(spending.percentageUsed).toBe(90);

      // Both 50% and 80% alerts should be triggered (90% crosses both)
      // 110% alert should NOT be triggered (90% < 110%)
      expect(notificationStore.count()).toBe(3); // 1 notification for alert1 + 2 for alert2 (in_app + email)

      const notifications = notificationStore.getAll();
      
      // Verify all notifications have correct data
      for (const notification of notifications) {
        expect(notification.data.currentSpending).toBe(900);
        expect(notification.data.budgetLimit).toBe(1000);
        expect(notification.data.percentageUsed).toBe(90);
        expect(notification.data.remainingAmount).toBe(100);
      }

      // Verify alerts are marked as triggered
      const periodDates = budgetService.getBudgetPeriodDates(budget, transaction.date);
      const budgetPeriodId = budgetService.generateBudgetPeriodId(
        budget.id,
        periodDates.startDate,
        periodDates.endDate
      );

      expect(alertTriggerStore.hasBeenTriggered(alert1.id, budgetPeriodId)).toBe(true);
      expect(alertTriggerStore.hasBeenTriggered(alert2.id, budgetPeriodId)).toBe(true);
      expect(alertTriggerStore.hasBeenTriggered(alert3.id, budgetPeriodId)).toBe(false);
    });

    it('should trigger after-limit alert when budget is exceeded', async () => {
      // Create a monthly budget
      const budget = budgetStore.create({
        organizationId: 1,
        categoryId: 1,
        amount: 1000,
        currency: 'USD',
        timePeriod: 'monthly',
        status: 'active',
      });

      // Create alerts
      alertStore.create({
        budgetId: budget.id,
        thresholdType: 'percentage',
        thresholdValue: 80,
        position: 'before_limit',
        channels: [{ type: 'in_app', enabled: true }],
      });

      const afterLimitAlert = alertStore.create({
        budgetId: budget.id,
        thresholdType: 'percentage',
        thresholdValue: 110,
        position: 'after_limit',
        channels: [{ type: 'in_app', enabled: true }, { type: 'email', enabled: true }],
      });

      // Create first transaction (80% of budget)
      const transaction1 = transactionStore.create({
        userId: 1,
        organizationId: 1,
        accountId: 1,
        amount: 800,
        type: 'despesa',
        category: 1,
        description: 'First expense',
        date: new Date('2024-01-15'),
        balanceBefore: 2000,
        balanceAfter: 1200,
        isRecurring: false,
      });

      await transactionBudgetHook.onTransactionChange(transaction1);

      // Should trigger 80% alert
      expect(notificationStore.count()).toBe(1);

      // Create second transaction that exceeds budget (total 115%)
      const transaction2 = transactionStore.create({
        userId: 1,
        organizationId: 1,
        accountId: 1,
        amount: 350,
        type: 'despesa',
        category: 1,
        description: 'Second expense',
        date: new Date('2024-01-20'),
        balanceBefore: 1200,
        balanceAfter: 850,
        isRecurring: false,
      });

      await transactionBudgetHook.onTransactionChange(transaction2);

      // Calculate spending
      const spending = budgetService.calculateSpending(budget.id, transaction2.date);

      // Assertions
      expect(spending.totalSpent).toBe(1150);
      expect(spending.percentageUsed).toBeCloseTo(115, 1);
      expect(spending.isExceeded).toBe(true);
      expect(spending.exceededAmount).toBe(150);

      // After-limit alert should be triggered (2 channels: in_app + email)
      expect(notificationStore.count()).toBe(3); // 1 from first transaction + 2 from second

      const lastNotifications = notificationStore.getAll().slice(-2);
      for (const notification of lastNotifications) {
        expect(notification.data.currentSpending).toBe(1150);
        expect(notification.data.budgetLimit).toBe(1000);
        expect(notification.data.percentageUsed).toBeCloseTo(115, 1);
        expect(notification.data.exceededAmount).toBe(150);
        expect(notification.data.remainingAmount).toBeUndefined();
      }
    });

    it('should not trigger same alert twice in same period', async () => {
      // Create a monthly budget
      const budget = budgetStore.create({
        organizationId: 1,
        categoryId: 1,
        amount: 1000,
        currency: 'USD',
        timePeriod: 'monthly',
        status: 'active',
      });

      // Create alert at 50%
      alertStore.create({
        budgetId: budget.id,
        thresholdType: 'percentage',
        thresholdValue: 50,
        position: 'before_limit',
        channels: [{ type: 'in_app', enabled: true }],
      });

      // Create first transaction (60% of budget)
      const transaction1 = transactionStore.create({
        userId: 1,
        organizationId: 1,
        accountId: 1,
        amount: 600,
        type: 'despesa',
        category: 1,
        description: 'First expense',
        date: new Date('2024-01-15'),
        balanceBefore: 2000,
        balanceAfter: 1400,
        isRecurring: false,
      });

      await transactionBudgetHook.onTransactionChange(transaction1);

      // Alert should be triggered
      expect(notificationStore.count()).toBe(1);

      // Create second transaction (total 80% of budget)
      const transaction2 = transactionStore.create({
        userId: 1,
        organizationId: 1,
        accountId: 1,
        amount: 200,
        type: 'despesa',
        category: 1,
        description: 'Second expense',
        date: new Date('2024-01-20'),
        balanceBefore: 1400,
        balanceAfter: 1200,
        isRecurring: false,
      });

      await transactionBudgetHook.onTransactionChange(transaction2);

      // Alert should NOT be triggered again (already triggered in this period)
      expect(notificationStore.count()).toBe(1);
    });
  });

  /**
   * Test: Transaction with no active budgets
   * Requirements: 3.1
   */
  describe('Transaction with no active budgets', () => {
    it('should not trigger any calculations when no active budgets exist for category', async () => {
      // Create transaction without any budgets
      const transaction = transactionStore.create({
        userId: 1,
        organizationId: 1,
        accountId: 1,
        amount: 500,
        type: 'despesa',
        category: 1,
        description: 'Expense without budget',
        date: new Date('2024-01-15'),
        balanceBefore: 2000,
        balanceAfter: 1500,
        isRecurring: false,
      });

      // Trigger budget hook
      await transactionBudgetHook.onTransactionChange(transaction);

      // No notifications should be sent
      expect(notificationStore.count()).toBe(0);

      // No errors should occur
      // Test passes if no exceptions are thrown
    });

    it('should not process inactive budgets', async () => {
      // Create an inactive budget
      const inactiveBudget = budgetStore.create({
        organizationId: 1,
        categoryId: 1,
        amount: 1000,
        currency: 'USD',
        timePeriod: 'monthly',
        status: 'inactive',
      });

      // Create alert for inactive budget
      alertStore.create({
        budgetId: inactiveBudget.id,
        thresholdType: 'percentage',
        thresholdValue: 50,
        position: 'before_limit',
        channels: [{ type: 'in_app', enabled: true }],
      });

      // Create transaction
      const transaction = transactionStore.create({
        userId: 1,
        organizationId: 1,
        accountId: 1,
        amount: 600,
        type: 'despesa',
        category: 1,
        description: 'Expense',
        date: new Date('2024-01-15'),
        balanceBefore: 2000,
        balanceAfter: 1400,
        isRecurring: false,
      });

      // Trigger budget hook
      await transactionBudgetHook.onTransactionChange(transaction);

      // No notifications should be sent (budget is inactive)
      expect(notificationStore.count()).toBe(0);
    });

    it('should not process budgets for different categories', async () => {
      // Create budget for category 1
      const budget = budgetStore.create({
        organizationId: 1,
        categoryId: 1,
        amount: 1000,
        currency: 'USD',
        timePeriod: 'monthly',
        status: 'active',
      });

      // Create alert
      alertStore.create({
        budgetId: budget.id,
        thresholdType: 'percentage',
        thresholdValue: 50,
        position: 'before_limit',
        channels: [{ type: 'in_app', enabled: true }],
      });

      // Create transaction for category 2 (different category)
      const transaction = transactionStore.create({
        userId: 1,
        organizationId: 1,
        accountId: 1,
        amount: 600,
        type: 'despesa',
        category: 2,
        description: 'Expense in different category',
        date: new Date('2024-01-15'),
        balanceBefore: 2000,
        balanceAfter: 1400,
        isRecurring: false,
      });

      // Trigger budget hook
      await transactionBudgetHook.onTransactionChange(transaction);

      // No notifications should be sent (different category)
      expect(notificationStore.count()).toBe(0);
    });

    it('should not process budgets for different organizations', async () => {
      // Create budget for organization 1
      const budget = budgetStore.create({
        organizationId: 1,
        categoryId: 1,
        amount: 1000,
        currency: 'USD',
        timePeriod: 'monthly',
        status: 'active',
      });

      // Create alert
      alertStore.create({
        budgetId: budget.id,
        thresholdType: 'percentage',
        thresholdValue: 50,
        position: 'before_limit',
        channels: [{ type: 'in_app', enabled: true }],
      });

      // Create transaction for organization 2 (different organization)
      const transaction = transactionStore.create({
        userId: 1,
        organizationId: 2,
        accountId: 1,
        amount: 600,
        type: 'despesa',
        category: 1,
        description: 'Expense in different organization',
        date: new Date('2024-01-15'),
        balanceBefore: 2000,
        balanceAfter: 1400,
        isRecurring: false,
      });

      // Trigger budget hook
      await transactionBudgetHook.onTransactionChange(transaction);

      // No notifications should be sent (different organization)
      expect(notificationStore.count()).toBe(0);
    });

    it('should not process budgets when transaction is outside budget period', async () => {
      // Create a daily budget for January 15, 2024
      const budget = budgetStore.create({
        organizationId: 1,
        categoryId: 1,
        amount: 1000,
        currency: 'USD',
        timePeriod: 'daily',
        status: 'active',
      });

      // Create alert
      alertStore.create({
        budgetId: budget.id,
        thresholdType: 'percentage',
        thresholdValue: 50,
        position: 'before_limit',
        channels: [{ type: 'in_app', enabled: true }],
      });

      // Create transaction on January 15
      const transaction1 = transactionStore.create({
        userId: 1,
        organizationId: 1,
        accountId: 1,
        amount: 600,
        type: 'despesa',
        category: 1,
        description: 'Expense on Jan 15',
        date: new Date('2024-01-15T10:00:00'),
        balanceBefore: 2000,
        balanceAfter: 1400,
        isRecurring: false,
      });

      await transactionBudgetHook.onTransactionChange(transaction1);

      // Alert should be triggered for Jan 15
      expect(notificationStore.count()).toBe(1);

      // Create transaction on January 16 (different day)
      const transaction2 = transactionStore.create({
        userId: 1,
        organizationId: 1,
        accountId: 1,
        amount: 600,
        type: 'despesa',
        category: 1,
        description: 'Expense on Jan 16',
        date: new Date('2024-01-16T10:00:00'),
        balanceBefore: 1400,
        balanceAfter: 800,
        isRecurring: false,
      });

      await transactionBudgetHook.onTransactionChange(transaction2);

      // For daily budget, Jan 16 is a different period
      // The budget should be processed, but spending should only include Jan 16 transactions
      const spending = budgetService.calculateSpending(budget.id, transaction2.date);
      
      // Only transaction2 should count for Jan 16
      expect(spending.totalSpent).toBe(600);
      expect(spending.percentageUsed).toBe(60);

      // Alert should be triggered again for the new period
      expect(notificationStore.count()).toBe(2);
    });
  });
});
