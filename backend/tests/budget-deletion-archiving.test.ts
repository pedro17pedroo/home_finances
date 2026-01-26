/**
 * Tests for budget deletion and archiving functionality
 * 
 * This test suite covers:
 * - Cascade deletion of budget data when no history exists
 * - Archiving budgets with historical data instead of deleting
 * 
 * Requirements: 6.5, 6.6
 */

import 'dotenv/config';
import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../src/core/database/db.js';
import {
  budgets,
  budgetAlerts,
  alertTriggers,
  budgetHistory,
  categories,
  users,
  organizations,
} from '../src/core/database/schema.js';
import { BudgetService } from '../src/domain/services/budget.service.js';
import { NotFoundError } from '../src/core/errors/app-error.js';

describe('Budget Deletion and Archiving', () => {
  let testOrgId: number;
  let testUserId: number;
  let testCategoryId: number;

  beforeAll(async () => {
    // Create test organization
    const org = await db
      .insert(organizations)
      .values({
        name: 'Test Org - Budget Deletion',
        ownerId: 1,
      })
      .returning();
    testOrgId = org[0].id;

    // Create test user
    const user = await db
      .insert(users)
      .values({
        email: `test-budget-deletion-${Date.now()}@example.com`,
        password: 'hashedpassword',
        organizationId: testOrgId,
      })
      .returning();
    testUserId = user[0].id;

    // Create test category
    const category = await db
      .insert(categories)
      .values({
        name: 'Test Category - Deletion',
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
      await db.delete(budgets).where(eq(budgets.organizationId, testOrgId));
      await db.delete(categories).where(eq(categories.organizationId, testOrgId));
      await db.delete(users).where(eq(users.organizationId, testOrgId));
      await db.delete(organizations).where(eq(organizations.id, testOrgId));
    }
  });

  beforeEach(async () => {
    // Clean up budgets and related data before each test
    await db.delete(budgets).where(eq(budgets.organizationId, testOrgId));
  });

  describe('Cascade Deletion (No History)', () => {
    test('should delete budget and cascade delete alerts when no history exists', async () => {
      // Create a budget with alerts
      const budget = await db
        .insert(budgets)
        .values({
          organizationId: testOrgId,
          categoryId: testCategoryId,
          amount: '1000.00',
          currency: 'USD',
          timePeriod: 'monthly',
          status: 'active',
        })
        .returning();

      const budgetId = budget[0].id;

      // Create alerts for the budget
      const alert1 = await db
        .insert(budgetAlerts)
        .values({
          budgetId,
          thresholdType: 'percentage',
          thresholdValue: '80',
          position: 'before_limit',
          channels: [{ type: 'in_app', enabled: true }],
        })
        .returning();

      const alert2 = await db
        .insert(budgetAlerts)
        .values({
          budgetId,
          thresholdType: 'percentage',
          thresholdValue: '100',
          position: 'before_limit',
          channels: [{ type: 'email', enabled: true }],
        })
        .returning();

      // Create alert triggers
      await db
        .insert(alertTriggers)
        .values({
          alertId: alert1[0].id,
          budgetPeriodId: '2024-01-monthly',
          spendingAmount: '800.00',
        });

      await db
        .insert(alertTriggers)
        .values({
          alertId: alert2[0].id,
          budgetPeriodId: '2024-01-monthly',
          spendingAmount: '1000.00',
        });

      // Verify data exists before deletion
      const alertsBefore = await db
        .select()
        .from(budgetAlerts)
        .where(eq(budgetAlerts.budgetId, budgetId));
      expect(alertsBefore).toHaveLength(2);

      const triggersBefore = await db
        .select()
        .from(alertTriggers)
        .where(inArray(alertTriggers.alertId, [alert1[0].id, alert2[0].id]));
      expect(triggersBefore).toHaveLength(2);

      // Delete the budget (no history exists)
      await BudgetService.deleteBudget(budgetId, testOrgId);

      // Verify budget is deleted
      const budgetAfter = await db
        .select()
        .from(budgets)
        .where(eq(budgets.id, budgetId));
      expect(budgetAfter).toHaveLength(0);

      // Verify alerts are cascade deleted
      const alertsAfter = await db
        .select()
        .from(budgetAlerts)
        .where(eq(budgetAlerts.budgetId, budgetId));
      expect(alertsAfter).toHaveLength(0);

      // Verify alert triggers are cascade deleted
      const triggersAfter = await db
        .select()
        .from(alertTriggers)
        .where(inArray(alertTriggers.alertId, [alert1[0].id, alert2[0].id]));
      expect(triggersAfter).toHaveLength(0);
    });

    test('should delete budget without alerts when no history exists', async () => {
      // Create a budget without alerts
      const budget = await db
        .insert(budgets)
        .values({
          organizationId: testOrgId,
          categoryId: testCategoryId,
          amount: '500.00',
          currency: 'USD',
          timePeriod: 'weekly',
          status: 'active',
        })
        .returning();

      const budgetId = budget[0].id;

      // Delete the budget
      await BudgetService.deleteBudget(budgetId, testOrgId);

      // Verify budget is deleted
      const budgetAfter = await db
        .select()
        .from(budgets)
        .where(eq(budgets.id, budgetId));
      expect(budgetAfter).toHaveLength(0);
    });

    test('should throw NotFoundError when deleting non-existent budget', async () => {
      const nonExistentId = 999999;

      await expect(
        BudgetService.deleteBudget(nonExistentId, testOrgId)
      ).rejects.toThrow('Budget not found');
    });

    test('should throw NotFoundError when deleting budget from different organization', async () => {
      // Create a budget
      const budget = await db
        .insert(budgets)
        .values({
          organizationId: testOrgId,
          categoryId: testCategoryId,
          amount: '1000.00',
          currency: 'USD',
          timePeriod: 'monthly',
          status: 'active',
        })
        .returning();

      const budgetId = budget[0].id;
      const differentOrgId = testOrgId + 1;

      // Try to delete from different organization
      await expect(
        BudgetService.deleteBudget(budgetId, differentOrgId)
      ).rejects.toThrow('Budget not found');

      // Verify budget still exists
      const budgetAfter = await db
        .select()
        .from(budgets)
        .where(eq(budgets.id, budgetId));
      expect(budgetAfter).toHaveLength(1);
    });
  });

  describe('Archiving (With History)', () => {
    test('should archive budget instead of deleting when history exists', async () => {
      // Create a budget
      const budget = await db
        .insert(budgets)
        .values({
          organizationId: testOrgId,
          categoryId: testCategoryId,
          amount: '2000.00',
          currency: 'USD',
          timePeriod: 'monthly',
          status: 'active',
        })
        .returning();

      const budgetId = budget[0].id;

      // Create alerts for the budget
      const alert = await db
        .insert(budgetAlerts)
        .values({
          budgetId,
          thresholdType: 'percentage',
          thresholdValue: '80',
          position: 'before_limit',
          channels: [{ type: 'in_app', enabled: true }],
        })
        .returning();

      // Create historical data
      await db
        .insert(budgetHistory)
        .values({
          budgetId,
          periodStartDate: new Date('2024-01-01'),
          periodEndDate: new Date('2024-01-31'),
          finalSpendingAmount: '1800.00',
          percentageUsed: '90.00',
          alertsTriggered: [alert[0].id],
        });

      // Verify budget is active before deletion
      const budgetBefore = await db
        .select()
        .from(budgets)
        .where(eq(budgets.id, budgetId));
      expect(budgetBefore[0].status).toBe('active');

      // Delete the budget (history exists, so it should be archived)
      await BudgetService.deleteBudget(budgetId, testOrgId);

      // Verify budget still exists but is archived
      const budgetAfter = await db
        .select()
        .from(budgets)
        .where(eq(budgets.id, budgetId));
      expect(budgetAfter).toHaveLength(1);
      expect(budgetAfter[0].status).toBe('archived');

      // Verify alerts still exist (not deleted)
      const alertsAfter = await db
        .select()
        .from(budgetAlerts)
        .where(eq(budgetAlerts.budgetId, budgetId));
      expect(alertsAfter).toHaveLength(1);

      // Verify history still exists
      const historyAfter = await db
        .select()
        .from(budgetHistory)
        .where(eq(budgetHistory.budgetId, budgetId));
      expect(historyAfter).toHaveLength(1);
    });

    test('should archive budget with multiple history records', async () => {
      // Create a budget
      const budget = await db
        .insert(budgets)
        .values({
          organizationId: testOrgId,
          categoryId: testCategoryId,
          amount: '1500.00',
          currency: 'USD',
          timePeriod: 'monthly',
          status: 'active',
        })
        .returning();

      const budgetId = budget[0].id;

      // Create multiple historical records
      await db
        .insert(budgetHistory)
        .values([
          {
            budgetId,
            periodStartDate: new Date('2024-01-01'),
            periodEndDate: new Date('2024-01-31'),
            finalSpendingAmount: '1200.00',
            percentageUsed: '80.00',
            alertsTriggered: [],
          },
          {
            budgetId,
            periodStartDate: new Date('2024-02-01'),
            periodEndDate: new Date('2024-02-29'),
            finalSpendingAmount: '1400.00',
            percentageUsed: '93.33',
            alertsTriggered: [],
          },
          {
            budgetId,
            periodStartDate: new Date('2024-03-01'),
            periodEndDate: new Date('2024-03-31'),
            finalSpendingAmount: '1600.00',
            percentageUsed: '106.67',
            alertsTriggered: [],
          },
        ]);

      // Delete the budget
      await BudgetService.deleteBudget(budgetId, testOrgId);

      // Verify budget is archived
      const budgetAfter = await db
        .select()
        .from(budgets)
        .where(eq(budgets.id, budgetId));
      expect(budgetAfter).toHaveLength(1);
      expect(budgetAfter[0].status).toBe('archived');

      // Verify all history records still exist
      const historyAfter = await db
        .select()
        .from(budgetHistory)
        .where(eq(budgetHistory.budgetId, budgetId));
      expect(historyAfter).toHaveLength(3);
    });

    test('should preserve all budget data when archiving', async () => {
      // Create a budget with all fields populated
      const budget = await db
        .insert(budgets)
        .values({
          organizationId: testOrgId,
          categoryId: testCategoryId,
          amount: '3000.00',
          currency: 'USD',
          timePeriod: 'custom',
          customStartDate: new Date('2024-01-01'),
          customEndDate: new Date('2024-12-31'),
          status: 'active',
        })
        .returning();

      const budgetId = budget[0].id;

      // Create historical data
      await db
        .insert(budgetHistory)
        .values({
          budgetId,
          periodStartDate: new Date('2024-01-01'),
          periodEndDate: new Date('2024-12-31'),
          finalSpendingAmount: '2500.00',
          percentageUsed: '83.33',
          alertsTriggered: [],
        });

      // Delete the budget
      await BudgetService.deleteBudget(budgetId, testOrgId);

      // Verify all budget fields are preserved
      const budgetAfter = await db
        .select()
        .from(budgets)
        .where(eq(budgets.id, budgetId));
      
      expect(budgetAfter).toHaveLength(1);
      expect(budgetAfter[0].status).toBe('archived');
      expect(budgetAfter[0].amount).toBe('3000.00');
      expect(budgetAfter[0].timePeriod).toBe('custom');
      expect(budgetAfter[0].customStartDate).toEqual(new Date('2024-01-01'));
      expect(budgetAfter[0].customEndDate).toEqual(new Date('2024-12-31'));
      expect(budgetAfter[0].organizationId).toBe(testOrgId);
      expect(budgetAfter[0].categoryId).toBe(testCategoryId);
    });

    test('should archive inactive budget with history', async () => {
      // Create an inactive budget
      const budget = await db
        .insert(budgets)
        .values({
          organizationId: testOrgId,
          categoryId: testCategoryId,
          amount: '1000.00',
          currency: 'USD',
          timePeriod: 'monthly',
          status: 'inactive',
        })
        .returning();

      const budgetId = budget[0].id;

      // Create historical data
      await db
        .insert(budgetHistory)
        .values({
          budgetId,
          periodStartDate: new Date('2024-01-01'),
          periodEndDate: new Date('2024-01-31'),
          finalSpendingAmount: '900.00',
          percentageUsed: '90.00',
          alertsTriggered: [],
        });

      // Verify budget is inactive before deletion
      const budgetBefore = await db
        .select()
        .from(budgets)
        .where(eq(budgets.id, budgetId));
      expect(budgetBefore[0].status).toBe('inactive');

      // Delete the budget
      await BudgetService.deleteBudget(budgetId, testOrgId);

      // Verify budget is archived (not inactive)
      const budgetAfter = await db
        .select()
        .from(budgets)
        .where(eq(budgets.id, budgetId));
      expect(budgetAfter).toHaveLength(1);
      expect(budgetAfter[0].status).toBe('archived');
    });
  });

  describe('Edge Cases', () => {
    test('should handle budget with alerts but no triggers', async () => {
      // Create a budget with alerts but no triggers
      const budget = await db
        .insert(budgets)
        .values({
          organizationId: testOrgId,
          categoryId: testCategoryId,
          amount: '1000.00',
          currency: 'USD',
          timePeriod: 'monthly',
          status: 'active',
        })
        .returning();

      const budgetId = budget[0].id;

      // Create alerts without triggers
      await db
        .insert(budgetAlerts)
        .values({
          budgetId,
          thresholdType: 'percentage',
          thresholdValue: '80',
          position: 'before_limit',
          channels: [{ type: 'in_app', enabled: true }],
        });

      // Delete the budget (no history)
      await BudgetService.deleteBudget(budgetId, testOrgId);

      // Verify budget and alerts are deleted
      const budgetAfter = await db
        .select()
        .from(budgets)
        .where(eq(budgets.id, budgetId));
      expect(budgetAfter).toHaveLength(0);

      const alertsAfter = await db
        .select()
        .from(budgetAlerts)
        .where(eq(budgetAlerts.budgetId, budgetId));
      expect(alertsAfter).toHaveLength(0);
    });

    test('should handle budget with triggers but no history', async () => {
      // Create a budget with alerts and triggers but no history
      const budget = await db
        .insert(budgets)
        .values({
          organizationId: testOrgId,
          categoryId: testCategoryId,
          amount: '1000.00',
          currency: 'USD',
          timePeriod: 'monthly',
          status: 'active',
        })
        .returning();

      const budgetId = budget[0].id;

      const alert = await db
        .insert(budgetAlerts)
        .values({
          budgetId,
          thresholdType: 'percentage',
          thresholdValue: '80',
          position: 'before_limit',
          channels: [{ type: 'in_app', enabled: true }],
        })
        .returning();

      await db
        .insert(alertTriggers)
        .values({
          alertId: alert[0].id,
          budgetPeriodId: '2024-01-monthly',
          spendingAmount: '800.00',
        });

      // Delete the budget (no history, only triggers)
      await BudgetService.deleteBudget(budgetId, testOrgId);

      // Verify budget, alerts, and triggers are all deleted
      const budgetAfter = await db
        .select()
        .from(budgets)
        .where(eq(budgets.id, budgetId));
      expect(budgetAfter).toHaveLength(0);

      const alertsAfter = await db
        .select()
        .from(budgetAlerts)
        .where(eq(budgetAlerts.budgetId, budgetId));
      expect(alertsAfter).toHaveLength(0);

      const triggersAfter = await db
        .select()
        .from(alertTriggers)
        .where(eq(alertTriggers.alertId, alert[0].id));
      expect(triggersAfter).toHaveLength(0);
    });
  });
});
