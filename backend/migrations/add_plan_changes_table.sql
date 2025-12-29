-- Migration: Add plan_changes table for tracking upgrades/downgrades with proration
-- Date: 2024-12-29

-- Create plan_changes table
CREATE TABLE IF NOT EXISTS plan_changes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  organization_id INTEGER REFERENCES organizations(id),
  subscription_id INTEGER REFERENCES subscriptions(id),
  
  -- Plan info
  from_plan_id INTEGER REFERENCES plans(id),
  to_plan_id INTEGER NOT NULL REFERENCES plans(id),
  change_type VARCHAR(20) NOT NULL, -- 'upgrade', 'downgrade', 'new'
  
  -- Proration calculation
  from_plan_price DECIMAL(10, 2),
  to_plan_price DECIMAL(10, 2) NOT NULL,
  days_remaining INTEGER, -- Days remaining on old plan
  credit_amount DECIMAL(10, 2) DEFAULT 0, -- Credit from old plan
  amount_to_pay DECIMAL(10, 2) NOT NULL, -- Final amount after proration
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'cancelled', 'scheduled'
  effective_date TIMESTAMP NOT NULL, -- When the change takes effect
  scheduled_for TIMESTAMP, -- For downgrades: when it will be applied (end of current cycle)
  
  -- Payment info (for upgrades)
  payment_id INTEGER REFERENCES subscription_payments(id),
  
  -- Metadata
  reason TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_plan_changes_user_id ON plan_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_changes_organization_id ON plan_changes(organization_id);
CREATE INDEX IF NOT EXISTS idx_plan_changes_status ON plan_changes(status);
CREATE INDEX IF NOT EXISTS idx_plan_changes_scheduled_for ON plan_changes(scheduled_for) WHERE scheduled_for IS NOT NULL;

-- Add comment to table
COMMENT ON TABLE plan_changes IS 'Tracks subscription plan changes (upgrades/downgrades) with proration calculations';
