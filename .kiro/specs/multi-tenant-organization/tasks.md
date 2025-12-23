# Tasks: Implementação Multi-Tenant por Organização

## Fase 1: Alterações na Base de Dados

- [x] 1. Criar migration para adicionar organizationId às tabelas
  - [x] 1.1 Adicionar `organization_id` à tabela `accounts`
  - [x] 1.2 Adicionar `organization_id` à tabela `transactions`
  - [x] 1.3 Adicionar `organization_id` à tabela `categories`
  - [x] 1.4 Adicionar `organization_id` à tabela `savings_goals`
  - [x] 1.5 Adicionar `organization_id` à tabela `loans`
  - [x] 1.6 Adicionar `organization_id` à tabela `debts`
  - [x] 1.7 Adicionar `organization_id` à tabela `transfers`
  - [x] 1.8 Adicionar `organization_id` à tabela `subscriptions`
  - [x] 1.9 Criar índices para performance
  - **File**: `backend/migrations/add_organization_multi_tenant.sql`

- [x] 2. Actualizar schema Drizzle
  - [x] 2.1 Adicionar campo `organizationId` às tabelas no schema.ts
  - [x] 2.2 Adicionar relações com organizations
  - **File**: `backend/src/core/database/schema.ts`

## Fase 2: Backend - Serviços de Organização

- [x] 3. Actualizar Auth Service para criar organização no registo
  - [x] 3.1 Criar organização automaticamente no registo (já existia)
  - [x] 3.2 Associar utilizador à organização como owner (já existia)
  - [x] 3.3 Retornar organizationId no token/resposta
  - **File**: `backend/src/domain/services/auth.service.ts`

- [x] 4. Criar middleware de contexto de organização
  - [x] 4.1 Extrair organizationId do utilizador autenticado
  - [x] 4.2 Adicionar organizationId ao request
  - [x] 4.3 Validar acesso à organização
  - **File**: `backend/src/api/middlewares/organization.ts`

## Fase 3: Backend - Actualizar Repositórios

- [x] 5. Actualizar Account Repository
  - [x] 5.1 Filtrar por organizationId em vez de userId
  - [x] 5.2 Incluir organizationId na criação
  - **File**: `backend/src/domain/repositories/account.repository.ts`

- [x] 6. Actualizar Transaction Repository
  - [x] 6.1 Filtrar por organizationId
  - [x] 6.2 Incluir organizationId na criação
  - **File**: `backend/src/domain/repositories/transaction.repository.ts`

- [x] 7. Actualizar Category Repository
  - [x] 7.1 Filtrar por organizationId
  - [x] 7.2 Incluir organizationId na criação
  - **File**: `backend/src/domain/repositories/category.repository.ts`

- [x] 8. Actualizar outros repositórios
  - [x] 8.1 SavingsGoal Repository
  - [x] 8.2 Loan Repository
  - [x] 8.3 Debt Repository
  - [x] 8.4 Transfer Repository

## Fase 4: Backend - Actualizar Serviços

- [x] 9. Actualizar Account Service
  - [x] 9.1 Usar organizationId do contexto
  - [x] 9.2 Verificar limites por organização
  - **File**: `backend/src/domain/services/account.service.ts`

- [x] 10. Actualizar Transaction Service
  - [x] 10.1 Usar organizationId do contexto
  - **File**: `backend/src/domain/services/transaction.service.ts`

- [x] 11. Actualizar Plan Access Service
  - [x] 11.1 Verificar limites por organização
  - [x] 11.2 Buscar assinatura da organização
  - **File**: `backend/src/domain/services/plan-access.service.ts`

- [x] 12. Actualizar Subscription Service
  - [x] 12.1 Associar assinatura à organização
  - [x] 12.2 Verificar assinatura por organizationId
  - **File**: `backend/src/domain/services/subscription.service.ts`

- [x] 13. Actualizar outros serviços
  - [x] 13.1 Category Service
  - [x] 13.2 Loan Service
  - [x] 13.3 Debt Service
  - [x] 13.4 Transfer Service
  - [x] 13.5 SavingsGoal Service

## Fase 5: Backend - Actualizar Controllers e Routes

- [x] 14. Actualizar controllers para usar organizationId
  - [x] 14.1 Account Controller (já actualizado)
  - [x] 14.2 Transaction Controller
  - [x] 14.3 Category Controller
  - [x] 14.4 Loan Controller
  - [x] 14.5 Debt Controller
  - [x] 14.6 Transfer Controller
  - [x] 14.7 SavingsGoal Controller

- [x] 15. Actualizar routes para usar organization middleware
  - [x] 15.1 Account Routes (já actualizado)
  - [x] 15.2 Transaction Routes
  - [x] 15.3 Category Routes
  - [x] 15.4 Loan Routes
  - [x] 15.5 Debt Routes
  - [x] 15.6 Transfer Routes
  - [x] 15.7 SavingsGoal Routes

## Fase 6: Frontend - Contexto de Organização

- [x] 16. Criar contexto de organização no frontend
  - [x] 16.1 Armazenar organizationId
  - [x] 16.2 Disponibilizar para toda a aplicação
  - [x] 16.3 Corrigir endpoint de `/organizations/current` para `/organizations/my`
  - **File**: `frontend/src/shared/contexts/organization-context.tsx`

- [x] 17. Actualizar hooks para usar organizationId
  - [x] 17.1 Não necessário - organizationId é gerido pelo backend via middleware
  - [x] 17.2 Não necessário - organizationId é gerido pelo backend via middleware
  - [x] 17.3 Não necessário - organizationId é gerido pelo backend via middleware

## Fase 7: Migration de Dados Existentes

- [x] 18. Criar script de migração de dados
  - [x] 18.1 Criar organizações para utilizadores existentes
  - [x] 18.2 Associar dados existentes às organizações
  - [x] 18.3 Migrar assinaturas para organizações
  - **File**: `backend/migrations/migrate_existing_data_to_organizations.sql`

## Notas
- Executar migrations em ordem:
  1. `backend/migrations/add_organization_multi_tenant.sql`
  2. `backend/migrations/migrate_existing_data_to_organizations.sql`
- Testar cada fase antes de avançar
- Manter backward compatibility durante a transição
- O frontend não precisa de alterações significativas pois o organizationId é gerido pelo backend através do middleware

## Status Final: ✅ COMPLETO

A implementação multi-tenant por organização está completa. Todas as fases foram implementadas:

1. **Base de Dados**: Migrations criadas para adicionar `organization_id` a todas as tabelas relevantes
2. **Backend**: Middleware, repositórios, serviços e controllers actualizados para usar `organizationId`
3. **Frontend**: Contexto de organização criado e endpoint corrigido

### Próximos Passos (Manual):
1. Executar as migrations na base de dados
2. Testar o fluxo completo de registo → login → operações
3. Verificar que dados são correctamente segregados por organização
