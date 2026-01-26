# Mobile Implementation Roadmap

## 🎯 Objetivo

Implementar no mobile as funcionalidades já desenvolvidas no frontend web:
1. Transações Recorrentes
2. Gestão de Orçamentos
3. Lembretes de Pagamento (Loans/Debts)
4. Sistema de Notificações

---

## 📋 Status Atual

### ✅ Já Implementado (Estrutura Básica)
- `mobile/src/services/recurring-transactions.service.ts`
- `mobile/src/services/budget.service.ts`
- `mobile/src/services/notifications.service.ts`
- `mobile/src/services/account-types.service.ts`
- `mobile/src/screens/recurring/RecurringTransactionsScreen.tsx`
- `mobile/src/screens/recurring/RecurringTransactionFormScreen.tsx`
- `mobile/src/screens/budgets/BudgetListScreen.tsx`
- `mobile/src/screens/budgets/BudgetFormScreen.tsx`
- `mobile/src/screens/budgets/BudgetDetailScreen.tsx`
- `mobile/src/hooks/useNotifications.ts`
- `mobile/src/lib/zod-pt.ts`

### ⏳ Precisa Implementar
- Integração completa dos serviços
- Navegação entre telas
- Formulários completos
- Validações
- Estados de loading/error
- Notificações push
- Lembretes de pagamento

---

## 🗺️ Roadmap de Implementação

### Fase 1: Transações Recorrentes (Prioridade Alta)

#### 1.1 RecurringTransactionsScreen
**Arquivo**: `mobile/src/screens/recurring/RecurringTransactionsScreen.tsx`

**Tarefas**:
- [ ] Implementar listagem de transações recorrentes
- [ ] Adicionar filtros (ativas, inativas, todas)
- [ ] Adicionar botão de criar nova
- [ ] Implementar toggle ativar/desativar
- [ ] Adicionar botão de executar manualmente
- [ ] Adicionar navegação para histórico
- [ ] Implementar pull-to-refresh
- [ ] Adicionar estados de loading/error/empty

**Componentes necessários**:
```typescript
- RecurringTransactionCard
- FilterButtons
- EmptyState
- LoadingSpinner
```

#### 1.2 RecurringTransactionFormScreen
**Arquivo**: `mobile/src/screens/recurring/RecurringTransactionFormScreen.tsx`

**Tarefas**:
- [ ] Implementar formulário completo
- [ ] Adicionar seleção de conta
- [ ] Adicionar seleção de categoria
- [ ] Adicionar seleção de frequência
- [ ] Adicionar campos de intervalo
- [ ] Adicionar date pickers (início/fim)
- [ ] Adicionar limite de execuções
- [ ] Adicionar canais de notificação
- [ ] Implementar validação com Zod
- [ ] Adicionar preview do agendamento
- [ ] Implementar submit

**Validações**:
```typescript
- Valor > 0
- Conta selecionada
- Categoria selecionada
- Frequência válida
- Data início < Data fim
- Intervalo > 0
```

#### 1.3 RecurringTransactionHistoryScreen (NOVO)
**Arquivo**: `mobile/src/screens/recurring/RecurringTransactionHistoryScreen.tsx`

**Tarefas**:
- [ ] Criar tela de histórico
- [ ] Listar execuções passadas
- [ ] Mostrar status (sucesso/erro)
- [ ] Mostrar data de execução
- [ ] Mostrar valor executado
- [ ] Adicionar filtro por período
- [ ] Implementar paginação

---

### Fase 2: Gestão de Orçamentos (Prioridade Alta)

#### 2.1 BudgetListScreen
**Arquivo**: `mobile/src/screens/budgets/BudgetListScreen.tsx`

**Tarefas**:
- [ ] Implementar listagem de orçamentos
- [ ] Adicionar cards com progresso visual
- [ ] Adicionar filtros (ativos, arquivados, período)
- [ ] Mostrar percentual usado
- [ ] Mostrar alertas configurados
- [ ] Adicionar botão de criar novo
- [ ] Implementar navegação para detalhes
- [ ] Adicionar pull-to-refresh
- [ ] Implementar estados de loading/error/empty

**Componentes necessários**:
```typescript
- BudgetCard (com progress bar)
- FilterButtons
- StatusBadge
- EmptyState
```

#### 2.2 BudgetFormScreen
**Arquivo**: `mobile/src/screens/budgets/BudgetFormScreen.tsx`

**Tarefas**:
- [ ] Implementar formulário multi-step
- [ ] Step 1: Informações básicas (categoria, valor, período)
- [ ] Step 2: Configuração de alertas
- [ ] Step 3: Revisão e confirmação
- [ ] Adicionar seleção de categoria
- [ ] Adicionar input de valor
- [ ] Adicionar seleção de período
- [ ] Adicionar date pickers para período custom
- [ ] Implementar configuração de alertas
- [ ] Adicionar validação com Zod
- [ ] Implementar submit

**Validações**:
```typescript
- Valor > 0
- Categoria selecionada
- Período válido
- Alertas válidos (threshold > 0)
- Data início < Data fim (custom)
```

#### 2.3 BudgetDetailScreen
**Arquivo**: `mobile/src/screens/budgets/BudgetDetailScreen.tsx`

**Tarefas**:
- [ ] Mostrar informações do orçamento
- [ ] Mostrar progresso visual (circular/linear)
- [ ] Mostrar gasto atual vs limite
- [ ] Mostrar percentual usado
- [ ] Listar alertas configurados
- [ ] Listar transações do período
- [ ] Adicionar botão de editar
- [ ] Adicionar botão de arquivar
- [ ] Adicionar botão de excluir
- [ ] Mostrar histórico de períodos anteriores

**Componentes necessários**:
```typescript
- ProgressCircle
- ProgressBar
- AlertCard
- TransactionList
- HistoryChart
```

---

### Fase 3: Lembretes de Pagamento (Prioridade Média)

#### 3.1 LoansScreen (Atualizar)
**Arquivo**: `mobile/src/screens/loans/LoansScreen.tsx`

**Tarefas**:
- [ ] Adicionar campos de contato no formulário
- [ ] Adicionar campo de telefone
- [ ] Adicionar campo de email
- [ ] Adicionar info box sobre lembretes
- [ ] Adicionar botão "Enviar Lembrete" nos cards
- [ ] Implementar modal de lembrete
- [ ] Adicionar opção de mensagem personalizada
- [ ] Mostrar preview da mensagem
- [ ] Mostrar canais disponíveis (Email/SMS)
- [ ] Implementar envio de lembrete

**Modal de Lembrete**:
```typescript
- Informações do destinatário
- Valor do empréstimo
- Data de vencimento
- Checkbox mensagem personalizada
- Textarea para mensagem
- Preview da mensagem padrão
- Botões: Cancelar / Enviar
```

#### 3.2 DebtsScreen (Atualizar)
**Arquivo**: `mobile/src/screens/debts/DebtsScreen.tsx`

**Tarefas**:
- [ ] Mesmas tarefas do LoansScreen
- [ ] Adaptar para dívidas (credor em vez de devedor)

---

### Fase 4: Sistema de Notificações (Prioridade Média)

#### 4.1 NotificationsScreen (Atualizar)
**Arquivo**: `mobile/src/screens/notifications/NotificationsScreen.tsx`

**Tarefas**:
- [ ] Implementar listagem completa
- [ ] Adicionar filtros (todas, não lidas, orçamentos, geral)
- [ ] Mostrar ícones por tipo
- [ ] Mostrar metadata (valores, percentuais)
- [ ] Adicionar botão "Marcar todas como lidas"
- [ ] Implementar marcar como lida ao clicar
- [ ] Adicionar action buttons
- [ ] Implementar navegação para páginas relacionadas
- [ ] Adicionar pull-to-refresh
- [ ] Implementar estados de loading/error/empty

**Componentes necessários**:
```typescript
- NotificationCard
- FilterButtons
- NotificationIcon
- MetadataDisplay
- EmptyState
```

#### 4.2 Notificações Push (NOVO)
**Arquivo**: `mobile/src/services/push-notifications.service.ts`

**Tarefas**:
- [ ] Configurar Expo Notifications
- [ ] Implementar registro de token
- [ ] Implementar recebimento de notificações
- [ ] Implementar navegação ao clicar
- [ ] Adicionar badge no ícone do app
- [ ] Implementar notificações locais
- [ ] Adicionar sons e vibração
- [ ] Implementar agendamento de notificações

#### 4.3 Badge de Notificações (NOVO)
**Arquivo**: `mobile/src/components/NotificationBadge.tsx`

**Tarefas**:
- [ ] Criar componente de badge
- [ ] Mostrar contador de não lidas
- [ ] Atualizar em tempo real
- [ ] Adicionar no header da navegação

---

### Fase 5: Melhorias e Polimento (Prioridade Baixa)

#### 5.1 Validações e Feedback
- [ ] Adicionar validações em todos os formulários
- [ ] Implementar mensagens de erro claras
- [ ] Adicionar toasts de sucesso/erro
- [ ] Implementar loading states
- [ ] Adicionar skeleton loaders

#### 5.2 Offline Support
- [ ] Implementar cache de dados
- [ ] Adicionar sincronização offline
- [ ] Mostrar indicador de conexão
- [ ] Implementar retry automático

#### 5.3 Performance
- [ ] Implementar lazy loading
- [ ] Otimizar renderização de listas
- [ ] Adicionar memoization
- [ ] Implementar virtual scrolling

#### 5.4 Acessibilidade
- [ ] Adicionar labels para screen readers
- [ ] Implementar navegação por teclado
- [ ] Adicionar contraste adequado
- [ ] Testar com VoiceOver/TalkBack

---

## 📦 Dependências Necessárias

### Já Instaladas
```json
{
  "@react-navigation/native": "^6.x",
  "@react-navigation/stack": "^6.x",
  "react-native-gesture-handler": "^2.x",
  "react-native-reanimated": "^3.x",
  "axios": "^1.x",
  "zod": "^3.x"
}
```

### A Instalar
```bash
# Notificações Push
expo install expo-notifications

# Date Picker
expo install @react-native-community/datetimepicker

# Charts (para orçamentos)
npm install react-native-chart-kit

# Progress Circle
npm install react-native-circular-progress

# Async Storage (cache)
expo install @react-native-async-storage/async-storage
```

---

## 🎨 Design System

### Cores
```typescript
const colors = {
  // Recurring Transactions
  recurring: {
    active: '#10b981',
    inactive: '#6b7280',
    background: '#ecfdf5',
  },
  
  // Budgets
  budget: {
    safe: '#10b981',      // < 70%
    warning: '#f59e0b',   // 70-90%
    danger: '#ef4444',    // > 90%
    exceeded: '#dc2626',  // > 100%
  },
  
  // Notifications
  notification: {
    info: '#3b82f6',
    warning: '#f59e0b',
    error: '#ef4444',
    success: '#10b981',
  },
  
  // Loans/Debts
  loan: '#f97316',
  debt: '#ef4444',
};
```

### Componentes Reutilizáveis
```typescript
// Já existentes
- Button
- Input
- Card
- Badge
- LoadingSpinner
- EmptyState

// A criar
- ProgressBar
- ProgressCircle
- FilterButtons
- DatePicker
- TimePicker
- Checkbox
- Switch
- Modal
- BottomSheet
```

---

## 🧪 Testes

### Unit Tests
```typescript
// Serviços
- recurring-transactions.service.test.ts
- budget.service.test.ts
- notifications.service.test.ts

// Hooks
- useNotifications.test.ts
- useRecurringTransactions.test.ts
- useBudgets.test.ts

// Componentes
- RecurringTransactionCard.test.tsx
- BudgetCard.test.tsx
- NotificationCard.test.tsx
```

### Integration Tests
```typescript
// Fluxos completos
- create-recurring-transaction.test.ts
- create-budget.test.ts
- send-loan-reminder.test.ts
- mark-notification-read.test.ts
```

---

## 📝 Checklist de Implementação

### Transações Recorrentes
- [ ] RecurringTransactionsScreen completa
- [ ] RecurringTransactionFormScreen completa
- [ ] RecurringTransactionHistoryScreen criada
- [ ] Serviço integrado
- [ ] Navegação configurada
- [ ] Testes implementados

### Orçamentos
- [ ] BudgetListScreen completa
- [ ] BudgetFormScreen completa
- [ ] BudgetDetailScreen completa
- [ ] Serviço integrado
- [ ] Notificações implementadas
- [ ] Navegação configurada
- [ ] Testes implementados

### Lembretes de Pagamento
- [ ] Campos de contato adicionados
- [ ] Botão de lembrete implementado
- [ ] Modal de lembrete criado
- [ ] Integração com API
- [ ] Testes implementados

### Notificações
- [ ] NotificationsScreen completa
- [ ] Push notifications configuradas
- [ ] Badge implementado
- [ ] Navegação por notificação
- [ ] Testes implementados

---

## 🚀 Ordem de Implementação Recomendada

1. **Semana 1**: Transações Recorrentes
   - Dia 1-2: RecurringTransactionsScreen
   - Dia 3-4: RecurringTransactionFormScreen
   - Dia 5: RecurringTransactionHistoryScreen + Testes

2. **Semana 2**: Orçamentos
   - Dia 1-2: BudgetListScreen
   - Dia 3-4: BudgetFormScreen
   - Dia 5: BudgetDetailScreen + Testes

3. **Semana 3**: Lembretes e Notificações
   - Dia 1-2: Lembretes de Pagamento
   - Dia 3-4: Sistema de Notificações
   - Dia 5: Push Notifications + Testes

4. **Semana 4**: Polimento e Testes
   - Dia 1-2: Melhorias de UX
   - Dia 3-4: Testes completos
   - Dia 5: Documentação e deploy

---

## 🎉 Resultado Esperado

Ao final da implementação, o app mobile terá:

✅ Paridade completa com o frontend web  
✅ Todas as funcionalidades implementadas  
✅ Notificações push funcionando  
✅ Offline support básico  
✅ Performance otimizada  
✅ Testes completos  
✅ Documentação atualizada  

**Pronto para produção!** 🚀
