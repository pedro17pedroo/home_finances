# 🎯 Como Acessar Transações Recorrentes

## 📍 Localização do Menu

### Frontend Web

O menu **"Transações Recorrentes"** está localizado no **dropdown do usuário**, logo abaixo de **"Convites Recebidos"**.

```
┌─────────────────────────────────────────────────┐
│  FinanceControl                    [Pedro Nájia]│ ← Clique aqui
└─────────────────────────────────────────────────┘
                                            │
                                            ▼
                        ┌──────────────────────────────┐
                        │  Pedro Nájia                 │
                        ├──────────────────────────────┤
                        │  📋 Perfil                   │
                        │  👥 Equipe                   │
                        │  ✉️  Convites Recebidos      │
                        │  🔄 Transações Recorrentes   │ ← AQUI!
                        │  🚪 Sair                     │
                        └──────────────────────────────┘
```

---

## 🖱️ Passo a Passo

### 1️⃣ Clique no seu nome/avatar
- Localizado no **canto superior direito** da tela
- Ao lado do ícone de notificações (🔔)

### 2️⃣ Localize "Transações Recorrentes"
- É o **4º item** do menu dropdown
- Ícone: 🔄 (RefreshCw)
- Logo abaixo de "Convites Recebidos"

### 3️⃣ Clique em "Transações Recorrentes"
- Você será redirecionado para `/transactions/recurring`
- Verá a lista de todas as suas transações recorrentes

---

## 🌐 Acesso Direto por URL

Se preferir, você pode acessar diretamente pela URL:

### Listagem
```
http://localhost:3001/transactions/recurring
```

### Criar Nova
```
http://localhost:3001/transactions/recurring/new
```

### Editar (substitua :id pelo ID da transação)
```
http://localhost:3001/transactions/recurring/:id/edit
```

---

## 📱 No Mobile

No aplicativo mobile, o acesso é pelo menu lateral:

```
┌─────────────────────────┐
│  ☰ Menu                 │
├─────────────────────────┤
│  🏠 Dashboard           │
│  💰 Transações          │
│  📊 Relatórios          │
│  👥 Equipe              │
│  ✉️  Convites           │
│  🔄 Transações          │ ← AQUI!
│     Recorrentes         │
│  ⚙️  Configurações      │
└─────────────────────────┘
```

---

## ✨ O que você verá na página

### Tela de Listagem

```
┌────────────────────────────────────────────────────────────┐
│  Transações Recorrentes              [+ Nova Transação]    │
│  Gerencie suas receitas e despesas automáticas             │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 📈 Salário Mensal                    250 000,00 Kz  │ │
│  │ Salário • Mensal                                     │ │
│  │ Próxima: 25/02/2026 • 1 execução                    │ │
│  │ [⏸️ Desativar] [🔄 Executar] [📜 Histórico] [✏️ Editar]│ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 📉 Aluguel                           -80 000,00 Kz  │ │
│  │ Moradia • Mensal                                     │ │
│  │ Próxima: 05/02/2026 • 12 execuções                  │ │
│  │ [⏸️ Desativar] [🔄 Executar] [📜 Histórico] [✏️ Editar]│ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### Tela de Criação/Edição

```
┌────────────────────────────────────────────────────────────┐
│  [← Voltar]                                                 │
│                                                             │
│  Nova Transação Recorrente                                 │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Tipo: [Receita ▼]                                         │
│                                                             │
│  Descrição: [_____________________________]                │
│                                                             │
│  Valor (AOA): [_____________________________]              │
│                                                             │
│  Categoria: [Selecione uma categoria ▼]                    │
│                                                             │
│  Conta: [Selecione uma conta ▼]                            │
│                                                             │
│  Frequência: [Mensal ▼]  Intervalo: [1]                   │
│                                                             │
│  Dia do Mês: [25]                                          │
│                                                             │
│  Data de Início: [26/01/2026]                              │
│                                                             │
│  Data de Fim: [_____________________________] (opcional)   │
│                                                             │
│  Notificar: [1] dia(s) antes                               │
│                                                             │
│  Canais: ☑️ App  ☑️ Email  ☐ SMS                           │
│                                                             │
│  [Cancelar]  [💾 Salvar]                                   │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 🎨 Identificação Visual

### Ícone
- **RefreshCw** (🔄) - Representa recorrência/repetição

### Cores
- **Receitas**: Verde (📈)
- **Despesas**: Vermelho (📉)
- **Ativas**: Cor normal
- **Inativas**: Opacidade reduzida + Badge "Inativa"

### Badges
- **Frequência**: Badge secundário (ex: "Mensal", "Semanal")
- **Categoria**: Badge outline
- **Status**: Badge destrutivo para inativas

---

## 🔍 Dicas de Navegação

### Atalhos de Teclado (futuro)
- `Ctrl/Cmd + N` - Nova transação recorrente
- `Esc` - Voltar/Cancelar

### Breadcrumbs
```
Dashboard > Transações > Transações Recorrentes
```

### Filtros Disponíveis
- Por tipo (Receita/Despesa)
- Por status (Ativa/Inativa)
- Por frequência
- Por categoria

---

## 📊 Estatísticas Rápidas (na listagem)

```
┌─────────────────────────────────────────────────┐
│  📊 Resumo                                       │
├─────────────────────────────────────────────────┤
│  Total de Transações: 5                         │
│  Ativas: 4  |  Inativas: 1                      │
│                                                  │
│  Receitas Mensais: +350 000,00 Kz              │
│  Despesas Mensais: -120 000,00 Kz              │
│  Saldo Previsto: +230 000,00 Kz                │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Próximas Funcionalidades

- [ ] Duplicar transação recorrente
- [ ] Exportar lista para Excel/PDF
- [ ] Gráfico de previsão de fluxo de caixa
- [ ] Notificações push no mobile
- [ ] Integração com calendário
- [ ] Templates de transações comuns

---

## 📞 Precisa de Ajuda?

- **Guia Completo**: Veja `GUIA_USO_TRANSACOES_RECORRENTES.md`
- **Documentação Técnica**: Veja `RECURRING_TRANSACTIONS_IMPLEMENTATION.md`
- **Correções Recentes**: Veja `RECURRING_TRANSACTIONS_FRONTEND_FIX.md`

---

**Desenvolvido por**: Kiro AI Assistant  
**Data**: 26 de Janeiro de 2026  
**Versão**: 1.0.0
