import { describe, test, expect } from "@jest/globals";
import * as fc from "fast-check";
import {
  configureAlertsSchema,
  alertConfigSchema,
} from "../src/api/validators/budget.validator.js";
import {
  ThresholdType,
  AlertPosition,
  ChannelType,
  type AlertChannel,
} from "../src/domain/entities/budget.types.js";

/**
 * Property-Based Tests for Alert Validation
 * 
 * These tests use fast-check to verify universal properties across
 * randomized inputs with a minimum of 100 iterations per test.
 * 
 * Tests validate:
 * - Property 8: Alert count constraint
 * - Property 9: Alert position distribution constraint
 * - Property 10: Alert threshold type acceptance
 * - Property 11: Alert threshold validation
 * - Property 12: Alert channel configuration
 */

// ============================================================================
// Test Data Generators (Arbitraries)
// ============================================================================

/**
 * Generate a valid threshold type
 */
const thresholdTypeArb = fc.constantFrom(ThresholdType.FIXED_AMOUNT, ThresholdType.PERCENTAGE);

/**
 * Generate a valid alert position
 */
const alertPositionArb = fc.constantFrom(AlertPosition.BEFORE_LIMIT, AlertPosition.AFTER_LIMIT);

/**
 * Generate a valid channel type
 */
const channelTypeArb = fc.constantFrom(ChannelType.IN_APP, ChannelType.EMAIL, ChannelType.SMS);

/**
 * Generate a valid alert channel
 */
const alertChannelArb: fc.Arbitrary<AlertChannel> = fc.record({
  type: channelTypeArb,
  enabled: fc.boolean(),
});

/**
 * Generate an array of alert channels (any combination)
 */
const alertChannelsArb = fc.array(alertChannelArb, { minLength: 1, maxLength: 3 });

/**
 * Generate a valid alert configuration
 */
const validAlertConfigArb = fc.oneof(
  // Before-limit percentage alert (0 < value <= 100)
  fc.record({
    thresholdType: fc.constant(ThresholdType.PERCENTAGE),
    thresholdValue: fc.double({ min: 0.01, max: 100, noNaN: true }),
    position: fc.constant(AlertPosition.BEFORE_LIMIT),
    channels: alertChannelsArb,
  }),
  // After-limit percentage alert (value > 100)
  fc.record({
    thresholdType: fc.constant(ThresholdType.PERCENTAGE),
    thresholdValue: fc.double({ min: 100.01, max: 200, noNaN: true }),
    position: fc.constant(AlertPosition.AFTER_LIMIT),
    channels: alertChannelsArb,
  })
);

// ============================================================================
// Property Tests
// ============================================================================

describe("Alert Validation Property Tests", () => {
  
  // Feature: budget-management, Property 8: Alert count constraint
  test("configuring more than 3 alerts should be rejected", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 4, max: 10 }),
        (alertCount) => {
          // Generate more than 3 alerts
          const alerts = fc.sample(validAlertConfigArb, alertCount);

          const dataForValidation = {
            body: {
              alerts: alerts,
            },
          };

          const result = configureAlertsSchema.safeParse(dataForValidation);

          // Should fail validation
          expect(result.success).toBe(false);
          if (!result.success) {
            const hasMaxAlertsError = result.error.issues.some(
              (issue) => issue.message.includes("Maximum 3 alerts")
            );
            expect(hasMaxAlertsError).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: budget-management, Property 8: Alert count constraint
  test("configuring 3 or fewer alerts should be accepted (count constraint)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        (alertCount) => {
          // Generate valid alerts with proper distribution
          let alerts: any[] = [];
          
          if (alertCount === 3) {
            // Must have 2 before-limit and 1 after-limit
            const beforeAlerts = fc.sample(
              fc.record({
                thresholdType: fc.constant(ThresholdType.PERCENTAGE),
                thresholdValue: fc.double({ min: 50, max: 90, noNaN: true }),
                position: fc.constant(AlertPosition.BEFORE_LIMIT),
                channels: alertChannelsArb,
              }),
              2
            );
            const afterAlert = fc.sample(
              fc.record({
                thresholdType: fc.constant(ThresholdType.PERCENTAGE),
                thresholdValue: fc.double({ min: 110, max: 150, noNaN: true }),
                position: fc.constant(AlertPosition.AFTER_LIMIT),
                channels: alertChannelsArb,
              }),
              1
            );
            alerts = [...beforeAlerts, ...afterAlert];
          } else {
            // For 1-2 alerts, any valid configuration is acceptable
            alerts = fc.sample(validAlertConfigArb, alertCount);
          }

          const dataForValidation = {
            body: {
              alerts: alerts,
            },
          };

          const result = configureAlertsSchema.safeParse(dataForValidation);

          // Should pass validation (no max alerts error)
          if (!result.success) {
            const hasMaxAlertsError = result.error.issues.some(
              (issue) => issue.message.includes("Maximum 3 alerts")
            );
            expect(hasMaxAlertsError).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: budget-management, Property 9: Alert position distribution constraint
  test("when configuring 3 alerts, must have exactly 2 before-limit and 1 after-limit", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3 }), // beforeCount
        (beforeCount) => {
          const afterCount = 3 - beforeCount;

          // Skip the valid case (2 before, 1 after)
          if (beforeCount === 2 && afterCount === 1) {
            return true;
          }

          // Generate alerts with invalid distribution
          const alerts: any[] = [];

          // Add before-limit alerts
          for (let i = 0; i < beforeCount; i++) {
            alerts.push({
              thresholdType: 'percentage',
              thresholdValue: 50 + i * 10,
              position: 'before_limit',
              channels: [{ type: 'in_app', enabled: true }],
            });
          }

          // Add after-limit alerts
          for (let i = 0; i < afterCount; i++) {
            alerts.push({
              thresholdType: 'percentage',
              thresholdValue: 110 + i * 10,
              position: 'after_limit',
              channels: [{ type: 'in_app', enabled: true }],
            });
          }

          const dataForValidation = {
            body: {
              alerts: alerts,
            },
          };

          const result = configureAlertsSchema.safeParse(dataForValidation);

          // Should fail validation for invalid distribution
          expect(result.success).toBe(false);
          if (!result.success) {
            const hasDistributionError = result.error.issues.some(
              (issue) => issue.message.includes("exactly 2 before-limit alerts and 1 after-limit alert")
            );
            expect(hasDistributionError).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: budget-management, Property 10: Alert threshold type acceptance
  test("alert threshold type must be 'fixed_amount' or 'percentage'", () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => s !== 'fixed_amount' && s !== 'percentage'),
        (invalidType) => {
          const alert = {
            thresholdType: invalidType,
            thresholdValue: 50,
            position: 'before_limit',
            channels: [{ type: 'in_app', enabled: true }],
          };

          const result = alertConfigSchema.safeParse(alert);

          // Should fail validation for invalid threshold type
          expect(result.success).toBe(false);
          if (!result.success) {
            const hasTypeError = result.error.issues.some(
              (issue) => issue.message.includes("Threshold type must be either")
            );
            expect(hasTypeError).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: budget-management, Property 11: Alert threshold validation
  // Part 1: Before-limit percentage alerts must be between 0 and 100
  test("before-limit percentage alerts must be between 0 and 100", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.double({ min: -100, max: 0, noNaN: true }),
          fc.double({ min: 100.01, max: 200, noNaN: true })
        ),
        (invalidPercentage) => {
          const alert = {
            thresholdType: 'percentage',
            thresholdValue: invalidPercentage,
            position: 'before_limit',
            channels: [{ type: 'in_app', enabled: true }],
          };

          const result = alertConfigSchema.safeParse(alert);

          // Should fail validation for invalid percentage
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: budget-management, Property 11: Alert threshold validation
  // Part 2: After-limit percentage alerts must be greater than 100
  test("after-limit percentage alerts must be greater than 100", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        (invalidPercentage) => {
          const alert = {
            thresholdType: 'percentage',
            thresholdValue: invalidPercentage,
            position: 'after_limit',
            channels: [{ type: 'in_app', enabled: true }],
          };

          const result = alertConfigSchema.safeParse(alert);

          // Should fail validation for invalid percentage
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: budget-management, Property 12: Alert channel configuration
  test("any combination of channels (in-app, email, SMS) should be accepted", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            type: channelTypeArb,
            enabled: fc.boolean(),
          }),
          { minLength: 1, maxLength: 3 }
        ),
        (channels) => {
          const alert = {
            thresholdType: 'percentage',
            thresholdValue: 80,
            position: 'before_limit',
            channels: channels,
          };

          const result = alertConfigSchema.safeParse(alert);

          // Should pass validation for any channel combination
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: budget-management, Property 12: Alert channel configuration
  test("each channel should have an independent enabled/disabled state", () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        (inAppEnabled, emailEnabled, smsEnabled) => {
          const alert = {
            thresholdType: 'percentage',
            thresholdValue: 80,
            position: 'before_limit',
            channels: [
              { type: 'in_app', enabled: inAppEnabled },
              { type: 'email', enabled: emailEnabled },
              { type: 'sms', enabled: smsEnabled },
            ],
          };

          const result = alertConfigSchema.safeParse(alert);

          // Should pass validation regardless of enabled states
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
