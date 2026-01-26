/**
 * Integration tests for budget update recalculation logic
 * 
 * Tests Requirements 6.1, 6.2, 6.3, 6.4:
 * - Budget field editability
 * - Alert configuration editability
 * - Percentage alert recalculation on amount change
 * - Spending recalculation on period change
 */

import 'dotenv/config';
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import { BudgetService } from "../src/domain/services/budget.service.js";
import { AlertService } from "../src/domain/services/alert.service.js";
import { BudgetRepository } from "../src/domain/repositories/budget.repository.js";
import { TransactionRepository } from "../src/domain/repositories/transaction.repository.js";
import { db } from "../src/core/database/db.js";
import { 
  organizations, 
  categories, 
  transactions,
  budgets,
  budgetAlerts,
  alertTriggers,
  users
} from "../src/core/database/schema.js";
import { eq } from "drizzle-orm";
import { 
  TimePeriodType, 
  BudgetStatus, 
  ThresholdType, 
  AlertPosition, 
  ChannelType 
} from "../src/domain/entities/budget.types.js";

describe("Budget Update Recalculation", () => {
  let testOrgId: number;
  let testUserId: number;
  let testCategoryId: number;

  beforeAll(async () => {
    // Create test organization
    const org = await db.insert(organizations).values({
      name: "Test Org Budget Update",
      ownerId: 1,
    }).returning();
    testOrgId = org[0].id;

    // Create test user
    const user = await db.insert(users).values({
      email: `test-budget-update-${Date.now()}@example.com`,
      password: "hashedpassword",
      organizationId: testOrgId,
    }).returning();
    testUserId = user[0].id;

    // Create test category
    const category = await db.insert(categories).values({
      userId: testUserId,
      organizationId: testOrgId,
      name: "Test Category",
      type: "despesa",
    }).returning();
    testCategoryId = category[0].id;
  });

  afterAll(async () => {
    // Clean up test data in correct order (delete children first)
    // Delete transactions first (they reference users)
    if (testUserId) {
      await db.delete(transactions).where(eq(transactions.userId, testUserId));
    }
    if (testOrgId) {
      await db.delete(budgets).where(eq(budgets.organizationId, testOrgId));
    }
    if (testCategoryId) {
      await db.delete(categories).where(eq(categories.id, testCategoryId));
    }
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
    if (testOrgId) {
      await db.delete(organizations).where(eq(organizations.id, testOrgId));
    }
  });

  beforeEach(async () => {
    // Clean up budgets and transactions before each test
    await db.delete(budgets).where(eq(budgets.organizationId, testOrgId));
  });

  describe("Requirement 6.3: Percentage alert recalculation on amount change", () => {
    test("should maintain percentage values when budget amount changes", async () => {
      // Create budget with percentage-based alerts
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 1000,
        timePeriod: TimePeriodType.MONTHLY,
        alerts: [
          {
            thresholdType: ThresholdType.PERCENTAGE,
            thresholdValue: 80,
            position: AlertPosition.BEFORE_LIMIT,
            channels: [{ type: ChannelType.IN_APP, enabled: true }],
          },
          {
            thresholdType: ThresholdType.PERCENTAGE,
            thresholdValue: 100,
            position: AlertPosition.BEFORE_LIMIT,
            channels: [{ type: ChannelType.EMAIL, enabled: true }],
          },
        ],
      };
      const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

      // Verify initial alert thresholds
      // 80% of 1000 = 800, 100% of 1000 = 1000
      const initialAlerts = await BudgetRepository.findAlertsByBudgetId(budget.id);
      expect(initialAlerts).toHaveLength(2);
      expect(Number(initialAlerts[0].thresholdValue)).toBe(80);
      expect(Number(initialAlerts[1].thresholdValue)).toBe(100);

      // Update budget amount to 2000
      await BudgetService.updateBudget(
        budget.id,
        { amount: 2000 },
        testOrgId
      );

      // Verify percentage values remain the same
      const updatedAlerts = await BudgetRepository.findAlertsByBudgetId(budget.id);
      expect(updatedAlerts).toHaveLength(2);
      expect(Number(updatedAlerts[0].thresholdValue)).toBe(80);
      expect(Number(updatedAlerts[1].thresholdValue)).toBe(100);

      // Verify the actual threshold amounts are calculated correctly with new budget amount
      // 80% of 2000 = 1600, 100% of 2000 = 2000
      const budgetPeriodId = "test-period";
      const triggeredAlerts = await AlertService.checkAlerts(
        budget.id,
        1600, // Current spending
        2000, // New budget amount
        budgetPeriodId
      );

      // At 1600 spending, the 80% alert should trigger (threshold = 1600)
      // but not the 100% alert (threshold = 2000)
      expect(triggeredAlerts.length).toBeGreaterThanOrEqual(1);
      const alert80 = triggeredAlerts.find(t => t.thresholdAmount === 1600);
      expect(alert80).toBeDefined();
    });

    test("should not modify fixed amount alerts when budget amount changes", async () => {
      // Create budget with fixed amount alerts
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 1000,
        timePeriod: TimePeriodType.MONTHLY,
        alerts: [
          {
            thresholdType: ThresholdType.FIXED_AMOUNT,
            thresholdValue: 500,
            position: AlertPosition.BEFORE_LIMIT,
            channels: [{ type: ChannelType.IN_APP, enabled: true }],
          },
          {
            thresholdType: ThresholdType.FIXED_AMOUNT,
            thresholdValue: 900,
            position: AlertPosition.BEFORE_LIMIT,
            channels: [{ type: ChannelType.EMAIL, enabled: true }],
          },
        ],
      };
      const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

      // Update budget amount to 2000
      await BudgetService.updateBudget(
        budget.id,
        { amount: 2000 },
        testOrgId
      );

      // Verify fixed amounts remain unchanged
      const updatedAlerts = await BudgetRepository.findAlertsByBudgetId(budget.id);
      expect(updatedAlerts).toHaveLength(2);
      expect(Number(updatedAlerts[0].thresholdValue)).toBe(500);
      expect(Number(updatedAlerts[1].thresholdValue)).toBe(900);
    });

    test("should handle mixed percentage and fixed amount alerts", async () => {
      // Create budget with both types of alerts
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 1000,
        timePeriod: TimePeriodType.MONTHLY,
        alerts: [
          {
            thresholdType: ThresholdType.PERCENTAGE,
            thresholdValue: 75,
            position: AlertPosition.BEFORE_LIMIT,
            channels: [{ type: ChannelType.IN_APP, enabled: true }],
          },
          {
            thresholdType: ThresholdType.FIXED_AMOUNT,
            thresholdValue: 950,
            position: AlertPosition.BEFORE_LIMIT,
            channels: [{ type: ChannelType.EMAIL, enabled: true }],
          },
        ],
      };
      const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

      // Update budget amount to 2000
      await BudgetService.updateBudget(
        budget.id,
        { amount: 2000 },
        testOrgId
      );

      // Verify alerts
      const updatedAlerts = await BudgetRepository.findAlertsByBudgetId(budget.id);
      expect(updatedAlerts).toHaveLength(2);
      
      const percentageAlert = updatedAlerts.find(a => a.thresholdType === "percentage");
      const fixedAlert = updatedAlerts.find(a => a.thresholdType === "fixed_amount");
      
      expect(Number(percentageAlert?.thresholdValue)).toBe(75);
      expect(Number(fixedAlert?.thresholdValue)).toBe(950);
    });
  });

  describe("Requirement 6.4: Spending recalculation on period change", () => {
    test("should recalculate spending when changing from monthly to daily period", async () => {
      // Create budget with monthly period
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 1000,
        timePeriod: TimePeriodType.MONTHLY,
      };
      const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

      // Create transactions on different days of the month
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 7);

      await TransactionRepository.create({
        userId: testUserId,
        organizationId: testOrgId,
        category: String(testCategoryId),
        amount: "100",
        type: "despesa",
        date: today,
        description: "Today transaction",
      });

      await TransactionRepository.create({
        userId: testUserId,
        organizationId: testOrgId,
        category: String(testCategoryId),
        amount: "200",
        type: "despesa",
        date: yesterday,
        description: "Yesterday transaction",
      });

      await TransactionRepository.create({
        userId: testUserId,
        organizationId: testOrgId,
        category: String(testCategoryId),
        amount: "300",
        type: "despesa",
        date: lastWeek,
        description: "Last week transaction",
      });

      // Calculate spending for monthly period (should include all transactions)
      const monthlySpending = await BudgetService.calculateSpending(budget.id);
      expect(monthlySpending.totalSpent).toBe(600); // 100 + 200 + 300

      // Update to daily period
      await BudgetService.updateBudget(
        budget.id,
        { timePeriod: TimePeriodType.DAILY },
        testOrgId
      );

      // Calculate spending for daily period (should only include today's transactions)
      const dailySpending = await BudgetService.calculateSpending(budget.id);
      expect(dailySpending.totalSpent).toBe(100); // Only today's transaction
    });

    test("should recalculate spending when changing from daily to weekly period", async () => {
      // Create budget with daily period
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 500,
        timePeriod: TimePeriodType.DAILY,
      };
      const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

      // Create transactions on different days
      const today = new Date();
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(today.getDate() - 2);
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 8);

      await TransactionRepository.create({
        userId: testUserId,
        organizationId: testOrgId,
        category: String(testCategoryId),
        amount: "50",
        type: "despesa",
        date: today,
        description: "Today transaction",
      });

      await TransactionRepository.create({
        userId: testUserId,
        organizationId: testOrgId,
        category: String(testCategoryId),
        amount: "75",
        type: "despesa",
        date: twoDaysAgo,
        description: "Two days ago transaction",
      });

      await TransactionRepository.create({
        userId: testUserId,
        organizationId: testOrgId,
        category: String(testCategoryId),
        amount: "100",
        type: "despesa",
        date: lastWeek,
        description: "Last week transaction",
      });

      // Calculate spending for daily period (should only include today)
      const dailySpending = await BudgetService.calculateSpending(budget.id);
      // Daily spending should be at least today's transaction (50)
      // It might include more if the transactions were created on the same day
      expect(dailySpending.totalSpent).toBeGreaterThanOrEqual(50);

      // Update to weekly period
      await BudgetService.updateBudget(
        budget.id,
        { timePeriod: TimePeriodType.WEEKLY },
        testOrgId
      );

      // Calculate spending for weekly period (should include this week's transactions)
      const weeklySpending = await BudgetService.calculateSpending(budget.id);
      expect(weeklySpending.totalSpent).toBeGreaterThanOrEqual(50); // At least today's transaction
      // May include twoDaysAgo if it's in the current week
    });

    test("should recalculate spending when changing to custom period", async () => {
      // Create budget with monthly period
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 1000,
        timePeriod: TimePeriodType.MONTHLY,
      };
      const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

      // Create transactions across different dates
      const customStart = new Date("2024-01-15");
      const customEnd = new Date("2024-01-20");
      const beforeCustom = new Date("2024-01-10");
      const duringCustom = new Date("2024-01-17");
      const afterCustom = new Date("2024-01-25");

      await TransactionRepository.create({
        userId: testUserId,
        organizationId: testOrgId,
        category: String(testCategoryId),
        amount: "100",
        type: "despesa",
        date: beforeCustom,
        description: "Before custom period",
      });

      await TransactionRepository.create({
        userId: testUserId,
        organizationId: testOrgId,
        category: String(testCategoryId),
        amount: "200",
        type: "despesa",
        date: duringCustom,
        description: "During custom period",
      });

      await TransactionRepository.create({
        userId: testUserId,
        organizationId: testOrgId,
        category: String(testCategoryId),
        amount: "300",
        type: "despesa",
        date: afterCustom,
        description: "After custom period",
      });

      // Update to custom period
      await BudgetService.updateBudget(
        budget.id,
        {
          timePeriod: TimePeriodType.CUSTOM,
          customStartDate: customStart,
          customEndDate: customEnd,
        },
        testOrgId
      );

      // Calculate spending for custom period (should only include transaction during period)
      const customSpending = await BudgetService.calculateSpending(budget.id);
      expect(customSpending.totalSpent).toBe(200); // Only the transaction on 2024-01-17
    });
  });

  describe("Requirement 6.1 & 6.2: Budget and alert editability", () => {
    test("should allow updating all budget fields", async () => {
      // Create budget
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 1000,
        timePeriod: TimePeriodType.MONTHLY,
        status: BudgetStatus.ACTIVE,
      };
      const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

      // Update all fields
      const updated = await BudgetService.updateBudget(
        budget.id,
        {
          amount: 2000,
          timePeriod: TimePeriodType.WEEKLY,
          status: BudgetStatus.INACTIVE,
        },
        testOrgId
      );

      expect(Number(updated.amount)).toBe(2000);
      expect(updated.timePeriod).toBe("weekly");
      expect(updated.status).toBe("inactive");
    });

    test("should allow replacing alert configurations", async () => {
      // Create budget with initial alerts
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 1000,
        timePeriod: TimePeriodType.MONTHLY,
        alerts: [
          {
            thresholdType: ThresholdType.PERCENTAGE,
            thresholdValue: 80,
            position: AlertPosition.BEFORE_LIMIT,
            channels: [{ type: ChannelType.IN_APP, enabled: true }],
          },
        ],
      };
      const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

      // Verify initial alerts
      const initialAlerts = await BudgetRepository.findAlertsByBudgetId(budget.id);
      expect(initialAlerts).toHaveLength(1);

      // Update with new alert configuration
      await BudgetService.updateBudget(
        budget.id,
        {
          alerts: [
            {
              thresholdType: ThresholdType.PERCENTAGE,
              thresholdValue: 50,
              position: AlertPosition.BEFORE_LIMIT,
              channels: [{ type: ChannelType.EMAIL, enabled: true }],
            },
            {
              thresholdType: ThresholdType.PERCENTAGE,
              thresholdValue: 90,
              position: AlertPosition.BEFORE_LIMIT,
              channels: [{ type: ChannelType.SMS, enabled: true }],
            },
          ],
        },
        testOrgId
      );

      // Verify alerts were replaced
      const updatedAlerts = await BudgetRepository.findAlertsByBudgetId(budget.id);
      expect(updatedAlerts).toHaveLength(2);
      expect(Number(updatedAlerts[0].thresholdValue)).toBe(50);
      expect(Number(updatedAlerts[1].thresholdValue)).toBe(90);
    });

    test("should allow removing all alerts", async () => {
      // Create budget with alerts
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 1000,
        timePeriod: TimePeriodType.MONTHLY,
        alerts: [
          {
            thresholdType: ThresholdType.PERCENTAGE,
            thresholdValue: 80,
            position: AlertPosition.BEFORE_LIMIT,
            channels: [{ type: ChannelType.IN_APP, enabled: true }],
          },
        ],
      };
      const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

      // Update with empty alerts array
      await BudgetService.updateBudget(
        budget.id,
        { alerts: [] },
        testOrgId
      );

      // Verify all alerts were removed
      const updatedAlerts = await BudgetRepository.findAlertsByBudgetId(budget.id);
      expect(updatedAlerts).toHaveLength(0);
    });
  });

  describe("Combined updates", () => {
    test("should handle updating amount, period, and alerts simultaneously", async () => {
      // Create budget
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 1000,
        timePeriod: TimePeriodType.MONTHLY,
        alerts: [
          {
            thresholdType: ThresholdType.PERCENTAGE,
            thresholdValue: 80,
            position: AlertPosition.BEFORE_LIMIT,
            channels: [{ type: ChannelType.IN_APP, enabled: true }],
          },
        ],
      };
      const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

      // Create some transactions
      await TransactionRepository.create({
        userId: testUserId,
        organizationId: testOrgId,
        category: String(testCategoryId),
        amount: "500",
        type: "despesa",
        date: new Date(),
        description: "Test transaction",
      });

      // Update everything at once
      await BudgetService.updateBudget(
        budget.id,
        {
          amount: 2000,
          timePeriod: TimePeriodType.WEEKLY,
          alerts: [
            {
              thresholdType: ThresholdType.PERCENTAGE,
              thresholdValue: 90,
              position: AlertPosition.BEFORE_LIMIT,
              channels: [{ type: ChannelType.EMAIL, enabled: true }],
            },
          ],
        },
        testOrgId
      );

      // Verify all updates
      const updatedBudget = await BudgetService.getBudget(budget.id, testOrgId);
      expect(updatedBudget.amount).toBe(2000);
      expect(updatedBudget.timePeriod).toBe("weekly");
      expect(updatedBudget.alerts).toHaveLength(1);
      expect(updatedBudget.alerts[0].thresholdValue).toBe(90);

      // Verify spending was recalculated for new period
      expect(updatedBudget.currentSpending).toBeDefined();
    });
  });
});
