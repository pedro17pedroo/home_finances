-- Migration: Fix Categories Organization ID
-- Date: 2024-12-23
-- Description: Update categories that have user_id but no organization_id

-- Update categories to use the user's organization_id
UPDATE categories c
SET organization_id = u.organization_id
FROM users u
WHERE c.user_id = u.id 
  AND c.organization_id IS NULL 
  AND u.organization_id IS NOT NULL;
