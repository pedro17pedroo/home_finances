# Correção do Formulário de Contas no Mobile

## Problemas Identificados

1. **Erro ao carregar tipos de conta**: O serviço estava tentando acessar `response.data.data` mas o backend retorna apenas `response.data`
2. **Bancos mostrando código em vez de nome**: O select estava usando `b.shortName || b.name` mas deveria usar apenas `b.name`
3. **Ordem dos campos incorreta**: A ordem não estava uniforme com o frontend web

## Correções Realizadas

### 1. Serviço de Tipos de Conta (`mobile/src/services/account-types.service.ts`)

**Antes:**
```typescript
getAll: async (): Promise<AccountType[]> => {
  const response = await api.get('/account-types');
  return response.data.data;
}
```

**Depois:**
```typescript
getAll: async (): Promise<AccountType[]> => {
  const response = await api.get('/account-types');
  // Backend retorna { status: 'success', data: [...] }
  return response.data.data || response.data;
}
```

**Correção do Import:**
```typescript
// Antes
import { api } from './api';

// Depois
import api from './api';
```

### 2. Tela de Adicionar Conta (`mobile/src/screens/accounts/AddAccountScreen.tsx`)

#### Ordem dos Campos
Alterada para corresponder ao frontend web:
1. **Nome da Conta**
2. **Banco** (primeiro)
3. **Tipo de Conta** (depois)
4. **Saldo Inicial**
5. **Cor**

#### Select de Bancos
**Antes:**
```typescript
label: b.shortName || b.name
```

**Depois:**
```typescript
label: b.name
```

#### Melhorias no Carregamento
- Adicionado console.log para debug
- Melhor tratamento de fallback para tipos de conta
- Mensagens de erro mais claras com toast
- Loading states separados para bancos e tipos de conta

#### Tratamento de Erros
```typescript
// Adicionado feedback de erro
catch (error) {
  console.error('Erro ao carregar tipos de conta:', error);
  showError('Erro ao carregar tipos de conta');
  // Fallback para tipos padrão
}
```

## Estrutura Final do Formulário

```
┌─────────────────────────────────┐
│ Nome da Conta                   │
│ [Input: Ex: Conta Corrente BAI] │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Banco                           │
│ [Select: BAI, BFA, BIC, etc]    │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Tipo de Conta                   │
│ [Select: Corrente, Poupança...] │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Saldo Inicial                   │
│ [Input: 0.00]                   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Cor                             │
│ [Color Picker Grid]             │
└─────────────────────────────────┘
```

## Uniformização com Frontend Web

A ordem dos campos agora está idêntica ao frontend web:
- ✅ Nome da Conta
- ✅ Banco (primeiro)
- ✅ Tipo de Conta (depois)
- ✅ Saldo Inicial
- ✅ Cor (mobile) / Taxa de Juros (web, condicional)

## Backend - Estrutura de Resposta

### Tipos de Conta
**Endpoint:** `GET /api/account-types`

**Resposta:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "code": "corrente",
      "name": "Conta Corrente",
      "description": null,
      "icon": null,
      "color": null,
      "isActive": true,
      "displayOrder": 1,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Bancos
**Endpoint:** `GET /api/public/banks`

**Resposta:**
```json
{
  "status": "success",
  "data": {
    "banks": [
      {
        "id": 1,
        "code": "BAI",
        "name": "Banco Angolano de Investimentos",
        "shortName": "BAI",
        "logoUrl": "/uploads/logos/bai.png"
      }
    ]
  }
}
```

## Fallbacks Implementados

### Tipos de Conta
Se a API falhar, usa tipos padrão:
- Conta Corrente
- Poupança
- Investimento
- Carteira
- Outro

### Bancos
Se a API falhar:
1. Tenta endpoint alternativo sem autenticação
2. Se falhar novamente, mostra erro mas permite continuar (banco é opcional)

## Estados de Loading

- **loadingAccountTypes**: Mostra spinner enquanto carrega tipos de conta
- **loadingBanks**: Mostra spinner enquanto carrega bancos
- Ambos com mensagens descritivas

## Validação

Campos obrigatórios:
- ✅ Nome da Conta
- ✅ Tipo de Conta

Campos opcionais:
- Banco
- Saldo Inicial (padrão: 0)
- Cor (padrão: primeira cor da paleta)

## Testes Recomendados

1. **Criar conta com todos os campos**
   - Preencher nome
   - Selecionar banco
   - Selecionar tipo
   - Definir saldo inicial
   - Escolher cor
   - Salvar

2. **Criar conta sem banco**
   - Preencher apenas nome e tipo
   - Verificar se salva corretamente

3. **Editar conta existente**
   - Abrir conta para edição
   - Verificar se campos são preenchidos
   - Alterar valores
   - Salvar

4. **Testar com API offline**
   - Desconectar da API
   - Verificar se fallbacks funcionam
   - Verificar mensagens de erro

5. **Testar loading states**
   - Verificar spinners durante carregamento
   - Verificar se formulário fica bloqueado durante salvamento

## Observações

- A ordem dos campos agora está uniforme entre mobile e web
- Os bancos mostram o nome completo em vez do código
- Tipos de conta carregam dinamicamente da API
- Fallbacks garantem que o app funcione mesmo com problemas na API
- Feedback visual claro para o usuário (loading, erros, sucesso)

## Conclusão

Todos os problemas identificados foram corrigidos:
- ✅ Tipos de conta carregam corretamente
- ✅ Bancos mostram nome em vez de código
- ✅ Ordem dos campos uniforme com frontend web
- ✅ Tratamento de erros melhorado
- ✅ Fallbacks implementados
- ✅ Feedback visual adequado
