# Requirements: Arquitectura Multi-Tenant por Organização

## Contexto
O sistema é um SaaS de gestão financeira pessoal/empresarial. Actualmente os dados estão segregados por `userId`, mas para suportar equipas e partilha de dados entre membros, precisamos migrar para segregação por `organizationId`.

## Requisitos Funcionais

### 1. Organização Automática
- 1.1 Quando um utilizador se regista (master), uma organização é criada automaticamente
- 1.2 A organização herda o nome do utilizador master (pode ser alterado depois)
- 1.3 O utilizador master torna-se owner da organização
- 1.4 A assinatura/plano fica associada à organização, não ao utilizador

### 2. Segregação de Dados por Organização
- 2.1 Todas as contas bancárias pertencem à organização
- 2.2 Todas as transações pertencem à organização
- 2.3 Todas as categorias pertencem à organização
- 2.4 Todas as metas de poupança pertencem à organização
- 2.5 Todos os empréstimos e dívidas pertencem à organização
- 2.6 Todas as transferências pertencem à organização

### 3. Membros da Organização
- 3.1 Membros convidados vêem os mesmos dados da organização
- 3.2 Permissões baseadas em role (owner, admin, member)
- 3.3 Owner pode gerir membros e assinatura
- 3.4 Admin pode gerir dados mas não assinatura
- 3.5 Member pode apenas visualizar e criar transações

### 4. Assinatura por Organização
- 4.1 A assinatura é da organização, não do utilizador individual
- 4.2 Limites do plano aplicam-se à organização (ex: max contas, max transações)
- 4.3 Todos os membros beneficiam do plano da organização

### 5. Migração de Dados Existentes
- 5.1 Utilizadores existentes sem organização devem ter uma criada
- 5.2 Dados existentes devem ser associados à nova organização
- 5.3 Assinaturas existentes devem ser migradas para a organização

## Requisitos Não-Funcionais
- Manter compatibilidade com dados existentes
- Não quebrar funcionalidades actuais durante a migração
- Performance: queries devem usar índices em organizationId
