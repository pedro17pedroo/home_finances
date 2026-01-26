-- Migration: Update accounts table to support more types and color
-- Date: 2024-12-29

-- Step 1: Add color column if not exists
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS color VARCHAR(20);

-- Step 2: Change type column from enum to varchar to support more types
-- First, create a temporary column
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS type_new VARCHAR(50);

-- Copy data from old column to new
UPDATE accounts SET type_new = type::text WHERE type_new IS NULL;

-- Set default for new column
ALTER TABLE accounts ALTER COLUMN type_new SET DEFAULT 'corrente';

-- Make new column not null (after copying data)
UPDATE accounts SET type_new = 'corrente' WHERE type_new IS NULL;
ALTER TABLE accounts ALTER COLUMN type_new SET NOT NULL;

-- Drop old column and rename new one (only if type is still enum)
-- Note: This is a destructive operation, run with caution
-- If the column is already varchar, this will fail gracefully

-- Check if type column is enum and convert
DO $$
BEGIN
    -- Check if the column type is an enum
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' 
        AND column_name = 'type' 
        AND data_type = 'USER-DEFINED'
    ) THEN
        -- Drop the old enum column
        ALTER TABLE accounts DROP COLUMN type;
        -- Rename the new column
        ALTER TABLE accounts RENAME COLUMN type_new TO type;
    ELSE
        -- Column is already varchar, just drop the temp column if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'accounts' 
            AND column_name = 'type_new'
        ) THEN
            ALTER TABLE accounts DROP COLUMN type_new;
        END IF;
    END IF;
END $$;

-- Add comment
COMMENT ON COLUMN accounts.type IS 'Account type: corrente, poupanca, investimento, carteira, outro';
COMMENT ON COLUMN accounts.color IS 'Account color for UI display (hex format)';
