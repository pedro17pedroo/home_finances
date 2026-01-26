import { describe, test, expect } from "@jest/globals";
import * as fc from "fast-check";
import {
  createBudgetSchema,
  updateBudgetSchema,
  configureAlertsSchema,
} from "../src/api/validators/budget.validator.js";
import {
  TimePeriodType,
  BudgetStatus,
  ThresholdType,
  AlertPosition,
  ChannelType,
} from "../src/domain/entities/budget.types.js";

/**
 * Property-Based Tests for Budget Validator
 * 
 * These tests use fast-check to verify universal properties across
 * randomized inputs with a minimum of 100 iterations per test.
 */

describe("Budget Validator Property Tests", () => {
  // ============================================================================
  // Property 1: Required fields validation
  // ============================================================================

  // Feature: budget-management, Property 1: Required fields validation
  test("budget creation requires all mandatory fields (categoryId, amount, timePeriod)", () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: fc.option(fc.uuid(), { nil: undefined }),
          amount: fc.option(fc.double({ min: 0.01, max: 1000000, noNaN: true }), { nil: undefined }),
          timePeriod: fc.option(
            fc.constantFrom(
              TimePeriodType.DAILY,
              TimePeriodType.WEEKLY,
              TimePeriodType.MONTHLY,
              TimePeriodType.ANNUAL,
              TimePeriodType.CUSTOM
            ),
            { nil: undefined }
          ),
          // Optional fields that may or may not be present
          status: fc.option(
            fc.constantFrom(BudgetStatus.ACTIVE, BudgetStatus.INACTIVE),
            { nil: undefined }
          ),
          customStartDate: fc.option(fc.date(), { nil: undefined }),
          customEndDate: fc.option(fc.date(), { nil: undefined }),
        }),
        (budgetData) => {
          const hasAllRequiredFields =
            budgetData.categoryId !== undefined &&
            budgetData.amount !== undefined &&
            budgetData.timePeriod !== undefined;

          // Convert dates to ISO strings for validation, handling invalid dates
          const customStartDateStr = budgetData.customStartDate
            ? isValidDate(budgetData.customStartDate)
              ? budgetData.customStartDate.toISOString()
              : undefined
            : undefined;
          const customEndDateStr = budgetData.customEndDate
            ? isValidDate(budgetData.customEndDate)
              ? budgetData.customEndDate.toISOString()
              : undefined
            : undefined;

          const dataForValidation = {
            body: {
              ...budgetData,
              customStartDate: customStartDateStr,
              customEndDate: customEndDateStr,
            },
          };

          const result = createBudgetSchema.safeParse(dataForValidation);

          if (hasAllRequiredFields) {
            // If all required fields are present, validation may still fail for other reasons
            // (e.g., custom period without dates), but it should NOT fail due to missing required fields
            if (!result.success) {
              const missingFieldErrors = result.error.issues.filter(
                (issue) =>
                  issue.message.includes("required") &&
                  (issue.path.includes("categoryId") ||
                    issue.path.includes("amount") ||
                    issue.path.includes("timePeriod"))
              );
              expect(missingFieldErrors.length).toBe(0);
            }
          } else {
            // If any required field is missing, validation MUST fail
            expect(result.success).toBe(false);
            if (!result.success) {
              // Check that at least one error is about missing required fields
              const hasRequiredFieldError = result.error.issues.some(
                (issue) =>
                  (issue.message.includes("required") ||
                    issue.message.includes("Required")) &&
                  (!budgetData.categoryId && issue.path.includes("categoryId") ||
                    !budgetData.amount && issue.path.includes("amount") ||
                    !budgetData.timePeriod && issue.path.includes("timePeriod"))
              );
              expect(hasRequiredFieldError).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // Property 44: API input validation
  // ============================================================================

  // Feature: budget-management, Property 44: API input validation
  test("API requests with invalid data are rejected with validation errors", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Invalid categoryId (not a UUID)
          fc.record({
            categoryId: fc.string().filter((s) => !isValidUUID(s)),
            amount: fc.double({ min: 0.01, max: 1000000 }),
            timePeriod: fc.constantFrom(
              TimePeriodType.DAILY,
              TimePeriodType.WEEKLY,
              TimePeriodType.MONTHLY,
              TimePeriodType.ANNUAL
            ),
          }),
          // Invalid amount (negative or zero)
          fc.record({
            categoryId: fc.uuid(),
            amount: fc.oneof(
              fc.double({ max: 0, noNaN: true }),
              fc.constant(-1),
              fc.constant(0)
            ),
            timePeriod: fc.constantFrom(
              TimePeriodType.DAILY,
              TimePeriodType.WEEKLY,
              TimePeriodType.MONTHLY,
              TimePeriodType.ANNUAL
            ),
          }),
          // Invalid amount (too large)
          fc.record({
            categoryId: fc.uuid(),
            amount: fc.double({ min: 1000000001, noNaN: true }),
            timePeriod: fc.constantFrom(
              TimePeriodType.DAILY,
              TimePeriodType.WEEKLY,
              TimePeriodType.MONTHLY,
              TimePeriodType.ANNUAL
            ),
          }),
          // Invalid time period (custom without dates)
          fc.record({
            categoryId: fc.uuid(),
            amount: fc.double({ min: 0.01, max: 1000000, noNaN: true }),
            timePeriod: fc.constant(TimePeriodType.CUSTOM),
            // Missing customStartDate and customEndDate
          }),
          // Invalid custom date range (end before start)
          fc.record({
            categoryId: fc.uuid(),
            amount: fc.double({ min: 0.01, max: 1000000, noNaN: true }),
            timePeriod: fc.constant(TimePeriodType.CUSTOM),
            customStartDate: fc.date({ min: new Date("2024-06-01"), max: new Date("2024-12-31") }),
            customEndDate: fc.date({ min: new Date("2024-01-01"), max: new Date("2024-05-31") }),
          }),
          // Too many alerts (more than 3)
          fc.record({
            categoryId: fc.uuid(),
            amount: fc.double({ min: 0.01, max: 1000000, noNaN: true }),
            timePeriod: fc.constantFrom(
              TimePeriodType.DAILY,
              TimePeriodType.WEEKLY,
              TimePeriodType.MONTHLY,
              TimePeriodType.ANNUAL
            ),
            alerts: fc.array(
              fc.record({
                thresholdType: fc.constantFrom(ThresholdType.PERCENTAGE),
                thresholdValue: fc.double({ min: 1, max: 100, noNaN: true }),
                position: fc.constantFrom(AlertPosition.BEFORE_LIMIT),
                channels: fc.array(
                  fc.record({
                    type: fc.constantFrom(ChannelType.IN_APP, ChannelType.EMAIL, ChannelType.SMS),
                    enabled: fc.boolean(),
                  }),
                  { minLength: 1, maxLength: 3 }
                ),
              }),
              { minLength: 4, maxLength: 10 }
            ),
          }),
          // Invalid alert distribution (3 alerts but wrong distribution)
          fc.record({
            categoryId: fc.uuid(),
            amount: fc.double({ min: 0.01, max: 1000000, noNaN: true }),
            timePeriod: fc.constantFrom(
              TimePeriodType.DAILY,
              TimePeriodType.WEEKLY,
              TimePeriodType.MONTHLY,
              TimePeriodType.ANNUAL
            ),
            alerts: fc.constant([
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
            ]),
          }),
          // Invalid percentage threshold (before-limit > 100%)
          fc.record({
            categoryId: fc.uuid(),
            amount: fc.double({ min: 0.01, max: 1000000, noNaN: true }),
            timePeriod: fc.constantFrom(
              TimePeriodType.DAILY,
              TimePeriodType.WEEKLY,
              TimePeriodType.MONTHLY,
              TimePeriodType.ANNUAL
            ),
            alerts: fc.array(
              fc.record({
                thresholdType: fc.constant(ThresholdType.PERCENTAGE),
                thresholdValue: fc.double({ min: 101, max: 200, noNaN: true }),
                position: fc.constant(AlertPosition.BEFORE_LIMIT),
                channels: fc.array(
                  fc.record({
                    type: fc.constantFrom(ChannelType.IN_APP, ChannelType.EMAIL, ChannelType.SMS),
                    enabled: fc.boolean(),
                  }),
                  { minLength: 1, maxLength: 3 }
                ),
              }),
              { minLength: 1, maxLength: 1 }
            ),
          }),
          // Invalid percentage threshold (after-limit <= 100%)
          fc.record({
            categoryId: fc.uuid(),
            amount: fc.double({ min: 0.01, max: 1000000, noNaN: true }),
            timePeriod: fc.constantFrom(
              TimePeriodType.DAILY,
              TimePeriodType.WEEKLY,
              TimePeriodType.MONTHLY,
              TimePeriodType.ANNUAL
            ),
            alerts: fc.array(
              fc.record({
                thresholdType: fc.constant(ThresholdType.PERCENTAGE),
                thresholdValue: fc.double({ min: 1, max: 100, noNaN: true }),
                position: fc.constant(AlertPosition.AFTER_LIMIT),
                channels: fc.array(
                  fc.record({
                    type: fc.constantFrom(ChannelType.IN_APP, ChannelType.EMAIL, ChannelType.SMS),
                    enabled: fc.boolean(),
                  }),
                  { minLength: 1, maxLength: 3 }
                ),
              }),
              { minLength: 1, maxLength: 1 }
            ),
          }),
          // Invalid fixed amount threshold (before-limit >= budget amount)
          fc
            .double({ min: 100, max: 1000, noNaN: true })
            .chain((budgetAmount) =>
              fc.record({
                categoryId: fc.uuid(),
                amount: fc.constant(budgetAmount),
                timePeriod: fc.constantFrom(
                  TimePeriodType.DAILY,
                  TimePeriodType.WEEKLY,
                  TimePeriodType.MONTHLY,
                  TimePeriodType.ANNUAL
                ),
                alerts: fc.array(
                  fc.record({
                    thresholdType: fc.constant(ThresholdType.FIXED_AMOUNT),
                    thresholdValue: fc.double({ min: budgetAmount, max: budgetAmount * 2, noNaN: true }),
                    position: fc.constant(AlertPosition.BEFORE_LIMIT),
                    channels: fc.array(
                      fc.record({
                        type: fc.constantFrom(ChannelType.IN_APP, ChannelType.EMAIL, ChannelType.SMS),
                        enabled: fc.boolean(),
                      }),
                      { minLength: 1, maxLength: 3 }
                    ),
                  }),
                  { minLength: 1, maxLength: 1 }
                ),
              })
            ),
          // Invalid fixed amount threshold (after-limit <= budget amount)
          fc
            .double({ min: 100, max: 1000, noNaN: true })
            .chain((budgetAmount) =>
              fc.record({
                categoryId: fc.uuid(),
                amount: fc.constant(budgetAmount),
                timePeriod: fc.constantFrom(
                  TimePeriodType.DAILY,
                  TimePeriodType.WEEKLY,
                  TimePeriodType.MONTHLY,
                  TimePeriodType.ANNUAL
                ),
                alerts: fc.array(
                  fc.record({
                    thresholdType: fc.constant(ThresholdType.FIXED_AMOUNT),
                    thresholdValue: fc.double({ min: 1, max: budgetAmount, noNaN: true }),
                    position: fc.constant(AlertPosition.AFTER_LIMIT),
                    channels: fc.array(
                      fc.record({
                        type: fc.constantFrom(ChannelType.IN_APP, ChannelType.EMAIL, ChannelType.SMS),
                        enabled: fc.boolean(),
                      }),
                      { minLength: 1, maxLength: 3 }
                    ),
                  }),
                  { minLength: 1, maxLength: 1 }
                ),
              })
            )
        ),
        (invalidData) => {
          // Convert dates to ISO strings if present, checking validity first
          const dataForValidation = {
            body: {
              ...invalidData,
              customStartDate:
                "customStartDate" in invalidData && invalidData.customStartDate instanceof Date
                  ? isValidDate(invalidData.customStartDate)
                    ? invalidData.customStartDate.toISOString()
                    : undefined
                  : "customStartDate" in invalidData
                  ? invalidData.customStartDate
                  : undefined,
              customEndDate:
                "customEndDate" in invalidData && invalidData.customEndDate instanceof Date
                  ? isValidDate(invalidData.customEndDate)
                    ? invalidData.customEndDate.toISOString()
                    : undefined
                  : "customEndDate" in invalidData
                  ? invalidData.customEndDate
                  : undefined,
            },
          };

          const result = createBudgetSchema.safeParse(dataForValidation);

          // All invalid data should be rejected
          expect(result.success).toBe(false);

          // Validation should return error details
          if (!result.success) {
            expect(result.error.issues.length).toBeGreaterThan(0);
            // Each error should have a message
            result.error.issues.forEach((issue) => {
              expect(issue.message).toBeTruthy();
              expect(typeof issue.message).toBe("string");
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional property test: Valid data should always pass validation
  // Feature: budget-management, Property 44: API input validation
  test("API requests with valid data are accepted", () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: fc.uuid(),
          amount: fc.double({ min: 0.01, max: 1000000, noNaN: true }),
          timePeriod: fc.constantFrom(
            TimePeriodType.DAILY,
            TimePeriodType.WEEKLY,
            TimePeriodType.MONTHLY,
            TimePeriodType.ANNUAL
          ),
          status: fc.option(
            fc.constantFrom(BudgetStatus.ACTIVE, BudgetStatus.INACTIVE),
            { nil: undefined }
          ),
          alerts: fc.option(
            fc.oneof(
              // 0 alerts
              fc.constant([]),
              // 1 alert
              fc.array(
                fc.record({
                  thresholdType: fc.constantFrom(ThresholdType.PERCENTAGE),
                  thresholdValue: fc.double({ min: 1, max: 100, noNaN: true }),
                  position: fc.constant(AlertPosition.BEFORE_LIMIT),
                  channels: fc.array(
                    fc.record({
                      type: fc.constantFrom(ChannelType.IN_APP, ChannelType.EMAIL, ChannelType.SMS),
                      enabled: fc.boolean(),
                    }),
                    { minLength: 1, maxLength: 3 }
                  ),
                }),
                { minLength: 1, maxLength: 1 }
              ),
              // 2 alerts (both before-limit)
              fc.array(
                fc.record({
                  thresholdType: fc.constantFrom(ThresholdType.PERCENTAGE),
                  thresholdValue: fc.double({ min: 1, max: 100, noNaN: true }),
                  position: fc.constant(AlertPosition.BEFORE_LIMIT),
                  channels: fc.array(
                    fc.record({
                      type: fc.constantFrom(ChannelType.IN_APP, ChannelType.EMAIL, ChannelType.SMS),
                      enabled: fc.boolean(),
                    }),
                    { minLength: 1, maxLength: 3 }
                  ),
                }),
                { minLength: 2, maxLength: 2 }
              ),
              // 3 alerts (2 before, 1 after) - valid distribution
              fc.constant([
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
                  channels: [{ type: ChannelType.IN_APP, enabled: true }],
                },
                {
                  thresholdType: ThresholdType.PERCENTAGE,
                  thresholdValue: 110,
                  position: AlertPosition.AFTER_LIMIT,
                  channels: [{ type: ChannelType.IN_APP, enabled: true }],
                },
              ])
            ),
            { nil: undefined }
          ),
        }),
        (validData) => {
          const dataForValidation = {
            body: validData,
          };

          const result = createBudgetSchema.safeParse(dataForValidation);

          // All valid data should be accepted
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property test for update budget validation
  // Feature: budget-management, Property 44: API input validation
  test("budget update API validates partial updates correctly", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Valid partial updates
          fc.record({
            amount: fc.option(fc.double({ min: 0.01, max: 1000000, noNaN: true }), { nil: undefined }),
            status: fc.option(
              fc.constantFrom(BudgetStatus.ACTIVE, BudgetStatus.INACTIVE),
              { nil: undefined }
            ),
            timePeriod: fc.option(
              fc.constantFrom(
                TimePeriodType.DAILY,
                TimePeriodType.WEEKLY,
                TimePeriodType.MONTHLY,
                TimePeriodType.ANNUAL
              ),
              { nil: undefined }
            ),
          }),
          // Invalid updates (negative amount)
          fc.record({
            amount: fc.double({ max: 0, noNaN: true }),
          }),
          // Invalid updates (amount too large)
          fc.record({
            amount: fc.double({ min: 1000000001, noNaN: true }),
          })
        ),
        (updateData) => {
          const dataForValidation = {
            body: updateData,
          };

          const result = updateBudgetSchema.safeParse(dataForValidation);

          // Check if data is valid or invalid
          const hasInvalidAmount =
            updateData.amount !== undefined &&
            (updateData.amount <= 0 || updateData.amount > 1000000000);

          if (hasInvalidAmount) {
            expect(result.success).toBe(false);
          } else {
            expect(result.success).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property test for alert configuration validation
  // Feature: budget-management, Property 44: API input validation
  test("alert configuration API validates alert arrays correctly", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Valid: 1-3 alerts with proper configuration
          fc
            .integer({ min: 1, max: 3 })
            .chain((count): fc.Arbitrary<{ alerts: any[] }> => {
              if (count === 3) {
                // Must have 2 before-limit and 1 after-limit
                return fc.constant({
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
                      channels: [{ type: ChannelType.IN_APP, enabled: true }],
                    },
                    {
                      thresholdType: ThresholdType.PERCENTAGE,
                      thresholdValue: 110,
                      position: AlertPosition.AFTER_LIMIT,
                      channels: [{ type: ChannelType.IN_APP, enabled: true }],
                    },
                  ],
                });
              } else {
                // 1-2 alerts can be any valid configuration
                return fc.record({
                  alerts: fc.array(
                    fc.record({
                      thresholdType: fc.constantFrom(ThresholdType.PERCENTAGE),
                      thresholdValue: fc.double({ min: 1, max: 100, noNaN: true }),
                      position: fc.constant(AlertPosition.BEFORE_LIMIT),
                      channels: fc.array(
                        fc.record({
                          type: fc.constantFrom(ChannelType.IN_APP, ChannelType.EMAIL, ChannelType.SMS),
                          enabled: fc.boolean(),
                        }),
                        { minLength: 1, maxLength: 3 }
                      ),
                    }),
                    { minLength: count, maxLength: count }
                  ),
                });
              }
            }),
          // Invalid: More than 3 alerts
          fc.record({
            alerts: fc.array(
              fc.record({
                thresholdType: fc.constantFrom(ThresholdType.PERCENTAGE),
                thresholdValue: fc.double({ min: 1, max: 100, noNaN: true }),
                position: fc.constant(AlertPosition.BEFORE_LIMIT),
                channels: fc.array(
                  fc.record({
                    type: fc.constantFrom(ChannelType.IN_APP, ChannelType.EMAIL, ChannelType.SMS),
                    enabled: fc.boolean(),
                  }),
                  { minLength: 1, maxLength: 3 }
                ),
              }),
              { minLength: 4, maxLength: 10 }
            ),
          })
        ),
        (alertData: { alerts: any[] }) => {
          const dataForValidation = {
            body: alertData,
          };

          const result = configureAlertsSchema.safeParse(dataForValidation);

          // Check if configuration is valid
          const hasMoreThan3Alerts = alertData.alerts.length > 3;

          if (hasMoreThan3Alerts) {
            expect(result.success).toBe(false);
          } else {
            expect(result.success).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a string is a valid UUID
 */
function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Check if a date is valid
 */
function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}
