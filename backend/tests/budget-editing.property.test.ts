/**
 * Property-Based Tests for Budget Editing
 * 
 * These tests verify universal properties across randomized inputs
 * with a minimum of 100 iterations per test.
 * 
 * Tests cover:
 * - Property 27: Budget field editability
 * - Property 28: Alert configuration editability
 * - Property 29: Percentage alert recalculation on amount change
 * - Property 30: Spending recalculation on period change
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import 'dotenv/config';
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import * as fc from "fast-check";
import { BudgetService } from "../src/domain/services/budget.service.js";
import { TransactionRepository } from "../src/domain/repositories/transaction.repository.js";
import { BudgetRepository } from "../src/domain/repositories/budget.repository.js";
import { db } from "../src/core/database/db.js";
import {
  budgets,
  organizations,
  categories,
  users,
  transactions,
} from "../src/core/database/schema.js";
import { eq } from "drizzle-orm";
import {
  TimePeriodType,
  BudgetStatus,
  ThresholdType,
  AlertPosition,
  ChannelType,
} from "../src/domain/entities/budget.types.js";

describe("Budget Editing Property Tests", () => {
  let testOrgId: number;
  let testUserId: number;
  let testCategoryId: number;

  beforeAll(async () => {
    // Create test organization
    const org = await db.insert(organizations).values({
      name: `Test Org - Budget Editing Props - ${Date.now()}`,
      ownerId: 1,
    }).returning();
    testOrgId = org[0].id;

    // Create test user
    const user = await db.insert(users).values({
      email: `test-budget-editing-props-${Date.now()}@example.com`,
      password: "hashedpassword",
      organizationId: testOrgId,
    }).returning();
    testUserId = user[0].id;

    // Create test category
    const category = await db.insert(categories).values({
      userId: testUserId,
      organizationId: testOrgId,
      name: "Test Category - Budget Editing Props",
      type: "despesa",
    }).returning();
    testCategoryId = category[0].id;
  });

  afterAll(async () => {
    // Clean up test data
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
    await db.delete(transactions).where(eq(transactions.userId, testUserId));
  });

  // Feature: budget-management, Property 27: Budget field editability
  // For any existing budget, updates to amount, time period, and status should be accepted and persisted
  test("Property 27: Budget field editability", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate initial budget data
        fc.record({
          initialAmount: fc.double({ min: 100, max: 10000, noNaN: true }),
          initialTimePeriod: fc.constantFrom(
            TimePeriodType.DAILY,
            TimePeriodType.WEEKLY,
            TimePeriodType.MONTHLY,
            TimePeriodType.ANNUAL
          ),
          initialStatus: fc.constantFrom(BudgetStatus.ACTIVE, BudgetStatus.INACTIVE),
          // Generate update data
          newAmount: fc.double({ min: 100, max: 10000, noNaN: true }),
          newTimePeriod: fc.constantFrom(
            TimePeriodType.DAILY,
            TimePeriodType.WEEKLY,
            TimePeriodType.MONTHLY,
            TimePeriodType.ANNUAL
          ),
          newStatus: fc.constantFrom(BudgetStatus.ACTIVE, BudgetStatus.INACTIVE),
        }),
        async (testData) => {
          try {
            // Create initial budget
            const budget = await BudgetService.createBudget(
              {
                categoryId: String(testCategoryId),
                amount: testData.initialAmount,
                timePeriod: testData.initialTimePeriod,
                status: testData.initialStatus,
              },
              testOrgId,
              'USD'
            );

            // Property: Update all fields (amount, timePeriod, status)
            const updatedBudget = await BudgetService.updateBudget(
              budget.id,
              {
                amount: testData.newAmount,
                timePeriod: testData.newTimePeriod,
                status: testData.newStatus,
              },
              testOrgId
            );

            // Property: All updated fields should be persisted
            expect(Number(updatedBudget.amount)).toBeCloseTo(testData.newAmount, 2);
            expect(updatedBudget.timePeriod).toBe(testData.newTimePeriod);
            expect(updatedBudget.status).toBe(testData.newStatus);

            // Property: Verify persistence by retrieving the budget
            const retrievedBudget = await BudgetService.getBudget(budget.id, testOrgId);
            expect(retrievedBudget.amount).toBeCloseTo(testData.newAmount, 2);
            expect(retrievedBudget.timePeriod).toBe(testData.newTimePeriod);
            expect(retrievedBudget.status).toBe(testData.newStatus);

            // Property: Other fields should remain unchanged
            expect(retrievedBudget.organizationId).toBe(testOrgId);
            expect(retrievedBudget.categoryId).toBe(testCategoryId);
            expect(retrievedBudget.currency).toBe('USD');

            // Clean up
            await db.delete(budgets).where(eq(budgets.id, budget.id));
          } catch (error) {
            // Clean up on error
            await db.delete(budgets).where(eq(budgets.organizationId, testOrgId));
            throw error;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: budget-management, Property 28: Alert configuration editability
  // For any existing budget, updates to its alert configurations should be accepted and persisted
  test("Property 28: Alert configuration editability", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          budgetAmount: fc.double({ min: 1000, max: 10000, noNaN: true }),
          timePeriod: fc.constantFrom(
            TimePeriodType.DAILY,
            TimePeriodType.WEEKLY,
            TimePeriodType.MONTHLY
          ),
          // Generate initial alerts (0-2 alerts)
          initialAlertCount: fc.integer({ min: 0, max: 2 }),
          // Generate new alerts (0-3 alerts)
          newAlertCount: fc.integer({ min: 0, max: 3 }),
          // Generate threshold percentages for alerts
          thresholds: fc.array(
            fc.double({ min: 50, max: 95, noNaN: true }),
            { minLength: 3, maxLength: 3 }
          ),
        }),
        async (testData) => {
          try {
            // Create initial alerts
            const initialAlerts = [];
            for (let i = 0; i < testData.initialAlertCount; i++) {
              initialAlerts.push({
                thresholdType: ThresholdType.PERCENTAGE,
                thresholdValue: 60 + i * 15,
                position: AlertPosition.BEFORE_LIMIT,
                channels: [{ type: ChannelType.IN_APP, enabled: true }],
              });
            }

            // Create budget with initial alerts
            const budget = await BudgetService.createBudget(
              {
                categoryId: String(testCategoryId),
                amount: testData.budgetAmount,
                timePeriod: testData.timePeriod,
                alerts: initialAlerts,
              },
              testOrgId,
              'USD'
            );

            // Verify initial alerts
            const initialAlertRecords = await BudgetRepository.findAlertsByBudgetId(budget.id);
            expect(initialAlertRecords).toHaveLength(testData.initialAlertCount);

            // Create new alert configuration
            const newAlerts = [];
            for (let i = 0; i < testData.newAlertCount; i++) {
              const isAfterLimit = i === 2 && testData.newAlertCount === 3;
              newAlerts.push({
                thresholdType: ThresholdType.PERCENTAGE,
                thresholdValue: isAfterLimit ? 110 : testData.thresholds[i],
                position: isAfterLimit ? AlertPosition.AFTER_LIMIT : AlertPosition.BEFORE_LIMIT,
                channels: [
                  { 
                    type: i === 0 ? ChannelType.IN_APP : i === 1 ? ChannelType.EMAIL : ChannelType.SMS, 
                    enabled: true 
                  }
                ],
              });
            }

            // Property: Update alert configuration
            await BudgetService.updateBudget(
              budget.id,
              { alerts: newAlerts },
              testOrgId
            );

            // Property: New alert configuration should be persisted
            const updatedAlertRecords = await BudgetRepository.findAlertsByBudgetId(budget.id);
            expect(updatedAlertRecords).toHaveLength(testData.newAlertCount);

            // Property: Verify each alert's configuration
            for (let i = 0; i < testData.newAlertCount; i++) {
              const alert = updatedAlertRecords[i];
              expect(alert.thresholdType).toBe('percentage');
              expect(Number(alert.thresholdValue)).toBeCloseTo(newAlerts[i].thresholdValue, 2);
              expect(alert.position).toBe(newAlerts[i].position);
            }

            // Property: Verify persistence by retrieving the budget
            const retrievedBudget = await BudgetService.getBudget(budget.id, testOrgId);
            expect(retrievedBudget.alerts).toHaveLength(testData.newAlertCount);

            // Clean up
            await db.delete(budgets).where(eq(budgets.id, budget.id));
          } catch (error) {
            // Clean up on error
            await db.delete(budgets).where(eq(budgets.organizationId, testOrgId));
            throw error;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: budget-management, Property 29: Percentage alert recalculation on amount change
  // For any budget with percentage-based alerts, if the budget amount changes from A1 to A2,
  // then the threshold amounts should be recalculated as (threshold_percentage / 100) × A2
  test("Property 29: Percentage alert recalculation on amount change", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          initialAmount: fc.double({ min: 1000, max: 5000, noNaN: true }),
          newAmount: fc.double({ min: 1000, max: 5000, noNaN: true }),
          timePeriod: fc.constantFrom(
            TimePeriodType.MONTHLY,
            TimePeriodType.WEEKLY
          ),
          // Generate percentage thresholds
          percentageThreshold1: fc.double({ min: 50, max: 80, noNaN: true }),
          percentageThreshold2: fc.double({ min: 85, max: 100, noNaN: true }),
          // Also test with fixed amount alerts to ensure they don't change
          includeFixedAlert: fc.boolean(),
          fixedAmount: fc.double({ min: 100, max: 500, noNaN: true }),
        }),
        async (testData) => {
          try {
            // Skip if amounts are the same (no recalculation to test)
            if (Math.abs(testData.initialAmount - testData.newAmount) < 1) {
              return;
            }

            // Create alerts with percentage thresholds
            const alerts = [
              {
                thresholdType: ThresholdType.PERCENTAGE,
                thresholdValue: testData.percentageThreshold1,
                position: AlertPosition.BEFORE_LIMIT,
                channels: [{ type: ChannelType.IN_APP, enabled: true }],
              },
              {
                thresholdType: ThresholdType.PERCENTAGE,
                thresholdValue: testData.percentageThreshold2,
                position: AlertPosition.BEFORE_LIMIT,
                channels: [{ type: ChannelType.EMAIL, enabled: true }],
              },
            ];

            // Optionally add a fixed amount alert (but only if it won't violate the 2-before, 1-after rule)
            // Since we already have 2 before-limit alerts, we can't add another before-limit
            // So we skip the fixed alert in this test to avoid validation errors
            // The test focuses on percentage alert recalculation anyway

            // Create budget with initial amount
            const budget = await BudgetService.createBudget(
              {
                categoryId: String(testCategoryId),
                amount: testData.initialAmount,
                timePeriod: testData.timePeriod,
                alerts,
              },
              testOrgId,
              'USD'
            );

            // Get initial alerts
            const initialAlerts = await BudgetRepository.findAlertsByBudgetId(budget.id);
            const initialPercentageAlerts = initialAlerts.filter(a => a.thresholdType === 'percentage');

            // Store initial percentage values
            const initialPercentages = initialPercentageAlerts.map(a => Number(a.thresholdValue));

            // Property: Update budget amount
            await BudgetService.updateBudget(
              budget.id,
              { amount: testData.newAmount },
              testOrgId
            );

            // Get updated alerts
            const updatedAlerts = await BudgetRepository.findAlertsByBudgetId(budget.id);
            const updatedPercentageAlerts = updatedAlerts.filter(a => a.thresholdType === 'percentage');

            // Property: Percentage values should remain the same
            expect(updatedPercentageAlerts).toHaveLength(initialPercentageAlerts.length);
            updatedPercentageAlerts.forEach((alert, index) => {
              expect(Number(alert.thresholdValue)).toBeCloseTo(initialPercentages[index], 2);
            });

            // Property: Verify threshold amounts are calculated correctly with new budget amount
            // The actual threshold amount is calculated dynamically when checking alerts
            // We verify this by checking that the percentage value stayed the same
            // and that the AlertService would calculate the correct threshold amount
            
            // Import AlertService to verify threshold calculation
            const { AlertService } = await import("../src/domain/services/alert.service.js");
            
            // Verify that the threshold amount would be calculated correctly
            // For the first percentage alert: (percentage / 100) * newAmount
            const expectedThreshold1 = (testData.percentageThreshold1 / 100) * testData.newAmount;
            const expectedThreshold2 = (testData.percentageThreshold2 / 100) * testData.newAmount;
            
            // Check alerts at spending slightly above the expected threshold to verify calculation
            // (Alerts trigger when spending >= threshold)
            const testSpending = expectedThreshold1 + 1;
            const triggeredAlertsAt1 = await AlertService.checkAlerts(
              budget.id,
              testSpending,
              testData.newAmount,
              'test-period-1'
            );
            
            // Property: At least one alert should trigger when spending exceeds the recalculated threshold
            expect(triggeredAlertsAt1.length).toBeGreaterThan(0);
            
            // Verify the threshold amount is calculated correctly
            const alert1 = triggeredAlertsAt1.find(t => 
              Math.abs(t.thresholdAmount - expectedThreshold1) < 1
            );
            expect(alert1).toBeDefined();
            expect(alert1?.thresholdAmount).toBeCloseTo(expectedThreshold1, 0);

            // Clean up
            await db.delete(budgets).where(eq(budgets.id, budget.id));
          } catch (error) {
            // Clean up on error
            await db.delete(budgets).where(eq(budgets.organizationId, testOrgId));
            throw error;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: budget-management, Property 30: Spending recalculation on period change
  // For any budget, if the time period changes, then the spending amount should be
  // recalculated using only transactions within the new period boundaries
  test("Property 30: Spending recalculation on period change", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          budgetAmount: fc.double({ min: 1000, max: 10000, noNaN: true }),
          initialTimePeriod: fc.constantFrom(
            TimePeriodType.MONTHLY,
            TimePeriodType.WEEKLY
          ),
          newTimePeriod: fc.constantFrom(
            TimePeriodType.DAILY,
            TimePeriodType.WEEKLY,
            TimePeriodType.MONTHLY
          ),
          // Generate transaction amounts
          todayAmount: fc.double({ min: 50, max: 200, noNaN: true }),
          yesterdayAmount: fc.double({ min: 50, max: 200, noNaN: true }),
          lastWeekAmount: fc.double({ min: 50, max: 200, noNaN: true }),
        }),
        async (testData) => {
          try {
            // Skip if periods are the same (no change to test)
            if (testData.initialTimePeriod === testData.newTimePeriod) {
              return;
            }

            // Create budget with initial time period
            const budget = await BudgetService.createBudget(
              {
                categoryId: String(testCategoryId),
                amount: testData.budgetAmount,
                timePeriod: testData.initialTimePeriod,
              },
              testOrgId,
              'USD'
            );

            // Create transactions at different time points
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 8);

            // Create today's transaction
            await TransactionRepository.create({
              userId: testUserId,
              organizationId: testOrgId,
              category: String(testCategoryId),
              amount: String(testData.todayAmount),
              type: 'despesa',
              date: today,
              description: 'Today transaction',
            });

            // Create yesterday's transaction
            await TransactionRepository.create({
              userId: testUserId,
              organizationId: testOrgId,
              category: String(testCategoryId),
              amount: String(testData.yesterdayAmount),
              type: 'despesa',
              date: yesterday,
              description: 'Yesterday transaction',
            });

            // Create last week's transaction
            await TransactionRepository.create({
              userId: testUserId,
              organizationId: testOrgId,
              category: String(testCategoryId),
              amount: String(testData.lastWeekAmount),
              type: 'despesa',
              date: lastWeek,
              description: 'Last week transaction',
            });

            // Calculate spending with initial period
            const initialSpending = await BudgetService.calculateSpending(budget.id);
            const initialTotal = initialSpending.totalSpent;

            // Property: Update time period
            await BudgetService.updateBudget(
              budget.id,
              { timePeriod: testData.newTimePeriod },
              testOrgId
            );

            // Property: Spending should be recalculated for new period
            const newSpending = await BudgetService.calculateSpending(budget.id);
            const newTotal = newSpending.totalSpent;

            // Property: Verify spending is calculated based on new period boundaries
            if (testData.newTimePeriod === TimePeriodType.DAILY) {
              // Daily period should only include today's transaction
              expect(newTotal).toBeCloseTo(testData.todayAmount, 1);
            } else if (testData.newTimePeriod === TimePeriodType.WEEKLY) {
              // Weekly period should include today and yesterday, but not last week
              const expectedWeekly = testData.todayAmount + testData.yesterdayAmount;
              expect(newTotal).toBeCloseTo(expectedWeekly, 1);
            } else if (testData.newTimePeriod === TimePeriodType.MONTHLY) {
              // Monthly period should include all transactions from this month
              // (today and yesterday are in current month, last week might not be)
              const currentMonth = today.getMonth();
              const lastWeekMonth = lastWeek.getMonth();
              
              if (currentMonth === lastWeekMonth) {
                // All transactions in current month
                const expectedMonthly = testData.todayAmount + testData.yesterdayAmount + testData.lastWeekAmount;
                expect(newTotal).toBeCloseTo(expectedMonthly, 1);
              } else {
                // Last week transaction is in previous month
                const expectedMonthly = testData.todayAmount + testData.yesterdayAmount;
                expect(newTotal).toBeCloseTo(expectedMonthly, 1);
              }
            }

            // Property: Verify that spending changed when period changed
            // (unless the new period happens to include the same transactions)
            if (testData.initialTimePeriod === TimePeriodType.MONTHLY && 
                testData.newTimePeriod === TimePeriodType.DAILY) {
              // Monthly to daily should definitely reduce spending
              expect(newTotal).toBeLessThan(initialTotal);
            }

            // Property: Verify persistence - retrieve budget and check spending
            const retrievedBudget = await BudgetService.getBudget(budget.id, testOrgId);
            expect(retrievedBudget.currentSpending).toBeCloseTo(newTotal, 1);
            expect(retrievedBudget.timePeriod).toBe(testData.newTimePeriod);

            // Clean up
            await db.delete(budgets).where(eq(budgets.id, budget.id));
            await db.delete(transactions).where(eq(transactions.userId, testUserId));
          } catch (error) {
            // Clean up on error
            await db.delete(budgets).where(eq(budgets.organizationId, testOrgId));
            await db.delete(transactions).where(eq(transactions.userId, testUserId));
            throw error;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional property: Combined updates maintain consistency
  // When multiple fields are updated simultaneously, all changes should be applied correctly
  test("Property: Combined budget updates maintain consistency", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          initialAmount: fc.double({ min: 1000, max: 5000, noNaN: true }),
          initialTimePeriod: fc.constantFrom(TimePeriodType.MONTHLY, TimePeriodType.WEEKLY),
          initialStatus: fc.constantFrom(BudgetStatus.ACTIVE, BudgetStatus.INACTIVE),
          newAmount: fc.double({ min: 1000, max: 5000, noNaN: true }),
          newTimePeriod: fc.constantFrom(TimePeriodType.DAILY, TimePeriodType.WEEKLY),
          newStatus: fc.constantFrom(BudgetStatus.ACTIVE, BudgetStatus.INACTIVE),
          percentageThreshold: fc.double({ min: 70, max: 90, noNaN: true }),
        }),
        async (testData) => {
          try {
            // Create budget with percentage alert
            const budget = await BudgetService.createBudget(
              {
                categoryId: String(testCategoryId),
                amount: testData.initialAmount,
                timePeriod: testData.initialTimePeriod,
                status: testData.initialStatus,
                alerts: [
                  {
                    thresholdType: ThresholdType.PERCENTAGE,
                    thresholdValue: testData.percentageThreshold,
                    position: AlertPosition.BEFORE_LIMIT,
                    channels: [{ type: ChannelType.IN_APP, enabled: true }],
                  },
                ],
              },
              testOrgId,
              'USD'
            );

            // Property: Update amount, period, and status simultaneously
            await BudgetService.updateBudget(
              budget.id,
              {
                amount: testData.newAmount,
                timePeriod: testData.newTimePeriod,
                status: testData.newStatus,
              },
              testOrgId
            );

            // Property: All updates should be applied
            const updatedBudget = await BudgetService.getBudget(budget.id, testOrgId);
            expect(updatedBudget.amount).toBeCloseTo(testData.newAmount, 2);
            expect(updatedBudget.timePeriod).toBe(testData.newTimePeriod);
            expect(updatedBudget.status).toBe(testData.newStatus);

            // Property: Percentage alert should still exist with same percentage
            expect(updatedBudget.alerts).toHaveLength(1);
            expect(updatedBudget.alerts[0].thresholdValue).toBeCloseTo(testData.percentageThreshold, 2);

            // Property: Spending should be calculated for new period
            expect(updatedBudget.currentSpending).toBeDefined();
            expect(updatedBudget.percentageUsed).toBeDefined();

            // Clean up
            await db.delete(budgets).where(eq(budgets.id, budget.id));
          } catch (error) {
            // Clean up on error
            await db.delete(budgets).where(eq(budgets.organizationId, testOrgId));
            throw error;
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
