# Correção: Internacionalização do Zod para Português

## Problema
Mensagens de validação aparecendo em inglês ("Required") mesmo com o app configurado em português.

## Causa
O Zod (biblioteca de validação) usa mensagens padrão em inglês. Era necessário configurar um mapa de erros personalizado em português.

## Solução Implementada

### 1. Arquivo de Configuração Global

**Arquivo:** `mobile/src/lib/zod-pt.ts`

Criado arquivo centralizado com todas as mensagens do Zod traduzidas para português:

```typescript
import { z } from 'zod';

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
        // ... mais casos
    }
  };

  z.setErrorMap(customErrorMap);
};
```

### 2. Configuração Global no App

**Arquivo:** `mobile/App.tsx`

Importado e executado no início do app:

```typescript
import { setupZodLocale } from './src/lib/zod-pt';

// Configurar mensagens do Zod em português
setupZodLocale();

export default function App() {
  // ...
}
```

### 3. Remoção de Configurações Locais

Removida configuração local do `AddTransactionScreen.tsx` já que agora está global.

## Mensagens Traduzidas

### Tipos de Erro

| Código | Inglês | Português |
|--------|--------|-----------|
| `invalid_type` (string) | "Expected string, received..." | "Campo obrigatório" |
| `invalid_type` (number) | "Expected number, received..." | "Deve ser um número" |
| `too_small` (string, min=1) | "String must contain at least 1 character(s)" | "Campo obrigatório" |
| `too_small` (string) | "String must contain at least X character(s)" | "Deve ter pelo menos X caracteres" |
| `too_small` (number) | "Number must be greater than or equal to X" | "Deve ser maior ou igual a X" |
| `too_small` (array) | "Array must contain at least X element(s)" | "Deve ter pelo menos X item(ns)" |
| `too_big` (string) | "String must contain at most X character(s)" | "Deve ter no máximo X caracteres" |
| `too_big` (number) | "Number must be less than or equal to X" | "Deve ser menor ou igual a X" |
| `too_big` (array) | "Array must contain at most X element(s)" | "Deve ter no máximo X item(ns)" |
| `invalid_string` (email) | "Invalid email" | "Email inválido" |
| `invalid_string` (url) | "Invalid url" | "URL inválida" |
| `invalid_string` (uuid) | "Invalid uuid" | "UUID inválido" |
| `invalid_enum_value` | "Invalid enum value. Expected..." | "Valor inválido. Opções válidas: ..." |
| `invalid_date` | "Invalid date" | "Data inválida" |

## Schemas Atualizados

### AddTransactionScreen

```typescript
const transactionSchema = z.object({
  amount: z.string().min(1, 'Valor é obrigatório'),
  description: z.string().optional(),
  accountId: z.number().min(1, 'Conta é obrigatória'),
  category: z.string().min(1, 'Categoria é obrigatória'),
});
```

### transaction.schema.ts

```typescript
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
```

## Benefícios

1. **Consistência**: Todas as mensagens de validação em português
2. **Centralização**: Um único lugar para gerenciar traduções
3. **Manutenibilidade**: Fácil adicionar novos tipos de erro
4. **Reutilização**: Todos os formulários usam as mesmas mensagens
5. **UX Melhorada**: Usuário entende claramente os erros

## Antes vs Depois

### Antes
```
❌ Required
❌ String must contain at least 1 character(s)
❌ Expected string, received undefined
❌ Invalid email
```

### Depois
```
✅ Campo obrigatório
✅ Deve ter pelo menos 1 caracteres
✅ Campo obrigatório
✅ Email inválido
```

## Uso em Novos Formulários

Para criar novos formulários com validação em português, basta usar o Zod normalmente:

```typescript
import { z } from 'zod';

const mySchema = z.object({
  name: z.string().min(1), // Automaticamente: "Campo obrigatório"
  email: z.string().email(), // Automaticamente: "Email inválido"
  age: z.number().min(18), // Automaticamente: "Deve ser maior ou igual a 18"
});
```

## Mensagens Personalizadas

Você ainda pode sobrescrever mensagens específicas:

```typescript
const mySchema = z.object({
  name: z.string().min(1, 'Por favor, informe seu nome'),
  email: z.string().email('Digite um email válido'),
});
```

## Tipos de Validação Suportados

- ✅ Campos obrigatórios
- ✅ Tamanho mínimo/máximo (string, number, array)
- ✅ Tipos inválidos
- ✅ Email, URL, UUID
- ✅ Enums
- ✅ Datas
- ✅ Validações customizadas (refine)

## Testes Recomendados

1. **Campo vazio**
   - Deixar campo obrigatório vazio
   - Verificar mensagem: "Campo obrigatório"

2. **Email inválido**
   - Digitar email sem @
   - Verificar mensagem: "Email inválido"

3. **Tamanho mínimo**
   - Digitar menos caracteres que o mínimo
   - Verificar mensagem: "Deve ter pelo menos X caracteres"

4. **Tamanho máximo**
   - Digitar mais caracteres que o máximo
   - Verificar mensagem: "Deve ter no máximo X caracteres"

5. **Número inválido**
   - Digitar texto em campo numérico
   - Verificar mensagem: "Deve ser um número"

## Observações

- A configuração é aplicada globalmente no `App.tsx`
- Todas as telas que usam Zod herdam automaticamente as traduções
- Mensagens personalizadas nos schemas têm prioridade sobre as globais
- A configuração é executada antes de qualquer componente ser renderizado

## Melhorias Futuras

- [ ] Adicionar suporte para múltiplos idiomas (i18n)
- [ ] Criar arquivo de traduções separado (pt.json, en.json)
- [ ] Detectar idioma do dispositivo automaticamente
- [ ] Adicionar mais tipos de validação (CPF, telefone, etc)
- [ ] Criar helper functions para validações comuns

## Conclusão

Agora todas as mensagens de validação do Zod aparecem em português, proporcionando uma experiência consistente e profissional para os usuários brasileiros e angolanos do aplicativo.
