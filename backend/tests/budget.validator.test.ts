import { describe, test, expect } from "@jest/globals";
import {
  createBudgetSchema,
  updateBudgetSchema,
  updateAlertSchema,
  configureAlertsSchema,
  budgetFiltersSchema,
  alertConfigSchema,
} from "../src/api/validators/budget.validator.js";
import {
  TimePeriodType,
  BudgetStatus,
  ThresholdType,
  AlertPosition,
  ChannelType,
} from "../src/domain/entities/budget.types.js";

/**
 * Budget Validator Tests
 * 
 * These tests verify that the Zod validation schemas correctly validate
 * budget-related API requests according to requirements 1.1, 1.2, 1.3,
 * 2.1-2.9, and 10.7.
 */

describe("Budget Validator", () => {
  describe("createBudgetSchema", () => {
    test("should accept valid budget creation request", () => {
      const validData = {
        body: {
          categoryId: "123e4567-e89b-12d3-a456-426614174000",
          amount: 1000,
          timePeriod: TimePeriodType.MONTHLY,
          status: BudgetStatus.ACTIVE,
        },
      };

      const result = createBudgetSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test("should reject budget without required fields", () => {
      const invalidData = {
        body: {
          amount: 1000,
        },
      };

      const result = createBudgetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes("categoryId"))).toBe(true);
        expect(result.error.issues.some(issue => issue.path.includes("timePeriod"))).toBe(true);
      }
    });

    test("should reject invalid time period", () => {
      const invalidData = {
        body: {
          categoryId: "123e4567-e89b-12d3-a456-426614174000",
          amount: 1000,
          timePeriod: "invalid_period",
        },
      };

      const result = createBudgetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    test("should reject custom period without dates", () => {
      const invalidData = {
        body: {
          categoryId: "123e4567-e89b-12d3-a456-426614174000",
          amount: 1000,
          timePeriod: TimePeriodType.CUSTOM,
        },
      };

      const result = createBudgetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.message.includes("Custom budget requires both start and end dates")
        )).toBe(true);
      }
    });

    test("should reject custom period with end date before start date", () => {
      const invalidData = {
        body: {
          categoryId: "123e4567-e89b-12d3-a456-426614174000",
          amount: 1000,
          timePeriod: TimePeriodType.CUSTOM,
          customStartDate: "2024-12-31T00:00:00Z",
          customEndDate: "2024-01-01T00:00:00Z",
        },
      };

      const result = createBudgetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.message.includes("end date must be after start date")
        )).toBe(true);
      }
    });

    test("should accept custom period with valid date range", () => {
      const validData = {
        body: {
          categoryId: "123e4567-e89b-12d3-a456-426614174000",
          amount: 1000,
          timePeriod: TimePeriodType.CUSTOM,
          customStartDate: "2024-01-01T00:00:00Z",
          customEndDate: "2024-12-31T23:59:59Z",
        },
      };

      const result = createBudgetSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test("should default status to active when not provided", () => {
      const validData = {
        body: {
          categoryId: "123e4567-e89b-12d3-a456-426614174000",
          amount: 1000,
          timePeriod: TimePeriodType.MONTHLY,
        },
      };

      const result = createBudgetSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body.status).toBe(BudgetStatus.ACTIVE);
      }
    });

    test("should reject more than 3 alerts", () => {
      const invalidData = {
        body: {
          categoryId: "123e4567-e89b-12d3-a456-426614174000",
          amount: 1000,
          timePeriod: TimePeriodType.MONTHLY,
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
              thresholdValue: 100,
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
        },
      };

      const result = createBudgetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.message.includes("Maximum 3 alerts")
        )).toBe(true);
      }
    });

    test("should reject 3 alerts without proper distribution (2 before, 1 after)", () => {
      const invalidData = {
        body: {
          categoryId: "123e4567-e89b-12d3-a456-426614174000",
          amount: 1000,
          timePeriod: TimePeriodType.MONTHLY,
          alerts: [
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
          ],
        },
      };

      const result = createBudgetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.message.includes("exactly 2 before-limit alerts and 1 after-limit alert")
        )).toBe(true);
      }
    });

    test("should accept 3 alerts with proper distribution", () => {
      const validData = {
        body: {
          categoryId: "123e4567-e89b-12d3-a456-426614174000",
          amount: 1000,
          timePeriod: TimePeriodType.MONTHLY,
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
        },
      };

      const result = createBudgetSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test("should reject before-limit percentage alert > 100%", () => {
      const invalidData = {
        body: {
          categoryId: "123e4567-e89b-12d3-a456-426614174000",
          amount: 1000,
          timePeriod: TimePeriodType.MONTHLY,
          alerts: [
            {
              thresholdType: ThresholdType.PERCENTAGE,
              thresholdValue: 150,
              position: AlertPosition.BEFORE_LIMIT,
              channels: [{ type: ChannelType.IN_APP, enabled: true }],
            },
          ],
        },
      };

      const result = createBudgetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.message.includes("before-limit percentage alerts must be between 0-100%")
        )).toBe(true);
      }
    });

    test("should reject after-limit percentage alert <= 100%", () => {
      const invalidData = {
        body: {
          categoryId: "123e4567-e89b-12d3-a456-426614174000",
          amount: 1000,
          timePeriod: TimePeriodType.MONTHLY,
          alerts: [
            {
              thresholdType: ThresholdType.PERCENTAGE,
              thresholdValue: 100,
              position: AlertPosition.AFTER_LIMIT,
              channels: [{ type: ChannelType.IN_APP, enabled: true }],
            },
          ],
        },
      };

      const result = createBudgetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.message.includes("after-limit must be >100%")
        )).toBe(true);
      }
    });

    test("should reject before-limit fixed amount >= budget amount", () => {
      const invalidData = {
        body: {
          categoryId: "123e4567-e89b-12d3-a456-426614174000",
          amount: 1000,
          timePeriod: TimePeriodType.MONTHLY,
          alerts: [
            {
              thresholdType: ThresholdType.FIXED_AMOUNT,
              thresholdValue: 1000,
              position: AlertPosition.BEFORE_LIMIT,
              channels: [{ type: ChannelType.IN_APP, enabled: true }],
            },
          ],
        },
      };

      const result = createBudgetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.message.includes("before-limit fixed alerts must be less than budget amount")
        )).toBe(true);
      }
    });

    test("should reject after-limit fixed amount <= budget amount", () => {
      const invalidData = {
        body: {
          categoryId: "123e4567-e89b-12d3-a456-426614174000",
          amount: 1000,
          timePeriod: TimePeriodType.MONTHLY,
          alerts: [
            {
              thresholdType: ThresholdType.FIXED_AMOUNT,
              thresholdValue: 1000,
              position: AlertPosition.AFTER_LIMIT,
              channels: [{ type: ChannelType.IN_APP, enabled: true }],
            },
          ],
        },
      };

      const result = createBudgetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.message.includes("after-limit must be greater")
        )).toBe(true);
      }
    });

    test("should accept valid fixed amount alerts", () => {
      const validData = {
        body: {
          categoryId: "123e4567-e89b-12d3-a456-426614174000",
          amount: 1000,
          timePeriod: TimePeriodType.MONTHLY,
          alerts: [
            {
              thresholdType: ThresholdType.FIXED_AMOUNT,
              thresholdValue: 500,
              position: AlertPosition.BEFORE_LIMIT,
              channels: [{ type: ChannelType.IN_APP, enabled: true }],
            },
            {
              thresholdType: ThresholdType.FIXED_AMOUNT,
              thresholdValue: 800,
              position: AlertPosition.BEFORE_LIMIT,
              channels: [{ type: ChannelType.IN_APP, enabled: true }],
            },
            {
              thresholdType: ThresholdType.FIXED_AMOUNT,
              thresholdValue: 1200,
              position: AlertPosition.AFTER_LIMIT,
              channels: [{ type: ChannelType.IN_APP, enabled: true }],
            },
          ],
        },
      };

      const result = createBudgetSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("alertConfigSchema", () => {
    test("should accept valid alert with multiple channels", () => {
      const validData = {
        thresholdType: ThresholdType.PERCENTAGE,
        thresholdValue: 80,
        position: AlertPosition.BEFORE_LIMIT,
        channels: [
          { type: ChannelType.IN_APP, enabled: true },
          { type: ChannelType.EMAIL, enabled: true },
          { type: ChannelType.SMS, enabled: false },
        ],
      };

      const result = alertConfigSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test("should reject alert without channels", () => {
      const invalidData = {
        thresholdType: ThresholdType.PERCENTAGE,
        thresholdValue: 80,
        position: AlertPosition.BEFORE_LIMIT,
        channels: [],
      };

      const result = alertConfigSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.message.includes("At least one alert channel")
        )).toBe(true);
      }
    });

    test("should accept alert with disabled channels", () => {
      const validData = {
        thresholdType: ThresholdType.PERCENTAGE,
        thresholdValue: 80,
        position: AlertPosition.BEFORE_LIMIT,
        channels: [
          { type: ChannelType.IN_APP, enabled: false },
          { type: ChannelType.EMAIL, enabled: false },
        ],
      };

      const result = alertConfigSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("updateBudgetSchema", () => {
    test("should accept partial budget updates", () => {
      const validData = {
        body: {
          amount: 2000,
        },
      };

      const result = updateBudgetSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test("should accept status update", () => {
      const validData = {
        body: {
          status: BudgetStatus.INACTIVE,
        },
      };

      const result = updateBudgetSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test("should reject invalid custom date range", () => {
      const invalidData = {
        body: {
          customStartDate: "2024-12-31T00:00:00Z",
          customEndDate: "2024-01-01T00:00:00Z",
        },
      };

      const result = updateBudgetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.message.includes("end date must be after start date")
        )).toBe(true);
      }
    });

    test("should accept empty update object", () => {
      const validData = {
        body: {},
      };

      const result = updateBudgetSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("updateAlertSchema", () => {
    test("should accept partial alert updates", () => {
      const validData = {
        body: {
          thresholdValue: 90,
        },
      };

      const result = updateAlertSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test("should accept channel updates", () => {
      const validData = {
        body: {
          channels: [
            { type: ChannelType.IN_APP, enabled: true },
            { type: ChannelType.EMAIL, enabled: false },
          ],
        },
      };

      const result = updateAlertSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test("should validate percentage threshold when both type and position provided", () => {
      const invalidData = {
        body: {
          thresholdType: ThresholdType.PERCENTAGE,
          thresholdValue: 150,
          position: AlertPosition.BEFORE_LIMIT,
        },
      };

      const result = updateAlertSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.message.includes("before-limit percentage alerts must be between 0-100%")
        )).toBe(true);
      }
    });
  });

  describe("configureAlertsSchema", () => {
    test("should accept valid alerts configuration", () => {
      const validData = {
        body: {
          alerts: [
            {
              thresholdType: ThresholdType.PERCENTAGE,
              thresholdValue: 50,
              position: AlertPosition.BEFORE_LIMIT,
              channels: [{ type: ChannelType.IN_APP, enabled: true }],
            },
          ],
        },
      };

      const result = configureAlertsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test("should reject more than 3 alerts", () => {
      const invalidData = {
        body: {
          alerts: [
            {
              thresholdType: ThresholdType.PERCENTAGE,
              thresholdValue: 25,
              position: AlertPosition.BEFORE_LIMIT,
              channels: [{ type: ChannelType.IN_APP, enabled: true }],
            },
            {
              thresholdType: ThresholdType.PERCENTAGE,
              thresholdValue: 50,
              position: AlertPosition.BEFORE_LIMIT,
              channels: [{ type: ChannelType.IN_APP, enabled: true }],
            },
            {
              thresholdType: ThresholdType.PERCENTAGE,
              thresholdValue: 75,
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
        },
      };

      const result = configureAlertsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("budgetFiltersSchema", () => {
    test("should accept valid filters", () => {
      const validData = {
        query: {
          status: BudgetStatus.ACTIVE,
          categoryId: "123e4567-e89b-12d3-a456-426614174000",
          timePeriod: TimePeriodType.MONTHLY,
        },
      };

      const result = budgetFiltersSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test("should accept empty filters", () => {
      const validData = {
        query: {},
      };

      const result = budgetFiltersSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test("should reject invalid category ID format", () => {
      const invalidData = {
        query: {
          categoryId: "not-a-uuid",
        },
      };

      const result = budgetFiltersSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
