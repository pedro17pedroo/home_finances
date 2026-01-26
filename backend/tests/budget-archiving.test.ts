/**
 * Budget Archiving Tests
 * 
 * Tests for budget period archiving and recurring budget rollover functionality.
 * Requirements: 9.1, 9.2, 9.4
 */

import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { db } from '../src/core/database/db.js';
import { 
  budgets, 
  budgetAlerts,
  alertTriggers,
  budgetHistory,
  organizations,
  categories,
  users,
  transactions
} from '../src/core/database/schema.js';
import { eq } from 'drizzle-orm';
import { BudgetService } from '../src/domain/services/budget.service.js';
import { AlertService } from '../src/domain/services/alert.service.js';
import { TimePeriodType, ThresholdType, AlertPosition, ChannelType } from '../src/domain/entities/budget.types.js';

describe('Budget Archiving', () => {
  let testOrgId: number;
  let testCategoryId: number;
  let testUserId: number;

  beforeAll(async () => {
    // Create test organization
    const org = await db
      .insert(organizations)
      .values({
        name: 'Test Org - Archiving',
        ownerId: 1,
      })
      .returning();
    testOrgId = org[0].id;

    // Create test user
    const user = await db
      .insert(users)
      .values({
        email: `test-archiving-${Date.now()}@example.com`,
        password: 'hashedpassword',
        organizationId: testOrgId,
      })
      .returning();
    testUserId = user[0].id;

    // Create test category
    const category = await db
      .insert(categories)
      .values({
        name: 'Test Category - Archiving',
        type: 'despesa',
        userId: testUserId,
        organizationId: testOrgId,
      })
      .returning();
    testCategoryId = category[0].id;
  });

  afterAll(async () => {
    // Clean up in reverse order of dependencies
    if (testOrgId) {
      await db.delete(transactions).where(eq(transactions.organizationId, testOrgId));
      await db.delete(budgets).where(eq(budgets.organizationId, testOrgId));
      await db.delete(categories).where(eq(categories.organizationId, testOrgId));
      await db.delete(users).where(eq(users.organizationId, testOrgId));
      await db.delete(organizations).where(eq(organizations.id, testOrgId));
    }
  });

  beforeEach(async () => {
    // Clean up budgets, transactions and related data before each test
    await db.delete(transactions).where(eq(transactions.organizationId, testOrgId));
    await db.delete(budgets).where(eq(budgets.organizationId, testOrgId));
  });

  describe('Requirement 9.1 & 9.2: Archive budget period with final spending data', () => {
    it('should archive budget period with final spending amount and percentage', async () => {
      // Create a monthly budget
      const budget = await BudgetService.createBudget(
        {
          categoryId: testCategoryId,
          amount: 1000,
          timePeriod: TimePeriodType.MONTHLY,
        },
        testOrgId,
        'USD'
      );

      // Create some transactions
      const now = new Date();
      await db.insert(transactions).values([
        {
          userId: testUserId,
          organizationId: testOrgId,
          category: String(testCategoryId),
          amount: '300',
          type: 'despesa',
          date: now,
          description: 'Test transaction 1',
        },
        {
          userId: testUserId,
          organizationId: testOrgId,
          category: String(testCategoryId),
          amount: '200',
          type: 'despesa',
          date: now,
          description: 'Test transaction 2',
        },
      ]);

      // Archive the budget period
      await BudgetService.archiveBudgetPeriod(budget.id);

      // Verify archive record was created
      const archives = await db
        .select()
        .from(budgetHistory)
        .where(eq(budgetHistory.budgetId, budget.id));

      expect(archives).toHaveLength(1);
      expect(Number(archives[0].finalSpendingAmount)).toBe(500);
      expect(Number(archives[0].percentageUsed)).toBe(50);
    });

    it('should archive triggered alerts in the budget history', async () => {
      // Create a budget with alerts
      const budget = await BudgetService.createBudget(
        {
          categoryId: testCategoryId,
          amount: 1000,
          timePeriod: TimePeriodType.MONTHLY,
          alerts: [
            {
              thresholdType: ThresholdType.PERCENTAGE,
              thresholdValue: 50,
              position: AlertPosition.BEFORE_LIMIT,
              channels: [{ type: ChannelType.IN_APP, enabled: true }],
            },
            {
              thresholdType: ThresholdType.PERCENTAGE,
              thresholdValue: 80,
              position: AlertPosition.BEFORE_LIMIT,
              channels: [{ type: ChannelType.IN_APP, enabled: true }],
            },
          ],
        },
        testOrgId,
        'USD'
      );

      // Get the alerts
      const alerts = await db
        .select()
        .from(budgetAlerts)
        .where(eq(budgetAlerts.budgetId, budget.id));

      // Mark some alerts as triggered
      const periodDates = await BudgetService.getBudgetPeriodDates(budget, new Date());
      const budgetPeriodId = `${budget.id}-${budget.timePeriod}-${periodDates.startDate.toISOString().split('T')[0]}`;

      await AlertService.markAlertTriggered(alerts[0].id, budgetPeriodId, 500);
      await AlertService.markAlertTriggered(alerts[1].id, budgetPeriodId, 800);

      // Archive the budget period
      await BudgetService.archiveBudgetPeriod(budget.id);

      // Verify archive record includes triggered alerts
      const archives = await db
        .select()
        .from(budgetHistory)
        .where(eq(budgetHistory.budgetId, budget.id));

      expect(archives).toHaveLength(1);
      const triggeredAlerts = archives[0].alertsTriggered as string[];
      expect(triggeredAlerts).toHaveLength(2);
      expect(triggeredAlerts).toContain(String(alerts[0].id));
      expect(triggeredAlerts).toContain(String(alerts[1].id));
    });

    it('should reset alert triggers after archiving', async () => {
      // Create a budget with an alert
      const budget = await BudgetService.createBudget(
        {
          categoryId: testCategoryId,
          amount: 1000,
          timePeriod: TimePeriodType.MONTHLY,
          alerts: [
            {
              thresholdType: ThresholdType.PERCENTAGE,
              thresholdValue: 50,
              position: AlertPosition.BEFORE_LIMIT,
              channels: [{ type: ChannelType.IN_APP, enabled: true }],
            },
          ],
        },
        testOrgId,
        'USD'
      );

      // Get the alert
      const alerts = await db
        .select()
        .from(budgetAlerts)
        .where(eq(budgetAlerts.budgetId, budget.id));

      // Mark alert as triggered
      const periodDates = await BudgetService.getBudgetPeriodDates(budget, new Date());
      const budgetPeriodId = `${budget.id}-${budget.timePeriod}-${periodDates.startDate.toISOString().split('T')[0]}`;

      await AlertService.markAlertTriggered(alerts[0].id, budgetPeriodId, 500);

      // Verify trigger exists
      const triggersBefore = await db
        .select()
        .from(alertTriggers)
        .where(eq(alertTriggers.alertId, alerts[0].id));
      expect(triggersBefore).toHaveLength(1);

      // Archive the budget period
      await BudgetService.archiveBudgetPeriod(budget.id);

      // Verify triggers were reset
      const triggersAfter = await db
        .select()
        .from(alertTriggers)
        .where(eq(alertTriggers.alertId, alerts[0].id));
      expect(triggersAfter).toHaveLength(0);
    });

    it('should archive budget with zero spending', async () => {
      // Create a budget with no transactions
      const budget = await BudgetService.createBudget(
        {
          categoryId: testCategoryId,
          amount: 1000,
          timePeriod: TimePeriodType.MONTHLY,
        },
        testOrgId,
        'USD'
      );

      // Archive the budget period
      await BudgetService.archiveBudgetPeriod(budget.id);

      // Verify archive record was created with zero spending
      const archives = await db
        .select()
        .from(budgetHistory)
        .where(eq(budgetHistory.budgetId, budget.id));

      expect(archives).toHaveLength(1);
      expect(Number(archives[0].finalSpendingAmount)).toBe(0);
      expect(Number(archives[0].percentageUsed)).toBe(0);
    });

    it('should archive budget with exceeded spending', async () => {
      // Create a budget
      const budget = await BudgetService.createBudget(
        {
          categoryId: testCategoryId,
          amount: 1000,
          timePeriod: TimePeriodType.MONTHLY,
        },
        testOrgId,
        'USD'
      );

      // Create transactions that exceed the budget
      const now = new Date();
      await db.insert(transactions).values([
        {
          userId: testUserId,
          organizationId: testOrgId,
          category: String(testCategoryId),
          amount: '800',
          type: 'despesa',
          date: now,
          description: 'Test transaction 1',
        },
        {
          userId: testUserId,
          organizationId: testOrgId,
          category: String(testCategoryId),
          amount: '500',
          type: 'despesa',
          date: now,
          description: 'Test transaction 2',
        },
      ]);

      // Archive the budget period
      await BudgetService.archiveBudgetPeriod(budget.id);

      // Verify archive record shows exceeded spending
      const archives = await db
        .select()
        .from(budgetHistory)
        .where(eq(budgetHistory.budgetId, budget.id));

      expect(archives).toHaveLength(1);
      expect(Number(archives[0].finalSpendingAmount)).toBe(1300);
      expect(Number(archives[0].percentageUsed)).toBe(130);
    });
  });

  describe('Requirement 9.4: Create next period for recurring budgets', () => {
    it('should reset alert triggers for recurring budget', async () => {
      // Create a recurring budget with an alert
      const budget = await BudgetService.createBudget(
        {
          categoryId: testCategoryId,
          amount: 1000,
          timePeriod: TimePeriodType.MONTHLY,
          alerts: [
            {
              thresholdType: ThresholdType.PERCENTAGE,
              thresholdValue: 50,
              position: AlertPosition.BEFORE_LIMIT,
              channels: [{ type: ChannelType.IN_APP, enabled: true }],
            },
          ],
        },
        testOrgId,
        'USD'
      );

      // Get the alert
      const alerts = await db
        .select()
        .from(budgetAlerts)
        .where(eq(budgetAlerts.budgetId, budget.id));

      // Mark alert as triggered
      const periodDates = await BudgetService.getBudgetPeriodDates(budget, new Date());
      const budgetPeriodId = `${budget.id}-${budget.timePeriod}-${periodDates.startDate.toISOString().split('T')[0]}`;

      await AlertService.markAlertTriggered(alerts[0].id, budgetPeriodId, 500);

      // Verify trigger exists
      const triggersBefore = await db
        .select()
        .from(alertTriggers)
        .where(eq(alertTriggers.alertId, alerts[0].id));
      expect(triggersBefore).toHaveLength(1);

      // Create next period
      await BudgetService.createNextPeriod(budget.id);

      // Verify triggers were reset
      const triggersAfter = await db
        .select()
        .from(alertTriggers)
        .where(eq(alertTriggers.alertId, alerts[0].id));
      expect(triggersAfter).toHaveLength(0);
    });

    it('should return the same budget for recurring periods', async () => {
      // Create a recurring budget
      const budget = await BudgetService.createBudget(
        {
          categoryId: testCategoryId,
          amount: 1000,
          timePeriod: TimePeriodType.MONTHLY,
        },
        testOrgId,
        'USD'
      );

      // Create next period
      const nextPeriodBudget = await BudgetService.createNextPeriod(budget.id);

      // Verify it's the same budget (recurring budgets don't create new records)
      expect(nextPeriodBudget.id).toBe(budget.id);
      expect(nextPeriodBudget.amount).toBe(budget.amount);
      expect(nextPeriodBudget.timePeriod).toBe(budget.timePeriod);
    });

    it('should throw error for custom budget period rollover', async () => {
      // Create a custom budget
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      const budget = await BudgetService.createBudget(
        {
          categoryId: testCategoryId,
          amount: 1000,
          timePeriod: TimePeriodType.CUSTOM,
          customStartDate: startDate,
          customEndDate: endDate,
        },
        testOrgId,
        'USD'
      );

      // Attempt to create next period should throw error
      await expect(
        BudgetService.createNextPeriod(budget.id)
      ).rejects.toThrow('Custom budgets do not have recurring periods');
    });

    it('should work for all recurring period types', async () => {
      const periodTypes = [
        TimePeriodType.DAILY,
        TimePeriodType.WEEKLY,
        TimePeriodType.MONTHLY,
        TimePeriodType.ANNUAL
      ];

      for (const timePeriod of periodTypes) {
        // Create a budget with this period type
        const budget = await BudgetService.createBudget(
          {
            categoryId: testCategoryId,
            amount: 1000,
            timePeriod,
          },
          testOrgId,
          'USD'
        );

        // Create next period should succeed
        const nextPeriodBudget = await BudgetService.createNextPeriod(budget.id);
        expect(nextPeriodBudget.id).toBe(budget.id);
        expect(nextPeriodBudget.timePeriod).toBe(timePeriod);

        // Clean up for next iteration
        await db.delete(budgets).where(eq(budgets.id, budget.id));
      }
    });
  });

  describe('Edge Cases', () => {
    it('should throw NotFoundError when archiving non-existent budget', async () => {
      await expect(
        BudgetService.archiveBudgetPeriod(99999)
      ).rejects.toThrow('Budget not found');
    });

    it('should throw NotFoundError when creating next period for non-existent budget', async () => {
      await expect(
        BudgetService.createNextPeriod(99999)
      ).rejects.toThrow('Budget not found');
    });

    it('should handle multiple archive operations for same budget', async () => {
      // Create a budget
      const budget = await BudgetService.createBudget(
        {
          categoryId: testCategoryId,
          amount: 1000,
          timePeriod: TimePeriodType.MONTHLY,
        },
        testOrgId,
        'USD'
      );

      // Archive multiple times
      await BudgetService.archiveBudgetPeriod(budget.id);
      await BudgetService.archiveBudgetPeriod(budget.id);
      await BudgetService.archiveBudgetPeriod(budget.id);

      // Verify multiple archive records were created
      const archives = await db
        .select()
        .from(budgetHistory)
        .where(eq(budgetHistory.budgetId, budget.id));

      expect(archives.length).toBeGreaterThanOrEqual(3);
    });
  });
});
