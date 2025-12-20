import { z } from "zod";

export const createTransactionSchema = z.object({
  body: z.object({
    accountId: z.number().positive("Account ID deve ser positivo"),
    amount: z.number().positive("Valor deve ser positivo"),
    type: z.enum(['receita', 'despesa'], {
      errorMap: () => ({ message: "Tipo deve ser 'receita' ou 'despesa'" }),
    }),
    category: z.string().min(1, "Categoria é obrigatória"),
    description: z.string().optional(),
    date: z.string().datetime("Data inválida"),
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
    date: z.string().datetime().optional(),
    isRecurring: z.boolean().optional(),
    recurringFrequency: z.string().optional(),
  }),
});

export const getTransactionsSchema = z.object({
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    type: z.enum(['receita', 'despesa']).optional(),
    accountId: z.string().transform(Number).optional(),
  }),
});

export const transactionParamsSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
});