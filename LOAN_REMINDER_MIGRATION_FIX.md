# Fix: Migração de Campos de Contato - Empréstimos e Dívidas

## Problema
Ao tentar criar empréstimos/dívidas, o sistema apresentava erro:
```
column "borrower_phone" does not exist
column "borrower_email" does not exist
column "creditor_phone" does not exist
column "creditor_email" does not exist
```

## Causa
A migração SQL não havia sido executada no banco de dados.

## Solução Aplicada

### 1. ✅ Migração SQL Executada
```bash
PGPASSWORD=postgres psql -h localhost -U postgres -d personal_finance \
  -f migrations/add_contact_info_to_loans_debts.sql
```

**Resultado:**
```
ALTER TABLE
ALTER TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
COMMENT
COMMENT
COMMENT
COMMENT
```

### 2. ✅ Serviços Atualizados

#### LoanService
**Arquivo**: `backend/src/domain/services/loan.service.ts`

**Mudanças**:
- Interface `CreateLoanRequest` atualizada com `borrowerPhone` e `borrowerEmail`
- Método `createLoan()` atualizado para incluir os novos campos

```typescript
export interface CreateLoanRequest {
  accountId: number;
  amount: number;
  borrower: string;
  borrowerPhone?: string;  // ✅ NOVO
  borrowerEmail?: string;  // ✅ NOVO
  interestRate?: number;
  dueDate?: string;
  description?: string;
}
```

#### DebtService
**Arquivo**: `backend/src/domain/services/debt.service.ts`

**Mudanças**:
- Interface `CreateDebtRequest` atualizada com `creditorPhone` e `creditorEmail`
- Método `createDebt()` atualizado para incluir os novos campos

```typescript
export interface CreateDebtRequest {
  accountId: number;
  amount: number;
  creditor: string;
  creditorPhone?: string;  // ✅ NOVO
  creditorEmail?: string;  // ✅ NOVO
  interestRate?: number;
  dueDate?: string;
  description?: string;
}
```

### 3. ✅ Modal de Criação Ajustado

**Arquivo**: `frontend/src/features/loans/pages/loans-page.tsx`

**Mudanças**:
- Altura dos modais ajustada para melhor visualização
- Adicionado `overflow-y-auto` para scroll quando necessário
- Adicionado `max-h-[90vh]` para limitar altura máxima
- Adicionado `my-8` para margem vertical

**Modais atualizados**:
- ✅ Modal de Criação
- ✅ Modal de Pagamento
- ✅ Modal de Cancelamento
- ✅ Modal de Lembrete

## Próximos Passos

### ⚠️ IMPORTANTE: Reiniciar o Backend
Para que as mudanças tenham efeito, você precisa **reiniciar o servidor backend**:

```bash
cd backend
npm run dev
```

Ou se estiver usando PM2:
```bash
pm2 restart backend
```

### Testar a Funcionalidade
1. Acesse a página de Empréstimos e Dívidas
2. Clique em "Novo Empréstimo"
3. Preencha os campos incluindo telefone e/ou email
4. Clique em "Criar"
5. Verifique se o empréstimo foi criado com sucesso
6. Teste o botão "Enviar Lembrete"

## Status Final

✅ Migração SQL executada com sucesso  
✅ Serviços atualizados (LoanService e DebtService)  
✅ Interfaces TypeScript atualizadas  
✅ Altura dos modais ajustada  
✅ Código sem erros de compilação  
⏳ **Aguardando reinício do backend**

## Verificação

Após reiniciar o backend, verifique os logs para confirmar que não há mais erros relacionados às colunas de contato.
