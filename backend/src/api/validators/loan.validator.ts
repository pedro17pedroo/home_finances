import { z } from "zod";

// Custom date validator that accepts both ISO datetime and simple date formats
const dateString = z.string().refine((val) => {
  // Accept ISO datetime format (2025-12-23T00:00:00.000Z)
  // or simple date format (2025-12-23)
  const isoDatetime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  const simpleDate = /^\d{4}-\d{2}-\d{2}$/;
  return isoDatetime.test(val) || simpleDate.test(val);
}, { message: "Data inválida" });

export const createLoanSchema = z.object({
  body: z.object({
    accountId: z.number()
      .int("ID da conta deve ser um número inteiro")
      .positive("ID da conta deve ser positivo"),
    amount: z.number()
      .positive("Valor deve ser positivo")
      .max(1000000000, "Valor muito alto"),
    borrower: z.string()
      .min(1, "Nome do devedor é obrigatório")
      .max(255, "Nome do devedor muito longo"),
    interestRate: z.number()
      .min(0, "Taxa de juros não pode ser negativa")
      .max(100, "Taxa de juros não pode ser maior que 100%")
      .optional(),
    dueDate: dateString.optional(),
    description: z.string()
      .max(500, "Descrição muito longa")
      .optional()
  })
});

export const updateLoanSchema = z.object({
  body: z.object({
    amount: z.number()
      .positive("Valor deve ser positivo")
      .max(1000000000, "Valor muito alto")
      .optional(),
    borrower: z.string()
      .min(1, "Nome do devedor é obrigatório")
      .max(255, "Nome do devedor muito longo")
      .optional(),
    interestRate: z.number()
      .min(0, "Taxa de juros não pode ser negativa")
      .max(100, "Taxa de juros não pode ser maior que 100%")
      .optional(),
    dueDate: dateString.optional(),
    status: z.enum(['pendente', 'pago', 'cancelado'], {
      errorMap: () => ({ message: "Status deve ser: pendente, pago ou cancelado" })
    }).optional(),
    description: z.string()
      .max(500, "Descrição muito longa")
      .optional()
  })
});

export const loanIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID do empréstimo deve ser um número válido"),
  })
});

export const loanFiltersSchema = z.object({
  query: z.object({
    status: z.enum(['pendente', 'pago', 'cancelado']).optional(),
    startDate: dateString.optional(),
    endDate: dateString.optional(),
  }).optional()
});