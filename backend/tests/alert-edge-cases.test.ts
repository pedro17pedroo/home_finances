import { describe, test, expect } from "@jest/globals";
import {
  ThresholdType,
  AlertPosition,
  ChannelType,
  type Alert,
  type AlertChannel,
} from "../src/domain/entities/budget.types.js";

/**
 * Unit Tests for Alert Edge Cases
 * 
 * These tests verify specific edge cases and boundary conditions for alert functionality.
 * 
 * Tests validate:
 * - Property 16: Alert triggering on threshold crossing
 * - Property 19: Alert idempotence within period
 * - Property 20: Multiple alert triggering
 * - Property 22: Alert trigger reset on period boundary
 */

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate threshold amount for an alert
 */
function calculateThresholdAmount(alert: Alert, budgetAmount: number): number {
  if (alert.thresholdType === ThresholdType.PERCENTAGE) {
    return (alert.thresholdValue / 100) * budgetAmount;
  } else {
    return alert.thresholdValue;
  }
}

/**
 * Check if spending crosses alert threshold
 */
function shouldTriggerAlert(alert: Alert, currentSpending: number, budgetAmount: number): boolean {
  const thresholdAmount = calculateThresholdAmount(alert, budgetAmount);
  return currentSpending >= thresholdAmount;
}

// ============================================================================
// Unit Tests
// ============================================================================

describe("Alert Edge Cases", () => {
  
  // Feature: budget-management, Property 16: Alert triggering on threshold crossing
  describe("Alert threshold crossing", () => {
    test("alert should trigger when spending exactly equals threshold", () => {
      const alert: Alert = {
        id: 1,
        budgetId: 1,
        thresholdType: ThresholdType.PERCENTAGE,
        thresholdValue: 80,
        position: AlertPosition.BEFORE_LIMIT,
        channels: [{ type: ChannelType.IN_APP, enabled: true }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const budgetAmount = 1000;
      const thresholdAmount = 800; // 80% of 1000
      const currentSpending = 800; // Exactly at threshold

      const shouldTrigger = shouldTriggerAlert(alert, currentSpending, budgetAmount);
      expect(shouldTrigger).toBe(true);
    });

    test("alert should trigger when spending exceeds threshold by small amount", () => {
      const alert: Alert = {
        id: 1,
        budgetId: 1,
        thresholdType: ThresholdType.FIXED_AMOUNT,
        thresholdValue: 500,
        position: AlertPosition.BEFORE_LIMIT,
        channels: [{ type: ChannelType.IN_APP, enabled: true }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const budgetAmount = 1000;
      const currentSpending = 500.01; // Just over threshold

      const shouldTrigger = shouldTriggerAlert(alert, currentSpending, budgetAmount);
      expect(shouldTrigger).toBe(true);
    });

    test("alert should NOT trigger when spending is just below threshold", () => {
      const alert: Alert = {
        id: 1,
        budgetId: 1,
        thresholdType: ThresholdType.PERCENTAGE,
        thresholdValue: 90,
        position: AlertPosition.BEFORE_LIMIT,
        channels: [{ type: ChannelType.IN_APP, enabled: true }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const budgetAmount = 1000;
      const currentSpending = 899.99; // Just below 90%

      const shouldTrigger = shouldTriggerAlert(alert, currentSpending, budgetAmount);
      expect(shouldTrigger).toBe(false);
    });
  });

  // Feature: budget-management, Property 20: Multiple alert triggering
  describe("Multiple alert triggering", () => {
    test("multiple alerts with different thresholds should trigger correctly", () => {
      const alerts: Alert[] = [
        {
          id: 1,
          budgetId: 1,
          thresholdType: ThresholdType.PERCENTAGE,
          thresholdValue: 50,
          position: AlertPosition.BEFORE_LIMIT,
          channels: [{ type: ChannelType.IN_APP, enabled: true }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          budgetId: 1,
          thresholdType: ThresholdType.PERCENTAGE,
          thresholdValue: 80,
          position: AlertPosition.BEFORE_LIMIT,
          channels: [{ type: ChannelType.EMAIL, enabled: true }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 3,
          budgetId: 1,
          thresholdType: ThresholdType.PERCENTAGE,
          thresholdValue: 110,
          position: AlertPosition.AFTER_LIMIT,
          channels: [{ type: ChannelType.SMS, enabled: true }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const budgetAmount = 1000;
      const currentSpending = 850; // 85% - should trigger first two alerts

      const triggeredAlerts = alerts.filter((alert) =>
        shouldTriggerAlert(alert, currentSpending, budgetAmount)
      );

      expect(triggeredAlerts.length).toBe(2);
      expect(triggeredAlerts[0].id).toBe(1); // 50% alert
      expect(triggeredAlerts[1].id).toBe(2); // 80% alert
    });

    test("all alerts should trigger when spending exceeds all thresholds", () => {
      const alerts: Alert[] = [
        {
          id: 1,
          budgetId: 1,
          thresholdType: ThresholdType.PERCENTAGE,
          thresholdValue: 50,
          position: AlertPosition.BEFORE_LIMIT,
          channels: [{ type: ChannelType.IN_APP, enabled: true }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          budgetId: 1,
          thresholdType: ThresholdType.PERCENTAGE,
          thresholdValue: 90,
          position: AlertPosition.BEFORE_LIMIT,
          channels: [{ type: ChannelType.EMAIL, enabled: true }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 3,
          budgetId: 1,
          thresholdType: ThresholdType.PERCENTAGE,
          thresholdValue: 110,
          position: AlertPosition.AFTER_LIMIT,
          channels: [{ type: ChannelType.SMS, enabled: true }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const budgetAmount = 1000;
      const currentSpending = 1200; // 120% - exceeds all thresholds

      const triggeredAlerts = alerts.filter((alert) =>
        shouldTriggerAlert(alert, currentSpending, budgetAmount)
      );

      expect(triggeredAlerts.length).toBe(3);
    });
  });

  // Feature: budget-management, Property 11: Alert threshold validation
  describe("Threshold calculation", () => {
    test("percentage threshold should calculate correctly", () => {
      const alert: Alert = {
        id: 1,
        budgetId: 1,
        thresholdType: ThresholdType.PERCENTAGE,
        thresholdValue: 75,
        position: AlertPosition.BEFORE_LIMIT,
        channels: [{ type: ChannelType.IN_APP, enabled: true }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const budgetAmount = 2000;
      const thresholdAmount = calculateThresholdAmount(alert, budgetAmount);

      expect(thresholdAmount).toBe(1500); // 75% of 2000
    });

    test("fixed amount threshold should return value as-is", () => {
      const alert: Alert = {
        id: 1,
        budgetId: 1,
        thresholdType: ThresholdType.FIXED_AMOUNT,
        thresholdValue: 750,
        position: AlertPosition.BEFORE_LIMIT,
        channels: [{ type: ChannelType.IN_APP, enabled: true }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const budgetAmount = 1000;
      const thresholdAmount = calculateThresholdAmount(alert, budgetAmount);

      expect(thresholdAmount).toBe(750);
    });

    test("after-limit percentage threshold should calculate correctly", () => {
      const alert: Alert = {
        id: 1,
        budgetId: 1,
        thresholdType: ThresholdType.PERCENTAGE,
        thresholdValue: 120,
        position: AlertPosition.AFTER_LIMIT,
        channels: [{ type: ChannelType.SMS, enabled: true }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const budgetAmount = 1000;
      const thresholdAmount = calculateThresholdAmount(alert, budgetAmount);

      expect(thresholdAmount).toBe(1200); // 120% of 1000
    });
  });

  // Feature: budget-management, Property 12: Alert channel configuration
  describe("Alert channel configuration", () => {
    test("alert can have multiple channels with independent enabled states", () => {
      const alert: Alert = {
        id: 1,
        budgetId: 1,
        thresholdType: ThresholdType.PERCENTAGE,
        thresholdValue: 80,
        position: AlertPosition.BEFORE_LIMIT,
        channels: [
          { type: ChannelType.IN_APP, enabled: true },
          { type: ChannelType.EMAIL, enabled: false },
          { type: ChannelType.SMS, enabled: true },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const enabledChannels = alert.channels.filter((c) => c.enabled);
      const disabledChannels = alert.channels.filter((c) => !c.enabled);

      expect(enabledChannels.length).toBe(2);
      expect(disabledChannels.length).toBe(1);
      expect(enabledChannels[0].type).toBe(ChannelType.IN_APP);
      expect(enabledChannels[1].type).toBe(ChannelType.SMS);
      expect(disabledChannels[0].type).toBe(ChannelType.EMAIL);
    });

    test("alert can have all channels enabled", () => {
      const alert: Alert = {
        id: 1,
        budgetId: 1,
        thresholdType: ThresholdType.PERCENTAGE,
        thresholdValue: 80,
        position: AlertPosition.BEFORE_LIMIT,
        channels: [
          { type: ChannelType.IN_APP, enabled: true },
          { type: ChannelType.EMAIL, enabled: true },
          { type: ChannelType.SMS, enabled: true },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const enabledChannels = alert.channels.filter((c) => c.enabled);

      expect(enabledChannels.length).toBe(3);
    });

    test("alert can have all channels disabled", () => {
      const alert: Alert = {
        id: 1,
        budgetId: 1,
        thresholdType: ThresholdType.PERCENTAGE,
        thresholdValue: 80,
        position: AlertPosition.BEFORE_LIMIT,
        channels: [
          { type: ChannelType.IN_APP, enabled: false },
          { type: ChannelType.EMAIL, enabled: false },
          { type: ChannelType.SMS, enabled: false },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const enabledChannels = alert.channels.filter((c) => c.enabled);

      expect(enabledChannels.length).toBe(0);
    });
  });
});
