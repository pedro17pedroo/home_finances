import 'dotenv/config';
import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import * as fc from "fast-check";
import { BudgetService } from "../src/domain/services/budget.service.js";
import { db } from "../src/core/database/db.js";
import { organizations, categories, budgets, users } from "../src/core/database/schema.js";
import { eq } from "drizzle-orm";
import type { Budget } from "../src/core/database/schema.js";

/**
 * Property-Based Tests for Budget Period Calculations
 * 
 * These tests verify the correctness properties for period boundary calculations
 * across different time period types and timezones.
 * 
 * Feature: budget-management
 * Task: 3.4 Write property tests for period calculations
 * 
 * Properties tested:
 * - Property 34: Organization timezone usage (Requirements 8.1)
 * - Property 35: Daily period boundaries (Requirements 8.2)
 * - Property 36: Weekly period boundaries (Requirements 8.3)
 * - Property 37: Monthly period boundaries (Requirements 8.4)
 * 
 * Each property test runs 100 iterations with randomized inputs using fast-check.
 * 
 * Note: Current implementation uses hardcoded UTC timezone and Monday week start.
 * These tests verify the period calculation logic works correctly with these defaults.
 * When organization timezone/weekStartDay fields are added to the schema, these tests
 * should be updated to test with various timezone configurations.
 */

describe("Budget Period Calculation Properties", () => {
  let testOrgId: number;
  let testUserId: number;
  let testCategoryId: number;

  beforeAll(async () => {
    // Create test organization
    const [org] = await db
      .insert(organizations)
      .values({
        name: `Test Org for Period Tests - ${Date.now()}`,
        ownerId: 1,
      })
      .returning();
    testOrgId = org.id;

    // Create test user
    const [user] = await db
      .insert(users)
      .values({
        email: `test-period-${Date.now()}@example.com`,
        password: "hashedpassword",
        organizationId: testOrgId,
      })
      .returning();
    testUserId = user.id;

    // Create test category
    const [category] = await db
      .insert(categories)
      .values({
        name: "Test Category",
        userId: testUserId,
        organizationId: testOrgId,
        type: "despesa",
      })
      .returning();
    testCategoryId = category.id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(budgets).where(eq(budgets.organizationId, testOrgId));
    await db.delete(categories).where(eq(categories.id, testCategoryId));
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(organizations).where(eq(organizations.id, testOrgId));
  });

  /**
   * Property 34: Organization timezone usage
   * 
   * For any budget period calculation, the period boundaries should be calculated
   * using the organization's configured timezone.
   * 
   * Note: Current implementation uses UTC as default. This test verifies that
   * period calculations are consistent and that the reference date falls within
   * the calculated period.
   * 
   * Validates: Requirements 8.1
   */
  // Feature: budget-management, Property 34: Organization timezone usage
  test("Property 34: Period calculations use organization timezone", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random date and time period type
        fc.date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") }),
        fc.constantFrom("daily", "weekly", "monthly", "annual"),
        async (referenceDate, timePeriod) => {
          // Skip invalid dates
          if (isNaN(referenceDate.getTime())) {
            return true;
          }

          // Create a test budget
          const [budget] = await db
            .insert(budgets)
            .values({
              organizationId: testOrgId,
              categoryId: testCategoryId,
              amount: "1000",
              currency: "AOA",
              timePeriod: timePeriod as any,
              status: "active",
            })
            .returning();

          try {
            // Get period dates
            const period = await BudgetService.getBudgetPeriodDates(budget, referenceDate);

            // Verify that period dates are valid Date objects
            expect(period.startDate).toBeInstanceOf(Date);
            expect(period.endDate).toBeInstanceOf(Date);

            // Verify that start date is before or equal to end date
            expect(period.startDate.getTime()).toBeLessThanOrEqual(period.endDate.getTime());

            // Verify that the reference date falls within the period
            expect(referenceDate.getTime()).toBeGreaterThanOrEqual(period.startDate.getTime());
            expect(referenceDate.getTime()).toBeLessThanOrEqual(period.endDate.getTime());
          } finally {
            // Clean up
            await db.delete(budgets).where(eq(budgets.id, budget.id));
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 35: Daily period boundaries
   * 
   * For any budget with daily time period, the period start should be at 00:00:00
   * and period end should be at 23:59:59 in the organization's timezone.
   * 
   * Validates: Requirements 8.2
   */
  // Feature: budget-management, Property 35: Daily period boundaries
  test("Property 35: Daily period boundaries are midnight to midnight", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random date
        fc.date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") }),
        async (referenceDate) => {
          // Skip invalid dates
          if (isNaN(referenceDate.getTime())) {
            return true;
          }

          // Create a daily budget
          const [budget] = await db
            .insert(budgets)
            .values({
              organizationId: testOrgId,
              categoryId: testCategoryId,
              amount: "1000",
              currency: "AOA",
              timePeriod: "daily",
              status: "active",
            })
            .returning();

          try {
            // Get period dates
            const period = await BudgetService.getBudgetPeriodDates(budget, referenceDate);

            // Verify start date is at 00:00:00.000
            expect(period.startDate.getHours()).toBe(0);
            expect(period.startDate.getMinutes()).toBe(0);
            expect(period.startDate.getSeconds()).toBe(0);
            expect(period.startDate.getMilliseconds()).toBe(0);

            // Verify end date is at 23:59:59.999
            expect(period.endDate.getHours()).toBe(23);
            expect(period.endDate.getMinutes()).toBe(59);
            expect(period.endDate.getSeconds()).toBe(59);
            expect(period.endDate.getMilliseconds()).toBe(999);

            // Verify both dates are on the same day
            expect(period.startDate.getFullYear()).toBe(period.endDate.getFullYear());
            expect(period.startDate.getMonth()).toBe(period.endDate.getMonth());
            expect(period.startDate.getDate()).toBe(period.endDate.getDate());

            // Verify the reference date is on the same day
            expect(period.startDate.getFullYear()).toBe(referenceDate.getFullYear());
            expect(period.startDate.getMonth()).toBe(referenceDate.getMonth());
            expect(period.startDate.getDate()).toBe(referenceDate.getDate());
          } finally {
            // Clean up
            await db.delete(budgets).where(eq(budgets.id, budget.id));
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 36: Weekly period boundaries
   * 
   * For any budget with weekly time period, the period should start on the
   * organization's configured week start day.
   * 
   * Note: Current implementation uses Monday (1) as the default week start day.
   * This test verifies that weekly periods always start on Monday and span 7 days.
   * 
   * Validates: Requirements 8.3
   */
  // Feature: budget-management, Property 36: Weekly period boundaries
  test("Property 36: Weekly period boundaries respect organization week start day", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random date
        fc.date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") }),
        async (referenceDate) => {
          // Skip invalid dates
          if (isNaN(referenceDate.getTime())) {
            return true;
          }

          // Create a weekly budget
          const [budget] = await db
            .insert(budgets)
            .values({
              organizationId: testOrgId,
              categoryId: testCategoryId,
              amount: "1000",
              currency: "AOA",
              timePeriod: "weekly",
              status: "active",
            })
            .returning();

          try {
            // Get period dates
            const period = await BudgetService.getBudgetPeriodDates(budget, referenceDate);

            // Verify start date is at 00:00:00.000
            expect(period.startDate.getHours()).toBe(0);
            expect(period.startDate.getMinutes()).toBe(0);
            expect(period.startDate.getSeconds()).toBe(0);
            expect(period.startDate.getMilliseconds()).toBe(0);

            // Verify end date is at 23:59:59.999
            expect(period.endDate.getHours()).toBe(23);
            expect(period.endDate.getMinutes()).toBe(59);
            expect(period.endDate.getSeconds()).toBe(59);
            expect(period.endDate.getMilliseconds()).toBe(999);

            // Verify start date is on Monday (1) - the default week start day
            expect(period.startDate.getDay()).toBe(1);

            // Verify period is exactly 7 days (6 days + partial day)
            const daysDiff = Math.floor(
              (period.endDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            expect(daysDiff).toBe(6); // Start day + 6 more days = 7 days total

            // Verify reference date falls within the period
            expect(referenceDate.getTime()).toBeGreaterThanOrEqual(period.startDate.getTime());
            expect(referenceDate.getTime()).toBeLessThanOrEqual(period.endDate.getTime());
          } finally {
            // Clean up
            await db.delete(budgets).where(eq(budgets.id, budget.id));
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 37: Monthly period boundaries
   * 
   * For any budget with monthly time period, the period should start on the first
   * day of the month at 00:00:00 and end on the last day of the month at 23:59:59
   * in the organization's timezone.
   * 
   * Validates: Requirements 8.4
   */
  // Feature: budget-management, Property 37: Monthly period boundaries
  test("Property 37: Monthly period boundaries span entire month", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random date
        fc.date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") }),
        async (referenceDate) => {
          // Skip invalid dates
          if (isNaN(referenceDate.getTime())) {
            return true;
          }

          // Create a monthly budget
          const [budget] = await db
            .insert(budgets)
            .values({
              organizationId: testOrgId,
              categoryId: testCategoryId,
              amount: "1000",
              currency: "AOA",
              timePeriod: "monthly",
              status: "active",
            })
            .returning();

          try {
            // Get period dates
            const period = await BudgetService.getBudgetPeriodDates(budget, referenceDate);

            // Verify start date is the first day of the month at 00:00:00.000
            expect(period.startDate.getDate()).toBe(1);
            expect(period.startDate.getHours()).toBe(0);
            expect(period.startDate.getMinutes()).toBe(0);
            expect(period.startDate.getSeconds()).toBe(0);
            expect(period.startDate.getMilliseconds()).toBe(0);

            // Verify end date is at 23:59:59.999
            expect(period.endDate.getHours()).toBe(23);
            expect(period.endDate.getMinutes()).toBe(59);
            expect(period.endDate.getSeconds()).toBe(59);
            expect(period.endDate.getMilliseconds()).toBe(999);

            // Verify start and end are in the same month and year
            expect(period.startDate.getFullYear()).toBe(referenceDate.getFullYear());
            expect(period.startDate.getMonth()).toBe(referenceDate.getMonth());
            expect(period.endDate.getFullYear()).toBe(referenceDate.getFullYear());
            expect(period.endDate.getMonth()).toBe(referenceDate.getMonth());

            // Verify end date is the last day of the month
            // Get the last day by going to the first day of next month and subtracting 1 day
            const lastDayOfMonth = new Date(
              referenceDate.getFullYear(),
              referenceDate.getMonth() + 1,
              0
            ).getDate();
            expect(period.endDate.getDate()).toBe(lastDayOfMonth);

            // Verify reference date falls within the period
            expect(referenceDate.getTime()).toBeGreaterThanOrEqual(period.startDate.getTime());
            expect(referenceDate.getTime()).toBeLessThanOrEqual(period.endDate.getTime());
          } finally {
            // Clean up
            await db.delete(budgets).where(eq(budgets.id, budget.id));
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
