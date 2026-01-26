import { z } from "zod";

export const createAccountSchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, "Account name is required")
      .max(100, "Account name must be less than 100 characters"),
    
    type: z.enum(['corrente', 'poupanca', 'investimento', 'carteira', 'outro'], {
      errorMap: () => ({ message: "Account type must be 'corrente', 'poupanca', 'investimento', 'carteira' or 'outro'" })
    }),
    
    bank: z.string()
      .max(100, "Bank name must be less than 100 characters")
      .optional(),
    
    bankId: z.number()
      .int()
      .positive()
      .optional(),
    
    balance: z.number()
      .default(0),
    
    color: z.string()
      .max(20, "Color must be less than 20 characters")
      .optional(),
    
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
    
    type: z.enum(['corrente', 'poupanca', 'investimento', 'carteira', 'outro'], {
      errorMap: () => ({ message: "Account type must be 'corrente', 'poupanca', 'investimento', 'carteira' or 'outro'" })
    }).optional(),
    
    bank: z.string()
      .max(100, "Bank name must be less than 100 characters")
      .optional(),
    
    bankId: z.number()
      .int()
      .positive()
      .optional()
      .nullable(),
    
    color: z.string()
      .max(20, "Color must be less than 20 characters")
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