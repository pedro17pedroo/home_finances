-- Migration: Add userId to categories table for multi-tenant support
-- Each user will have their own categories

-- Add userId column (nullable first to handle existing data)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);

-- Add isDefault column to mark default categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Create index for faster queries by user
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

-- Create index for faster queries by user and type
CREATE INDEX IF NOT EXISTS idx_categories_user_type ON categories(user_id, type);
