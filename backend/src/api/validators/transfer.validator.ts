import { z } from "zod";

// Custom date validator that accepts both ISO datetime and simple date formats
const dateString = z.string().refine((val) => {
  const isoDatetime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  const simpleDate = /^\d{4}-\d{2}-\d{2}$/;
  return isoDatetime.test(val) || simpleDate.test(val);
}, { message: "Data inválida" });

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
    startDate: dateString.optional(),
    endDate: dateString.optional(),
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