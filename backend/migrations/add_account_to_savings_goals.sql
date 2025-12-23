-- Migration: Add accountId to savings_goals table
-- This links savings goals to specific accounts, so progress is tracked by account balance

-- Add accountId column to savings_goals
ALTER TABLE savings_goals 
ADD COLUMN IF NOT EXISTS account_id INTEGER REFERENCES accounts(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_savings_goals_account_id ON savings_goals(account_id);

-- Note: currentAmount will now be calculated from the linked account's balance
-- The currentAmount column is kept for backward compatibility but will be deprecated
