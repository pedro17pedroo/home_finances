import 'dotenv/config';
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import { BudgetService } from "../src/domain/services/budget.service.js";
import { BudgetRepository } from "../src/domain/repositories/budget.repository.js";
import { db } from "../src/core/database/db.js";
import { budgets, budgetAlerts, organizations, categories, users } from "../src/core/database/schema.js";
import { eq } from "drizzle-orm";
import {
  TimePeriodType,
  BudgetStatus,
  ThresholdType,
  AlertPosition,
  ChannelType,
} from "../src/domain/entities/budget.types.js";

/**
 * Budget Service Tests
 * 
 * These tests verify the BudgetService CRUD operations including:
 * - Budget creation with default status (Requirement 1.4)
 * - Organization-based filtering (Requirements 1.6, 5.1, 10.1)
 * - Alert validation (Requirements 2.1-2.7)
 * - Budget updates and deletions
 */

describe("BudgetService", () => {
  let testOrgId: number;
  let testUserId: number;
  let testCategoryId: number;

  beforeAll(async () => {
    // Create test organization
    const org = await db.insert(organizations).values({
      name: "Test Organization",
      ownerId: 1,
    }).returning();
    testOrgId = org[0].id;

    // Create test user
    const user = await db.insert(users).values({
      email: `test-budget-${Date.now()}@example.com`,
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
    // Clean up test data
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
    // Clean up budgets before each test
    await db.delete(budgets).where(eq(budgets.organizationId, testOrgId));
  });

  describe("createBudget", () => {
    test("should create budget with default status 'active'", async () => {
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 1000,
        timePeriod: TimePeriodType.MONTHLY,
      };

      const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

      expect(budget).toBeDefined();
      expect(budget.status).toBe("active");
      expect(budget.organizationId).toBe(testOrgId);
      expect(budget.categoryId).toBe(testCategoryId);
      expect(Number(budget.amount)).toBe(1000);
      expect(budget.currency).toBe("AOA");
    });

    test("should create budget with explicit status", async () => {
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 1000,
        timePeriod: TimePeriodType.MONTHLY,
        status: BudgetStatus.INACTIVE,
      };

      const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

      expect(budget.status).toBe("inactive");
    });

    test("should reject budget without required fields", async () => {
      const budgetData = {
        amount: 1000,
      } as any;

      await expect(
        BudgetService.createBudget(budgetData, testOrgId, "AOA")
      ).rejects.toThrow("Budget creation requires category, time period, and amount");
    });

    test("should reject budget with invalid time period", async () => {
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 1000,
        timePeriod: "invalid" as any,
      };

      await expect(
        BudgetService.createBudget(budgetData, testOrgId, "AOA")
      ).rejects.toThrow("Time period must be one of");
    });

    test("should reject custom period without dates", async () => {
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 1000,
        timePeriod: TimePeriodType.CUSTOM,
      };

      await expect(
        BudgetService.createBudget(budgetData, testOrgId, "AOA")
      ).rejects.toThrow("Custom budget requires start and end dates");
    });

    test("should reject custom period with end date before start date", async () => {
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 1000,
        timePeriod: TimePeriodType.CUSTOM,
        customStartDate: new Date("2024-12-31"),
        customEndDate: new Date("2024-01-01"),
      };

      await expect(
        BudgetService.createBudget(budgetData, testOrgId, "AOA")
      ).rejects.toThrow("end date must be after start date");
    });

    test("should create budget with valid custom date range", async () => {
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 1000,
        timePeriod: TimePeriodType.CUSTOM,
        customStartDate: new Date("2024-01-01"),
        customEndDate: new Date("2024-12-31"),
      };

      const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

      expect(budget).toBeDefined();
      expect(budget.timePeriod).toBe("custom");
      expect(budget.customStartDate).toBeDefined();
      expect(budget.customEndDate).toBeDefined();
    });

    test("should reject budget with zero amount", async () => {
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 0,
        timePeriod: TimePeriodType.MONTHLY,
      };

      await expect(
        BudgetService.createBudget(budgetData, testOrgId, "AOA")
      ).rejects.toThrow("amount must be greater than zero");
    });

    test("should reject budget with negative amount", async () => {
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: -100,
        timePeriod: TimePeriodType.MONTHLY,
      };

      await expect(
        BudgetService.createBudget(budgetData, testOrgId, "AOA")
      ).rejects.toThrow("amount must be greater than zero");
    });

    test("should create budget with valid alerts", async () => {
      const budgetData = {
        categoryId: String(testCategoryId),
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
            channels: [{ type: ChannelType.EMAIL, enabled: true }],
          },
          {
            thresholdType: ThresholdType.PERCENTAGE,
            thresholdValue: 110,
            position: AlertPosition.AFTER_LIMIT,
            channels: [{ type: ChannelType.SMS, enabled: true }],
          },
        ],
      };

      const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

      expect(budget).toBeDefined();

      // Verify alerts were created
      const alerts = await BudgetRepository.findAlertsByBudgetId(budget.id);
      expect(alerts).toHaveLength(3);
    });

    test("should reject more than 3 alerts", async () => {
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 1000,
        timePeriod: TimePeriodType.MONTHLY,
        alerts: [
          {
            thresholdType: ThresholdType.PERCENTAGE,
            thresholdValue: 25,
            position: AlertPosition.BEFORE_LIMIT,
            channels: [{ type: ChannelType.IN_APP, enabled: true }],
          },
          {
            thresholdType: ThresholdType.PERCENTAGE,
            thresholdValue: 50,
            position: AlertPosition.BEFORE_LIMIT,
            channels: [{ type: ChannelType.IN_APP, enabled: true }],
          },
          {
            thresholdType: ThresholdType.PERCENTAGE,
            thresholdValue: 75,
            position: AlertPosition.BEFORE_LIMIT,
            channels: [{ type: ChannelType.IN_APP, enabled: true }],
          },
          {
            thresholdType: ThresholdType.PERCENTAGE,
            thresholdValue: 110,
            position: AlertPosition.AFTER_LIMIT,
            channels: [{ type: ChannelType.IN_APP, enabled: true }],
          },
        ],
      };

      await expect(
        BudgetService.createBudget(budgetData, testOrgId, "AOA")
      ).rejects.toThrow("Maximum 3 alerts");
    });

    test("should reject 3 alerts without proper distribution", async () => {
      const budgetData = {
        categoryId: String(testCategoryId),
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
            thresholdValue: 110,
            position: AlertPosition.AFTER_LIMIT,
            channels: [{ type: ChannelType.IN_APP, enabled: true }],
          },
          {
            thresholdType: ThresholdType.PERCENTAGE,
            thresholdValue: 120,
            position: AlertPosition.AFTER_LIMIT,
            channels: [{ type: ChannelType.IN_APP, enabled: true }],
          },
        ],
      };

      await expect(
        BudgetService.createBudget(budgetData, testOrgId, "AOA")
      ).rejects.toThrow("exactly 2 before-limit alerts and 1 after-limit alert");
    });
  });

  describe("updateBudget", () => {
    test("should update budget amount", async () => {
      // Create budget
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 1000,
        timePeriod: TimePeriodType.MONTHLY,
      };
      const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

      // Update budget
      const updated = await BudgetService.updateBudget(
        budget.id,
        { amount: 2000 },
        testOrgId
      );

      expect(Number(updated.amount)).toBe(2000);
    });

    test("should update budget status", async () => {
      // Create budget
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 1000,
        timePeriod: TimePeriodType.MONTHLY,
      };
      const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

      // Update status
      const updated = await BudgetService.updateBudget(
        budget.id,
        { status: BudgetStatus.INACTIVE },
        testOrgId
      );

      expect(updated.status).toBe("inactive");
    });

    test("should recalculate percentage-based alerts when budget amount changes", async () => {
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
            channels: [{ type: ChannelType.IN_APP, enabled: true }],
          },
        ],
      };
      const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

      // Get initial alerts
      const initialAlerts = await BudgetRepository.findAlertsByBudgetId(budget.id);
      expect(initialAlerts).toHaveLength(2);
      
      // Verify initial percentage values
      expect(initialAlerts[0].thresholdType).toBe("percentage");
      expect(Number(initialAlerts[0].thresholdValue)).toBe(80);

      // Update budget amount
      await BudgetService.updateBudget(
        budget.id,
        { amount: 2000 },
        testOrgId
      );

      // Get alerts after update
      const updatedAlerts = await BudgetRepository.findAlertsByBudgetId(budget.id);
      expect(updatedAlerts).toHaveLength(2);
      
      // Verify percentage values remain the same (80% and 100%)
      // The actual threshold amounts will be calculated dynamically based on new budget amount
      expect(updatedAlerts[0].thresholdType).toBe("percentage");
      expect(Number(updatedAlerts[0].thresholdValue)).toBe(80);
      
      // Verify the alerts are still valid with the new amount
      // 80% of 2000 = 1600, 100% of 2000 = 2000
      const budgetWithStatus = await BudgetService.getBudget(budget.id, testOrgId);
      expect(budgetWithStatus.alerts).toHaveLength(2);
    });

    test("should handle fixed amount alerts when budget amount changes", async () => {
      // Create budget with fixed amount alerts
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 1000,
        timePeriod: TimePeriodType.MONTHLY,
        alerts: [
          {
            thresholdType: ThresholdType.FIXED_AMOUNT,
            thresholdValue: 800,
            position: AlertPosition.BEFORE_LIMIT,
            channels: [{ type: ChannelType.IN_APP, enabled: true }],
          },
        ],
      };
      const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

      // Update budget amount
      await BudgetService.updateBudget(
        budget.id,
        { amount: 2000 },
        testOrgId
      );

      // Get alerts after update
      const updatedAlerts = await BudgetRepository.findAlertsByBudgetId(budget.id);
      expect(updatedAlerts).toHaveLength(1);
      
      // Verify fixed amount remains unchanged
      expect(updatedAlerts[0].thresholdType).toBe("fixed_amount");
      expect(Number(updatedAlerts[0].thresholdValue)).toBe(800);
    });

    test("should update alert configurations when provided", async () => {
      // Create budget without alerts
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 1000,
        timePeriod: TimePeriodType.MONTHLY,
      };
      const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

      // Update budget with new alerts
      await BudgetService.updateBudget(
        budget.id,
        {
          alerts: [
            {
              thresholdType: ThresholdType.PERCENTAGE,
              thresholdValue: 75,
              position: AlertPosition.BEFORE_LIMIT,
              channels: [{ type: ChannelType.IN_APP, enabled: true }],
            },
          ],
        },
        testOrgId
      );

      // Verify alerts were created
      const alerts = await BudgetRepository.findAlertsByBudgetId(budget.id);
      expect(alerts).toHaveLength(1);
      expect(Number(alerts[0].thresholdValue)).toBe(75);
    });

    test("should update both amount and alerts together", async () => {
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

      // Update both amount and alerts
      await BudgetService.updateBudget(
        budget.id,
        {
          amount: 2000,
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

      // Verify budget amount was updated
      const updatedBudget = await BudgetRepository.findById(budget.id);
      expect(Number(updatedBudget?.amount)).toBe(2000);

      // Verify alerts were replaced with new configuration
      const alerts = await BudgetRepository.findAlertsByBudgetId(budget.id);
      expect(alerts).toHaveLength(1);
      expect(Number(alerts[0].thresholdValue)).toBe(90);
      expect(alerts[0].channels).toEqual([{ type: "email", enabled: true }]);
    });

    test("should recalculate spending when time period changes", async () => {
      // Create budget with monthly period
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 1000,
        timePeriod: TimePeriodType.MONTHLY,
      };
      const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

      // Get initial spending (should be for current month)
      const initialSpending = await BudgetService.calculateSpending(budget.id);
      
      // Update to daily period
      await BudgetService.updateBudget(
        budget.id,
        { timePeriod: TimePeriodType.DAILY },
        testOrgId
      );

      // Get spending after update (should be for current day)
      const updatedSpending = await BudgetService.calculateSpending(budget.id);
      
      // Spending amounts may differ because the time period changed
      // The key is that calculateSpending uses the updated budget's time period
      expect(updatedSpending).toBeDefined();
      expect(updatedSpending.budgetAmount).toBe(1000);
    });

    test("should reject update for non-existent budget", async () => {
      await expect(
        BudgetService.updateBudget(99999, { amount: 2000 }, testOrgId)
      ).rejects.toThrow("Budget");
    });

    test("should reject update for budget from different organization", async () => {
      // Create budget
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 1000,
        timePeriod: TimePeriodType.MONTHLY,
      };
      const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

      // Try to update with different org ID
      await expect(
        BudgetService.updateBudget(budget.id, { amount: 2000 }, 99999)
      ).rejects.toThrow("Budget");
    });
  });

  describe("deleteBudget", () => {
    test("should delete budget", async () => {
      // Create budget
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 1000,
        timePeriod: TimePeriodType.MONTHLY,
      };
      const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

      // Delete budget
      await BudgetService.deleteBudget(budget.id, testOrgId);

      // Verify deletion
      const deleted = await BudgetRepository.findById(budget.id);
      expect(deleted).toBeNull();
    });

    test("should reject delete for non-existent budget", async () => {
      await expect(
        BudgetService.deleteBudget(99999, testOrgId)
      ).rejects.toThrow("Budget");
    });

    test("should reject delete for budget from different organization", async () => {
      // Create budget
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 1000,
        timePeriod: TimePeriodType.MONTHLY,
      };
      const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

      // Try to delete with different org ID
      await expect(
        BudgetService.deleteBudget(budget.id, 99999)
      ).rejects.toThrow("Budget");
    });
  });

  describe("getBudget", () => {
    test("should get budget by ID", async () => {
      // Create budget
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 1000,
        timePeriod: TimePeriodType.MONTHLY,
      };
      const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

      // Get budget
      const retrieved = await BudgetService.getBudget(budget.id, testOrgId);

      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(budget.id);
      expect(retrieved.organizationId).toBe(testOrgId);
      expect(retrieved.currentSpending).toBe(0);
      expect(retrieved.percentageUsed).toBe(0);
      expect(retrieved.remainingAmount).toBe(1000);
      expect(retrieved.isExceeded).toBe(false);
    });

    test("should reject get for non-existent budget", async () => {
      await expect(
        BudgetService.getBudget(99999, testOrgId)
      ).rejects.toThrow("Budget");
    });

    test("should reject get for budget from different organization", async () => {
      // Create budget
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 1000,
        timePeriod: TimePeriodType.MONTHLY,
      };
      const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

      // Try to get with different org ID
      await expect(
        BudgetService.getBudget(budget.id, 99999)
      ).rejects.toThrow("Budget");
    });
  });

  describe("listBudgets", () => {
    test("should list all budgets for organization", async () => {
      // Create multiple budgets
      await BudgetService.createBudget(
        {
          categoryId: String(testCategoryId),
          amount: 1000,
          timePeriod: TimePeriodType.MONTHLY,
        },
        testOrgId,
        "AOA"
      );

      await BudgetService.createBudget(
        {
          categoryId: String(testCategoryId),
          amount: 2000,
          timePeriod: TimePeriodType.WEEKLY,
        },
        testOrgId,
        "AOA"
      );

      // List budgets
      const budgets = await BudgetService.listBudgets(testOrgId);

      expect(budgets).toHaveLength(2);
      expect(budgets[0].organizationId).toBe(testOrgId);
      expect(budgets[1].organizationId).toBe(testOrgId);
    });

    test("should filter budgets by status", async () => {
      // Create budgets with different statuses
      await BudgetService.createBudget(
        {
          categoryId: String(testCategoryId),
          amount: 1000,
          timePeriod: TimePeriodType.MONTHLY,
          status: BudgetStatus.ACTIVE,
        },
        testOrgId,
        "AOA"
      );

      await BudgetService.createBudget(
        {
          categoryId: String(testCategoryId),
          amount: 2000,
          timePeriod: TimePeriodType.WEEKLY,
          status: BudgetStatus.INACTIVE,
        },
        testOrgId,
        "AOA"
      );

      // List active budgets only
      const activeBudgets = await BudgetService.listBudgets(testOrgId, {
        status: BudgetStatus.ACTIVE,
      });

      expect(activeBudgets).toHaveLength(1);
      expect(activeBudgets[0].status).toBe("active");
    });

    test("should return empty array for organization with no budgets", async () => {
      const budgets = await BudgetService.listBudgets(99999);
      expect(budgets).toHaveLength(0);
    });
  });

  describe("Edge Cases", () => {
    describe("custom date range validation", () => {
      test("should reject custom period with same start and end date", async () => {
        const sameDate = new Date("2024-06-15T12:00:00Z");
        const budgetData = {
          categoryId: String(testCategoryId),
          amount: 1000,
          timePeriod: TimePeriodType.CUSTOM,
          customStartDate: sameDate,
          customEndDate: sameDate,
        };

        await expect(
          BudgetService.createBudget(budgetData, testOrgId, "AOA")
        ).rejects.toThrow("end date must be after start date");
      });

      test("should reject custom period with end date only 1 millisecond before start", async () => {
        const startDate = new Date("2024-06-15T12:00:00.000Z");
        const endDate = new Date("2024-06-15T11:59:59.999Z");
        const budgetData = {
          categoryId: String(testCategoryId),
          amount: 1000,
          timePeriod: TimePeriodType.CUSTOM,
          customStartDate: startDate,
          customEndDate: endDate,
        };

        await expect(
          BudgetService.createBudget(budgetData, testOrgId, "AOA")
        ).rejects.toThrow("end date must be after start date");
      });

      test("should accept custom period with end date 1 millisecond after start", async () => {
        const startDate = new Date("2024-06-15T12:00:00.000Z");
        const endDate = new Date("2024-06-15T12:00:00.001Z");
        const budgetData = {
          categoryId: String(testCategoryId),
          amount: 1000,
          timePeriod: TimePeriodType.CUSTOM,
          customStartDate: startDate,
          customEndDate: endDate,
        };

        const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");
        expect(budget).toBeDefined();
        expect(budget.timePeriod).toBe("custom");
      });

      test("should reject update that makes end date equal to start date", async () => {
        // Create valid custom budget
        const budgetData = {
          categoryId: String(testCategoryId),
          amount: 1000,
          timePeriod: TimePeriodType.CUSTOM,
          customStartDate: new Date("2024-01-01"),
          customEndDate: new Date("2024-12-31"),
        };
        const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

        // Try to update end date to equal start date
        await expect(
          BudgetService.updateBudget(
            budget.id,
            { customEndDate: new Date("2024-01-01") },
            testOrgId
          )
        ).rejects.toThrow("end date must be after start date");
      });

      test("should handle custom date range spanning multiple years", async () => {
        const budgetData = {
          categoryId: String(testCategoryId),
          amount: 5000,
          timePeriod: TimePeriodType.CUSTOM,
          customStartDate: new Date("2024-01-01"),
          customEndDate: new Date("2026-12-31"),
        };

        const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");
        expect(budget).toBeDefined();
        
        const period = await BudgetService.getBudgetPeriodDates(budget, new Date());
        expect(period.startDate.getFullYear()).toBe(2024);
        expect(period.endDate.getFullYear()).toBe(2026);
      });
    });

    describe("period boundaries at DST transitions", () => {
      test("should handle daily period during spring DST transition (US)", async () => {
        // March 10, 2024 - Spring forward (2am -> 3am)
        const budgetData = {
          categoryId: String(testCategoryId),
          amount: 1000,
          timePeriod: TimePeriodType.DAILY,
        };
        const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

        const dstDate = new Date("2024-03-10T10:00:00Z");
        const period = await BudgetService.getBudgetPeriodDates(budget, dstDate);

        // Should still be midnight to midnight
        expect(period.startDate.getHours()).toBe(0);
        expect(period.startDate.getMinutes()).toBe(0);
        expect(period.endDate.getHours()).toBe(23);
        expect(period.endDate.getMinutes()).toBe(59);
        
        // Same day
        expect(period.startDate.getDate()).toBe(10);
        expect(period.endDate.getDate()).toBe(10);
      });

      test("should handle daily period during fall DST transition (US)", async () => {
        // November 3, 2024 - Fall back (2am -> 1am)
        const budgetData = {
          categoryId: String(testCategoryId),
          amount: 1000,
          timePeriod: TimePeriodType.DAILY,
        };
        const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

        const dstDate = new Date("2024-11-03T10:00:00Z");
        const period = await BudgetService.getBudgetPeriodDates(budget, dstDate);

        // Should still be midnight to midnight
        expect(period.startDate.getHours()).toBe(0);
        expect(period.startDate.getMinutes()).toBe(0);
        expect(period.endDate.getHours()).toBe(23);
        expect(period.endDate.getMinutes()).toBe(59);
        
        // Same day
        expect(period.startDate.getDate()).toBe(3);
        expect(period.endDate.getDate()).toBe(3);
      });

      test("should handle monthly period spanning DST transition", async () => {
        // March 2024 contains DST transition on March 10
        const budgetData = {
          categoryId: String(testCategoryId),
          amount: 1000,
          timePeriod: TimePeriodType.MONTHLY,
        };
        const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

        const marchDate = new Date("2024-03-15T10:00:00Z");
        const period = await BudgetService.getBudgetPeriodDates(budget, marchDate);

        // Should be first to last day of March
        expect(period.startDate.getDate()).toBe(1);
        expect(period.startDate.getMonth()).toBe(2); // March
        expect(period.endDate.getDate()).toBe(31);
        expect(period.endDate.getMonth()).toBe(2);
        
        // Verify time boundaries
        expect(period.startDate.getHours()).toBe(0);
        expect(period.endDate.getHours()).toBe(23);
      });

      test("should handle weekly period spanning DST transition", async () => {
        // Week of March 10, 2024 (DST transition)
        const budgetData = {
          categoryId: String(testCategoryId),
          amount: 1000,
          timePeriod: TimePeriodType.WEEKLY,
        };
        const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

        const dstWeekDate = new Date("2024-03-10T10:00:00Z"); // Sunday
        const period = await BudgetService.getBudgetPeriodDates(budget, dstWeekDate);

        // Should span full week Monday to Sunday
        expect(period.startDate.getDay()).toBe(1); // Monday
        expect(period.endDate.getDay()).toBe(0); // Sunday
        
        // Verify time boundaries are correct
        expect(period.startDate.getHours()).toBe(0);
        expect(period.endDate.getHours()).toBe(23);
      });
    });

    describe("budget with zero transactions", () => {
      test("should calculate spending as zero when no transactions exist", async () => {
        const budgetData = {
          categoryId: String(testCategoryId),
          amount: 1000,
          timePeriod: TimePeriodType.MONTHLY,
        };
        const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

        const budgetWithStatus = await BudgetService.getBudget(budget.id, testOrgId);

        expect(budgetWithStatus.currentSpending).toBe(0);
        expect(budgetWithStatus.percentageUsed).toBe(0);
        expect(budgetWithStatus.remainingAmount).toBe(1000);
        expect(budgetWithStatus.exceededAmount).toBe(0);
        expect(budgetWithStatus.isExceeded).toBe(false);
      });

      test("should list budget with zero spending when no transactions exist", async () => {
        const budgetData = {
          categoryId: String(testCategoryId),
          amount: 2500,
          timePeriod: TimePeriodType.WEEKLY,
        };
        await BudgetService.createBudget(budgetData, testOrgId, "AOA");

        const budgets = await BudgetService.listBudgets(testOrgId);

        expect(budgets.length).toBeGreaterThan(0);
        const budget = budgets.find(b => b.amount === 2500);
        expect(budget).toBeDefined();
        expect(budget!.currentSpending).toBe(0);
        expect(budget!.percentageUsed).toBe(0);
        expect(budget!.remainingAmount).toBe(2500);
      });

      test("should handle calculateSpending for budget with no transactions", async () => {
        const budgetData = {
          categoryId: String(testCategoryId),
          amount: 500,
          timePeriod: TimePeriodType.DAILY,
        };
        const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

        const spending = await BudgetService.calculateSpending(budget.id);

        expect(spending.totalSpent).toBe(0);
        expect(spending.budgetAmount).toBe(500);
        expect(spending.percentageUsed).toBe(0);
        expect(spending.remainingAmount).toBe(500);
        expect(spending.exceededAmount).toBe(0);
        expect(spending.isExceeded).toBe(false);
      });

      test("should handle budget with zero amount and zero transactions", async () => {
        // Note: This tests the edge case even though zero amount should be rejected
        // The validation prevents this, but we test the calculation logic
        const budgetData = {
          categoryId: String(testCategoryId),
          amount: 0.01, // Minimum positive amount
          timePeriod: TimePeriodType.MONTHLY,
        };
        const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

        const budgetWithStatus = await BudgetService.getBudget(budget.id, testOrgId);

        expect(budgetWithStatus.currentSpending).toBe(0);
        expect(budgetWithStatus.percentageUsed).toBe(0);
        expect(budgetWithStatus.remainingAmount).toBeCloseTo(0.01, 2);
      });

      test("should handle inactive budget with zero transactions", async () => {
        const budgetData = {
          categoryId: String(testCategoryId),
          amount: 1000,
          timePeriod: TimePeriodType.MONTHLY,
          status: BudgetStatus.INACTIVE,
        };
        const budget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");

        const budgetWithStatus = await BudgetService.getBudget(budget.id, testOrgId);

        expect(budgetWithStatus.status).toBe("inactive");
        expect(budgetWithStatus.currentSpending).toBe(0);
        expect(budgetWithStatus.percentageUsed).toBe(0);
      });
    });
  });

  describe("getBudgetPeriodDates", () => {
    let testBudget: any;

    beforeEach(async () => {
      // Create a test budget for period calculations
      const budgetData = {
        categoryId: String(testCategoryId),
        amount: 1000,
        timePeriod: TimePeriodType.MONTHLY,
      };
      testBudget = await BudgetService.createBudget(budgetData, testOrgId, "AOA");
    });

    describe("daily period", () => {
      test("should calculate daily period boundaries", async () => {
        testBudget.timePeriod = "daily";
        const referenceDate = new Date("2024-03-15T14:30:00Z");

        const period = await BudgetService.getBudgetPeriodDates(testBudget, referenceDate);

        // Should be midnight to midnight of the same day
        expect(period.startDate.getHours()).toBe(0);
        expect(period.startDate.getMinutes()).toBe(0);
        expect(period.startDate.getSeconds()).toBe(0);
        expect(period.startDate.getMilliseconds()).toBe(0);

        expect(period.endDate.getHours()).toBe(23);
        expect(period.endDate.getMinutes()).toBe(59);
        expect(period.endDate.getSeconds()).toBe(59);
        expect(period.endDate.getMilliseconds()).toBe(999);

        // Same day
        expect(period.startDate.getDate()).toBe(15);
        expect(period.endDate.getDate()).toBe(15);
      });

      test("should handle daily period at day boundary", async () => {
        testBudget.timePeriod = "daily";
        const referenceDate = new Date("2024-03-15T00:00:00Z");

        const period = await BudgetService.getBudgetPeriodDates(testBudget, referenceDate);

        expect(period.startDate.getDate()).toBe(15);
        expect(period.endDate.getDate()).toBe(15);
      });
    });

    describe("weekly period", () => {
      test("should calculate weekly period starting Monday", async () => {
        testBudget.timePeriod = "weekly";
        // March 15, 2024 is a Friday
        const referenceDate = new Date("2024-03-15T14:30:00Z");

        const period = await BudgetService.getBudgetPeriodDates(testBudget, referenceDate);

        // Week should start on Monday (March 11) and end on Sunday (March 17)
        expect(period.startDate.getDay()).toBe(1); // Monday
        expect(period.startDate.getDate()).toBe(11);
        expect(period.startDate.getHours()).toBe(0);

        expect(period.endDate.getDay()).toBe(0); // Sunday
        expect(period.endDate.getDate()).toBe(17);
        expect(period.endDate.getHours()).toBe(23);
      });

      test("should handle weekly period when reference is Monday", async () => {
        testBudget.timePeriod = "weekly";
        // March 11, 2024 is a Monday
        const referenceDate = new Date("2024-03-11T14:30:00Z");

        const period = await BudgetService.getBudgetPeriodDates(testBudget, referenceDate);

        // Week should start on same Monday and end on Sunday
        expect(period.startDate.getDay()).toBe(1); // Monday
        expect(period.startDate.getDate()).toBe(11);

        expect(period.endDate.getDay()).toBe(0); // Sunday
        expect(period.endDate.getDate()).toBe(17);
      });

      test("should handle weekly period when reference is Sunday", async () => {
        testBudget.timePeriod = "weekly";
        // March 17, 2024 is a Sunday
        const referenceDate = new Date("2024-03-17T14:30:00Z");

        const period = await BudgetService.getBudgetPeriodDates(testBudget, referenceDate);

        // Week should start on Monday (March 11) and end on same Sunday
        expect(period.startDate.getDay()).toBe(1); // Monday
        expect(period.startDate.getDate()).toBe(11);

        expect(period.endDate.getDay()).toBe(0); // Sunday
        expect(period.endDate.getDate()).toBe(17);
      });
    });

    describe("monthly period", () => {
      test("should calculate monthly period boundaries", async () => {
        testBudget.timePeriod = "monthly";
        const referenceDate = new Date("2024-03-15T14:30:00Z");

        const period = await BudgetService.getBudgetPeriodDates(testBudget, referenceDate);

        // Should be first to last day of March
        expect(period.startDate.getDate()).toBe(1);
        expect(period.startDate.getMonth()).toBe(2); // March (0-indexed)
        expect(period.startDate.getHours()).toBe(0);

        expect(period.endDate.getDate()).toBe(31); // March has 31 days
        expect(period.endDate.getMonth()).toBe(2);
        expect(period.endDate.getHours()).toBe(23);
      });

      test("should handle February in leap year", async () => {
        testBudget.timePeriod = "monthly";
        const referenceDate = new Date("2024-02-15T14:30:00Z");

        const period = await BudgetService.getBudgetPeriodDates(testBudget, referenceDate);

        expect(period.startDate.getDate()).toBe(1);
        expect(period.startDate.getMonth()).toBe(1); // February

        expect(period.endDate.getDate()).toBe(29); // 2024 is a leap year
        expect(period.endDate.getMonth()).toBe(1);
      });

      test("should handle February in non-leap year", async () => {
        testBudget.timePeriod = "monthly";
        const referenceDate = new Date("2023-02-15T14:30:00Z");

        const period = await BudgetService.getBudgetPeriodDates(testBudget, referenceDate);

        expect(period.startDate.getDate()).toBe(1);
        expect(period.endDate.getDate()).toBe(28); // 2023 is not a leap year
      });

      test("should handle month with 30 days", async () => {
        testBudget.timePeriod = "monthly";
        const referenceDate = new Date("2024-04-15T14:30:00Z");

        const period = await BudgetService.getBudgetPeriodDates(testBudget, referenceDate);

        expect(period.startDate.getDate()).toBe(1);
        expect(period.endDate.getDate()).toBe(30); // April has 30 days
      });
    });

    describe("annual period", () => {
      test("should calculate annual period boundaries", async () => {
        testBudget.timePeriod = "annual";
        const referenceDate = new Date("2024-06-15T14:30:00Z");

        const period = await BudgetService.getBudgetPeriodDates(testBudget, referenceDate);

        // Should be Jan 1 to Dec 31 of 2024
        expect(period.startDate.getFullYear()).toBe(2024);
        expect(period.startDate.getMonth()).toBe(0); // January
        expect(period.startDate.getDate()).toBe(1);
        expect(period.startDate.getHours()).toBe(0);

        expect(period.endDate.getFullYear()).toBe(2024);
        expect(period.endDate.getMonth()).toBe(11); // December
        expect(period.endDate.getDate()).toBe(31);
        expect(period.endDate.getHours()).toBe(23);
      });

      test("should handle annual period at year boundary", async () => {
        testBudget.timePeriod = "annual";
        const referenceDate = new Date("2024-01-01T00:00:00Z");

        const period = await BudgetService.getBudgetPeriodDates(testBudget, referenceDate);

        expect(period.startDate.getFullYear()).toBe(2024);
        expect(period.startDate.getMonth()).toBe(0);
        expect(period.startDate.getDate()).toBe(1);

        expect(period.endDate.getFullYear()).toBe(2024);
        expect(period.endDate.getMonth()).toBe(11);
        expect(period.endDate.getDate()).toBe(31);
      });
    });

    describe("custom period", () => {
      test("should return custom period dates", async () => {
        const customStart = new Date("2024-03-01T00:00:00Z");
        const customEnd = new Date("2024-06-30T23:59:59Z");

        testBudget.timePeriod = "custom";
        testBudget.customStartDate = customStart;
        testBudget.customEndDate = customEnd;

        const period = await BudgetService.getBudgetPeriodDates(testBudget, new Date());

        expect(period.startDate.getTime()).toBe(customStart.getTime());
        expect(period.endDate.getTime()).toBe(customEnd.getTime());
      });

      test("should throw error for custom period without dates", async () => {
        testBudget.timePeriod = "custom";
        testBudget.customStartDate = null;
        testBudget.customEndDate = null;

        await expect(
          BudgetService.getBudgetPeriodDates(testBudget, new Date())
        ).rejects.toThrow("Custom budget requires start and end dates");
      });
    });

    describe("invalid period", () => {
      test("should throw error for invalid time period", async () => {
        testBudget.timePeriod = "invalid";

        await expect(
          BudgetService.getBudgetPeriodDates(testBudget, new Date())
        ).rejects.toThrow("Invalid time period");
      });
    });
  });
});
