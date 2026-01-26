import { z } from "zod";
import {
  TimePeriodType,
  BudgetStatus,
  ThresholdType,
  AlertPosition,
  ChannelType,
} from "../../domain/entities/budget.types.js";

/**
 * Budget Management Validation Schemas
 * 
 * This file contains Zod validation schemas for budget-related API requests.
 * Validates requirements 1.1, 1.2, 1.3, 2.1-2.9, and 10.7.
 */

// ============================================================================
// Alert Channel Schema
// ============================================================================

/**
 * Schema for alert channel configuration
 * Validates: Requirements 2.8, 2.9
 */
export const alertChannelSchema = z.object({
  type: z.nativeEnum(ChannelType, {
    errorMap: () => ({ message: "Channel type must be one of: in_app, email, sms" }),
  }),
  enabled: z.boolean({
    required_error: "Channel enabled status is required",
    invalid_type_error: "Channel enabled must be a boolean",
  }),
});

// ============================================================================
// Alert Configuration Schema
// ============================================================================

/**
 * Schema for alert configuration
 * Validates: Requirements 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9
 */
export const alertConfigSchema = z.object({
  thresholdType: z.nativeEnum(ThresholdType, {
    errorMap: () => ({ message: "Threshold type must be either 'fixed_amount' or 'percentage'" }),
  }),
  thresholdValue: z.number({
    required_error: "Threshold value is required",
    invalid_type_error: "Threshold value must be a number",
  }).positive("Threshold value must be greater than 0"),
  position: z.nativeEnum(AlertPosition, {
    errorMap: () => ({ message: "Alert position must be either 'before_limit' or 'after_limit'" }),
  }),
  channels: z.array(alertChannelSchema, {
    required_error: "Alert channels are required",
    invalid_type_error: "Channels must be an array",
  }).min(1, "At least one alert channel must be configured"),
}).refine(
  (data) => {
    // Validate percentage thresholds based on position
    if (data.thresholdType === ThresholdType.PERCENTAGE) {
      if (data.position === AlertPosition.BEFORE_LIMIT) {
        // Before-limit percentage alerts must be between 0 and 100
        return data.thresholdValue > 0 && data.thresholdValue <= 100;
      } else if (data.position === AlertPosition.AFTER_LIMIT) {
        // After-limit percentage alerts must be >= 100 (100% means "when budget is reached/exceeded")
        return data.thresholdValue >= 100;
      }
    }
    return true;
  },
  {
    message: "Invalid threshold value: before-limit percentage alerts must be between 0-100%, after-limit must be >=100%",
    path: ["thresholdValue"],
  }
);

// ============================================================================
// Create Budget Schema
// ============================================================================

/**
 * Schema for creating a new budget
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.1, 2.2
 */
export const createBudgetSchema = z.object({
  body: z.object({
    categoryId: z.union([
      z.string().transform((val) => parseInt(val)),
      z.number()
    ], {
      required_error: "Category ID is required",
      invalid_type_error: "Category ID must be a string or number",
    }).refine((val) => !isNaN(val) && val > 0, {
      message: "Category ID must be a valid positive number"
    }),
    
    amount: z.number({
      required_error: "Budget amount is required",
      invalid_type_error: "Budget amount must be a number",
    })
      .positive("Budget amount must be greater than 0")
      .max(1000000000, "Budget amount is too large"),
    
    timePeriod: z.nativeEnum(TimePeriodType, {
      errorMap: () => ({ message: "Time period is required and must be one of: daily, weekly, monthly, annual, custom" }),
    }),
    
    customStartDate: z.string()
      .datetime("Custom start date must be a valid ISO datetime")
      .optional()
      .transform((val) => val ? new Date(val) : undefined),
    
    customEndDate: z.string()
      .datetime("Custom end date must be a valid ISO datetime")
      .optional()
      .transform((val) => val ? new Date(val) : undefined),
    
    status: z.nativeEnum(BudgetStatus, {
      errorMap: () => ({ message: "Status must be either 'active' or 'inactive'" }),
    }).optional().default(BudgetStatus.ACTIVE),
    
    alerts: z.array(alertConfigSchema)
      .max(3, "Maximum 3 alerts allowed per budget")
      .optional(),
  })
    .refine(
      (data) => {
        // Validate custom date range: end date must be after start date
        if (data.timePeriod === TimePeriodType.CUSTOM) {
          if (!data.customStartDate || !data.customEndDate) {
            return false;
          }
          return data.customEndDate > data.customStartDate;
        }
        return true;
      },
      {
        message: "Custom budget requires both start and end dates, and end date must be after start date",
        path: ["customEndDate"],
      }
    )
    .refine(
      (data) => {
        // Validate that custom dates are only provided for custom time period
        if (data.timePeriod !== TimePeriodType.CUSTOM) {
          return !data.customStartDate && !data.customEndDate;
        }
        return true;
      },
      {
        message: "Custom start and end dates should only be provided for custom time period",
        path: ["timePeriod"],
      }
    )
    .refine(
      (data) => {
        // Validate alert distribution: exactly 2 before-limit and 1 after-limit when all 3 alerts configured
        if (data.alerts && data.alerts.length === 3) {
          const beforeLimitCount = data.alerts.filter(
            (alert) => alert.position === AlertPosition.BEFORE_LIMIT
          ).length;
          const afterLimitCount = data.alerts.filter(
            (alert) => alert.position === AlertPosition.AFTER_LIMIT
          ).length;
          return beforeLimitCount === 2 && afterLimitCount === 1;
        }
        return true;
      },
      {
        message: "When configuring 3 alerts, must have exactly 2 before-limit alerts and 1 after-limit alert",
        path: ["alerts"],
      }
    )
    .refine(
      (data) => {
        // Validate fixed amount thresholds against budget amount
        if (data.alerts) {
          for (const alert of data.alerts) {
            if (alert.thresholdType === ThresholdType.FIXED_AMOUNT) {
              if (alert.position === AlertPosition.BEFORE_LIMIT) {
                // Before-limit fixed alerts must be less than budget amount
                if (alert.thresholdValue >= data.amount) {
                  return false;
                }
              } else if (alert.position === AlertPosition.AFTER_LIMIT) {
                // After-limit fixed alerts must be greater than budget amount
                if (alert.thresholdValue <= data.amount) {
                  return false;
                }
              }
            }
          }
        }
        return true;
      },
      {
        message: "Invalid alert threshold: before-limit fixed alerts must be less than budget amount, after-limit must be greater",
        path: ["alerts"],
      }
    ),
});

// ============================================================================
// Update Budget Schema
// ============================================================================

/**
 * Schema for updating an existing budget
 * Validates: Requirements 6.1, 6.2, 10.7
 */
export const updateBudgetSchema = z.object({
  body: z.object({
    amount: z.number({
      invalid_type_error: "Budget amount must be a number",
    })
      .positive("Budget amount must be greater than 0")
      .max(1000000000, "Budget amount is too large")
      .optional(),
    
    timePeriod: z.nativeEnum(TimePeriodType, {
      errorMap: () => ({ message: "Time period must be one of: daily, weekly, monthly, annual, custom" }),
    }).optional(),
    
    customStartDate: z.string()
      .datetime("Custom start date must be a valid ISO datetime")
      .optional()
      .transform((val) => val ? new Date(val) : undefined),
    
    customEndDate: z.string()
      .datetime("Custom end date must be a valid ISO datetime")
      .optional()
      .transform((val) => val ? new Date(val) : undefined),
    
    status: z.nativeEnum(BudgetStatus, {
      errorMap: () => ({ message: "Status must be either 'active' or 'inactive'" }),
    }).optional(),
  })
    .refine(
      (data) => {
        // Validate custom date range if both dates are provided
        if (data.customStartDate && data.customEndDate) {
          return data.customEndDate > data.customStartDate;
        }
        return true;
      },
      {
        message: "Custom end date must be after start date",
        path: ["customEndDate"],
      }
    ),
});

// ============================================================================
// Update Alert Schema
// ============================================================================

/**
 * Schema for updating an alert
 * Validates: Requirements 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 6.2
 */
export const updateAlertSchema = z.object({
  body: z.object({
    thresholdType: z.nativeEnum(ThresholdType, {
      errorMap: () => ({ message: "Threshold type must be either 'fixed_amount' or 'percentage'" }),
    }).optional(),
    
    thresholdValue: z.number({
      invalid_type_error: "Threshold value must be a number",
    })
      .positive("Threshold value must be greater than 0")
      .optional(),
    
    position: z.nativeEnum(AlertPosition, {
      errorMap: () => ({ message: "Alert position must be either 'before_limit' or 'after_limit'" }),
    }).optional(),
    
    channels: z.array(alertChannelSchema, {
      invalid_type_error: "Channels must be an array",
    })
      .min(1, "At least one alert channel must be configured")
      .optional(),
  })
    .refine(
      (data) => {
        // Validate percentage thresholds based on position (if both are provided)
        if (data.thresholdType === ThresholdType.PERCENTAGE && data.position && data.thresholdValue) {
          if (data.position === AlertPosition.BEFORE_LIMIT) {
            return data.thresholdValue > 0 && data.thresholdValue <= 100;
          } else if (data.position === AlertPosition.AFTER_LIMIT) {
            return data.thresholdValue >= 100;
          }
        }
        return true;
      },
      {
        message: "Invalid threshold value: before-limit percentage alerts must be between 0-100%, after-limit must be >=100%",
        path: ["thresholdValue"],
      }
    ),
});

// ============================================================================
// Configure Alerts Schema
// ============================================================================

/**
 * Schema for configuring multiple alerts for a budget
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9
 */
export const configureAlertsSchema = z.object({
  body: z.object({
    alerts: z.array(alertConfigSchema, {
      required_error: "Alerts array is required",
      invalid_type_error: "Alerts must be an array",
    })
      .max(3, "Maximum 3 alerts allowed per budget"),
  })
    .refine(
      (data) => {
        // Validate alert distribution: exactly 2 before-limit and 1 after-limit when all 3 alerts configured
        if (data.alerts.length === 3) {
          const beforeLimitCount = data.alerts.filter(
            (alert) => alert.position === AlertPosition.BEFORE_LIMIT
          ).length;
          const afterLimitCount = data.alerts.filter(
            (alert) => alert.position === AlertPosition.AFTER_LIMIT
          ).length;
          return beforeLimitCount === 2 && afterLimitCount === 1;
        }
        return true;
      },
      {
        message: "When configuring 3 alerts, must have exactly 2 before-limit alerts and 1 after-limit alert",
        path: ["alerts"],
      }
    ),
});

// ============================================================================
// Budget ID Parameter Schema
// ============================================================================

/**
 * Schema for budget ID in URL parameters
 */
export const budgetIdSchema = z.object({
  params: z.object({
    id: z.string().transform((val) => parseInt(val)).refine((val) => !isNaN(val) && val > 0, {
      message: "Budget ID must be a valid positive number"
    }),
  }),
});

/**
 * Schema for alert ID in URL parameters
 */
export const alertIdSchema = z.object({
  params: z.object({
    id: z.string().transform((val) => parseInt(val)).refine((val) => !isNaN(val) && val > 0, {
      message: "Alert ID must be a valid positive number"
    }),
  }),
});

// ============================================================================
// Budget Filters Schema
// ============================================================================

/**
 * Schema for budget list filtering
 * Validates: Requirements 5.1
 */
export const budgetFiltersSchema = z.object({
  query: z.object({
    status: z.nativeEnum(BudgetStatus, {
      errorMap: () => ({ message: "Status must be either 'active' or 'inactive'" }),
    }).optional(),
    
    categoryId: z.string()
      .transform((val) => parseInt(val))
      .refine((val) => !isNaN(val) && val > 0, {
        message: "Category ID must be a valid positive number"
      })
      .optional(),
    
    timePeriod: z.nativeEnum(TimePeriodType, {
      errorMap: () => ({ message: "Time period must be one of: daily, weekly, monthly, annual, custom" }),
    }).optional(),
  }),
});

// ============================================================================
// Type Exports for TypeScript
// ============================================================================

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>["body"];
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>["body"];
export type UpdateAlertInput = z.infer<typeof updateAlertSchema>["body"];
export type ConfigureAlertsInput = z.infer<typeof configureAlertsSchema>["body"];
export type BudgetFiltersInput = z.infer<typeof budgetFiltersSchema>["query"];
