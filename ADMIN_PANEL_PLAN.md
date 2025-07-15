# Plano de Implementação - Painel de Administração SaaS

## 1. Visão Geral
Sistema administrativo completo para gestão do SaaS FinanceControl, permitindo à equipa de suporte gerir todos os aspectos do sistema.

## 2. Análise da Estrutura Atual

### Sistema de Roles Atual
- **member**: Utilizador normal
- **admin**: Administrador de organização
- **owner**: Proprietário da organização

### Novo Sistema de Roles Proposto
- **super_admin**: Administrador global do sistema (equipa de suporte)
- **admin**: Administrador de organização (clientes)
- **owner**: Proprietário da organização (clientes)
- **member**: Membro da organização (clientes)

## 3. Arquitectura da Solução

### 3.1 Schema da Base de Dados

#### Novas Tabelas Necessárias:

**admin_users** - Utilizadores da equipa de suporte
```sql
- id: serial PRIMARY KEY
- email: varchar(255) UNIQUE NOT NULL
- password: varchar(255) NOT NULL
- firstName: varchar(100)
- lastName: varchar(100)
- role: varchar(50) DEFAULT 'admin' -- 'super_admin', 'admin'
- permissions: jsonb -- Permissões específicas
- isActive: boolean DEFAULT true
- lastLoginAt: timestamp
- createdAt: timestamp DEFAULT NOW()
- updatedAt: timestamp DEFAULT NOW()
```

**payment_methods** - Métodos de pagamento configuráveis
```sql
- id: serial PRIMARY KEY
- name: varchar(100) NOT NULL -- 'stripe', 'paypal', 'bank_transfer'
- displayName: varchar(100) NOT NULL
- isActive: boolean DEFAULT true
- config: jsonb -- Configurações específicas
- createdAt: timestamp DEFAULT NOW()
- updatedAt: timestamp DEFAULT NOW()
```

**landing_content** - Conteúdo gerenciável da landing page
```sql
- id: serial PRIMARY KEY
- section: varchar(100) NOT NULL -- 'hero', 'features', 'testimonials', 'pricing'
- content: jsonb NOT NULL -- Conteúdo estruturado
- isActive: boolean DEFAULT true
- createdAt: timestamp DEFAULT NOW()
- updatedAt: timestamp DEFAULT NOW()
```

**campaigns** - Campanhas e promoções
```sql
- id: serial PRIMARY KEY
- name: varchar(255) NOT NULL
- description: text
- discountType: varchar(50) -- 'percentage', 'fixed_amount', 'free_trial'
- discountValue: decimal(10,2)
- couponCode: varchar(100) UNIQUE
- validFrom: timestamp
- validUntil: timestamp
- usageLimit: integer
- usageCount: integer DEFAULT 0
- isActive: boolean DEFAULT true
- createdAt: timestamp DEFAULT NOW()
- updatedAt: timestamp DEFAULT NOW()
```

**system_settings** - Configurações do sistema
```sql
- id: serial PRIMARY KEY
- key: varchar(100) UNIQUE NOT NULL
- value: jsonb NOT NULL
- description: text
- category: varchar(100) -- 'trial', 'payments', 'notifications', 'security'
- createdAt: timestamp DEFAULT NOW()
- updatedAt: timestamp DEFAULT NOW()
```

**legal_content** - Conteúdo legal e termos
```sql
- id: serial PRIMARY KEY
- type: varchar(100) NOT NULL -- 'terms', 'privacy', 'contacts', 'contracts'
- title: varchar(255) NOT NULL
- content: text NOT NULL
- version: varchar(20) NOT NULL
- isActive: boolean DEFAULT true
- createdAt: timestamp DEFAULT NOW()
- updatedAt: timestamp DEFAULT NOW()
```

**audit_logs** - Logs de auditoria
```sql
- id: serial PRIMARY KEY
- adminUserId: integer REFERENCES admin_users(id)
- action: varchar(255) NOT NULL
- entityType: varchar(100) -- 'user', 'plan', 'campaign', etc.
- entityId: integer
- oldData: jsonb
- newData: jsonb
- ipAddress: varchar(45)
- userAgent: text
- createdAt: timestamp DEFAULT NOW()
```

### 3.2 Estrutura de Permissões

#### Grupos de Permissões
```javascript
const PERMISSIONS = {
  PLANS: {
    VIEW: 'plans.view',
    CREATE: 'plans.create',
    UPDATE: 'plans.update',
    DELETE: 'plans.delete',
    MANAGE_PRICING: 'plans.manage_pricing'
  },
  USERS: {
    VIEW: 'users.view',
    CREATE: 'users.create',
    UPDATE: 'users.update',
    DELETE: 'users.delete',
    MANAGE_SUBSCRIPTIONS: 'users.manage_subscriptions'
  },
  PAYMENTS: {
    VIEW: 'payments.view',
    MANAGE_METHODS: 'payments.manage_methods',
    PROCESS_REFUNDS: 'payments.process_refunds'
  },
  CAMPAIGNS: {
    VIEW: 'campaigns.view',
    CREATE: 'campaigns.create',
    UPDATE: 'campaigns.update',
    DELETE: 'campaigns.delete'
  },
  CONTENT: {
    VIEW: 'content.view',
    MANAGE_LANDING: 'content.manage_landing',
    MANAGE_LEGAL: 'content.manage_legal'
  },
  SYSTEM: {
    VIEW_SETTINGS: 'system.view_settings',
    MANAGE_SETTINGS: 'system.manage_settings',
    VIEW_LOGS: 'system.view_logs'
  }
};
```

## 4. Funcionalidades por Módulo

### 4.1 Gestão de Planos
#### Funcionalidades:
- ✅ Listar todos os planos
- ⭐ Criar novos planos
- ⭐ Editar planos existentes
- ⭐ Activar/desactivar planos
- ⭐ Ajustar preços
- ⭐ Configurar limites (contas, transações)
- ⭐ Gerir features por plano
- ⭐ Histórico de alterações de preços

#### Páginas:
- `/admin/plans` - Lista de planos
- `/admin/plans/create` - Criar plano
- `/admin/plans/:id/edit` - Editar plano
- `/admin/plans/:id/pricing-history` - Histórico de preços

### 4.2 Gestão de Métodos de Pagamento
#### Funcionalidades:
- ⭐ Listar métodos de pagamento
- ⭐ Activar/desactivar métodos
- ⭐ Configurar Stripe
- ⭐ Configurar PayPal
- ⭐ Configurar transferência bancária
- ⭐ Configurar Multicaixa Express
- ⭐ Testar conexões de pagamento

#### Páginas:
- `/admin/payment-methods` - Lista de métodos
- `/admin/payment-methods/:id/configure` - Configurar método

### 4.3 Gestão de Testes e Modalidades
#### Funcionalidades:
- ⭐ Configurar duração do período de teste
- ⭐ Definir planos gratuitos
- ⭐ Configurar modalidades de teste
- ⭐ Gerir utilizadores em período de teste
- ⭐ Estatísticas de conversão

#### Páginas:
- `/admin/trial-settings` - Configurações de teste
- `/admin/trial-users` - Utilizadores em teste

### 4.4 Gestão de Conteúdo da Landing Page
#### Funcionalidades:
- ⭐ Editar secção Hero
- ⭐ Gerir funcionalidades destacadas
- ⭐ Gerir testemunhos
- ⭐ Configurar preços exibidos
- ⭐ Gerir FAQ
- ⭐ Preview das alterações

#### Páginas:
- `/admin/landing-content` - Gerir conteúdo
- `/admin/landing-content/preview` - Preview

### 4.5 Gestão de Utilizadores e Assinaturas
#### Funcionalidades:
- ⭐ Listar todos os utilizadores
- ⭐ Pesquisar utilizadores
- ⭐ Ver detalhes de utilizador
- ⭐ Gerir assinaturas
- ⭐ Alterar planos de utilizadores
- ⭐ Cancelar assinaturas
- ⭐ Processar reembolsos
- ⭐ Impersonar utilizadores (para suporte)

#### Páginas:
- `/admin/users` - Lista de utilizadores
- `/admin/users/:id` - Detalhes do utilizador
- `/admin/users/:id/subscription` - Gerir assinatura

### 4.6 Gestão de Campanhas e Promoções
#### Funcionalidades:
- ⭐ Criar campanhas promocionais
- ⭐ Gerir códigos de desconto
- ⭐ Configurar descontos percentuais/fixos
- ⭐ Definir períodos de validade
- ⭐ Limitar uso de cupons
- ⭐ Estatísticas de campanhas

#### Páginas:
- `/admin/campaigns` - Lista de campanhas
- `/admin/campaigns/create` - Criar campanha
- `/admin/campaigns/:id/edit` - Editar campanha
- `/admin/campaigns/:id/stats` - Estatísticas

### 4.7 Gestão de Conteúdo Legal
#### Funcionalidades:
- ⭐ Gerir Termos de Serviço
- ⭐ Gerir Política de Privacidade
- ⭐ Gerir informações de Contacto
- ⭐ Gerir modelos de Contratos
- ⭐ Controlo de versões
- ⭐ Publicação de alterações

#### Páginas:
- `/admin/legal-content` - Lista de conteúdos
- `/admin/legal-content/:type/edit` - Editar conteúdo
- `/admin/legal-content/:type/versions` - Versões

## 5. Dashboard Administrativo

### 5.1 Métricas Principais
- 📊 Número total de utilizadores
- 📊 Utilizadores activos
- 📊 Receita mensal recorrente (MRR)
- 📊 Taxa de conversão de trial
- 📊 Churn rate
- 📊 Distribuição por planos
- 📊 Métodos de pagamento mais utilizados

### 5.2 Gráficos e Análises
- 📈 Crescimento de utilizadores
- 📈 Receita ao longo do tempo
- 📈 Conversões por fonte
- 📈 Cancelamentos por motivo

## 6. Autenticação e Segurança

### 6.1 Sistema de Autenticação Admin
- ⭐ Login separado para administradores
- ⭐ Autenticação de dois factores (2FA)
- ⭐ Sessões com timeout automático
- ⭐ Logs de acesso detalhados

### 6.2 Middleware de Segurança
- ⭐ Validação de permissões
- ⭐ Rate limiting
- ⭐ Auditoria de acções
- ⭐ Proteção CSRF

## 7. Plano de Implementação

### Fase 1: Fundação (Semana 1-2) ✅ CONCLUÍDO
1. **Criar schema da base de dados** ✅
   - Tabelas admin_users, system_settings, audit_logs
   - Migração da base de dados

2. **Sistema de autenticação admin** ✅
   - Login admin separado
   - Middleware de permissões
   - Estrutura base do painel

3. **Dashboard básico** ✅
   - Layout principal
   - Navegação
   - Métricas básicas

### Fase 2: Gestão Core (Semana 3-4) ✅ CONCLUÍDO
1. **Gestão de Planos** ✅
   - CRUD completo de planos
   - Ajuste de preços
   - Gestão de features

2. **Gestão de Utilizadores** ✅
   - Lista de utilizadores
   - Detalhes e edição
   - Gestão de assinaturas

### Fase 3: Funcionalidades Avançadas (Semana 5-6)
1. **Gestão de Pagamentos**
   - Configuração de métodos
   - Processamento de reembolsos

2. **Campanhas e Promoções**
   - Sistema de cupons
   - Estatísticas de campanhas

### Fase 4: Conteúdo e Configurações (Semana 7-8)
1. **Gestão de Conteúdo**
   - Editor de landing page
   - Gestão de conteúdo legal

2. **Configurações do Sistema**
   - Configurações de trial
   - Configurações gerais

### Fase 5: Análises e Melhorias (Semana 9-10)
1. **Sistema de Análises**
   - Métricas avançadas
   - Relatórios detalhados

2. **Auditoria e Logs**
   - Sistema de auditoria completo
   - Logs de segurança

## 8. Estrutura de Ficheiros

```
/admin
├── components/
│   ├── layout/
│   │   ├── admin-header.tsx
│   │   ├── admin-sidebar.tsx
│   │   └── admin-layout.tsx
│   ├── dashboard/
│   │   ├── metrics-card.tsx
│   │   ├── revenue-chart.tsx
│   │   └── user-growth-chart.tsx
│   ├── plans/
│   │   ├── plan-form.tsx
│   │   ├── plan-list.tsx
│   │   └── pricing-history.tsx
│   ├── users/
│   │   ├── user-list.tsx
│   │   ├── user-details.tsx
│   │   └── subscription-manager.tsx
│   ├── campaigns/
│   │   ├── campaign-form.tsx
│   │   ├── campaign-list.tsx
│   │   └── campaign-stats.tsx
│   ├── content/
│   │   ├── landing-editor.tsx
│   │   ├── legal-editor.tsx
│   │   └── content-preview.tsx
│   └── payments/
│       ├── payment-methods.tsx
│       ├── payment-config.tsx
│       └── refund-processor.tsx
├── pages/
│   ├── login.tsx
│   ├── dashboard.tsx
│   ├── plans/
│   ├── users/
│   ├── campaigns/
│   ├── content/
│   ├── payments/
│   └── settings/
├── hooks/
│   ├── use-admin-auth.tsx
│   ├── use-permissions.tsx
│   └── use-audit-log.tsx
├── lib/
│   ├── admin-api.ts
│   ├── permissions.ts
│   └── audit.ts
└── types/
    ├── admin.ts
    ├── permissions.ts
    └── audit.ts
```

## 9. Estimativa de Tempo

- **Fase 1**: 20-25 horas
- **Fase 2**: 25-30 horas
- **Fase 3**: 20-25 horas
- **Fase 4**: 15-20 horas
- **Fase 5**: 15-20 horas

**Total estimado**: 95-120 horas (12-15 dias de trabalho)

## 10. Considerações Técnicas

### 10.1 Performance
- Paginação para listas grandes
- Lazy loading de componentes
- Cache de métricas computacionalmente caras

### 10.2 Segurança
- Validação rigorosa de permissões
- Sanitização de inputs
- Auditoria de todas as acções críticas

### 10.3 Usabilidade
- Interface intuitiva
- Feedback visual para acções
- Confirmações para acções críticas

## 11. Dependências Adicionais

### Frontend
- `react-chartjs-2` - Gráficos e análises
- `date-fns` - Manipulação de datas
- `react-markdown` - Editor de conteúdo
- `react-select` - Seleção avançada

### Backend
- `bcryptjs` - Hash de senhas admin
- `jsonwebtoken` - Tokens JWT para admin
- `express-rate-limit` - Rate limiting
- `helmet` - Segurança HTTP

## 12. Próximos Passos

1. **Aprovação do plano** pelo utilizador
2. **Priorização de funcionalidades** - quais implementar primeiro
3. **Definição de utilizadores admin** iniciais
4. **Configuração de permissões** específicas
5. **Início da implementação** pela Fase 1

---

**Legenda:**
- ✅ Já implementado
- ⭐ A implementar
- 📊 Métrica/Dashboard
- 📈 Gráfico/Análise