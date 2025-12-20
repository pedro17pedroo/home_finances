import { z } from "zod";

export const createAccountSchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, "Account name is required")
      .max(100, "Account name must be less than 100 characters"),
    
    type: z.enum(['corrente', 'poupanca'], {
      errorMap: () => ({ message: "Account type must be 'corrente' or 'poupanca'" })
    }),
    
    bank: z.string()
      .min(1, "Bank name is required")
      .max(100, "Bank name must be less than 100 characters"),
    
    balance: z.number()
      .min(0, "Balance cannot be negative"),
    
    interestRate: z.number()
      .min(0, "Interest rate cannot be negative")
      .max(100, "Interest rate cannot exceed 100%")
      .optional(),
  }),
});

export const updateAccountSchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, "Account name is required")
      .max(100, "Account name must be less than 100 characters")
      .optional(),
    
    type: z.enum(['corrente', 'poupanca'], {
      errorMap: () => ({ message: "Account type must be 'corrente' or 'poupanca'" })
    }).optional(),
    
    bank: z.string()
      .min(1, "Bank name is required")
      .max(100, "Bank name must be less than 100 characters")
      .optional(),
    
    interestRate: z.number()
      .min(0, "Interest rate cannot be negative")
      .max(100, "Interest rate cannot exceed 100%")
      .optional(),
  }),
});

export const accountIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Account ID must be a valid number"),
  }),
});