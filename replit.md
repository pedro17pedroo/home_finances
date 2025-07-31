# Sistema de Controle Financeiro Doméstico

## Overview
This project is a comprehensive, production-ready SaaS platform designed for domestic financial control. It enables users to manage income, track expenses, set savings goals, and handle loans and debts with detailed reporting. The platform offers a multi-tiered subscription model (Basic, Premium, Enterprise) with features like real-time notifications, plan-based access control, and a full subscription management system. It is localized for the Angolan market, using AOA currency and local banking references, and includes a robust admin panel for complete system configuration, user management, and analytics.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query)
- **UI Components**: Radix UI primitives with shadcn/ui
- **Styling**: Tailwind CSS with custom CSS variables
- **Charts**: Chart.js
- **Forms**: React Hook Form with Zod validation
- **Design Principles**: Mobile-first responsive design, consistent theming, real-time UI updates via centralized cache synchronization.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **Database ORM**: Drizzle ORM
- **Database**: PostgreSQL (Neon serverless driver)
- **Session Management**: Connect-pg-simple for PostgreSQL session storage
- **API Design**: RESTful API with JSON responses
- **Architecture Pattern**: Controller-Model-Middleware-Router (CMMR) for clear separation of concerns, authentication, and modular routing.
- **Subscription System**: Comprehensive subscription management with automatic expiration checks, blocking middleware, notification service, and manual payment processing with receipt uploads and admin approval.
- **Security**: IP blocking, security event monitoring, brute force protection, audit logs.
- **System Configuration**: Database-driven configuration for currency, texts, plan limits, trial status, and maintenance mode.

### Database Design
- **Core Tables**: accounts, transactions, categories, savings_goals, loans, debts, payment_transactions, payment_confirmations.
- **Relationships**: Foreign key constraints between related entities.
- **Enums**: PostgreSQL enums for various types and statuses.
- **Schema Management**: Drizzle migrations.

### Core Features
- **Account Management**: Create, edit, delete bank accounts with types and balances.
- **Transaction Management**: Income and expense tracking with categories, descriptions, and recurring options.
- **Financial Goals**: Savings goals, loans, and debt tracking.
- **Reporting**: Comprehensive financial reports and analytics.
- **User Authentication**: Secure login, registration, and password management.
- **Admin Panel**: Full CRUD for users and plans, payment method configuration, campaign management, landing page content management, system settings, advanced analytics, and audit/security logs.
- **Payment System**: Flexible system supporting Stripe and Angolan methods (Multicaixa Express, Unitel Money, AfriMoney, bank transfers) with detailed instructions and manual verification.

## External Dependencies

- **Database**: Neon PostgreSQL serverless database
- **Payment Gateway**: Stripe (for payment processing and subscription management)
- **UI Components**: Radix UI
- **Charting Library**: Chart.js
- **Date Utility**: date-fns
- **Validation**: Zod