import { z } from 'zod';

/**
 * Configuração global do Zod para mensagens em português
 */
export const setupZodLocale = () => {
  const customErrorMap: z.ZodErrorMap = (issue, ctx) => {
    switch (issue.code) {
      case z.ZodIssueCode.invalid_type:
        if (issue.expected === 'string') {
          return { message: 'Campo obrigatório' };
        }
        if (issue.expected === 'number') {
          return { message: 'Deve ser um número' };
        }
        return { message: 'Tipo inválido' };

      case z.ZodIssueCode.too_small:
        if (issue.type === 'string') {
          if (issue.minimum === 1) {
            return { message: 'Campo obrigatório' };
          }
          return { message: `Deve ter pelo menos ${issue.minimum} caracteres` };
        }
        if (issue.type === 'number') {
          return { message: `Deve ser maior ou igual a ${issue.minimum}` };
        }
        if (issue.type === 'array') {
          return { message: `Deve ter pelo menos ${issue.minimum} item(ns)` };
        }
        return { message: 'Valor muito pequeno' };

      case z.ZodIssueCode.too_big:
        if (issue.type === 'string') {
          return { message: `Deve ter no máximo ${issue.maximum} caracteres` };
        }
        if (issue.type === 'number') {
          return { message: `Deve ser menor ou igual a ${issue.maximum}` };
        }
        if (issue.type === 'array') {
          return { message: `Deve ter no máximo ${issue.maximum} item(ns)` };
        }
        return { message: 'Valor muito grande' };

      case z.ZodIssueCode.invalid_string:
        if (issue.validation === 'email') {
          return { message: 'Email inválido' };
        }
        if (issue.validation === 'url') {
          return { message: 'URL inválida' };
        }
        if (issue.validation === 'uuid') {
          return { message: 'UUID inválido' };
        }
        return { message: 'Formato inválido' };

      case z.ZodIssueCode.invalid_enum_value:
        return { message: 'Valor inválido. Opções válidas: ' + issue.options.join(', ') };

      case z.ZodIssueCode.invalid_date:
        return { message: 'Data inválida' };

      case z.ZodIssueCode.custom:
        return { message: issue.message || 'Valor inválido' };

      default:
        return { message: ctx.defaultError };
    }
  };

  z.setErrorMap(customErrorMap);
};

export default setupZodLocale;
