import 'dotenv/config';
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import * as fc from "fast-check";
import { BudgetService } from "../src/domain/services/budget.service.js";
import { db } from "../src/core/database/db.js";
import { budgets, organizations, categories, users, transactions, accounts } from "../src/core/database/schema.js";
import { eq, inArray } from "drizzle-orm";
import {
  TimePeriodType,
  BudgetStatus,
  type CreateBudgetDTO,
} from "../src/domain/entities/budget.types.js";

/**
 * Property-Based Tests for Budget Spending Calculations
 * 
 * These tests verify universal properties across randomized inputs
 * with a minimum of 100 iterations per test.
 * 
 * Tests cover:
 * - Property 13: Spending calculation triggers on transaction
 * - Property 14: Spending calculation filters
 * - Property 15: Budget metrics calculation correctness
 */

describe("Budget Spending Calculation Property Tests", () => {
  let testOrgId: number;
  let testUserId: number;
  let testCategoryId: number;
  let testAccountId: number;
  const testCurrency = "AOA";
  const uniqueTimestamp = Date.now();

  beforeAll(async () => {
    // Create test organization with unique name
    const org = await db.insert(organizations).values({
      name: `Test Org Spending - ${uniqueTimestamp}`,
      ownerId: 1,
    }).returning();
    testOrgId = org[0].id;

    // Create test user
    const user = await db.insert(users).values({
      email: `test-budget-spending-${uniqueTimestamp}@example.com`,
      password: "hashedpassword",
      organizationId: testOrgId,
    }).returning();
    testUserId = user[0].id;

    // Create test category
    const category = await db.insert(categories).values({
      userId: testUserId,
      organizationId: testOrgId,
      name: "Test Category Spending",
      type: "despesa",
    }).returning();
    testCategoryId = category[0].id;

    // Create test account
    const account = await db.insert(accounts).values({
      userId: testUserId,
      organizationId: testOrgId,
      name: "Test Account",
      type: "corrente",
      balance: "10000",
    }).returning();
    testAccountId = account[0].id;
  });

  afterAll(async () => {
    // Clean up test data in correct order (respecting foreign key constraints)
    // Delete transactions first
    if (testOrgId) {
      await db.delete(transactions).where(eq(transactions.organizationId, testOrgId));
    }
    // Delete budgets
    if (testOrgId) {
      await db.delete(budgets).where(eq(budgets.organizationId, testOrgId));
    }
    // Delete account
    if (testAccountId) {
      await db.delete(accounts).where(eq(accounts.id, testAccountId));
    }
    // Delete category BEFORE user (foreign key constraint)
    if (testCategoryId) {
      await db.delete(categories).where(eq(categories.id, testCategoryId));
    }
    // Delete user
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
    // Delete organization
    if (testOrgId) {
      await db.delete(organizations).where(eq(organizations.id, testOrgId));
    }
  });

  beforeEach(async () => {
    // Clean up transactions first (due to foreign key constraints)
    await db.delete(transactions).where(eq(transactions.organizationId, testOrgId));
    // Then clean up budgets
    await db.delete(budgets).where(eq(budgets.organizationId, testOrgId));
  });

  // ============================================================================
  // Property 13: Spending calculation triggers on transaction
  // ============================================================================

  // Feature: budget-management, Property 13: Spending calculation triggers on transaction
  test("spending calculation is triggered when transaction is created in budget category", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          budgetAmount: fc.double({ min: 100, max: 10000, noNaN: true }),
          transactionAmount: fc.double({ min: 1, max: 1000, noNaN: true }),
          timePeriod: fc.constantFrom(
            TimePeriodType.DAILY,
            TimePeriodType.WEEKLY,
            TimePeriodType.MONTHLY
          ),
        }),
        async (testData) => {
          // Clean up before this iteration
          await db.delete(transactions).where(eq(transactions.organizationId, testOrgId));
          await db.delete(budgets).where(eq(budgets.organizationId, testOrgId));

          // Create budget
          const budget = await BudgetService.createBudget(
            {
              categoryId: String(testCategoryId),
              amount: testData.budgetAmount,
              timePeriod: testData.timePeriod,
              status: BudgetStatus.ACTIVE,
            },
            testOrgId,
            testCurrency
          );

          // Create transaction in the budget's category
          await db.insert(transactions).values({
            userId: testUserId,
            organizationId: testOrgId,
            accountId: testAccountId,
            amount: String(testData.transactionAmount),
            description: "Test transaction",
            category: String(testCategoryId), // Match budget category
            type: "despesa",
            date: new Date(),
          });

          // Calculate spending
          const spending = await BudgetService.calculateSpending(budget.id);

          // Property: Spending calculation should be triggered and return non-zero spending
          expect(spending.totalSpent).toBeGreaterThan(0);
          expect(spending.totalSpent).toBeCloseTo(testData.transactionAmount, 2);

          // Clean up after this iteration
          await db.delete(transactions).where(eq(transactions.organizationId, testOrgId));
          await db.delete(budgets).where(eq(budgets.id, budget.id));
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // Property 14: Spending calculation filters
  // ============================================================================

  // Feature: budget-management, Property 14: Spending calculation filters
  test("spending calculation filters by category, organization, and date range", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          budgetAmount: fc.double({ min: 1000, max: 10000, noNaN: true }),
          inPeriodAmount: fc.double({ min: 10, max: 500, noNaN: true }),
          outOfPeriodAmount: fc.double({ min: 10, max: 500, noNaN: true }),
          wrongCategoryAmount: fc.double({ min: 10, max: 500, noNaN: true }),
        }),
        async (testData) => {
          // Clean up before this iteration
          await db.delete(transactions).where(eq(transactions.organizationId, testOrgId));
          await db.delete(budgets).where(eq(budgets.organizationId, testOrgId));

          // Create budget for monthly period
          const budget = await BudgetService.createBudget(
            {
              categoryId: String(testCategoryId),
              amount: testData.budgetAmount,
              timePeriod: TimePeriodType.MONTHLY,
              status: BudgetStatus.ACTIVE,
            },
            testOrgId,
            testCurrency
          );

          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);

          // Create transaction IN period, IN category (should be counted)
          await db.insert(transactions).values({
            userId: testUserId,
            organizationId: testOrgId,
            accountId: testAccountId,
            amount: String(testData.inPeriodAmount),
            description: "In period transaction",
            category: String(testCategoryId),
            type: "despesa",
            date: new Date(now.getFullYear(), now.getMonth(), 15), // Mid-month
          });

          // Create transaction OUT of period (should NOT be counted)
          await db.insert(transactions).values({
            userId: testUserId,
            organizationId: testOrgId,
            accountId: testAccountId,
            amount: String(testData.outOfPeriodAmount),
            description: "Out of period transaction",
            category: String(testCategoryId),
            type: "despesa",
            date: lastMonth,
          });

          // Create another category for wrong category test
          const wrongCategory = await db.insert(categories).values({
            userId: testUserId,
            organizationId: testOrgId,
            name: `Wrong Category ${Date.now()}`,
            type: "despesa",
          }).returning();

          // Create transaction in WRONG category (should NOT be counted)
          await db.insert(transactions).values({
            userId: testUserId,
            organizationId: testOrgId,
            accountId: testAccountId,
            amount: String(testData.wrongCategoryAmount),
            description: "Wrong category transaction",
            category: String(wrongCategory[0].id),
            type: "despesa",
            date: new Date(now.getFullYear(), now.getMonth(), 15),
          });

          // Calculate spending
          const spending = await BudgetService.calculateSpending(budget.id);

          // Property: Only transactions matching category, organization, and date range should be counted
          expect(spending.totalSpent).toBeCloseTo(testData.inPeriodAmount, 2);
          
          // Verify out-of-period and wrong-category transactions are NOT included
          expect(spending.totalSpent).not.toBe(testData.inPeriodAmount + testData.outOfPeriodAmount);
          expect(spending.totalSpent).not.toBe(testData.inPeriodAmount + testData.wrongCategoryAmount);

          // Clean up after this iteration
          await db.delete(categories).where(eq(categories.id, wrongCategory[0].id));
          await db.delete(transactions).where(eq(transactions.organizationId, testOrgId));
          await db.delete(budgets).where(eq(budgets.id, budget.id));
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // Property 15: Budget metrics calculation correctness
  // ============================================================================

  // Feature: budget-management, Property 15: Budget metrics calculation correctness
  test("budget metrics are calculated correctly based on spending and budget amount", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          budgetAmount: fc.double({ min: 100, max: 10000, noNaN: true }),
          spendingAmount: fc.double({ min: 0, max: 15000, noNaN: true }),
        }),
        async (testData) => {
          // Clean up before this iteration
          await db.delete(transactions).where(eq(transactions.organizationId, testOrgId));
          await db.delete(budgets).where(eq(budgets.organizationId, testOrgId));

          // Create budget
          const budget = await BudgetService.createBudget(
            {
              categoryId: String(testCategoryId),
              amount: testData.budgetAmount,
              timePeriod: TimePeriodType.MONTHLY,
              status: BudgetStatus.ACTIVE,
            },
            testOrgId,
            testCurrency
          );

          // Create transaction with spending amount
          if (testData.spendingAmount > 0) {
            await db.insert(transactions).values({
              userId: testUserId,
              organizationId: testOrgId,
              accountId: testAccountId,
              amount: String(testData.spendingAmount),
              description: "Test spending",
              category: String(testCategoryId),
              type: "despesa",
              date: new Date(),
            });
          }

          // Calculate spending
          const spending = await BudgetService.calculateSpending(budget.id);

          // Property: Percentage used = (totalSpent / budgetAmount) × 100
          // Calculate expected percentage using the actual values returned from the service
          // to account for database storage precision
          const expectedPercentage = (spending.totalSpent / spending.budgetAmount) * 100;
          // Use a tolerance that accounts for floating-point precision
          // The difference should be less than 0.1% (0.1 percentage points)
          expect(Math.abs(spending.percentageUsed - expectedPercentage)).toBeLessThan(0.1);

          // Property: Remaining amount = budgetAmount - totalSpent (when not exceeded)
          if (testData.spendingAmount <= testData.budgetAmount) {
            const expectedRemaining = testData.budgetAmount - testData.spendingAmount;
            expect(spending.remainingAmount).toBeCloseTo(expectedRemaining, 1);
            expect(spending.exceededAmount).toBe(0);
            expect(spending.isExceeded).toBe(false);
          }

          // Property: Exceeded amount = totalSpent - budgetAmount (when exceeded)
          if (testData.spendingAmount > testData.budgetAmount) {
            const expectedExceeded = testData.spendingAmount - testData.budgetAmount;
            expect(spending.exceededAmount).toBeCloseTo(expectedExceeded, 1);
            expect(spending.remainingAmount).toBe(0);
            expect(spending.isExceeded).toBe(true);
          }

          // Property: Budget amount should match
          expect(spending.budgetAmount).toBeCloseTo(testData.budgetAmount, 2);

          // Property: Total spent should match
          expect(spending.totalSpent).toBeCloseTo(testData.spendingAmount, 1);

          // Clean up after this iteration
          await db.delete(transactions).where(eq(transactions.organizationId, testOrgId));
          await db.delete(budgets).where(eq(budgets.id, budget.id));
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional test: Multiple transactions accumulate correctly
  // Feature: budget-management, Property 15: Budget metrics calculation correctness
  test("multiple transactions accumulate correctly in spending calculation", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          budgetAmount: fc.double({ min: 1000, max: 10000, noNaN: true }),
          transactionCount: fc.integer({ min: 2, max: 10 }),
          transactionAmount: fc.double({ min: 10, max: 500, noNaN: true }),
        }),
        async (testData) => {
          // Clean up before this iteration
          await db.delete(transactions).where(eq(transactions.organizationId, testOrgId));
          await db.delete(budgets).where(eq(budgets.organizationId, testOrgId));

          // Create budget
          const budget = await BudgetService.createBudget(
            {
              categoryId: String(testCategoryId),
              amount: testData.budgetAmount,
              timePeriod: TimePeriodType.MONTHLY,
              status: BudgetStatus.ACTIVE,
            },
            testOrgId,
            testCurrency
          );

          // Create multiple transactions
          let expectedTotal = 0;
          for (let i = 0; i < testData.transactionCount; i++) {
            const amount = testData.transactionAmount + i;
            await db.insert(transactions).values({
              userId: testUserId,
              organizationId: testOrgId,
              accountId: testAccountId,
              amount: String(amount),
              description: `Test transaction ${i}`,
              category: String(testCategoryId),
              type: "despesa",
              date: new Date(),
            });
            expectedTotal += amount;
          }

          // Calculate spending
          const spending = await BudgetService.calculateSpending(budget.id);

          // Property: Total spent should equal sum of all transactions
          expect(spending.totalSpent).toBeCloseTo(expectedTotal, 1);

          // Property: Metrics should be calculated based on accumulated total
          const expectedPercentage = (expectedTotal / testData.budgetAmount) * 100;
          expect(spending.percentageUsed).toBeCloseTo(expectedPercentage, 2);

          if (expectedTotal <= testData.budgetAmount) {
            expect(spending.remainingAmount).toBeCloseTo(testData.budgetAmount - expectedTotal, 1);
            expect(spending.isExceeded).toBe(false);
          } else {
            expect(spending.exceededAmount).toBeCloseTo(expectedTotal - testData.budgetAmount, 1);
            expect(spending.isExceeded).toBe(true);
          }

          // Clean up after this iteration
          await db.delete(transactions).where(eq(transactions.organizationId, testOrgId));
          await db.delete(budgets).where(eq(budgets.id, budget.id));
        }
      ),
      { numRuns: 100 }
    );
  });

  // Test: Only expense transactions count towards budget
  // Feature: budget-management, Property 14: Spending calculation filters
  test("only expense transactions count towards budget spending", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          budgetAmount: fc.double({ min: 1000, max: 10000, noNaN: true }),
          expenseAmount: fc.double({ min: 10, max: 500, noNaN: true }),
          incomeAmount: fc.double({ min: 10, max: 500, noNaN: true }),
        }),
        async (testData) => {
          // Clean up before this iteration
          await db.delete(transactions).where(eq(transactions.organizationId, testOrgId));
          await db.delete(budgets).where(eq(budgets.organizationId, testOrgId));

          // Create budget
          const budget = await BudgetService.createBudget(
            {
              categoryId: String(testCategoryId),
              amount: testData.budgetAmount,
              timePeriod: TimePeriodType.MONTHLY,
              status: BudgetStatus.ACTIVE,
            },
            testOrgId,
            testCurrency
          );

          // Create expense transaction (should be counted)
          await db.insert(transactions).values({
            userId: testUserId,
            organizationId: testOrgId,
            accountId: testAccountId,
            amount: String(testData.expenseAmount),
            description: "Expense transaction",
            category: String(testCategoryId),
            type: "despesa",
            date: new Date(),
          });

          // Create income transaction (should NOT be counted)
          await db.insert(transactions).values({
            userId: testUserId,
            organizationId: testOrgId,
            accountId: testAccountId,
            amount: String(testData.incomeAmount),
            description: "Income transaction",
            category: String(testCategoryId),
            type: "receita",
            date: new Date(),
          });

          // Calculate spending
          const spending = await BudgetService.calculateSpending(budget.id);

          // Property: Only expense transactions should be counted
          expect(spending.totalSpent).toBeCloseTo(testData.expenseAmount, 2);
          expect(spending.totalSpent).not.toBe(testData.expenseAmount + testData.incomeAmount);

          // Clean up after this iteration
          await db.delete(transactions).where(eq(transactions.organizationId, testOrgId));
          await db.delete(budgets).where(eq(budgets.id, budget.id));
        }
      ),
      { numRuns: 100 }
    );
  });
});
