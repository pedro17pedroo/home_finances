# Implementation Plan: Sistema de Gestão de Assinaturas Completo

## Overview

Este plano implementa o sistema completo de gestão de assinaturas com suporte a períodos de teste, duração de planos, cupões de desconto e notificações de expiração.

## Tasks

### Fase 1: Alterações na Base de Dados

- [x] 1. Criar migration para alterações no schema
  - [x] 1.1 Adicionar campos à tabela `plans` (duration_days, trial_days, billing_cycle, description, sort_order)
  - [x] 1.2 Adicionar campos à tabela `subscriptions` (trial_ends_at, next_billing_date, cancelled_at, cancellation_reason)
  - [x] 1.3 Criar tabela `subscription_notifications`
  - [x] 1.4 Adicionar campos à tabela `campaigns` (applicable_plans, min_amount, max_discount)
  - _Requirements: 1.1, 1.2, 2.2_
  - **File**: `backend/migrations/add_subscription_management.sql`

- [x] 2. Actualizar schema Drizzle
  - [x] 2.1 Actualizar definição da tabela `plans` em schema.ts
  - [x] 2.2 Actualizar definição da tabela `subscriptions` em schema.ts
  - [x] 2.3 Adicionar tabela `subscriptionNotifications` em schema.ts
  - [x] 2.4 Actualizar definição da tabela `campaigns` em schema.ts
  - [x] 2.5 Criar tipos e schemas de inserção
  - _Requirements: 1.1, 1.2, 2.2, 3.1_
  - **File**: `backend/src/core/database/schema.ts`

### Fase 2: Backend - Serviços e Repositórios

- [x] 3. Criar/Expandir Plan Service
  - [x] 3.1 Criar `plan.service.ts` com métodos CRUD
  - [x] 3.2 Implementar `getAllPlans` (incluindo inactivos para admin)
  - [x] 3.3 Implementar `createPlan` com validação
  - [x] 3.4 Implementar `updatePlan` com validação
  - [x] 3.5 Implementar `togglePlanStatus`
  - [x] 3.6 Implementar `deletePlan` (verificar assinaturas)
  - _Requirements: 1.1, 1.2, 1.3_
  - **File**: `backend/src/domain/services/plan.service.ts`

- [x] 4. Criar Campaign Service
  - [x] 4.1 Criar `campaign.service.ts`
  - [x] 4.2 Implementar `getAllCampaigns`
  - [x] 4.3 Implementar `createCampaign` com validação de código único
  - [x] 4.4 Implementar `updateCampaign`
  - [x] 4.5 Implementar `validateCoupon` (verificar validade, limite, uso)
  - [x] 4.6 Implementar `applyCoupon` (registar uso)
  - [x] 4.7 Implementar `getCampaignUsage` (estatísticas)
  - _Requirements: 3.1, 3.2, 3.3_
  - **File**: `backend/src/domain/services/campaign.service.ts`

- [x] 5. Expandir Subscription Service
  - [x] 5.1 Actualizar `createSubscription` para suportar trial
  - [x] 5.2 Implementar `getSubscriptionDetails` (com info do plano)
  - [x] 5.3 Implementar `renewSubscription`
  - [x] 5.4 Implementar `cancelSubscription` com motivo
  - [x] 5.5 Implementar `extendSubscription` (admin)
  - [x] 5.6 Implementar `getSubscriptionsForAdmin` com filtros
  - [x] 5.7 Implementar `getSubscriptionStats`
  - _Requirements: 2.1, 2.2, 2.3_
  - **File**: `backend/src/domain/services/subscription.service.ts`

- [ ] 6. Criar Notification Service (para envio de emails)
  - [ ] 6.1 Criar `subscription-notification.service.ts`
  - [ ] 6.2 Implementar `createNotification`
  - [ ] 6.3 Implementar `getPendingNotifications`
  - [ ] 6.4 Implementar `markNotificationSent`
  - [ ] 6.5 Implementar `sendNotification` (log por agora, preparar para email)
  - _Requirements: 4.2, 4.3_

### Fase 3: Backend - Jobs

- [x] 7. Criar Job de Expiração de Assinaturas
  - [x] 7.1 Criar `subscription-expiration.job.ts`
  - [x] 7.2 Implementar verificação de trials a expirar
  - [x] 7.3 Implementar verificação de assinaturas a expirar
  - [x] 7.4 Implementar criação de notificações (7, 3, 1 dias)
  - [x] 7.5 Implementar marcação de assinaturas expiradas
  - [x] 7.6 Agendar job para executar diariamente
  - _Requirements: 4.1_
  - **File**: `backend/src/core/jobs/subscription-expiration.job.ts`

- [ ] 8. Criar Job de Notificações
  - [ ] 8.1 Criar `notification.job.ts`
  - [ ] 8.2 Implementar processamento de notificações pendentes
  - [ ] 8.3 Implementar retry para notificações falhadas
  - [ ] 8.4 Agendar job para executar a cada hora
  - _Requirements: 4.2, 4.3_

### Fase 4: Backend - API Routes

- [x] 9. Criar Routes de Admin para Planos
  - [x] 9.1 Criar `admin-plan.controller.ts`
  - [x] 9.2 Implementar GET /api/admin/plans-v2
  - [x] 9.3 Implementar POST /api/admin/plans-v2
  - [x] 9.4 Implementar PUT /api/admin/plans-v2/:id
  - [x] 9.5 Implementar PATCH /api/admin/plans-v2/:id/toggle
  - [x] 9.6 Implementar DELETE /api/admin/plans-v2/:id
  - _Requirements: 1.3_
  - **File**: `backend/src/api/controllers/admin-plan.controller.ts`

- [x] 10. Criar Routes de Admin para Assinaturas
  - [x] 10.1 Criar `admin-subscription.controller.ts`
  - [x] 10.2 Implementar GET /api/admin/subscriptions
  - [x] 10.3 Implementar GET /api/admin/subscriptions/:id
  - [x] 10.4 Implementar GET /api/admin/subscriptions/stats
  - [x] 10.5 Implementar PATCH /api/admin/subscriptions/:id/status
  - [x] 10.6 Implementar POST /api/admin/subscriptions/:id/extend
  - [x] 10.7 Implementar GET /api/admin/subscriptions/export
  - _Requirements: 2.1_
  - **File**: `backend/src/api/controllers/admin-subscription.controller.ts`

- [x] 11. Criar Routes de Admin para Campanhas
  - [x] 11.1 Criar `admin-campaign.controller.ts`
  - [x] 11.2 Implementar GET /api/admin/campaigns
  - [x] 11.3 Implementar POST /api/admin/campaigns
  - [x] 11.4 Implementar PUT /api/admin/campaigns/:id
  - [x] 11.5 Implementar PATCH /api/admin/campaigns/:id/toggle
  - [x] 11.6 Implementar GET /api/admin/campaigns/:id/usage
  - [x] 11.7 Implementar DELETE /api/admin/campaigns/:id
  - _Requirements: 3.3_
  - **File**: `backend/src/api/controllers/admin-campaign.controller.ts`

- [x] 12. Expandir Routes Públicas de Assinaturas
  - [x] 12.1 Implementar POST /api/subscriptions/validate-coupon
  - [x] 12.2 Actualizar POST /api/subscriptions/subscribe para suportar cupões e trial
  - [x] 12.3 Implementar GET /api/subscriptions/my-subscription
  - [x] 12.4 Implementar POST /api/subscriptions/renew
  - _Requirements: 3.2, 2.3, 5.2_
  - **File**: `backend/src/api/routes/subscription.routes.ts`

### Fase 5: Backoffice - Gestão de Planos

- [x] 13. Criar Página de Gestão de Planos
  - [x] 13.1 Actualizar `PlansPage.tsx` com listagem
  - [x] 13.2 Implementar tabela com colunas (nome, tipo, preço, duração, trial, status)
  - [x] 13.3 Implementar filtros e ordenação
  - [x] 13.4 Implementar botões de acção (editar, activar/desactivar)
  - _Requirements: 1.3_
  - **File**: `backoffice/src/features/plans/pages/plans-page.tsx`

- [x] 14. Criar Modal de Plano
  - [x] 14.1 Modal integrado em `PlansPage.tsx`
  - [x] 14.2 Implementar formulário com todos os campos
  - [x] 14.3 Implementar validação de formulário
  - [x] 14.4 Implementar criação e edição
  - _Requirements: 1.1, 1.2, 1.3_

### Fase 6: Backoffice - Gestão de Assinaturas

- [x] 15. Criar Página de Gestão de Assinaturas
  - [x] 15.1 Criar `SubscriptionsPage.tsx` com listagem
  - [x] 15.2 Implementar tabela com colunas (utilizador, plano, status, datas)
  - [x] 15.3 Implementar filtros (status, plano, período)
  - [x] 15.4 Implementar exportação CSV
  - [x] 15.5 Implementar cards de estatísticas
  - _Requirements: 2.1_
  - **File**: `backoffice/src/features/subscriptions/pages/subscriptions-page.tsx`

- [x] 16. Criar Página de Detalhes da Assinatura
  - [x] 16.1 Modal integrado em `SubscriptionsPage.tsx`
  - [x] 16.2 Exibir informações do utilizador
  - [x] 16.3 Exibir informações da assinatura
  - [x] 16.4 Exibir histórico de pagamentos
  - [x] 16.5 Implementar acções (alterar status, estender)
  - _Requirements: 2.1, 2.2_

### Fase 7: Backoffice - Gestão de Campanhas

- [x] 17. Criar Página de Gestão de Campanhas
  - [x] 17.1 Criar `CampaignsPage.tsx` com listagem
  - [x] 17.2 Implementar tabela com colunas (nome, código, desconto, validade, usos)
  - [x] 17.3 Implementar filtros (status, tipo)
  - [x] 17.4 Implementar botões de acção
  - _Requirements: 3.3_
  - **File**: `backoffice/src/features/campaigns/pages/campaigns-page.tsx`

- [x] 18. Criar Modal de Campanha
  - [x] 18.1 Modal integrado em `CampaignsPage.tsx`
  - [x] 18.2 Implementar formulário com todos os campos
  - [x] 18.3 Implementar selecção de planos aplicáveis
  - [x] 18.4 Implementar validação de código único
  - _Requirements: 3.1, 3.3_

- [x] 19. Criar Página de Uso de Campanha
  - [x] 19.1 Modal integrado em `CampaignsPage.tsx`
  - [x] 19.2 Exibir estatísticas da campanha
  - [x] 19.3 Listar utilizações com detalhes
  - _Requirements: 3.3_

### Fase 8: Frontend - Integração

- [x] 20. Actualizar Onboarding para Trial
  - [x] 20.1 Exibir informação de trial na selecção de plano
  - [x] 20.2 Ajustar fluxo para planos com trial (skip pagamento)
  - [x] 20.3 Exibir mensagem de trial activo após registo
  - _Requirements: 5.1_
  - **File**: `frontend/src/features/auth/pages/onboarding-page.tsx`

- [x] 21. Adicionar Campo de Cupão no Checkout
  - [x] 21.1 Adicionar input de código de cupão
  - [x] 21.2 Implementar validação em tempo real
  - [x] 21.3 Exibir desconto no resumo
  - [x] 21.4 Enviar cupão na requisição de pagamento
  - _Requirements: 3.2_
  - **File**: `frontend/src/features/auth/pages/onboarding-page.tsx`

- [x] 22. Actualizar Dashboard do Utilizador
  - [x] 22.1 Exibir card de assinatura com status
  - [x] 22.2 Exibir dias restantes (trial ou assinatura)
  - [x] 22.3 Exibir alertas de expiração
  - [x] 22.4 Adicionar botão de renovar
  - _Requirements: 5.2_
  - **Files**: 
    - `frontend/src/features/dashboard/pages/dashboard-page.tsx`
    - `frontend/src/shared/hooks/use-subscription.ts`
    - `frontend/src/shared/api/subscriptions.ts`

### Fase 9: Testes e Documentação

- [ ] 23. Escrever Testes
  - [ ] 23.1 Testes unitários para plan.service
  - [ ] 23.2 Testes unitários para campaign.service
  - [ ] 23.3 Testes unitários para subscription.service (trial, expiração)
  - [ ] 23.4 Testes de integração para fluxo de cupão
  - [ ] 23.5 Testes de integração para fluxo de trial

- [ ] 24. Checkpoint Final
  - [ ] 24.1 Verificar todas as funcionalidades
  - [ ] 24.2 Testar fluxos completos
  - [ ] 24.3 Verificar logs e auditoria

## Notes

- A implementação será feita em fases para permitir testes incrementais
- Os jobs de notificação inicialmente apenas fazem log (sem envio real de email/SMS)
- A tabela `campaigns` já existe, apenas serão adicionados campos
- Manter compatibilidade com assinaturas existentes

## Migration Required

Execute a migration antes de testar:
```bash
psql -h localhost -U postgres -d financecontrol -f backend/migrations/add_subscription_management.sql
```
