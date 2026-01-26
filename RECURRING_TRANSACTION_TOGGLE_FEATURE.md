# Nova Funcionalidade: Tornar Transação Recorrente

## Visão Geral

Adicionada funcionalidade que permite ao usuário criar uma transação recorrente diretamente do formulário de nova transação, melhorando significativamente a experiência do usuário.

## Como Funciona

### 1. **Checkbox "Tornar esta transação recorrente"**
- Localizado no formulário de nova transação
- Quando marcado, expande campos adicionais para configurar a recorrência
- Ícone de refresh (RefreshCw) para identificação visual

### 2. **Campos de Recorrência (aparecem quando checkbox marcado)**

#### Configuração Básica:
- **Frequência**: Diária, Semanal, Mensal ou Anual
- **Intervalo**: Quantas vezes repetir (ex: a cada 2 semanas)
- **Data de Início**: Quando começar a recorrência
- **Data de Fim** (Opcional): Quando parar a recorrência

#### Configuração Avançada:
- **Limite de Execuções** (Opcional): Número máximo de vezes que deve executar
- **Canais de Notificação**:
  - App (notificação no sistema)
  - Email (enviado para o e-mail do usuário)

### 3. **Comportamento ao Salvar**

Quando o usuário clica em "Salvar":

1. **Cria a transação imediata** - A transação é registrada normalmente com a data especificada
2. **Cria a recorrência** (se checkbox marcado) - Configura o agendamento automático para futuras execuções
3. **Feedback ao usuário**:
   - Se apenas transação: "Transação criada com sucesso!"
   - Se transação + recorrência: "Transação e recorrência criadas com sucesso!"

## Benefícios para o Usuário

### ✅ **Experiência Simplificada**
- Não precisa navegar para outra página
- Tudo em um único formulário
- Fluxo natural e intuitivo

### ✅ **Economia de Tempo**
- Cria transação e recorrência em uma única ação
- Menos cliques e navegação
- Processo mais rápido

### ✅ **Flexibilidade**
- Pode criar apenas a transação (checkbox desmarcado)
- Pode criar transação + recorrência (checkbox marcado)
- Usuário tem controle total

### ✅ **Feedback Visual**
- Explicações inline sobre cada campo
- Preview do intervalo selecionado
- Info box explicando o comportamento

## Detalhes Técnicos

### Frontend
**Arquivo**: `frontend/src/features/transactions/pages/transactions-page.tsx`

**Novos Estados**:
```typescript
const [isRecurring, setIsRecurring] = useState(false);
const [recurringData, setRecurringData] = useState({
  frequency: 'monthly',
  interval: 1,
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  maxOccurrences: '',
  notifyBeforeDays: 1,
  notificationChannels: ['app'],
});
```

**Lógica de Submissão**:
1. Cria transação via `createTransactionMutation`
2. Se `isRecurring === true`, cria recorrência via `recurringTransactionsApi.create()`
3. Mostra toast apropriado
4. Reseta formulário

### Backend
Usa os endpoints existentes:
- `POST /api/transactions` - Criar transação
- `POST /api/recurring-transactions` - Criar recorrência

## Exemplos de Uso

### Caso 1: Salário Mensal
1. Usuário cria transação de receita "Salário"
2. Marca checkbox "Tornar recorrente"
3. Seleciona:
   - Frequência: Mensal
   - Intervalo: 1
   - Data de Início: 01/02/2026
   - Notificações: App + Email
4. Salva
5. **Resultado**: 
   - Transação criada para hoje
   - Recorrência configurada para repetir todo dia 1º do mês

### Caso 2: Aluguel Trimestral
1. Usuário cria transação de despesa "Aluguel"
2. Marca checkbox "Tornar recorrente"
3. Seleciona:
   - Frequência: Mensal
   - Intervalo: 3 (a cada 3 meses)
   - Data de Início: 01/02/2026
   - Limite: 4 execuções (1 ano)
4. Salva
5. **Resultado**:
   - Transação criada para hoje
   - Recorrência configurada para repetir a cada 3 meses, 4 vezes

### Caso 3: Transação Única
1. Usuário cria transação "Compra no supermercado"
2. **NÃO marca** checkbox "Tornar recorrente"
3. Salva
4. **Resultado**:
   - Apenas a transação é criada
   - Nenhuma recorrência configurada

## Interface do Usuário

### Elementos Visuais:
- ✅ Checkbox com ícone de refresh
- ✅ Texto explicativo abaixo do checkbox
- ✅ Info box azul quando campos expandem
- ✅ Preview do intervalo selecionado
- ✅ Placeholders informativos
- ✅ Textos de ajuda em cada campo

### Validações:
- Data de início é obrigatória quando recorrente
- Pelo menos um canal de notificação deve estar selecionado
- Intervalo mínimo é 1
- Limite de execuções (se preenchido) deve ser maior que 0

## Arquivos Modificados

- `frontend/src/features/transactions/pages/transactions-page.tsx`
  - Adicionado estado `isRecurring`
  - Adicionado estado `recurringData`
  - Modificado `handleSubmit` para criar recorrência
  - Modificado `resetForm` para limpar campos de recorrência
  - Adicionados imports: `RefreshCw`, `Checkbox`, `recurringTransactionsApi`
  - Adicionados campos de recorrência no formulário

## Testes Sugeridos

1. ✅ Criar transação sem marcar recorrente
2. ✅ Criar transação marcando recorrente com todos os campos
3. ✅ Criar transação recorrente sem data de fim
4. ✅ Criar transação recorrente sem limite de execuções
5. ✅ Verificar que ambas (transação + recorrência) são criadas
6. ✅ Verificar toast de sucesso apropriado
7. ✅ Verificar que formulário é resetado após salvar
8. ✅ Verificar preview do intervalo
9. ✅ Verificar validações de campos obrigatórios

## Melhorias Futuras Possíveis

- [ ] Adicionar campo "Dia da Semana" para recorrências semanais
- [ ] Adicionar campo "Dia do Mês" para recorrências mensais
- [ ] Adicionar campo "Mês do Ano" para recorrências anuais
- [ ] Preview de próximas execuções
- [ ] Opção de editar recorrência após criação
- [ ] Sugestões inteligentes baseadas em histórico

---

## Status

✅ **Implementado e Funcional**

A funcionalidade está completa e pronta para uso. O usuário agora pode criar transações recorrentes de forma muito mais intuitiva e rápida! 🎉
