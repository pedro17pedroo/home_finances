# Correção: Nome do Banco nas Contas

## Problema
Contas criadas no mobile não estavam exibindo o nome do banco, enquanto contas criadas no frontend web exibiam corretamente.

## Causa Raiz
O repositório de contas no backend não estava fazendo JOIN com a tabela `banks`, retornando apenas o `bankId` sem as informações do banco.

## Solução Implementada

### 1. Backend - Repositório de Contas

#### Adicionado JOIN com tabela banks
**Arquivo:** `backend/src/domain/repositories/account.repository.ts`

**Antes:**
```typescript
static async findByUserId(userId: number): Promise<Account[]> {
  return db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .orderBy(accounts.name);
}
```

**Depois:**
```typescript
static async findByUserId(userId: number): Promise<AccountWithBank[]> {
  return db
    .select({
      // Account fields
      id: accounts.id,
      userId: accounts.userId,
      organizationId: accounts.organizationId,
      name: accounts.name,
      type: accounts.type,
      bank: accounts.bank,
      bankId: accounts.bankId,
      balance: accounts.balance,
      color: accounts.color,
      interestRate: accounts.interestRate,
      createdAt: accounts.createdAt,
      updatedAt: accounts.updatedAt,
      // Bank fields (from JOIN)
      bankName: banks.name,
      bankCode: banks.code,
      bankLogoUrl: banks.logoUrl,
    })
    .from(accounts)
    .leftJoin(banks, eq(accounts.bankId, banks.id))
    .where(eq(accounts.userId, userId))
    .orderBy(accounts.name);
}
```

#### Novo tipo AccountWithBank
```typescript
export interface AccountWithBank extends Account {
  bankName?: string | null;
  bankCode?: string | null;
  bankLogoUrl?: string | null;
}
```

#### Métodos atualizados com JOIN:
- ✅ `findById()`
- ✅ `findByUserId()`
- ✅ `findByOrganizationId()`
- ✅ `findByOrganizationOrUser()`
- ✅ `findByUserIdAndType()`
- ✅ `findByOrganizationIdAndType()`

### 2. Backend - Serviço de Contas

**Arquivo:** `backend/src/domain/services/account.service.ts`

Atualizado para usar `AccountWithBank`:
```typescript
import { AccountRepository, AccountWithBank } from "../repositories/account.repository.js";

export class AccountService {
  static async getAccounts(ctx: AccountContext): Promise<AccountWithBank[]> {
    // ...
  }
  
  static async getUserAccounts(userId: number): Promise<AccountWithBank[]> {
    // ...
  }
  
  static async getSavingsAccounts(userId: number, organizationId?: number | null): Promise<AccountWithBank[]> {
    // ...
  }
  
  static async getAccountById(id: number, userId: number, organizationId?: number | null): Promise<AccountWithBank> {
    // ...
  }
}
```

### 3. Mobile - Tipo Account

**Arquivo:** `mobile/src/types/index.ts`

Adicionados novos campos:
```typescript
export interface Account {
  id: number;
  name: string;
  type: 'corrente' | 'poupanca' | 'investimento' | 'carteira' | 'outro';
  bank?: string; // Legacy field - nome do banco como string
  bankId?: number; // ID do banco na tabela banks
  bankName?: string; // Nome do banco do join ✨ NOVO
  bankCode?: string; // Código do banco do join ✨ NOVO
  bankLogoUrl?: string; // URL do logo do banco do join ✨ NOVO
  balance: string;
  // ... outros campos
}
```

### 4. Mobile - Tela de Contas

**Arquivo:** `mobile/src/screens/accounts/AccountsScreen.tsx`

**Antes:**
```typescript
{account.bank && (
  <Text style={[styles.accountBank, { color: colors.textSecondary }]}>
    {account.bank}
  </Text>
)}
```

**Depois:**
```typescript
{(account.bankName || account.bank) && (
  <Text style={[styles.accountBank, { color: colors.textSecondary }]}>
    {account.bankName || account.bank}
  </Text>
)}
```

## Estrutura de Dados

### Tabela accounts
```sql
CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  organization_id INTEGER,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  bank VARCHAR(255), -- Campo legacy
  bank_id INTEGER REFERENCES banks(id), -- FK para tabela banks
  balance DECIMAL(15,2) DEFAULT 0,
  color VARCHAR(20),
  interest_rate DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabela banks
```sql
CREATE TABLE banks (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(50),
  logo_url VARCHAR(500),
  swift_code VARCHAR(20),
  country VARCHAR(2) DEFAULT 'AO',
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Resposta da API

### Antes (sem JOIN)
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "name": "BFA",
      "type": "corrente",
      "bankId": 2,
      "balance": "0.00"
    }
  ]
}
```

### Depois (com JOIN)
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "name": "BFA",
      "type": "corrente",
      "bankId": 2,
      "bankName": "Banco de Fomento Angola S.A.",
      "bankCode": "BFA",
      "bankLogoUrl": "/uploads/logos/bfa.png",
      "balance": "0.00"
    }
  ]
}
```

## Compatibilidade

### Retrocompatibilidade
- ✅ Campo `bank` (string) mantido para contas antigas
- ✅ Fallback `account.bankName || account.bank` no mobile
- ✅ Contas criadas antes da migração continuam funcionando

### Migração de Dados
Contas antigas que têm `bank` como string podem ser migradas:
```sql
-- Exemplo de migração (se necessário)
UPDATE accounts 
SET bank_id = (SELECT id FROM banks WHERE name = accounts.bank)
WHERE bank_id IS NULL AND bank IS NOT NULL;
```

## Benefícios

1. **Dados Normalizados**: Informações do banco centralizadas na tabela `banks`
2. **Consistência**: Mesmo nome do banco em todas as contas
3. **Flexibilidade**: Fácil adicionar novos campos (logo, swift code, etc)
4. **Performance**: JOIN eficiente com índice em `bankId`
5. **Manutenção**: Atualizar nome do banco em um único lugar

## Campos Disponíveis

Agora cada conta retorna:
- ✅ `bankId` - ID do banco
- ✅ `bankName` - Nome completo do banco
- ✅ `bankCode` - Código do banco (ex: BAI, BFA, BIC)
- ✅ `bankLogoUrl` - URL do logo do banco
- ✅ `bank` - Campo legacy (para compatibilidade)

## Uso Futuro

Com os novos campos, é possível:
- Exibir logo do banco nas contas
- Filtrar contas por banco
- Estatísticas por banco
- Validações específicas por banco
- Integração com APIs bancárias

## Testes Realizados

- ✅ Criar conta no mobile com banco selecionado
- ✅ Verificar se nome do banco aparece na lista
- ✅ Criar conta no web com banco selecionado
- ✅ Verificar se nome do banco aparece na lista
- ✅ Contas antigas (sem bankId) continuam funcionando
- ✅ Editar conta e alterar banco

## Observações

- O JOIN é LEFT JOIN, então contas sem banco (bankId = null) continuam funcionando
- O campo `bank` (string) é mantido para retrocompatibilidade
- O mobile usa fallback: `bankName || bank` para garantir exibição
- Todos os métodos do repositório foram atualizados com o JOIN

## Conclusão

O problema foi resolvido adicionando JOIN com a tabela `banks` em todos os métodos de busca do repositório de contas. Agora, tanto contas criadas no mobile quanto no web exibem corretamente o nome do banco.
