import { z } from "zod";

// Custom date validator that accepts both ISO datetime and simple date formats
const dateString = z.string().refine((val) => {
  // Accept ISO datetime format (2025-12-23T00:00:00.000Z)
  // or simple date format (2025-12-23)
  const isoDatetime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  const simpleDate = /^\d{4}-\d{2}-\d{2}$/;
  return isoDatetime.test(val) || simpleDate.test(val);
}, { message: "Data inválida" });

export const createTransactionSchema = z.object({
  body: z.object({
    accountId: z.number().positive("Account ID deve ser positivo"),
    amount: z.number().positive("Valor deve ser positivo"),
    type: z.enum(['receita', 'despesa'], {
      errorMap: () => ({ message: "Tipo deve ser 'receita' ou 'despesa'" }),
    }),
    category: z.string().min(1, "Categoria é obrigatória"),
    description: z.string().optional(),
    date: dateString,
    isRecurring: z.boolean().optional(),
    recurringFrequency: z.string().optional(),
  }),
});

export const updateTransactionSchema = z.object({
  body: z.object({
    accountId: z.number().positive().optional(),
    amount: z.number().positive().optional(),
    type: z.enum(['receita', 'despesa']).optional(),
    category: z.string().min(1).optional(),
    description: z.string().optional(),
    date: dateString.optional(),
    isRecurring: z.boolean().optional(),
    recurringFrequency: z.string().optional(),
  }),
});

export const getTransactionsSchema = z.object({
  query: z.object({
    startDate: dateString.optional(),
    endDate: dateString.optional(),
    type: z.enum(['receita', 'despesa']).optional(),
    accountId: z.string().transform(Number).optional(),
  }),
});

export const transactionParamsSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
});