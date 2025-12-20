import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    emailOrPhone: z.string().min(1, "Email ou telefone é obrigatório"),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email("Email inválido").optional(),
    phone: z.string().min(9, "Telefone deve ter pelo menos 9 dígitos").optional(),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    firstName: z.string().min(1, "Nome é obrigatório"),
    lastName: z.string().min(1, "Sobrenome é obrigatório"),
    planType: z.enum(['basic', 'premium', 'enterprise']).optional(),
  }).refine(data => data.email || data.phone, {
    message: "Email ou telefone é obrigatório",
    path: ["emailOrPhone"]
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(9).optional(),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(6, "Senha atual é obrigatória"),
    newPassword: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres"),
  }),
});