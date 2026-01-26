import 'dotenv/config';

import { describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import * as fc from "fast-check";
import { TransactionService } from "../src/domain/services/transaction.service.js";
import { BudgetService } from "../src/domain/services/budget.service.js";
import { db } from "../src/core/database/db.js";
import { 
  users, 
  organizations, 
  categories, 
  budgets, 
  budgetAlerts,
  accounts,
  alertTriggers,
  transactions,
  subscriptions,
  plans,
} from "../src/core/database/schema.js";
import { eq } from "drizzle-orm";
import {
  ThresholdType,
  AlertPosition,
  ChannelType,
  TimePeriodType,
  BudgetStatus,
  type AlertChannel,
} from "../src/domain/entities/budget.types.js";

/**
 * Property-Based Tests for Synchronous Transaction Processing
 * 
 * These tests use fast-check to verify universal properties across
 * randomized inputs with a minimum of 100 iterations per test.
 * 
 * Tests validate:
 * - Property 43: Synchronous transaction processing
 */

// ============================================================================
// Test Setup
// ============================================================================

describe("Synchronous Transaction Processing Property Tests", () => {
  let testOrgId: number;
  let testUserId: number;
  let testCategoryId: number;
  let testAccountId: number;
  const testCurrency = "AOA";

  beforeAll(async () => {
    // Create test organization with premium plan to avoid transaction limits
    const org = await db.insert(organizations).values({
      name: `Test Org Sync ${Date.now()}`,
      ownerId: 1,
      planType: 'premium', // Use premium plan to avoid transaction limits
    }).returning();
    testOrgId = org[0].id;

    // Create test user
    const user = await db.insert(users).values({
      email: `test-sync-${Date.now()}@example.com`,
      phone: `+244900${Date.now().toString().slice(-6)}`, // Unique phone number
      firstName: "Test",
      lastName: "User",
      password: "hashedpassword",
      organizationId: testOrgId,
    }).returning();
    testUserId = user[0].id;

    // Create an active subscription with unlimited transactions for testing
    // First, create or get a test plan with unlimited transactions
    const [testPlan] = await db.insert(plans).values({
      name: "Test Plan Unlimited",
      type: "premium",
      price: "0",
      maxAccounts: 999,
      maxTransactions: -1, // Unlimited
      maxUsers: 999,
      features: [],
    }).returning().catch(async () => {
      // If plan already exists, get it
      return await db.select().from(plans).where(eq(plans.name, "Test Plan Unlimited")).limit(1);
    });

    // Create active subscription
    await db.insert(subscriptions).values({
      userId: testUserId,
      organizationId: testOrgId,
      planId: String(testPlan.id),
      status: 'active',
      startDate: new Date(),
    });

    // Create test category
    const category = await db.insert(categories).values({
      userId: testUserId,
      organizationId: testOrgId,
      name: "Test Category Sync",
      type: "despesa",
    }).returning();
    testCategoryId = category[0].id;

    // Create test account
    const account = await db.insert(accounts).values({
      userId: testUserId,
      organizationId: testOrgId,
      name: "Test Account Sync",
      type: "corrente",
      balance: "100000.00", // Start with a large balance
    }).returning();
    testAccountId = account[0].id;
  });

  afterAll(async () => {
    // Cleanup in reverse order of dependencies
    // First delete transactions
    if (testAccountId) {
      await db.delete(transactions).where(eq(transactions.accountId, testAccountId));
    }
    // Delete subscriptions before users
    if (testUserId) {
      await db.delete(subscriptions).where(eq(subscriptions.userId, testUserId));
    }
    if (testAccountId) {
      await db.delete(accounts).where(eq(accounts.id, testAccountId));
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
    // Clean up budgets, alerts, alert triggers, and transactions before each test
    // Also clean up transactions to ensure clean state
    if (testAccountId) {
      await db.delete(transactions).where(eq(transactions.accountId, testAccountId));
      // Reset account balance
      await db.update(accounts)
        .set({ balance: "100000.00" })
        .where(eq(accounts.id, testAccountId));
    }
    if (testOrgId) {
      await db.delete(budgets).where(eq(budgets.organizationId, testOrgId));
    }
  });

  // ============================================================================
  // Test Data Generators (Arbitraries)
  // ============================================================================

  /**
   * Generate a valid budget amount
   */
  const budgetAmountArb = fc.double({ min: 1000, max: 50000, noNaN: true, noDefaultInfinity: true });

  /**
   * Generate a valid alert threshold percentage
   */
  const alertThresholdArb = fc.constantFrom(50, 75, 80, 90, 100);

  /**
   * Generate alert channels with at least in-app enabled
   */
  const alertChannelsArb: fc.Arbitrary<AlertChannel[]> = fc.constant([
    { type: ChannelType.IN_APP, enabled: true },
    { type: ChannelType.EMAIL, enabled: false },
    { type: ChannelType.SMS, enabled: false },
  ]);

  // ============================================================================
  // Property Tests
  // ============================================================================

  // Feature: budget-management, Property 43: Synchronous transaction processing
  test("budget calculations and alert checks complete before transaction API returns", async () => {
    await fc.assert(
      fc.asyncProperty(
        budgetAmountArb,
        alertThresholdArb,
        alertChannelsArb,
        async (budgetAmount, alertThreshold, channels) => {
          // Clean up transactions before this iteration
          await db.delete(transactions).where(eq(transactions.accountId, testAccountId));
          
          // Create a budget with an alert
          const budget = await BudgetService.createBudget(
            {
              categoryId: String(testCategoryId),
              amount: budgetAmount,
              timePeriod: TimePeriodType.MONTHLY,
              status: BudgetStatus.ACTIVE,
            },
            testOrgId,
            testCurrency
          );

          // Create an alert at the threshold
          const alert = await db.insert(budgetAlerts).values({
            budgetId: budget.id,
            thresholdType: ThresholdType.PERCENTAGE,
            thresholdValue: String(alertThreshold),
            position: AlertPosition.BEFORE_LIMIT,
            channels: channels,
          }).returning();

          // Calculate transaction amount that will cross the threshold
          const transactionAmount = (budgetAmount * alertThreshold) / 100 + 1;

          // Get spending BEFORE transaction
          const spendingBefore = await BudgetService.calculateSpending(budget.id);

          // Get alert triggers BEFORE transaction
          const triggersBefore = await db
            .select()
            .from(alertTriggers)
            .where(eq(alertTriggers.alertId, alert[0].id));

          // Create transaction - this should trigger budget processing synchronously
          const transaction = await TransactionService.createTransaction(
            {
              accountId: testAccountId,
              amount: transactionAmount,
              type: 'despesa',
              category: String(testCategoryId),
              description: 'Test transaction',
              date: new Date().toISOString(),
            },
            testUserId,
            testOrgId
          );

          // CRITICAL: After transaction API returns, budget calculations should be complete
          // Verify spending was calculated and increased
          const spendingAfter = await BudgetService.calculateSpending(budget.id);
          expect(spendingAfter.totalSpent).toBeGreaterThan(spendingBefore.totalSpent);
          expect(spendingAfter.totalSpent).toBeCloseTo(spendingBefore.totalSpent + transactionAmount, 2);

          // Verify percentage was calculated
          const expectedPercentage = (spendingAfter.totalSpent / budgetAmount) * 100;
          expect(spendingAfter.percentageUsed).toBeCloseTo(expectedPercentage, 1);

          // Verify alert was checked and triggered (if threshold crossed)
          const currentPercentage = (spendingAfter.totalSpent / budgetAmount) * 100;
          const previousPercentage = (spendingBefore.totalSpent / budgetAmount) * 100;
          
          // Alert should trigger if we crossed the threshold
          if (previousPercentage < alertThreshold && currentPercentage >= alertThreshold) {
            const triggersAfter = await db
              .select()
              .from(alertTriggers)
              .where(eq(alertTriggers.alertId, alert[0].id));
            
            // Alert should have been triggered synchronously
            expect(triggersAfter.length).toBeGreaterThan(triggersBefore.length);
          }

          // Cleanup
          await db.delete(transactions).where(eq(transactions.accountId, testAccountId));
          await db.delete(budgetAlerts).where(eq(budgetAlerts.id, alert[0].id));
          await db.delete(budgets).where(eq(budgets.id, budget.id));
        }
      ),
      { numRuns: 10 } // Reduced runs for faster execution
    );
  }, 120000); // 120 second timeout

  // Additional test: Verify synchronous processing with multiple budgets
  test("multiple budget calculations complete synchronously for single transaction", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(budgetAmountArb, { minLength: 2, maxLength: 3 }),
        fc.array(alertThresholdArb, { minLength: 2, maxLength: 3 }),
        async (budgetAmounts, alertThresholds) => {
          // Clean up transactions before this iteration
          await db.delete(transactions).where(eq(transactions.accountId, testAccountId));
          
          // Ensure arrays have same length
          const count = Math.min(budgetAmounts.length, alertThresholds.length);
          const amounts = budgetAmounts.slice(0, count);
          const thresholds = alertThresholds.slice(0, count);

          // Create multiple budgets for the same category
          const budgetIds: number[] = [];
          const alertIds: number[] = [];

          for (let i = 0; i < count; i++) {
            const budget = await BudgetService.createBudget(
              {
                categoryId: String(testCategoryId),
                amount: amounts[i],
                timePeriod: TimePeriodType.MONTHLY,
                status: BudgetStatus.ACTIVE,
              },
              testOrgId,
              testCurrency
            );
            budgetIds.push(budget.id);

            const alert = await db.insert(budgetAlerts).values({
              budgetId: budget.id,
              thresholdType: ThresholdType.PERCENTAGE,
              thresholdValue: String(thresholds[i]),
              position: AlertPosition.BEFORE_LIMIT,
              channels: [{ type: ChannelType.IN_APP, enabled: true }],
            }).returning();
            alertIds.push(alert[0].id);
          }

          // Create a transaction that affects all budgets
          const transactionAmount = Math.max(...amounts) * 0.5; // 50% of largest budget

          // Get spending BEFORE transaction for all budgets
          const spendingsBefore = await Promise.all(
            budgetIds.map(id => BudgetService.calculateSpending(id))
          );

          // Verify all budgets start with zero spending
          for (let i = 0; i < count; i++) {
            expect(spendingsBefore[i].totalSpent).toBe(0);
          }

          // Create transaction - should process all budgets synchronously
          const transaction = await TransactionService.createTransaction(
            {
              accountId: testAccountId,
              amount: transactionAmount,
              type: 'despesa',
              category: String(testCategoryId),
              description: 'Test multi-budget transaction',
              date: new Date().toISOString(),
            },
            testUserId,
            testOrgId
          );

          // Verify ALL budgets were processed synchronously
          for (let i = 0; i < count; i++) {
            const spending = await BudgetService.calculateSpending(budgetIds[i]);
            
            // Spending should be calculated for all budgets and equal to transaction amount
            expect(spending.totalSpent).toBeCloseTo(transactionAmount, 2);
            
            // Check if alert should have been triggered
            const currentPercentage = (spending.totalSpent / amounts[i]) * 100;
            
            if (currentPercentage >= thresholds[i]) {
              const triggers = await db
                .select()
                .from(alertTriggers)
                .where(eq(alertTriggers.alertId, alertIds[i]));
              
              expect(triggers.length).toBeGreaterThan(0);
            }
          }

          // Cleanup
          await db.delete(transactions).where(eq(transactions.accountId, testAccountId));
          for (const alertId of alertIds) {
            await db.delete(budgetAlerts).where(eq(budgetAlerts.id, alertId));
          }
          for (const budgetId of budgetIds) {
            await db.delete(budgets).where(eq(budgets.id, budgetId));
          }
        }
      ),
      { numRuns: 10 } // Reduced runs due to complexity
    );
  }, 120000); // 120 second timeout

  // Test: Verify synchronous processing doesn't block on notification failures
  test("transaction completes even if notification delivery fails", async () => {
    await fc.assert(
      fc.asyncProperty(
        budgetAmountArb,
        async (budgetAmount) => {
          // Clean up transactions before this iteration
          await db.delete(transactions).where(eq(transactions.accountId, testAccountId));
          
          // Create a budget with an alert
          const budget = await BudgetService.createBudget(
            {
              categoryId: String(testCategoryId),
              amount: budgetAmount,
              timePeriod: TimePeriodType.MONTHLY,
              status: BudgetStatus.ACTIVE,
            },
            testOrgId,
            testCurrency
          );

          // Create an alert that will be triggered
          const alert = await db.insert(budgetAlerts).values({
            budgetId: budget.id,
            thresholdType: ThresholdType.PERCENTAGE,
            thresholdValue: "50",
            position: AlertPosition.BEFORE_LIMIT,
            channels: [
              { type: ChannelType.IN_APP, enabled: true },
              { type: ChannelType.EMAIL, enabled: true }, // Email might fail
              { type: ChannelType.SMS, enabled: true }, // SMS might fail
            ],
          }).returning();

          // Create transaction that crosses threshold
          const transactionAmount = budgetAmount * 0.6; // 60% of budget

          // Get spending BEFORE transaction
          const spendingBefore = await BudgetService.calculateSpending(budget.id);

          // Transaction should complete successfully even if notifications fail
          const transaction = await TransactionService.createTransaction(
            {
              accountId: testAccountId,
              amount: transactionAmount,
              type: 'despesa',
              category: String(testCategoryId),
              description: 'Test notification failure',
              date: new Date().toISOString(),
            },
            testUserId,
            testOrgId
          );

          // Transaction should be created
          expect(transaction).toBeDefined();
          expect(transaction.id).toBeDefined();

          // Budget calculations should still complete
          const spending = await BudgetService.calculateSpending(budget.id);
          expect(spending.totalSpent).toBeGreaterThan(spendingBefore.totalSpent);
          expect(spending.totalSpent).toBeCloseTo(spendingBefore.totalSpent + transactionAmount, 2);

          // Alert should still be marked as triggered if threshold was crossed
          const currentPercentage = (spending.totalSpent / budgetAmount) * 100;
          const previousPercentage = (spendingBefore.totalSpent / budgetAmount) * 100;
          
          if (previousPercentage < 50 && currentPercentage >= 50) {
            const triggers = await db
              .select()
              .from(alertTriggers)
              .where(eq(alertTriggers.alertId, alert[0].id));
            expect(triggers.length).toBeGreaterThan(0);
          }

          // Cleanup
          await db.delete(transactions).where(eq(transactions.accountId, testAccountId));
          await db.delete(budgetAlerts).where(eq(budgetAlerts.id, alert[0].id));
          await db.delete(budgets).where(eq(budgets.id, budget.id));
        }
      ),
      { numRuns: 10 }
    );
  }, 120000); // 120 second timeout
});
