import { z } from "zod";

export const createTransferSchema = z.object({
  body: z.object({
    fromAccountId: z.number()
      .int("From account ID must be an integer")
      .positive("From account ID must be positive"),
    
    toAccountId: z.number()
      .int("To account ID must be an integer")
      .positive("To account ID must be positive"),
    
    amount: z.number()
      .min(0.01, "Transfer amount must be greater than zero"),
    
    description: z.string()
      .max(500, "Description must be less than 500 characters")
      .optional(),
  }).refine((data) => data.fromAccountId !== data.toAccountId, {
    message: "Cannot transfer to the same account",
    path: ["toAccountId"],
  }),
});

export const transferFiltersSchema = z.object({
  query: z.object({
    startDate: z.string()
      .datetime("Invalid start date format")
      .optional(),
    
    endDate: z.string()
      .datetime("Invalid end date format")
      .optional(),
    
    accountId: z.string()
      .regex(/^\d+$/, "Account ID must be a valid number")
      .optional(),
  }),
});

export const transferIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Transfer ID must be a valid number"),
  }),
});

export const accountIdSchema = z.object({
  params: z.object({
    accountId: z.string().regex(/^\d+$/, "Account ID must be a valid number"),
  }),
});