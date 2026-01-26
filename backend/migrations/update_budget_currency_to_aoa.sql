-- Migration: Update budget currency from USD to AOA
-- Description: Changes all existing budgets to use AOA (Kwanza Angolano) instead of USD
-- Date: 2026-01-26

-- Update all budgets to use AOA currency
UPDATE budgets 
SET currency = 'AOA' 
WHERE currency = 'USD' OR currency IS NULL;

-- Verify the update
SELECT COUNT(*) as updated_budgets 
FROM budgets 
WHERE currency = 'AOA';
