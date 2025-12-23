# Design: Sistema de Gestão de Assinaturas Completo

## Overview

Este documento descreve a arquitectura técnica para implementar o sistema de gestão de assinaturas completo, incluindo alterações na base de dados, novos endpoints API, componentes de backoffice e jobs de processamento.

## Database Schema Changes

### 1. Alterações na Tabela `plans`

```sql
ALTER TABLE plans ADD COLUMN duration_days INTEGER DEFAULT NULL;
ALTER TABLE plans ADD COLUMN trial_days INTEGER DEFAULT 0;
ALTER TABLE plans ADD COLUMN billing_cycle VARCHAR(20) DEFAULT 'monthly'; -- 'monthly', 'quarterly', 'yearly', 'one_time'
ALTER TABLE plans ADD COLUMN description TEXT;
ALTER TABLE plans ADD COLUMN sort_order INTEGER DEFAULT 0;
```

### 2. Alterações na Tabela `subscriptions`

```sql
ALTER TABLE subscriptions ADD COLUMN trial_ends_at TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN next_billing_date TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN cancelled_at TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN cancellation_reason TEXT;
```

### 3. Nova Tabela `subscription_notifications`

```sql
CREATE TABLE subscription_notifications (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER REFERENCES subscriptions(id) NOT NULL,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'trial_ending', 'expiring', 'expired', 'payment_reminder'
  days_before INTEGER, -- Dias antes do evento (7, 3, 1, 0)
  sent_at TIMESTAMP,
  channel VARCHAR(20), -- 'email', 'sms', 'push'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Alterações na Tabela `campaigns` (já existe)

A tabela `campaigns` já existe com os campos necessários. Adicionar:

```sql
ALTER TABLE campaigns ADD COLUMN applicable_plans JSONB DEFAULT '[]'; -- IDs dos planos aplicáveis
ALTER TABLE campaigns ADD COLUMN min_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN max_discount DECIMAL(10,2); -- Limite máximo de desconto
```

## API Endpoints

### Plans Management (Backoffice)

```
GET    /api/admin/plans              - Listar todos os planos
POST   /api/admin/plans              - Criar plano
PUT    /api/admin/plans/:id          - Actualizar plano
PATCH  /api/admin/plans/:id/toggle   - Activar/desactivar plano
DELETE /api/admin/plans/:id          - Eliminar plano (se sem assinaturas)
```

### Subscriptions Management (Backoffice)

```
GET    /api/admin/subscriptions                    - Listar assinaturas
GET    /api/admin/subscriptions/:id                - Detalhes da assinatura
GET    /api/admin/subscriptions/stats              - Estatísticas
PATCH  /api/admin/subscriptions/:id/status         - Alterar status
POST   /api/admin/subscriptions/:id/extend         - Estender assinatura
GET    /api/admin/subscriptions/export             - Exportar CSV
```

### Campaigns/Coupons Management (Backoffice)

```
GET    /api/admin/campaigns              - Listar campanhas/cupões
POST   /api/admin/campaigns              - Criar campanha
PUT    /api/admin/campaigns/:id          - Actualizar campanha
PATCH  /api/admin/campaigns/:id/toggle   - Activar/desactivar
GET    /api/admin/campaigns/:id/usage    - Ver utilizações
DELETE /api/admin/campaigns/:id          - Eliminar campanha
```

### Public Endpoints

```
POST   /api/subscriptions/validate-coupon  - Validar cupão
POST   /api/subscriptions/apply-coupon     - Aplicar cupão ao checkout
GET    /api/subscriptions/my-subscription  - Detalhes da assinatura do utilizador
POST   /api/subscriptions/renew            - Renovar assinatura
```

## Component Architecture

### Backend Services

```
backend/src/domain/services/
├── subscription.service.ts      (existente - expandir)
├── plan.service.ts              (novo)
├── campaign.service.ts          (novo)
└── notification.service.ts      (novo)

backend/src/jobs/
├── recurring-transactions.job.ts (existente)
├── subscription-expiration.job.ts (novo)
└── notification.job.ts           (novo)
```

### Backoffice Pages

```
backoffice/src/pages/
├── plans/
│   ├── PlansPage.tsx           - Lista de planos
│   └── PlanFormModal.tsx       - Criar/editar plano
├── subscriptions/
│   ├── SubscriptionsPage.tsx   - Lista de assinaturas
│   └── SubscriptionDetail.tsx  - Detalhes
└── campaigns/
    ├── CampaignsPage.tsx       - Lista de campanhas
    └── CampaignFormModal.tsx   - Criar/editar campanha
```

## Flow Diagrams

### Trial Flow

```
1. Utilizador selecciona plano com trial
2. Sistema verifica se plano tem trial_days > 0
3. Se sim:
   - Cria assinatura com status='trial'
   - Define trial_ends_at = now + trial_days
   - Não solicita pagamento
4. Job diário verifica trials a expirar
5. Envia notificações 3 dias e 1 dia antes
6. Quando trial expira:
   - Altera status para 'pending'
   - Notifica utilizador para efectuar pagamento
7. Se não pagar em X dias:
   - Altera status para 'expired'
   - Limita funcionalidades
```

### Coupon Validation Flow

```
1. Utilizador insere código do cupão
2. Frontend chama POST /validate-coupon
3. Backend verifica:
   - Cupão existe e está activo
   - Dentro do período de validade
   - Não excedeu limite de utilizações
   - Utilizador não usou antes
   - Plano é aplicável (se restrito)
4. Retorna desconto calculado ou erro
5. No checkout, aplica desconto ao valor final
6. Regista uso do cupão
```

### Expiration Job Flow

```
1. Job executa diariamente às 00:00
2. Busca assinaturas com end_date próximo
3. Para cada assinatura:
   - Se expira em 7 dias: cria notificação '7_days'
   - Se expira em 3 dias: cria notificação '3_days'
   - Se expira em 1 dia: cria notificação '1_day'
   - Se expirou: altera status para 'expired'
4. Job de notificações processa fila
5. Envia emails/SMS pendentes
6. Actualiza status das notificações
```

## Data Models

### Plan (expandido)

```typescript
interface Plan {
  id: number;
  name: string;
  type: 'basic' | 'premium' | 'enterprise';
  price: number;
  durationDays: number | null;  // null = ilimitado
  trialDays: number;            // 0 = sem trial
  billingCycle: 'monthly' | 'quarterly' | 'yearly' | 'one_time';
  features: string[];
  maxAccounts: number;
  maxTransactions: number;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
}
```

### Subscription (expandido)

```typescript
interface Subscription {
  id: number;
  userId: number;
  planId: string;
  status: 'trial' | 'active' | 'pending' | 'expired' | 'cancelled';
  paymentType: 'one_time' | 'recurring';
  paymentMethod: string | null;
  startDate: Date;
  endDate: Date | null;
  trialEndsAt: Date | null;
  nextBillingDate: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Campaign (expandido)

```typescript
interface Campaign {
  id: number;
  name: string;
  description: string | null;
  discountType: 'percentage' | 'fixed_amount' | 'free_trial';
  discountValue: number;
  couponCode: string;
  validFrom: Date | null;
  validUntil: Date | null;
  usageLimit: number | null;
  usageCount: number;
  applicablePlans: number[];  // IDs dos planos
  minAmount: number;
  maxDiscount: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## Security Considerations

1. **Validação de Cupões**: Rate limiting para prevenir brute force
2. **Auditoria**: Todas as alterações em planos/assinaturas são logadas
3. **Permissões**: Apenas admins podem aceder endpoints de gestão
4. **Dados Sensíveis**: Não expor informações de outros utilizadores

## Migration Strategy

1. Criar migrations para alterações no schema
2. Migrar dados existentes (definir valores default)
3. Implementar endpoints de backoffice
4. Implementar jobs de expiração
5. Actualizar frontend de onboarding para suportar trial
6. Testar fluxos completos

## Testing Strategy

1. **Unit Tests**: Services de planos, campanhas, notificações
2. **Integration Tests**: Fluxos de trial, expiração, cupões
3. **E2E Tests**: Onboarding com trial, aplicação de cupão
