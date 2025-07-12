# Sistema de Controle Financeiro Doméstico

## Overview

This is a comprehensive domestic financial control system built with React, Express, and PostgreSQL. The application provides tools for managing personal finances including income tracking, expense monitoring, savings goals, loans, and debt management with detailed reporting and analytics.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (December 2025)

- ✅ **Complete SaaS Platform Migration**: Successfully transformed from basic financial control to complete SaaS platform
- ✅ **Landing Page & Pricing**: Professional landing page with 3-tier pricing (Basic R$29, Premium R$59, Enterprise R$149)
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
- ✅ **Dashboard Integration**: "Adicionar Conta" button now redirects to the dedicated accounts management page

## Current Status
The system is a **complete, production-ready SaaS platform** with all MVP and core features implemented. All pages are functional and the user journey from landing to subscription is complete.

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