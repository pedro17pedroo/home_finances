import { z } from "zod";

export const createSavingsGoalSchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, "Goal name is required")
      .max(100, "Goal name must be less than 100 characters"),
    
    targetAmount: z.number()
      .min(0.01, "Target amount must be greater than zero"),
    
    currentAmount: z.number()
      .min(0, "Current amount cannot be negative")
      .optional(),
    
    targetDate: z.string()
      .refine((date) => {
        const targetDate = new Date(date);
        return targetDate > new Date();
      }, "Target date must be in the future"),
    
    description: z.string()
      .max(500, "Description must be less than 500 characters")
      .optional(),
  }),
});

export const updateSavingsGoalSchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, "Goal name is required")
      .max(100, "Goal name must be less than 100 characters")
      .optional(),
    
    targetAmount: z.number()
      .min(0.01, "Target amount must be greater than zero")
      .optional(),
    
    currentAmount: z.number()
      .min(0, "Current amount cannot be negative")
      .optional(),
    
    targetDate: z.string()
      .refine((date) => {
        const targetDate = new Date(date);
        return targetDate > new Date();
      }, "Target date must be in the future")
      .optional(),
    
    description: z.string()
      .max(500, "Description must be less than 500 characters")
      .optional(),
  }),
});

export const addToGoalSchema = z.object({
  body: z.object({
    amount: z.number()
      .min(0.01, "Amount must be greater than zero"),
    
    description: z.string()
      .max(200, "Description must be less than 200 characters")
      .optional(),
  }),
});

export const savingsGoalIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Savings goal ID must be a valid number"),
  }),
});