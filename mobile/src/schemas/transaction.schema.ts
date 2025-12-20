import { z } from 'zod';

export const transactionSchema = z.object({
  type: z.enum(['receita', 'despesa'], {
    required_error: 'Tipo é obrigatório',
  }),
  description: z
    .string()
    .min(2, 'Descrição deve ter pelo menos 2 caracteres')
    .max(100, 'Descrição deve ter no máximo 100 caracteres'),
  amount: z
    .string()
    .min(1, 'Valor é obrigatório')
    .refine((val) => {
      const num = parseFloat(val.replace(/[^\d.,]/g, '').replace(',', '.'));
      return !isNaN(num) && num > 0;
    }, 'Valor deve ser maior que zero'),
  categoryId: z
    .string()
    .min(1, 'Categoria é obrigatória'),
  accountId: z
    .string()
    .min(1, 'Conta é obrigatória'),
  date: z
    .string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Data deve estar no formato DD/MM/YYYY'),
});

export type TransactionFormData = z.infer<typeof transactionSchema>;