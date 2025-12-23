-- Migration: Add organization_id to all data tables for multi-tenant support
-- This migration adds organization_id foreign key to all main data tables
-- to support data segregation by organization instead of by user

-- Step 1: Add organization_id column to accounts table
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);

-- Step 2: Add organization_id column to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);

-- Step 3: Add organization_id column to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);

-- Step 4: Add organization_id column to savings_goals table
ALTER TABLE savings_goals 
ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);

-- Step 5: Add organization_id column to loans table
ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);

-- Step 6: Add organization_id column to debts table
ALTER TABLE debts 
ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);

-- Step 7: Add organization_id column to transfers table
ALTER TABLE transfers 
ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);

-- Step 8: Add organization_id column to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);

-- Step 9: Add organization_id column to subscription_payments table
ALTER TABLE subscription_payments 
ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);

-- Step 10: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_organization_id ON accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_organization_id ON transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_categories_organization_id ON categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_organization_id ON savings_goals(organization_id);
CREATE INDEX IF NOT EXISTS idx_loans_organization_id ON loans(organization_id);
CREATE INDEX IF NOT EXISTS idx_debts_organization_id ON debts(organization_id);
CREATE INDEX IF NOT EXISTS idx_transfers_organization_id ON transfers(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_organization_id ON subscription_payments(organization_id);

-- Step 11: Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_accounts_org_user ON accounts(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_org_date ON transactions(organization_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_categories_org_type ON categories(organization_id, type);

-- Note: After running this migration, run the data migration script to:
-- 1. Create organizations for existing users without one
-- 2. Populate organization_id in all tables based on user's organization
