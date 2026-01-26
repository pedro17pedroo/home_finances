/**
 * Property-Based Tests for Budget Archiving
 * 
 * These tests verify universal properties across randomized inputs
 * with a minimum of 100 iterations per test.
 * 
 * Tests cover:
 * - Property 40: Period end archiving
 * - Property 41: Archive retrieval
 * - Property 42: Recurring budget rollover
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */

import 'dotenv/config';
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import * as fc from "fast-check";
import { BudgetService } from "../src/domain/services/budget.service.js";
import { AlertService } from "../src/domain/services/alert.service.js";
import { TransactionRepository } from "../src/domain/repositories/transaction.repository.js";
import { BudgetRepository } from "../src/domain/repositories/budget.repository.js";
import { db } from "../src/core/database/db.js";
import {
  budgets,
  budgetHistory,
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

describe("Budget Archiving Property Tests", () => {
  let testOrgId: number;
  let testUserId: number;
  let testCategoryId: number;

  beforeAll(async () => {
    // Create test organization
    const org = await db.insert(organizations).values({
      name: `Test Org - Budget Archiving Props - ${Date.now()}`,
      ownerId: 1,
    }).returning();
    testOrgId = org[0].id;

    // Create test user
    const user = await db.insert(users).values({
      email: `test-budget-archiving-props-${Date.now()}@example.com`,
      password: "hashedpassword",
      organizationId: testOrgId,
    }).returning();
    testUserId = user[0].id;

    // Create test category
    const category = await db.insert(categories).values({
      userId: testUserId,
      organizationId: testOrgId,
      name: "Test Category - Budget Archiving Props",
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

  // Feature: budget-management, Property 40: Period end archiving
  // For any budget period that ends, an archive record should be created with the final spending amount,
  // percentage used, and list of triggered alert IDs
  test("Property 40: Period end archiving", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          budgetAmount: fc.double({ min: 500, max: 5000, noNaN: true }),
          timePeriod: fc.constantFrom(
            TimePeriodType.DAILY,
            TimePeriodType.WEEKLY,
            TimePeriodType.MONTHLY,
            TimePeriodType.ANNUAL
          ),
          // Generate transaction amounts (0-5 transactions)
          transactionCount: fc.integer({ min: 0, max: 5 }),
          transactionAmounts: fc.array(
            fc.double({ min: 10, max: 500, noNaN: true }),
            { minLength: 5, maxLength: 5 }
          ),
          // Generate alert configuration (0-3 alerts)
          alertCount: fc.integer({ min: 0, max: 3 }),
          alertThresholds: fc.array(
            fc.double({ min: 40, max: 95, noNaN: true }),
            { minLength: 3, maxLength: 3 }
          ),
        }),
        async (testData) => {
          try {
            // Create alerts based on count
            const alerts = [];
            for (let i = 0; i < testData.alertCount; i++) {
              const isAfterLimit = i === 2 && testData.alertCount === 3;
              alerts.push({
                thresholdType: ThresholdType.PERCENTAGE,
                thresholdValue: isAfterLimit ? 110 : testData.alertThresholds[i],
                position: isAfterLimit ? AlertPosition.AFTER_LIMIT : AlertPosition.BEFORE_LIMIT,
                channels: [{ type: ChannelType.IN_APP, enabled: true }],
              });
            }

            // Create budget
            const budget = await BudgetService.createBudget(
              {
                categoryId: String(testCategoryId),
                amount: testData.budgetAmount,
                timePeriod: testData.timePeriod,
                alerts: alerts.length > 0 ? alerts : undefined,
              },
              testOrgId,
              'USD'
            );

            // Create transactions
            const now = new Date();
            let totalSpent = 0;
            for (let i = 0; i < testData.transactionCount; i++) {
              const amount = testData.transactionAmounts[i];
              totalSpent += amount;
              
              await TransactionRepository.create({
                userId: testUserId,
                organizationId: testOrgId,
                category: String(testCategoryId),
                amount: String(amount),
                type: 'despesa',
                date: now,
                description: `Test transaction ${i + 1}`,
              });
            }

            // Calculate expected percentage
            const expectedPercentage = testData.budgetAmount > 0 
              ? (totalSpent / testData.budgetAmount) * 100 
              : 0;

            // Trigger alerts if spending crosses thresholds
            const periodDates = await BudgetService.getBudgetPeriodDates(budget, now);
            const budgetPeriodId = `${budget.id}-${budget.timePeriod}-${periodDates.startDate.toISOString().split('T')[0]}`;
            
            const budgetAlerts = await BudgetRepository.findAlertsByBudgetId(budget.id);
            const triggeredAlertIds: number[] = [];
            
            for (const alert of budgetAlerts) {
              const thresholdAmount = (Number(alert.thresholdValue) / 100) * testData.budgetAmount;
              if (totalSpent >= thresholdAmount) {
                await AlertService.markAlertTriggered(alert.id, budgetPeriodId, totalSpent);
                triggeredAlertIds.push(alert.id);
              }
            }

            // Property: Archive the budget period
            await BudgetService.archiveBudgetPeriod(budget.id);

            // Property: Archive record should be created
            const archives = await db
              .select()
              .from(budgetHistory)
              .where(eq(budgetHistory.budgetId, budget.id));

            expect(archives.length).toBeGreaterThan(0);
            const archive = archives[archives.length - 1]; // Get the most recent archive

            // Property: Archive should contain final spending amount
            expect(Number(archive.finalSpendingAmount)).toBeCloseTo(totalSpent, 1);

            // Property: Archive should contain percentage used
            expect(Number(archive.percentageUsed)).toBeCloseTo(expectedPercentage, 1);

            // Property: Archive should contain list of triggered alert IDs
            const archivedAlertIds = archive.alertsTriggered as string[];
            expect(archivedAlertIds).toHaveLength(triggeredAlertIds.length);
            
            // Verify all triggered alerts are in the archive
            for (const alertId of triggeredAlertIds) {
              expect(archivedAlertIds).toContain(String(alertId));
            }

            // Property: Archive should have period dates
            expect(archive.periodStartDate).toBeDefined();
            expect(archive.periodEndDate).toBeDefined();
            expect(new Date(archive.periodEndDate).getTime()).toBeGreaterThan(
              new Date(archive.periodStartDate).getTime()
            );

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
  }, 10000); // 10 second timeout for this property test

  // Feature: budget-management, Property 41: Archive retrieval
  // For any archived budget period, users from the same organization should be able to retrieve the archive record
  test("Property 41: Archive retrieval", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          budgetAmount: fc.double({ min: 1000, max: 10000, noNaN: true }),
          timePeriod: fc.constantFrom(
            TimePeriodType.DAILY,
            TimePeriodType.WEEKLY,
            TimePeriodType.MONTHLY
          ),
          spendingAmount: fc.double({ min: 0, max: 5000, noNaN: true }),
          // Generate multiple archive periods (1-3)
          archiveCount: fc.integer({ min: 1, max: 3 }),
        }),
        async (testData) => {
          try {
            // Create budget
            const budget = await BudgetService.createBudget(
              {
                categoryId: String(testCategoryId),
                amount: testData.budgetAmount,
                timePeriod: testData.timePeriod,
              },
              testOrgId,
              'USD'
            );

            // Create transaction
            if (testData.spendingAmount > 0) {
              await TransactionRepository.create({
                userId: testUserId,
                organizationId: testOrgId,
                category: String(testCategoryId),
                amount: String(testData.spendingAmount),
                type: 'despesa',
                date: new Date(),
                description: 'Test transaction',
              });
            }

            // Create multiple archive periods
            const archiveIds: number[] = [];
            for (let i = 0; i < testData.archiveCount; i++) {
              await BudgetService.archiveBudgetPeriod(budget.id);
              
              // Get the most recent archive
              const archives = await db
                .select()
                .from(budgetHistory)
                .where(eq(budgetHistory.budgetId, budget.id));
              
              if (archives.length > 0) {
                archiveIds.push(archives[archives.length - 1].id);
              }
            }

            // Property: Retrieve archives for the budget
            const retrievedArchives = await db
              .select()
              .from(budgetHistory)
              .where(eq(budgetHistory.budgetId, budget.id));

            // Property: All created archives should be retrievable
            expect(retrievedArchives.length).toBeGreaterThanOrEqual(testData.archiveCount);

            // Property: Each archive should contain valid data
            for (const archive of retrievedArchives) {
              expect(archive.budgetId).toBe(budget.id);
              expect(archive.finalSpendingAmount).toBeDefined();
              expect(archive.percentageUsed).toBeDefined();
              expect(archive.alertsTriggered).toBeDefined();
              expect(archive.periodStartDate).toBeDefined();
              expect(archive.periodEndDate).toBeDefined();
              
              // Property: Spending amount should be non-negative
              expect(Number(archive.finalSpendingAmount)).toBeGreaterThanOrEqual(0);
              
              // Property: Percentage should be non-negative
              expect(Number(archive.percentageUsed)).toBeGreaterThanOrEqual(0);
              
              // Property: Alerts triggered should be an array
              expect(Array.isArray(archive.alertsTriggered)).toBe(true);
            }

            // Property: Archives should be ordered by creation time (most recent last)
            if (retrievedArchives.length > 1) {
              for (let i = 1; i < retrievedArchives.length; i++) {
                const prevTime = new Date(retrievedArchives[i - 1].createdAt || 0).getTime();
                const currTime = new Date(retrievedArchives[i].createdAt || 0).getTime();
                expect(currTime).toBeGreaterThanOrEqual(prevTime);
              }
            }

            // Property: Verify organization isolation - archives belong to budget's organization
            const budgetData = await BudgetRepository.findById(budget.id);
            expect(budgetData?.organizationId).toBe(testOrgId);

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

  // Feature: budget-management, Property 42: Recurring budget rollover
  // For any budget with a recurring time period (daily, weekly, monthly, annual), when the period ends,
  // a new budget period should be automatically created with the same configuration
  test("Property 42: Recurring budget rollover", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          budgetAmount: fc.double({ min: 500, max: 5000, noNaN: true }),
          timePeriod: fc.constantFrom(
            TimePeriodType.DAILY,
            TimePeriodType.WEEKLY,
            TimePeriodType.MONTHLY,
            TimePeriodType.ANNUAL
          ),
          status: fc.constantFrom(BudgetStatus.ACTIVE, BudgetStatus.INACTIVE),
          // Generate alert configuration (0-2 alerts to avoid validation complexity)
          alertCount: fc.integer({ min: 0, max: 2 }),
          alertThresholds: fc.array(
            fc.double({ min: 50, max: 90, noNaN: true }),
            { minLength: 2, maxLength: 2 }
          ),
        }),
        async (testData) => {
          try {
            // Create alerts based on count
            const alerts = [];
            for (let i = 0; i < testData.alertCount; i++) {
              alerts.push({
                thresholdType: ThresholdType.PERCENTAGE,
                thresholdValue: testData.alertThresholds[i],
                position: AlertPosition.BEFORE_LIMIT,
                channels: [{ type: ChannelType.IN_APP, enabled: true }],
              });
            }

            // Create recurring budget
            const budget = await BudgetService.createBudget(
              {
                categoryId: String(testCategoryId),
                amount: testData.budgetAmount,
                timePeriod: testData.timePeriod,
                status: testData.status,
                alerts: alerts.length > 0 ? alerts : undefined,
              },
              testOrgId,
              'USD'
            );

            // Store original budget configuration
            const originalAmount = Number(budget.amount);
            const originalTimePeriod = budget.timePeriod;
            const originalStatus = budget.status;
            const originalCurrency = budget.currency;
            const originalCategoryId = budget.categoryId;
            const originalOrgId = budget.organizationId;

            // Get original alerts
            const originalAlerts = await BudgetRepository.findAlertsByBudgetId(budget.id);
            const originalAlertCount = originalAlerts.length;

            // Property: Create next period (simulates period rollover)
            const nextPeriodBudget = await BudgetService.createNextPeriod(budget.id);

            // Property: Budget ID should remain the same (recurring budgets reuse the same record)
            expect(nextPeriodBudget.id).toBe(budget.id);

            // Property: Budget configuration should remain unchanged
            expect(Number(nextPeriodBudget.amount)).toBeCloseTo(originalAmount, 2);
            expect(nextPeriodBudget.timePeriod).toBe(originalTimePeriod);
            expect(nextPeriodBudget.status).toBe(originalStatus);
            expect(nextPeriodBudget.currency).toBe(originalCurrency);
            expect(nextPeriodBudget.categoryId).toBe(originalCategoryId);
            expect(nextPeriodBudget.organizationId).toBe(originalOrgId);

            // Property: Alerts should remain configured
            const nextPeriodAlerts = await BudgetRepository.findAlertsByBudgetId(nextPeriodBudget.id);
            expect(nextPeriodAlerts).toHaveLength(originalAlertCount);

            // Property: Alert configurations should be preserved
            for (let i = 0; i < originalAlertCount; i++) {
              const originalAlert = originalAlerts[i];
              const nextAlert = nextPeriodAlerts.find(a => a.id === originalAlert.id);
              
              expect(nextAlert).toBeDefined();
              expect(nextAlert?.thresholdType).toBe(originalAlert.thresholdType);
              expect(Number(nextAlert?.thresholdValue)).toBeCloseTo(Number(originalAlert.thresholdValue), 2);
              expect(nextAlert?.position).toBe(originalAlert.position);
            }

            // Property: Alert triggers should be reset for the new period
            // (This allows alerts to trigger again in the new period)
            const periodDates = await BudgetService.getBudgetPeriodDates(nextPeriodBudget, new Date());
            const budgetPeriodId = `${nextPeriodBudget.id}-${nextPeriodBudget.timePeriod}-${periodDates.startDate.toISOString().split('T')[0]}`;
            
            for (const alert of nextPeriodAlerts) {
              const hasBeenTriggered = await AlertService.hasAlertBeenTriggered(alert.id, budgetPeriodId);
              expect(hasBeenTriggered).toBe(false);
            }

            // Property: Spending calculation should work for the new period
            const spending = await BudgetService.calculateSpending(nextPeriodBudget.id);
            expect(spending).toBeDefined();
            expect(spending.totalSpent).toBeGreaterThanOrEqual(0);
            expect(spending.budgetAmount).toBeCloseTo(originalAmount, 2);
            expect(spending.percentageUsed).toBeGreaterThanOrEqual(0);

            // Property: Budget should be retrievable with status
            const retrievedBudget = await BudgetService.getBudget(nextPeriodBudget.id, testOrgId);
            expect(retrievedBudget.id).toBe(budget.id);
            expect(retrievedBudget.amount).toBeCloseTo(originalAmount, 2);
            expect(retrievedBudget.timePeriod).toBe(originalTimePeriod);

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

  // Additional property: Custom budgets should not support rollover
  // For any budget with custom time period, attempting to create next period should fail
  test("Property: Custom budgets do not support period rollover", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          budgetAmount: fc.double({ min: 1000, max: 10000, noNaN: true }),
          // Generate custom date range (start date in past, end date in future)
          daysInPast: fc.integer({ min: 1, max: 30 }),
          daysInFuture: fc.integer({ min: 1, max: 30 }),
        }),
        async (testData) => {
          try {
            // Calculate custom dates
            const now = new Date();
            const startDate = new Date(now);
            startDate.setDate(now.getDate() - testData.daysInPast);
            const endDate = new Date(now);
            endDate.setDate(now.getDate() + testData.daysInFuture);

            // Create custom budget
            const budget = await BudgetService.createBudget(
              {
                categoryId: String(testCategoryId),
                amount: testData.budgetAmount,
                timePeriod: TimePeriodType.CUSTOM,
                customStartDate: startDate,
                customEndDate: endDate,
              },
              testOrgId,
              'USD'
            );

            // Property: Attempting to create next period should throw error
            await expect(
              BudgetService.createNextPeriod(budget.id)
            ).rejects.toThrow('Custom budgets do not have recurring periods');

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

  // Additional property: Multiple archive operations preserve all history
  // For any budget, multiple archive operations should create multiple archive records
  test("Property: Multiple archive operations preserve all history", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          budgetAmount: fc.double({ min: 1000, max: 5000, noNaN: true }),
          timePeriod: fc.constantFrom(
            TimePeriodType.MONTHLY,
            TimePeriodType.WEEKLY
          ),
          archiveCount: fc.integer({ min: 2, max: 4 }),
          spendingAmounts: fc.array(
            fc.double({ min: 0, max: 1000, noNaN: true }),
            { minLength: 4, maxLength: 4 }
          ),
        }),
        async (testData) => {
          try {
            // Create budget
            const budget = await BudgetService.createBudget(
              {
                categoryId: String(testCategoryId),
                amount: testData.budgetAmount,
                timePeriod: testData.timePeriod,
              },
              testOrgId,
              'USD'
            );

            // Create multiple archive periods with different spending
            const expectedSpending: number[] = [];
            
            for (let i = 0; i < testData.archiveCount; i++) {
              // Create transaction for this period
              const spendingAmount = testData.spendingAmounts[i];
              expectedSpending.push(spendingAmount);
              
              if (spendingAmount > 0) {
                await TransactionRepository.create({
                  userId: testUserId,
                  organizationId: testOrgId,
                  category: String(testCategoryId),
                  amount: String(spendingAmount),
                  type: 'despesa',
                  date: new Date(),
                  description: `Period ${i + 1} transaction`,
                });
              }

              // Archive the period
              await BudgetService.archiveBudgetPeriod(budget.id);

              // Clean transactions for next period
              await db.delete(transactions).where(eq(transactions.userId, testUserId));
            }

            // Property: All archive records should exist
            const archives = await db
              .select()
              .from(budgetHistory)
              .where(eq(budgetHistory.budgetId, budget.id));

            expect(archives).toHaveLength(testData.archiveCount);

            // Property: Each archive should have the correct spending amount
            for (let i = 0; i < testData.archiveCount; i++) {
              const archive = archives[i];
              expect(Number(archive.finalSpendingAmount)).toBeCloseTo(expectedSpending[i], 1);
            }

            // Property: Archives should be independent (modifying one doesn't affect others)
            // This is implicitly tested by having different spending amounts in each archive

            // Property: All archives should have valid period dates
            for (const archive of archives) {
              expect(archive.periodStartDate).toBeDefined();
              expect(archive.periodEndDate).toBeDefined();
              expect(new Date(archive.periodEndDate).getTime()).toBeGreaterThan(
                new Date(archive.periodStartDate).getTime()
              );
            }

            // Clean up
            await db.delete(budgets).where(eq(budgets.id, budget.id));
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
});
