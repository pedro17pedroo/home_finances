-- Migration: Populate organization_memberships from existing users.organizationId
-- This script migrates existing user-organization relationships to the new memberships table
-- and sets activeOrganizationId from existing organizationId

-- Step 1: Insert membership records for all existing users with organizationId
-- Preserve existing roles (owner/member)
INSERT INTO organization_memberships (user_id, organization_id, role, joined_at, created_at, updated_at)
SELECT 
  u.id as user_id,
  u.organization_id as organization_id,
  COALESCE(u.role, 'member') as role,
  u.created_at as joined_at,
  NOW() as created_at,
  NOW() as updated_at
FROM users u
WHERE u.organization_id IS NOT NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- Step 2: Ensure organization owners have 'owner' role in memberships
-- This handles cases where the user is the owner of the organization
UPDATE organization_memberships om
SET role = 'owner', updated_at = NOW()
FROM organizations o
WHERE om.organization_id = o.id 
  AND om.user_id = o.owner_id
  AND om.role != 'owner';

-- Step 3: Set activeOrganizationId from existing organizationId for all users
UPDATE users
SET active_organization_id = organization_id
WHERE organization_id IS NOT NULL
  AND active_organization_id IS NULL;

-- Step 4: Verify migration integrity
-- This query should return 0 rows if migration was successful
-- (All users with organizationId should have a corresponding membership)
DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM users u
  WHERE u.organization_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM organization_memberships om 
      WHERE om.user_id = u.id AND om.organization_id = u.organization_id
    );
  
  IF missing_count > 0 THEN
    RAISE WARNING 'Migration warning: % users are missing membership records', missing_count;
  ELSE
    RAISE NOTICE 'Migration successful: All existing user-organization relationships migrated';
  END IF;
END $$;
