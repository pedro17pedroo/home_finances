import { z } from "zod";

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
    dueDate: z.string()
      .datetime("Data de vencimento deve ser uma data válida")
      .optional(),
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
    dueDate: z.string()
      .datetime("Data de vencimento deve ser uma data válida")
      .optional(),
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
    startDate: z.string()
      .datetime("Data de início deve ser uma data válida")
      .optional(),
    endDate: z.string()
      .datetime("Data de fim deve ser uma data válida")
      .optional(),
  }).optional()
});