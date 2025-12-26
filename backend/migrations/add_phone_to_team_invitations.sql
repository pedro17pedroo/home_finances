-- Add phone column to team_invitations table
ALTER TABLE team_invitations ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Make email nullable (since we can now invite by phone)
ALTER TABLE team_invitations ALTER COLUMN email DROP NOT NULL;

-- Add check constraint to ensure at least email or phone is provided
-- Note: This is optional, the application layer already validates this
-- ALTER TABLE team_invitations ADD CONSTRAINT email_or_phone_required 
--   CHECK (email IS NOT NULL OR phone IS NOT NULL);

-- Verify
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'team_invitations' 
ORDER BY ordinal_position;
