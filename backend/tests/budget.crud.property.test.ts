import 'dotenv/config';
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import * as fc from "fast-check";
import { BudgetService } from "../src/domain/services/budget.service.js";
import { db } from "../src/core/database/db.js";
import { budgets, organizations, categories, users } from "../src/core/database/schema.js";
import { eq, inArray } from "drizzle-orm";
import {
  TimePeriodType,
  BudgetStatus,
  type CreateBudgetDTO,
} from "../src/domain/entities/budget.types.js";

/**
 * Property-Based Tests for Budget CRUD Operations
 * 
 * These tests verify universal properties across randomized inputs
 * with a minimum of 100 iterations per test.
 * 
 * Tests cover:
 * - Property 4: Default status assignment
 * - Property 5: Status toggle persistence
 * - Property 6: Organization association invariant
 * - Property 7: Currency inheritance invariant
 * - Property 23: Organization-scoped budget listing
 */

describe("Budget CRUD Property Tests", () => {
  let testOrgId1: number;
  let testOrgId2: number;
  let testUserId1: number;
  let testUserId2: number;
  let testCategoryId1: number;
  let testCategoryId2: number;
  const testCurrency1 = "AOA";
  const testCurrency2 = "USD";

  beforeAll(async () => {
    // Create first test organization
    const org1 = await db.insert(organizations).values({
      name: `Test Org 1 - ${Date.now()}`,
      ownerId: 1,
    }).returning();
    testOrgId1 = org1[0].id;

    // Create second test organization
    const org2 = await db.insert(organizations).values({
      name: `Test Org 2 - ${Date.now()}`,
      ownerId: 1,
    }).returning();
    testOrgId2 = org2[0].id;

    // Create test user for org 1
    const user1 = await db.insert(users).values({
      email: `test-budget-crud-1-${Date.now()}@example.com`,
      password: "hashedpassword",
      organizationId: testOrgId1,
    }).returning();
    testUserId1 = user1[0].id;

    // Create test user for org 2
    const user2 = await db.insert(users).values({
      email: `test-budget-crud-2-${Date.now()}@example.com`,
      password: "hashedpassword",
      organizationId: testOrgId2,
    }).returning();
    testUserId2 = user2[0].id;

    // Create test category for org 1
    const category1 = await db.insert(categories).values({
      userId: testUserId1,
      organizationId: testOrgId1,
      name: "Test Category 1",
      type: "despesa",
    }).returning();
    testCategoryId1 = category1[0].id;

    // Create test category for org 2
    const category2 = await db.insert(categories).values({
      userId: testUserId2,
      organizationId: testOrgId2,
      name: "Test Category 2",
      type: "despesa",
    }).returning();
    testCategoryId2 = category2[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testCategoryId1) {
      await db.delete(categories).where(eq(categories.id, testCategoryId1));
    }
    if (testCategoryId2) {
      await db.delete(categories).where(eq(categories.id, testCategoryId2));
    }
    if (testUserId1) {
      await db.delete(users).where(eq(users.id, testUserId1));
    }
    if (testUserId2) {
      await db.delete(users).where(eq(users.id, testUserId2));
    }
    if (testOrgId1) {
      await db.delete(organizations).where(eq(organizations.id, testOrgId1));
    }
    if (testOrgId2) {
      await db.delete(organizations).where(eq(organizations.id, testOrgId2));
    }
  });

  beforeEach(async () => {
    // Clean up budgets before each test
    await db.delete(budgets).where(
      inArray(budgets.organizationId, [testOrgId1, testOrgId2])
    );
  });

  // ============================================================================
  // Property 4: Default status assignment
  // ============================================================================

  // Feature: budget-management, Property 4: Default status assignment
  test("budget creation without explicit status defaults to 'active'", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          amount: fc.double({ min: 0.01, max: 1000000, noNaN: true }),
          timePeriod: fc.constantFrom(
            TimePeriodType.DAILY,
            TimePeriodType.WEEKLY,
            TimePeriodType.MONTHLY,
            TimePeriodType.ANNUAL
          ),
        }),
        async (budgetData) => {
          // Create budget without explicit status
          const createData: CreateBudgetDTO = {
            categoryId: String(testCategoryId1),
            amount: budgetData.amount,
            timePeriod: budgetData.timePeriod,
            // status is intentionally omitted
          };

          const budget = await BudgetService.createBudget(
            createData,
            testOrgId1,
            testCurrency1
          );

          // Property: Budget created without explicit status should have status 'active'
          expect(budget.status).toBe('active');

          // Clean up
          await db.delete(budgets).where(eq(budgets.id, budget.id));
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // Property 5: Status toggle persistence
  // ============================================================================

  // Feature: budget-management, Property 5: Status toggle persistence
  test("toggling budget status persists correctly on retrieval", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          amount: fc.double({ min: 0.01, max: 1000000, noNaN: true }),
          timePeriod: fc.constantFrom(
            TimePeriodType.DAILY,
            TimePeriodType.WEEKLY,
            TimePeriodType.MONTHLY,
            TimePeriodType.ANNUAL
          ),
          initialStatus: fc.constantFrom(BudgetStatus.ACTIVE, BudgetStatus.INACTIVE),
        }),
        async (budgetData) => {
          // Create budget with initial status
          const createData: CreateBudgetDTO = {
            categoryId: String(testCategoryId1),
            amount: budgetData.amount,
            timePeriod: budgetData.timePeriod,
            status: budgetData.initialStatus,
          };

          const budget = await BudgetService.createBudget(
            createData,
            testOrgId1,
            testCurrency1
          );

          // Verify initial status
          expect(budget.status).toBe(budgetData.initialStatus);

          // Toggle status
          const toggledStatus =
            budgetData.initialStatus === BudgetStatus.ACTIVE
              ? BudgetStatus.INACTIVE
              : BudgetStatus.ACTIVE;

          const updatedBudget = await BudgetService.updateBudget(
            budget.id,
            { status: toggledStatus },
            testOrgId1
          );

          // Property: Toggled status should persist
          expect(updatedBudget.status).toBe(toggledStatus);

          // Retrieve budget and verify status persists
          const retrievedBudget = await BudgetService.getBudget(budget.id, testOrgId1);
          expect(retrievedBudget.status).toBe(toggledStatus);

          // Toggle back and verify again
          const retoggledStatus = budgetData.initialStatus;
          const retoggledBudget = await BudgetService.updateBudget(
            budget.id,
            { status: retoggledStatus },
            testOrgId1
          );

          expect(retoggledBudget.status).toBe(retoggledStatus);

          const finalRetrievedBudget = await BudgetService.getBudget(budget.id, testOrgId1);
          expect(finalRetrievedBudget.status).toBe(retoggledStatus);

          // Clean up
          await db.delete(budgets).where(eq(budgets.id, budget.id));
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // Property 6: Organization association invariant
  // ============================================================================

  // Feature: budget-management, Property 6: Organization association invariant
  test("budget's organization ID always matches the creating user's organization", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          amount: fc.double({ min: 0.01, max: 1000000, noNaN: true }),
          timePeriod: fc.constantFrom(
            TimePeriodType.DAILY,
            TimePeriodType.WEEKLY,
            TimePeriodType.MONTHLY,
            TimePeriodType.ANNUAL
          ),
          status: fc.constantFrom(BudgetStatus.ACTIVE, BudgetStatus.INACTIVE),
          useOrg1: fc.boolean(), // Randomly choose which organization to use
        }),
        async (budgetData) => {
          // Select organization and category based on random boolean
          const orgId = budgetData.useOrg1 ? testOrgId1 : testOrgId2;
          const categoryId = budgetData.useOrg1 ? testCategoryId1 : testCategoryId2;
          const currency = budgetData.useOrg1 ? testCurrency1 : testCurrency2;

          // Create budget
          const createData: CreateBudgetDTO = {
            categoryId: String(categoryId),
            amount: budgetData.amount,
            timePeriod: budgetData.timePeriod,
            status: budgetData.status,
          };

          const budget = await BudgetService.createBudget(createData, orgId, currency);

          // Property: Budget's organizationId must equal the provided organizationId
          expect(budget.organizationId).toBe(orgId);

          // Verify through retrieval
          const retrievedBudget = await BudgetService.getBudget(budget.id, orgId);
          expect(retrievedBudget.organizationId).toBe(orgId);

          // Verify that the budget cannot be accessed from a different organization
          const otherOrgId = budgetData.useOrg1 ? testOrgId2 : testOrgId1;
          await expect(
            BudgetService.getBudget(budget.id, otherOrgId)
          ).rejects.toThrow();

          // Clean up
          await db.delete(budgets).where(eq(budgets.id, budget.id));
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // Property 7: Currency inheritance invariant
  // ============================================================================

  // Feature: budget-management, Property 7: Currency inheritance invariant
  test("budget's currency always matches the organization's configured currency", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          amount: fc.double({ min: 0.01, max: 1000000, noNaN: true }),
          timePeriod: fc.constantFrom(
            TimePeriodType.DAILY,
            TimePeriodType.WEEKLY,
            TimePeriodType.MONTHLY,
            TimePeriodType.ANNUAL
          ),
          status: fc.constantFrom(BudgetStatus.ACTIVE, BudgetStatus.INACTIVE),
          useOrg1: fc.boolean(), // Randomly choose which organization to use
        }),
        async (budgetData) => {
          // Select organization, category, and currency based on random boolean
          const orgId = budgetData.useOrg1 ? testOrgId1 : testOrgId2;
          const categoryId = budgetData.useOrg1 ? testCategoryId1 : testCategoryId2;
          const orgCurrency = budgetData.useOrg1 ? testCurrency1 : testCurrency2;

          // Create budget
          const createData: CreateBudgetDTO = {
            categoryId: String(categoryId),
            amount: budgetData.amount,
            timePeriod: budgetData.timePeriod,
            status: budgetData.status,
          };

          const budget = await BudgetService.createBudget(createData, orgId, orgCurrency);

          // Property: Budget's currency must equal the organization's currency
          expect(budget.currency).toBe(orgCurrency);

          // Verify through retrieval
          const retrievedBudget = await BudgetService.getBudget(budget.id, orgId);
          expect(retrievedBudget.currency).toBe(orgCurrency);

          // Verify currency persists after updates
          const updatedBudget = await BudgetService.updateBudget(
            budget.id,
            { amount: budgetData.amount * 1.5 },
            orgId
          );
          expect(updatedBudget.currency).toBe(orgCurrency);

          // Clean up
          await db.delete(budgets).where(eq(budgets.id, budget.id));
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // Property 23: Organization-scoped budget listing
  // ============================================================================

  // Feature: budget-management, Property 23: Organization-scoped budget listing
  test("budget listing returns only budgets from the requesting organization", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Generate random number of budgets for each organization
          org1BudgetCount: fc.integer({ min: 1, max: 5 }),
          org2BudgetCount: fc.integer({ min: 1, max: 5 }),
          // Generate random budget data
          budgetAmount: fc.double({ min: 0.01, max: 1000000, noNaN: true }),
          timePeriod: fc.constantFrom(
            TimePeriodType.DAILY,
            TimePeriodType.WEEKLY,
            TimePeriodType.MONTHLY,
            TimePeriodType.ANNUAL
          ),
        }),
        async (testData) => {
          const createdBudgetIds: number[] = [];

          try {
            // Create budgets for organization 1
            const org1Budgets: Array<{ id: number; organizationId: number }> = [];
            for (let i = 0; i < testData.org1BudgetCount; i++) {
              const budget = await BudgetService.createBudget(
                {
                  categoryId: String(testCategoryId1),
                  amount: testData.budgetAmount + i,
                  timePeriod: testData.timePeriod,
                },
                testOrgId1,
                testCurrency1
              );
              org1Budgets.push(budget);
              createdBudgetIds.push(budget.id);
            }

            // Create budgets for organization 2
            const org2Budgets: Array<{ id: number; organizationId: number }> = [];
            for (let i = 0; i < testData.org2BudgetCount; i++) {
              const budget = await BudgetService.createBudget(
                {
                  categoryId: String(testCategoryId2),
                  amount: testData.budgetAmount + i,
                  timePeriod: testData.timePeriod,
                },
                testOrgId2,
                testCurrency2
              );
              org2Budgets.push(budget);
              createdBudgetIds.push(budget.id);
            }

            // List budgets for organization 1
            const org1List = await BudgetService.listBudgets(testOrgId1);

            // Property: All returned budgets must belong to organization 1
            expect(org1List.length).toBeGreaterThanOrEqual(testData.org1BudgetCount);
            org1List.forEach((budget) => {
              expect(budget.organizationId).toBe(testOrgId1);
            });

            // Property: No budgets from organization 2 should be in the list
            const org2BudgetIdsInOrg1List = org1List.filter((budget) =>
              org2Budgets.some((org2Budget) => org2Budget.id === budget.id)
            );
            expect(org2BudgetIdsInOrg1List.length).toBe(0);

            // List budgets for organization 2
            const org2List = await BudgetService.listBudgets(testOrgId2);

            // Property: All returned budgets must belong to organization 2
            expect(org2List.length).toBeGreaterThanOrEqual(testData.org2BudgetCount);
            org2List.forEach((budget) => {
              expect(budget.organizationId).toBe(testOrgId2);
            });

            // Property: No budgets from organization 1 should be in the list
            const org1BudgetIdsInOrg2List = org2List.filter((budget) =>
              org1Budgets.some((org1Budget) => org1Budget.id === budget.id)
            );
            expect(org1BudgetIdsInOrg2List.length).toBe(0);

            // Verify that each organization's budgets are in their respective lists
            org1Budgets.forEach((budget) => {
              const found = org1List.some((b) => b.id === budget.id);
              expect(found).toBe(true);
            });

            org2Budgets.forEach((budget) => {
              const found = org2List.some((b) => b.id === budget.id);
              expect(found).toBe(true);
            });
          } finally {
            // Clean up all created budgets
            if (createdBudgetIds.length > 0) {
              await db.delete(budgets).where(inArray(budgets.id, createdBudgetIds));
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional test: Organization-scoped budget listing with filters
  // Feature: budget-management, Property 23: Organization-scoped budget listing
  test("filtered budget listing maintains organization isolation", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Generate budgets with different statuses
          activeCount: fc.integer({ min: 1, max: 3 }),
          inactiveCount: fc.integer({ min: 1, max: 3 }),
          budgetAmount: fc.double({ min: 0.01, max: 1000000, noNaN: true }),
          timePeriod: fc.constantFrom(
            TimePeriodType.DAILY,
            TimePeriodType.WEEKLY,
            TimePeriodType.MONTHLY,
            TimePeriodType.ANNUAL
          ),
        }),
        async (testData) => {
          const createdBudgetIds: number[] = [];

          try {
            // Create active budgets for org 1
            for (let i = 0; i < testData.activeCount; i++) {
              const budget = await BudgetService.createBudget(
                {
                  categoryId: String(testCategoryId1),
                  amount: testData.budgetAmount + i,
                  timePeriod: testData.timePeriod,
                  status: BudgetStatus.ACTIVE,
                },
                testOrgId1,
                testCurrency1
              );
              createdBudgetIds.push(budget.id);
            }

            // Create inactive budgets for org 1
            for (let i = 0; i < testData.inactiveCount; i++) {
              const budget = await BudgetService.createBudget(
                {
                  categoryId: String(testCategoryId1),
                  amount: testData.budgetAmount + i,
                  timePeriod: testData.timePeriod,
                  status: BudgetStatus.INACTIVE,
                },
                testOrgId1,
                testCurrency1
              );
              createdBudgetIds.push(budget.id);
            }

            // Create budgets for org 2 (to verify isolation)
            const org2Budget = await BudgetService.createBudget(
              {
                categoryId: String(testCategoryId2),
                amount: testData.budgetAmount,
                timePeriod: testData.timePeriod,
                status: BudgetStatus.ACTIVE,
              },
              testOrgId2,
              testCurrency2
            );
            createdBudgetIds.push(org2Budget.id);

            // List active budgets for org 1
            const activeList = await BudgetService.listBudgets(testOrgId1, {
              status: BudgetStatus.ACTIVE,
            });

            // Property: All returned budgets must be active and from org 1
            expect(activeList.length).toBeGreaterThanOrEqual(testData.activeCount);
            activeList.forEach((budget) => {
              expect(budget.organizationId).toBe(testOrgId1);
              expect(budget.status).toBe('active');
            });

            // List inactive budgets for org 1
            const inactiveList = await BudgetService.listBudgets(testOrgId1, {
              status: BudgetStatus.INACTIVE,
            });

            // Property: All returned budgets must be inactive and from org 1
            expect(inactiveList.length).toBeGreaterThanOrEqual(testData.inactiveCount);
            inactiveList.forEach((budget) => {
              expect(budget.organizationId).toBe(testOrgId1);
              expect(budget.status).toBe('inactive');
            });

            // Property: No budgets from org 2 should appear in org 1's filtered lists
            const org2BudgetInActiveList = activeList.some((b) => b.id === org2Budget.id);
            const org2BudgetInInactiveList = inactiveList.some((b) => b.id === org2Budget.id);
            expect(org2BudgetInActiveList).toBe(false);
            expect(org2BudgetInInactiveList).toBe(false);
          } finally {
            // Clean up all created budgets
            if (createdBudgetIds.length > 0) {
              await db.delete(budgets).where(inArray(budgets.id, createdBudgetIds));
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
