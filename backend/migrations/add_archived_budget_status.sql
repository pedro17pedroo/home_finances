-- Add 'archived' status to budget_status enum
-- This allows budgets with historical data to be archived instead of deleted

-- Add the new value to the enum
ALTER TYPE budget_status ADD VALUE IF NOT EXISTS 'archived';

-- Update the check constraint on budgets table to include 'archived'
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_status_check;
ALTER TABLE budgets ADD CONSTRAINT budgets_status_check 
  CHECK (status IN ('active', 'inactive', 'archived'));

-- Add comment
COMMENT ON COLUMN budgets.status IS 'Budget status: active, inactive, or archived (for budgets with historical data)';
