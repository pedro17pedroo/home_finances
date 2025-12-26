# Requirements Document

## Introduction

Este documento define os requisitos para permitir que um utilizador pertença a múltiplas organizações simultaneamente. Atualmente, um utilizador só pode pertencer a uma organização (via `users.organizationId`). Esta funcionalidade permitirá:

1. Utilizadores convidados para uma organização possam criar a sua própria organização
2. Utilizadores possam alternar entre organizações no aplicativo
3. Cada organização mantém a sua própria subscrição independente
4. Utilizadores podem ter diferentes papéis em diferentes organizações

## Glossary

- **User**: Pessoa registada no sistema com credenciais de autenticação
- **Organization**: Entidade que agrupa contas, transações e outros dados financeiros
- **Owner**: Utilizador que criou e é dono de uma organização
- **Member**: Utilizador que foi convidado para colaborar numa organização
- **Active_Organization**: Organização atualmente selecionada pelo utilizador no aplicativo
- **Organization_Membership**: Relação entre um utilizador e uma organização, incluindo o papel
- **Subscription**: Plano de subscrição associado a uma organização específica

## Requirements

### Requirement 1: Membership Multi-Organização

**User Story:** As a user, I want to belong to multiple organizations, so that I can manage my personal finances and collaborate with family/business finances separately.

#### Acceptance Criteria

1. THE System SHALL allow a User to be a member of multiple Organizations simultaneously
2. WHEN a User creates an account, THE System SHALL create a default Organization where the User is the Owner
3. WHEN a User accepts an invitation to join an Organization, THE System SHALL add the User as a Member without removing existing memberships
4. THE System SHALL store each Organization_Membership with the User's role (owner, admin, member)
5. WHEN a User is removed from an Organization, THE System SHALL preserve the User's account and other memberships

### Requirement 2: Criação de Organização Própria por Membros Convidados

**User Story:** As a member invited to an organization, I want to create my own organization, so that I can manage my personal finances independently.

#### Acceptance Criteria

1. WHEN a User who is only a Member (not Owner) of any Organization requests to create a new Organization, THE System SHALL allow the creation
2. WHEN a new Organization is created, THE System SHALL set the creating User as the Owner
3. THE System SHALL allow a User to be Owner of multiple Organizations
4. WHEN creating a new Organization, THE System SHALL NOT affect the User's existing memberships in other Organizations

### Requirement 3: Alternância entre Organizações

**User Story:** As a user with multiple organization memberships, I want to switch between organizations in the app, so that I can view and manage different financial contexts.

#### Acceptance Criteria

1. THE System SHALL track which Organization is the User's Active_Organization
2. WHEN a User logs in, THE System SHALL set the Active_Organization to the last used Organization
3. WHEN a User switches Organizations, THE System SHALL update the Active_Organization and refresh all displayed data
4. THE System SHALL display a menu/selector showing all Organizations the User belongs to
5. WHEN displaying the Organization selector, THE System SHALL show the User's role in each Organization
6. THE System SHALL persist the Active_Organization selection across sessions

### Requirement 4: Subscrições por Organização

**User Story:** As an organization owner, I want my organization to have its own subscription, so that billing is separate from other organizations I belong to.

#### Acceptance Criteria

1. THE System SHALL associate Subscriptions with Organizations, not Users
2. WHEN a User creates a new Organization, THE System SHALL allow selecting a subscription plan for that Organization
3. WHEN checking feature access, THE System SHALL use the Active_Organization's Subscription
4. THE System SHALL allow different Organizations to have different subscription plans
5. WHEN a User switches Organizations, THE System SHALL apply the feature limits of the new Active_Organization's Subscription

### Requirement 5: Convites e Aceitação

**User Story:** As an organization owner, I want to invite users who may already have accounts, so that they can collaborate without losing their existing data.

#### Acceptance Criteria

1. WHEN an Owner invites an email that already has an account, THE System SHALL send an invitation to join the Organization
2. WHEN a User with an existing account accepts an invitation, THE System SHALL add the membership without creating a new account
3. WHEN an Owner invites an email without an account, THE System SHALL send an invitation to register and join
4. WHEN a new User registers via invitation, THE System SHALL create their account AND their own default Organization AND add them to the inviting Organization
5. IF a User tries to register with an email that already exists, THEN THE System SHALL show an error with option to login and accept pending invitations

### Requirement 6: Isolamento de Dados por Organização

**User Story:** As a user, I want my data in each organization to be completely separate, so that personal and shared finances don't mix.

#### Acceptance Criteria

1. THE System SHALL filter all financial data (accounts, transactions, categories, etc.) by Active_Organization
2. WHEN a User creates data (account, transaction, etc.), THE System SHALL associate it with the Active_Organization
3. THE System SHALL NOT allow Users to access data from Organizations they don't belong to
4. WHEN a User is removed from an Organization, THE System SHALL NOT delete data they created in that Organization

### Requirement 7: Interface de Gestão de Organizações

**User Story:** As a user, I want to manage my organizations from my profile, so that I can see all my memberships and create new organizations.

#### Acceptance Criteria

1. THE System SHALL provide a screen listing all Organizations the User belongs to
2. WHEN displaying Organizations, THE System SHALL show the User's role and the Organization's subscription status
3. THE System SHALL provide an option to create a new Organization from the management screen
4. WHEN a User is an Owner, THE System SHALL show options to manage team members
5. WHEN a User is a Member, THE System SHALL show an option to leave the Organization

### Requirement 8: Migração de Dados Existentes

**User Story:** As a system administrator, I want existing data to be migrated correctly, so that current users don't lose access to their data.

#### Acceptance Criteria

1. WHEN migrating, THE System SHALL create Organization_Membership records for all existing User-Organization relationships
2. WHEN migrating, THE System SHALL preserve the current organizationId as the User's Active_Organization
3. THE System SHALL ensure all existing Owners remain Owners after migration
4. THE System SHALL ensure all existing Members remain Members after migration
