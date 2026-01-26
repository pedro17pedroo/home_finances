/**
 * Property-Based Tests for Budget Deletion and Archiving
 * 
 * These tests verify universal properties across randomized inputs
 * with a minimum of 100 iterations per test.
 * 
 * Tests cover:
 * - Property 31: Cascade deletion of budget data
 * - Property 32: Archive instead of delete for historical budgets
 * 
 * Requirements: 6.5, 6.6
 */

import 'dotenv/config';
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import * as fc from "fast-check";
import { BudgetService } from "../src/domain/services/budget.service.js";
import { db } from "../src/core/database/db.js";
import {
  budgets,
  budgetAlerts,
  alertTriggers,
  budgetHistory,
  organizations,
  categories,
  users,
} from "../src/core/database/schema.js";
import { eq, inArray } from "drizzle-orm";
import {
  TimePeriodType,
  BudgetStatus,
} from "../src/domain/entities/budget.types.js";

describe("Budget Deletion Property Tests", () => {
  let testOrgId: number;
  let testUserId: number;
  let testCategoryId: number;

  beforeAll(async () => {
    // Create test organization
    const org = await db.insert(organizations).values({
      name: `Test Org - Deletion Props - ${Date.now()}`,
      ownerId: 1,
    }).returning();
    testOrgId = org[0].id;

    // Create test user
    const user = await db.insert(users).values({
      email: `test-deletion-props-${Date.now()}@example.com`,
      password: "hashedpassword",
      organizationId: testOrgId,
    }).returning();
    testUserId = user[0].id;

    // Create test category
    const category = await db.insert(categories).values({
      userId: testUserId,
      organizationId: testOrgId,
      name: "Test Category - Deletion Props",
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

  // Feature: budget-management, Property 31: Cascade deletion of budget data
  // For any budget without historical data, deleting it should also remove all associated alerts and alert triggers
  test("Property 31: Cascade deletion of budget data", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random budget data
        fc.record({
          amount: fc.double({ min: 100, max: 10000, noNaN: true }),
          timePeriod: fc.constantFrom(
            TimePeriodType.DAILY,
            TimePeriodType.WEEKLY,
            TimePeriodType.MONTHLY,
            TimePeriodType.ANNUAL
          ),
          status: fc.constantFrom(BudgetStatus.ACTIVE, BudgetStatus.INACTIVE),
          // Generate 0-3 alerts
          alertCount: fc.integer({ min: 0, max: 3 }),
          // Generate 0-5 alert triggers
          triggerCount: fc.integer({ min: 0, max: 5 }),
        }),
        async (budgetData) => {
          try {
            // Create budget
            const budget = await db
              .insert(budgets)
              .values({
                organizationId: testOrgId,
                categoryId: testCategoryId,
                amount: String(budgetData.amount),
                currency: 'USD',
                timePeriod: budgetData.timePeriod,
                status: budgetData.status,
              })
              .returning();

            const budgetId = budget[0].id;
            const alertIds: number[] = [];

            // Create alerts
            for (let i = 0; i < budgetData.alertCount; i++) {
              const alert = await db
                .insert(budgetAlerts)
                .values({
                  budgetId,
                  thresholdType: 'percentage',
                  thresholdValue: String(50 + i * 20),
                  position: i < 2 ? 'before_limit' : 'after_limit',
                  channels: [{ type: 'in_app', enabled: true }],
                })
                .returning();
              alertIds.push(alert[0].id);
            }

            // Create alert triggers
            const triggerCount = Math.min(budgetData.triggerCount, alertIds.length);
            for (let i = 0; i < triggerCount; i++) {
              await db
                .insert(alertTriggers)
                .values({
                  alertId: alertIds[i % alertIds.length],
                  budgetPeriodId: `2024-${String(i + 1).padStart(2, '0')}-monthly`,
                  spendingAmount: String(budgetData.amount * 0.8),
                });
            }

            // Verify data exists before deletion
            const alertsBefore = await db
              .select()
              .from(budgetAlerts)
              .where(eq(budgetAlerts.budgetId, budgetId));
            expect(alertsBefore).toHaveLength(budgetData.alertCount);

            if (alertIds.length > 0) {
              const triggersBefore = await db
                .select()
                .from(alertTriggers)
                .where(inArray(alertTriggers.alertId, alertIds));
              expect(triggersBefore.length).toBeGreaterThanOrEqual(0);
            }

            // Delete the budget (no history exists)
            await BudgetService.deleteBudget(budgetId, testOrgId);

            // Property: Budget should be deleted
            const budgetAfter = await db
              .select()
              .from(budgets)
              .where(eq(budgets.id, budgetId));
            expect(budgetAfter).toHaveLength(0);

            // Property: All alerts should be cascade deleted
            const alertsAfter = await db
              .select()
              .from(budgetAlerts)
              .where(eq(budgetAlerts.budgetId, budgetId));
            expect(alertsAfter).toHaveLength(0);

            // Property: All alert triggers should be cascade deleted
            if (alertIds.length > 0) {
              const triggersAfter = await db
                .select()
                .from(alertTriggers)
                .where(inArray(alertTriggers.alertId, alertIds));
              expect(triggersAfter).toHaveLength(0);
            }
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

  // Feature: budget-management, Property 32: Archive instead of delete for historical budgets
  // For any budget with archived history records, attempting to delete it should archive the budget instead of removing it
  test("Property 32: Archive instead of delete for historical budgets", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random budget data
        fc.record({
          amount: fc.double({ min: 100, max: 10000, noNaN: true }),
          timePeriod: fc.constantFrom(
            TimePeriodType.DAILY,
            TimePeriodType.WEEKLY,
            TimePeriodType.MONTHLY,
            TimePeriodType.ANNUAL
          ),
          status: fc.constantFrom(BudgetStatus.ACTIVE, BudgetStatus.INACTIVE),
          // Generate 1-5 history records
          historyCount: fc.integer({ min: 1, max: 5 }),
          // Generate spending data for history
          spendingPercentages: fc.array(
            fc.double({ min: 0, max: 150, noNaN: true }),
            { minLength: 1, maxLength: 5 }
          ),
        }),
        async (budgetData) => {
          try {
            // Create budget
            const budget = await db
              .insert(budgets)
              .values({
                organizationId: testOrgId,
                categoryId: testCategoryId,
                amount: String(budgetData.amount),
                currency: 'USD',
                timePeriod: budgetData.timePeriod,
                status: budgetData.status,
              })
              .returning();

            const budgetId = budget[0].id;

            // Create historical records
            const historyCount = Math.min(
              budgetData.historyCount,
              budgetData.spendingPercentages.length
            );

            for (let i = 0; i < historyCount; i++) {
              const spendingPercentage = budgetData.spendingPercentages[i];
              const finalSpending = (budgetData.amount * spendingPercentage) / 100;

              await db
                .insert(budgetHistory)
                .values({
                  budgetId,
                  periodStartDate: new Date(`2024-${String(i + 1).padStart(2, '0')}-01`),
                  periodEndDate: new Date(`2024-${String(i + 1).padStart(2, '0')}-28`),
                  finalSpendingAmount: String(finalSpending.toFixed(2)),
                  percentageUsed: String(spendingPercentage.toFixed(2)),
                  alertsTriggered: [],
                });
            }

            // Verify history exists before deletion
            const historyBefore = await db
              .select()
              .from(budgetHistory)
              .where(eq(budgetHistory.budgetId, budgetId));
            expect(historyBefore.length).toBeGreaterThan(0);

            // Store original budget data
            const originalStatus = budget[0].status;
            const originalAmount = budget[0].amount;

            // Delete the budget (history exists, so it should be archived)
            await BudgetService.deleteBudget(budgetId, testOrgId);

            // Property: Budget should still exist
            const budgetAfter = await db
              .select()
              .from(budgets)
              .where(eq(budgets.id, budgetId));
            expect(budgetAfter).toHaveLength(1);

            // Property: Budget status should be 'archived'
            expect(budgetAfter[0].status).toBe('archived');

            // Property: Budget data should be preserved (except status)
            expect(budgetAfter[0].amount).toBe(originalAmount);
            expect(budgetAfter[0].organizationId).toBe(testOrgId);
            expect(budgetAfter[0].categoryId).toBe(testCategoryId);
            expect(budgetAfter[0].timePeriod).toBe(budgetData.timePeriod);

            // Property: History should still exist
            const historyAfter = await db
              .select()
              .from(budgetHistory)
              .where(eq(budgetHistory.budgetId, budgetId));
            expect(historyAfter).toHaveLength(historyBefore.length);

            // Clean up
            await db.delete(budgets).where(eq(budgets.id, budgetId));
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

  // Additional property: Archived budgets should not be deleted again
  test("Property: Archived budgets remain archived when deleted again", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          amount: fc.double({ min: 100, max: 10000, noNaN: true }),
          timePeriod: fc.constantFrom(
            TimePeriodType.DAILY,
            TimePeriodType.WEEKLY,
            TimePeriodType.MONTHLY
          ),
        }),
        async (budgetData) => {
          try {
            // Create budget
            const budget = await db
              .insert(budgets)
              .values({
                organizationId: testOrgId,
                categoryId: testCategoryId,
                amount: String(budgetData.amount),
                currency: 'USD',
                timePeriod: budgetData.timePeriod,
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
                periodEndDate: new Date('2024-01-31'),
                finalSpendingAmount: String((budgetData.amount * 0.8).toFixed(2)),
                percentageUsed: '80.00',
                alertsTriggered: [],
              });

            // First deletion - should archive
            await BudgetService.deleteBudget(budgetId, testOrgId);

            const budgetAfterFirst = await db
              .select()
              .from(budgets)
              .where(eq(budgets.id, budgetId));
            expect(budgetAfterFirst).toHaveLength(1);
            expect(budgetAfterFirst[0].status).toBe('archived');

            // Second deletion - should remain archived
            await BudgetService.deleteBudget(budgetId, testOrgId);

            const budgetAfterSecond = await db
              .select()
              .from(budgets)
              .where(eq(budgets.id, budgetId));
            expect(budgetAfterSecond).toHaveLength(1);
            expect(budgetAfterSecond[0].status).toBe('archived');

            // Clean up
            await db.delete(budgets).where(eq(budgets.id, budgetId));
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
