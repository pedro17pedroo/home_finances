-- Migration: Add active_organization_id to users table
-- Tracks which organization is currently selected by the user

-- Add active_organization_id column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_organization_id INTEGER REFERENCES organizations(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_active_organization_id ON users(active_organization_id);
