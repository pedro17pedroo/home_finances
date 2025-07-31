# Sistema de Controle Financeiro Doméstico

## Overview

This is a comprehensive domestic financial control system built with React, Express, and PostgreSQL. The application provides tools for managing personal finances including income tracking, expense monitoring, savings goals, loans, and debt management with detailed reporting and analytics.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (July 2025)

- ✅ **Replit Environment Migration**: Successfully migrated from Replit Agent to standard Replit environment with full database setup
- ✅ **Date Validation Fix**: Fixed critical date parsing issues in savings goals, loans, and debts API endpoints
- ✅ **Stripe Integration**: Configured Stripe API keys for payment processing functionality
- ✅ **Complete SaaS Platform Migration**: Successfully transformed from basic financial control to complete SaaS platform
- ✅ **Landing Page & Pricing**: Professional landing page with 3-tier pricing (Basic 14.500 Kz, Premium 29.500 Kz, Enterprise 74.500 Kz)
- ✅ **Enhanced Registration**: Plan selection during signup with 14-day free trial
- ✅ **All Core Features**: Dashboard, transactions, savings goals, loans/debts, reports all fully functional
- ✅ **Stripe Integration**: Payment processing and subscription management
- ✅ **Complete Documentation**: Comprehensive PRD-based documentation with implementation roadmap
- ✅ **Plan-Based Access Control**: Implemented comprehensive subscription restrictions and upgrade flows
- ✅ **Two-Step Registration**: Plan selection first, then account creation with immediate redirect to dashboard
- ✅ **Complete Subscription Management**: Full subscription control panel with status monitoring, plan changes, cancellation, and billing portal integration
- ✅ **Real-time Notifications**: Smart notifications for trial ending, payment issues, and subscription status changes
- ✅ **Stripe Webhooks**: Automatic subscription status synchronization via webhooks
- ✅ **Responsive Navigation**: Mobile-first responsive header with slide-out menu and optimized breakpoints
- ✅ **Plan Limit Implementation**: Comprehensive plan limits for Basic tier with 5 accounts max and 1000 transactions/month
- ✅ **Replit Migration**: Successfully migrated from Replit Agent to standard Replit environment with proper security
- ✅ **Account Management Page**: Dedicated page for managing bank accounts with create/edit/delete functionality
- ✅ **Dashboard Integration**: "Adicionar Conta" button now opens a modal with account creation form directly in the dashboard
- ✅ **Transaction Forms Enhancement**: Added "Nova Conta" button in transaction forms (receitas/despesas) for quick account creation
- ✅ **Angola Localization**: Complete adaptation for Angola market with AOA currency, Angolan bank references, and localized pricing
- ✅ **Currency Conversion**: All remaining R$ references converted to Kz (Angolan Kwanza) across all forms, pages, and documentation
- ✅ **Plan Selection Fix**: Fixed registration flow to properly respect selected plan type during account creation
- ✅ **Replit Migration Completed**: Successfully migrated from Replit Agent to standard Replit environment with PostgreSQL database
- ✅ **Database Setup Complete**: Created PostgreSQL database, applied migrations, and populated default plans
- ✅ **Database Seeding System**: Created comprehensive seeding system for plans with automatic verification and documentation
- ✅ **Account Balance Synchronization**: Fixed critical issue where account balances weren't updating with transactions - implemented automatic balance calculation
- ✅ **Form Conflict Resolution**: Fixed issue where creating accounts from transaction forms inadvertently saved transactions
- ✅ **Dynamic Statistics**: Implemented automatic calculation for "Este Mês" and "Média Mensal" cards in Receitas and Despesas pages
- ✅ **Advanced Filtering & Pagination**: Added comprehensive filtering system (search, category, value range, date period) and pagination to Income and Expenses pages
- ✅ **Account Card Enhancement**: Updated account cards to display name, bank, and account type clearly
- ✅ **Centralized Cache Synchronization**: Implemented comprehensive cache synchronization system with useCacheSync hook for real-time UI updates
- ✅ **React Query Optimization**: Updated all mutations across the application to use centralized cache invalidation for consistent state management
- ✅ **Real-time UI Updates**: System now updates automatically without page refreshes across all components (transactions, accounts, loans, debts, savings goals)
- ✅ **Streamlined Registration Flow**: Removed duplicate plan selection step - users now go directly from landing page plan selection to registration form with plan pre-selected
- ✅ **Dynamic Plan Loading**: Landing page now loads plans directly from database instead of hardcoded data
- ✅ **Admin Panel Planning**: Comprehensive implementation plan created for complete admin panel with user management, plan management, campaigns, content management, and payment settings
- ✅ **Admin Panel Phase 1 & 2**: Complete admin panel foundation with authentication, dashboard, user management, and plan management implemented
- ✅ **Admin Panel Phase 2 Improvements**: Enhanced plan CRUD with unlimited plans, user-friendly forms replacing JSON input, comprehensive feature management, and improved price adjustment capabilities
- ✅ **Admin Panel Phase 3-4**: Complete implementation of payment methods, campaigns, landing content, legal content, and system settings management
- ✅ **Admin Panel Phase 5**: Advanced analytics system with metrics, audit logs with comprehensive filtering, and security logs with threat monitoring
- ✅ **Complete Admin System**: All admin panel phases (1-5) fully implemented with proper authentication, permissions, and comprehensive management capabilities
- ✅ **Database Setup Complete**: Admin user created, categories populated, plans configured - all core data structures ready
- ✅ **Replit Environment Migration**: Successfully migrated from Replit Agent to standard Replit environment with proper security, database setup, and dependency management
- ✅ **React Suspension Issues Fixed**: Resolved React component suspension errors by implementing proper error handling in authentication queries and preventing synchronous state updates during render
- ✅ **React Component Fixes**: Fixed AdminLogin component state update issue preventing React suspension errors
- ✅ **Comprehensive Error Handling**: Implemented error boundaries throughout App component and fixed all admin pages to use throwOnError: false in useQuery calls
- ✅ **Admin Payment Methods Fix**: Resolved admin payment methods page routing error by properly wrapping component in AdminLayout and fixing import structure
- ✅ **Admin Sidebar Fix**: Fixed missing sidebar issue by creating wrapper components for all admin pages, ensuring every admin page properly displays AdminLayout with sidebar navigation
- ✅ **Complete User Management CRUD**: Implemented full Create, Read, Update, Delete functionality for users in admin panel with modal forms and database integration
- ✅ **Final Replit Environment Migration (July 2025)**: Successfully completed migration from Replit Agent to standard Replit environment with database setup, seeds execution, and billing portal fix
- ✅ **Replit Migration Completed (July 29, 2025)**: Successfully migrated project from Replit Agent to standard Replit environment with PostgreSQL database, all seeds executed, admin user created, and Stripe payment integration fixed
- ✅ **Arquitetura MVC Implementada (July 30, 2025)**: Reestruturado servidor para usar arquitetura Controller-Model-Middleware-Router com separação clara de responsabilidades, middleware de autenticação e segurança, e roteamento modular
- ✅ **Sistema de Subscrições Completo (July 30, 2025)**: Implementado sistema completo de gestão de subscrições com verificação automática de expiração, middleware de bloqueio, serviço de notificações, e sistema de pagamentos manuais com upload de comprovantes e aprovação administrativa
- ✅ **Payment Flow Fixes**: Fixed critical payment transaction data flow issues, resolved undefined transaction IDs in Stripe session creation, and improved error handling in payment components
- ✅ **Security System Documentation**: Created comprehensive documentation explaining IP blocking, security event monitoring, and brute force protection mechanisms
- ✅ **Audit Logs System Optimization**: Enhanced audit logs functionality with real CSV export, comprehensive filtering, and complete database integration with proper data validation
- ✅ **Real Analytics Implementation**: Replaced mock data with real database queries for all analytics endpoints including revenue, user growth, conversions, churn, and cohort analysis
- ✅ **Analytics Database Integration**: Connected all admin panel analytics to PostgreSQL database with real-time metrics calculation and proper data aggregation
- ✅ **Complete System Configuration Implementation**: Built comprehensive database-driven configuration system with backend API, frontend hooks, and configurable components for currency, text, and plan limits
- ✅ **Dynamic Plan Limits**: Updated plan limits system to use database configurations instead of hardcoded values, supporting unlimited plans with -1 values
- ✅ **Configurable UI Components**: Created SystemText, CurrencyDisplay, and specialized components for dynamic content management across the platform
- ✅ **Sistema de Campanhas Completo**: Implementado sistema completo de campanhas e cupons de desconto com integração total ao Stripe, planos e sistema de usuários - inclui validação de cupons, aplicação de descontos, rastreamento de uso, estatísticas detalhadas e painel administrativo completo
- ✅ **Sistema de Múltiplos Métodos de Pagamento**: Criado sistema flexível para suportar Stripe, Multicaixa Express, Unitel Money, AfriMoney e transferências bancárias - com interface unificada, instruções detalhadas e verificação manual para métodos angolanos
- ✅ **Database Schema Expandido**: Adicionadas tabelas payment_transactions e payment_confirmations para rastrear todos os pagamentos e permitir verificação manual com upload de comprovantes
- ✅ **Métodos de Pagamento Angolanos**: Configurados 5 métodos de pagamento com instruções detalhadas, incluindo dados bancários reais do BAI, BFA e BIC para transferências
- ✅ **Sistema de Upload de Comprovantes**: Implementado upload de ficheiros para transferências bancárias com validação de tipo e tamanho, armazenamento seguro e visualização no painel admin
- ✅ **Migração Replit Agent → Replit (July 31, 2025)**: Completada migração final do Replit Agent para ambiente Replit padrão, base de dados PostgreSQL criada e populada, todos os sistemas funcionais - corrigindo política de planos para fonte única de verdade

## Current Status
The system is a **complete, production-ready SaaS platform** with all MVP and core features implemented. All pages are functional and the user journey from landing to subscription is complete.

**Migration Status**: Successfully migrated from Replit Agent to standard Replit environment on July 29, 2025. All core systems functional, database seeded, and billing issues resolved.

**Sistema de Configuração Completo**: Todos os aspectos visuais e funcionais são agora configuráveis através do painel admin, incluindo moeda, textos da landing page, limites de planos, status de trial, e modo de manutenção. Sistema de atualização de configurações corrigido e totalmente funcional.

## Admin Panel Status - ALL PHASES COMPLETED
✅ **Phase 1 - Foundation**: Database schema, admin authentication, basic dashboard
✅ **Phase 2 - Core Management**: User management, plan management with full CRUD operations
✅ **Phase 3 - Payment Systems**: Payment method configuration with Stripe integration
✅ **Phase 4 - Content Management**: Campaign management, landing page content, legal content, system settings
✅ **Phase 5 - Analytics & Monitoring**: Advanced analytics, audit logs, security monitoring with IP blocking

## System Status
**PRODUCTION-READY**: All core features, admin panel, and SaaS functionality completely implemented and functional.

## Admin Panel Access
- URL: `/admin/login`
- Email: admin@financecontrol.com
- Password: admin123
- Role: Super Admin (all permissions)

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Charts**: Chart.js for data visualization
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL with Neon serverless driver
- **Session Management**: Connect-pg-simple for PostgreSQL session storage
- **API Design**: RESTful API with JSON responses

### Database Design
- **Tables**: accounts, transactions, categories, savings_goals, loans, debts
- **Relationships**: Foreign key constraints between transactions and accounts
- **Enums**: PostgreSQL enums for transaction types, statuses, account types, and categories
- **Schema Management**: Drizzle migrations with push-based deployment

## Key Components

### Data Models
- **Accounts**: Bank accounts with types (checking/savings), balances, and interest rates
- **Transactions**: Income and expense records with categories, descriptions, and recurring options
- **Categories**: Predefined categories for transaction classification
- **Savings Goals**: Target-based savings with progress tracking
- **Loans**: Money lent to others with interest rates and due dates
- **Debts**: Money owed with payment tracking

### Frontend Pages
- **Dashboard**: Overview with financial summary, charts, and quick actions
- **Receitas (Income)**: Income transaction management
- **Despesas (Expenses)**: Expense tracking and categorization
- **Poupança (Savings)**: Savings goals and account management
- **Empréstimos (Loans)**: Loan and debt tracking
- **Relatórios (Reports)**: Analytics and financial reports

### API Endpoints
- `/api/accounts` - Account CRUD operations
- `/api/transactions` - Transaction management with filtering
- `/api/savings-goals` - Savings goal tracking
- `/api/loans` - Loan management
- `/api/debts` - Debt tracking
- `/api/dashboard/*` - Aggregated dashboard data

## Data Flow

1. **User Input**: Forms capture financial data with client-side validation
2. **API Requests**: TanStack Query manages API calls with caching and error handling
3. **Database Operations**: Drizzle ORM executes type-safe database queries
4. **Real-time Updates**: Query invalidation ensures UI stays synchronized
5. **Data Visualization**: Chart.js renders financial trends and category breakdowns

## External Dependencies

### Production Dependencies
- **Database**: Neon PostgreSQL serverless database
- **UI Components**: Radix UI primitives for accessibility
- **Charts**: Chart.js for financial visualizations
- **Date Handling**: date-fns for date manipulation
- **Validation**: Zod for runtime type checking

### Development Tools
- **TypeScript**: Type safety across the entire stack
- **Vite**: Fast development server and build tool
- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS**: CSS processing and optimization

## Deployment Strategy

### Build Process
1. **Client Build**: Vite builds React app to `dist/public`
2. **Server Build**: esbuild bundles Express server to `dist/index.js`
3. **Database**: Drizzle migrations applied via `db:push` command

### Environment Configuration
- **Development**: `NODE_ENV=development` with tsx for TypeScript execution
- **Production**: `NODE_ENV=production` with compiled JavaScript
- **Database**: `DATABASE_URL` required for PostgreSQL connection

### File Structure
```
├── client/          # React frontend
├── server/          # Express backend
├── shared/          # Shared TypeScript types and schemas
├── migrations/      # Database migration files
└── dist/           # Build output
```

The application follows a monorepo structure with clear separation between frontend, backend, and shared code, making it easy to maintain and scale.