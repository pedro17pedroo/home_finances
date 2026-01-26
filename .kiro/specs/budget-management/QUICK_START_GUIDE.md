# Budget Management - Guia Rápido de Uso 🚀

Este guia fornece instruções rápidas para começar a usar o sistema de gerenciamento de orçamentos.

---

## 📱 Mobile App - Como Usar

### Acessar Orçamentos
1. Abra o app mobile
2. No Dashboard, procure por um botão/link para "Orçamentos" (ou navegue diretamente)
3. Ou navegue para: `BudgetList` screen

### Criar um Orçamento
1. Na tela de lista de orçamentos, toque no botão flutuante (+)
2. Preencha os campos:
   - **Categoria:** ID da categoria de gastos
   - **Valor:** Quanto você quer gastar
   - **Período:** Escolha entre diário, semanal, mensal, anual ou personalizado
   - **Datas personalizadas:** Se escolher "personalizado", selecione início e fim
   - **Status:** Ative ou desative o orçamento
3. Toque em "Criar Orçamento"

### Visualizar Detalhes
1. Na lista, toque em qualquer card de orçamento
2. Veja:
   - Informações do orçamento
   - Gasto atual vs. orçamento
   - Barra de progresso visual
   - Alertas configurados
   - Histórico de períodos anteriores

### Editar um Orçamento
1. Abra os detalhes do orçamento
2. Toque no botão "Editar"
3. Modifique os campos desejados
4. Toque em "Salvar Alterações"

### Excluir um Orçamento
1. Abra os detalhes do orçamento
2. Toque no botão "Excluir"
3. Confirme a exclusão
4. **Nota:** Orçamentos com histórico serão arquivados, não excluídos

### Receber Notificações
1. Quando seus gastos atingirem um limite configurado, você receberá uma notificação
2. Toque na notificação para ir direto aos detalhes do orçamento
3. Configure alertas ao criar/editar um orçamento

---

## 🌐 Web Frontend - Como Usar

### Acessar Orçamentos
1. Faça login no sistema web
2. Navegue para: `/budgets`
3. Ou clique no menu de navegação em "Orçamentos"

### Criar um Orçamento
1. Na página de orçamentos, clique em "Novo Orçamento"
2. Preencha o formulário:
   - **Categoria:** ID da categoria
   - **Valor do Orçamento:** Quanto você quer gastar
   - **Período:** Selecione o tipo de período
   - **Datas:** Se personalizado, escolha início e fim
   - **Status:** Marque "Orçamento Ativo" se quiser ativá-lo
3. Clique em "Criar Orçamento"

### Visualizar Detalhes
1. Na lista, clique em qualquer card de orçamento
2. Veja todas as informações detalhadas
3. Visualize o gráfico de progresso
4. Confira alertas e histórico

### Editar um Orçamento
1. Nos detalhes, clique em "Editar"
2. Ou navegue para: `/budgets/:id/edit`
3. Modifique os campos
4. Clique em "Salvar Alterações"

### Excluir um Orçamento
1. Nos detalhes, clique em "Excluir"
2. Confirme a ação
3. Orçamentos com histórico serão arquivados

### Receber Notificações
1. Notificações aparecem como toasts no canto superior direito
2. Clique na notificação para ir aos detalhes
3. Notificações fecham automaticamente após 5 segundos

---

## 🔧 API - Como Integrar

### Endpoints Disponíveis

#### Listar Orçamentos
```http
GET /api/budgets
Authorization: Bearer {token}

Query Parameters (opcional):
- status: active | inactive | archived
- categoryId: number
- timePeriod: daily | weekly | monthly | annual | custom
```

#### Criar Orçamento
```http
POST /api/budgets
Authorization: Bearer {token}
Content-Type: application/json

{
  "categoryId": 1,
  "amount": 1000,
  "timePeriod": "monthly",
  "status": "active",
  "alerts": [
    {
      "thresholdType": "percentage",
      "thresholdValue": 80,
      "position": "before_limit",
      "channels": [
        { "type": "in_app", "enabled": true },
        { "type": "email", "enabled": true }
      ]
    }
  ]
}
```

#### Obter Detalhes
```http
GET /api/budgets/:id
Authorization: Bearer {token}
```

#### Atualizar Orçamento
```http
PUT /api/budgets/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 1200,
  "status": "active"
}
```

#### Excluir Orçamento
```http
DELETE /api/budgets/:id
Authorization: Bearer {token}
```

#### Obter Status Atual
```http
GET /api/budgets/:id/status
Authorization: Bearer {token}
```

#### Obter Histórico
```http
GET /api/budgets/:id/history
Authorization: Bearer {token}
```

#### Configurar Alertas
```http
POST /api/budgets/:id/alerts
Authorization: Bearer {token}
Content-Type: application/json

{
  "alerts": [
    {
      "thresholdType": "percentage",
      "thresholdValue": 90,
      "position": "before_limit",
      "channels": [
        { "type": "in_app", "enabled": true }
      ]
    }
  ]
}
```

---

## 💡 Dicas e Boas Práticas

### Criando Orçamentos Efetivos

1. **Comece com períodos mensais**
   - Mais fácil de acompanhar
   - Alinha com ciclos de pagamento

2. **Configure alertas em 80% e 100%**
   - 80%: Aviso antecipado
   - 100%: Limite atingido
   - Opcional: 110% para gastos excedidos

3. **Use categorias específicas**
   - Evite categorias muito amplas
   - Facilita o controle detalhado

4. **Revise mensalmente**
   - Ajuste valores baseado no histórico
   - Identifique padrões de gastos

### Interpretando Indicadores Visuais

**Cores da Barra de Progresso:**
- 🟢 **Verde** (0-89%): Gastos sob controle
- 🟡 **Amarelo** (90-99%): Atenção, próximo do limite
- 🔴 **Vermelho** (100%+): Orçamento excedido

**Status do Orçamento:**
- **Ativo**: Monitorando gastos ativamente
- **Inativo**: Pausado, não monitora gastos
- **Arquivado**: Orçamento com histórico, não pode ser excluído

### Configurando Alertas

**Tipos de Limite:**
- **Percentual**: Baseado em % do orçamento (ex: 80%)
- **Valor Fixo**: Valor específico em moeda (ex: R$ 800)

**Posições:**
- **Antes do Limite**: Alertas preventivos (máx. 2)
- **Depois do Limite**: Alertas de excesso (máx. 1)

**Canais:**
- **In-App**: Notificações no aplicativo
- **Email**: Notificações por e-mail
- **SMS**: Notificações por mensagem (se configurado)

---

## 🐛 Troubleshooting

### Orçamento não está calculando gastos
- ✅ Verifique se o orçamento está **ativo**
- ✅ Confirme que a categoria está correta
- ✅ Verifique se as transações estão no período do orçamento
- ✅ Confirme que as transações são do tipo "despesa"

### Alertas não estão sendo disparados
- ✅ Verifique se os alertas estão configurados
- ✅ Confirme que os canais estão habilitados
- ✅ Verifique se o alerta já foi disparado neste período
- ✅ Confirme que o limite foi realmente atingido

### Não consigo excluir um orçamento
- ✅ Orçamentos com histórico são arquivados, não excluídos
- ✅ Isso preserva seus dados históricos
- ✅ Use o status "inativo" se quiser pausar

### Período personalizado não funciona
- ✅ Data de fim deve ser posterior à data de início
- ✅ Ambas as datas devem ser preenchidas
- ✅ Formato de data deve estar correto

---

## 📞 Suporte

### Documentação Completa
- **Requirements:** `.kiro/specs/budget-management/requirements.md`
- **Design:** `.kiro/specs/budget-management/design.md`
- **Tasks:** `.kiro/specs/budget-management/tasks.md`
- **Implementation:** `.kiro/specs/budget-management/IMPLEMENTATION_COMPLETE.md`

### Código Fonte
- **Backend:** `backend/src/domain/services/budget.service.ts`
- **Mobile:** `mobile/src/screens/budgets/`
- **Web:** `frontend/src/features/budgets/`

### Testes
- **Backend Tests:** `backend/tests/budget*.test.ts`
- **API Tests:** `backend/tests/budget-api.integration.test.ts`

---

## 🎯 Casos de Uso Comuns

### Caso 1: Controlar Gastos com Alimentação
```
Categoria: Alimentação
Valor: R$ 800,00
Período: Mensal
Alertas:
  - 80% (R$ 640) - Aviso antecipado
  - 100% (R$ 800) - Limite atingido
```

### Caso 2: Orçamento Semanal de Transporte
```
Categoria: Transporte
Valor: R$ 200,00
Período: Semanal
Alertas:
  - 90% (R$ 180) - Quase no limite
  - 100% (R$ 200) - Limite atingido
```

### Caso 3: Controle de Projeto Específico
```
Categoria: Projeto X
Valor: R$ 5.000,00
Período: Personalizado (01/02 a 28/02)
Alertas:
  - R$ 4.000 - Checkpoint intermediário
  - R$ 5.000 - Limite do projeto
```

---

**Última Atualização:** 25 de Janeiro de 2026  
**Versão:** 1.0.0  
**Status:** Production Ready ✅
