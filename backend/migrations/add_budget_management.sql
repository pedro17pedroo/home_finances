-- Migration: Add budget management system
-- Enables users to create budgets with alerts and track spending

-- Budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL,
  time_period VARCHAR(20) NOT NULL CHECK (time_period IN ('daily', 'weekly', 'monthly', 'annual', 'custom')),
  custom_start_date TIMESTAMP WITH TIME ZONE,
  custom_end_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_custom_dates CHECK (
    (time_period = 'custom' AND custom_start_date IS NOT NULL AND custom_end_date IS NOT NULL)
    OR (time_period != 'custom' AND custom_start_date IS NULL AND custom_end_date IS NULL)
  ),
  CONSTRAINT end_after_start CHECK (custom_end_date IS NULL OR custom_end_date > custom_start_date)
);

-- Budget alerts table
CREATE TABLE IF NOT EXISTS budget_alerts (
  id SERIAL PRIMARY KEY,
  budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  threshold_type VARCHAR(20) NOT NULL CHECK (threshold_type IN ('fixed_amount', 'percentage')),
  threshold_value NUMERIC(15, 2) NOT NULL CHECK (threshold_value > 0),
  position VARCHAR(20) NOT NULL CHECK (position IN ('before_limit', 'after_limit')),
  channels JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alert triggers table (for deduplication)
CREATE TABLE IF NOT EXISTS alert_triggers (
  id SERIAL PRIMARY KEY,
  alert_id INTEGER NOT NULL REFERENCES budget_alerts(id) ON DELETE CASCADE,
  budget_period_id VARCHAR(100) NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  spending_amount NUMERIC(15, 2) NOT NULL,
  UNIQUE(alert_id, budget_period_id)
);

-- Budget history table
CREATE TABLE IF NOT EXISTS budget_history (
  id SERIAL PRIMARY KEY,
  budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  period_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  final_spending_amount NUMERIC(15, 2) NOT NULL,
  percentage_used NUMERIC(5, 2) NOT NULL,
  alerts_triggered JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_budgets_org_category ON budgets(organization_id, category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(status);
CREATE INDEX IF NOT EXISTS idx_budgets_time_period ON budgets(time_period);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_budget ON budget_alerts(budget_id);
CREATE INDEX IF NOT EXISTS idx_alert_triggers_alert_period ON alert_triggers(alert_id, budget_period_id);
CREATE INDEX IF NOT EXISTS idx_budget_history_budget ON budget_history(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_history_dates ON budget_history(period_start_date, period_end_date);

-- Add comments for documentation
COMMENT ON TABLE budgets IS 'Stores budget configurations for spending categories with time periods';
COMMENT ON TABLE budget_alerts IS 'Stores alert configurations for budgets with threshold and channel settings';
COMMENT ON TABLE alert_triggers IS 'Tracks triggered alerts to prevent duplicate notifications within the same period';
COMMENT ON TABLE budget_history IS 'Archives budget performance data at the end of each period';

COMMENT ON COLUMN budgets.time_period IS 'Budget time period: daily, weekly, monthly, annual, or custom';
COMMENT ON COLUMN budgets.custom_start_date IS 'Start date for custom time period (required when time_period is custom)';
COMMENT ON COLUMN budgets.custom_end_date IS 'End date for custom time period (required when time_period is custom)';
COMMENT ON COLUMN budget_alerts.threshold_type IS 'Type of threshold: fixed_amount or percentage';
COMMENT ON COLUMN budget_alerts.threshold_value IS 'Threshold value (amount in currency or percentage of budget)';
COMMENT ON COLUMN budget_alerts.position IS 'Alert position: before_limit or after_limit';
COMMENT ON COLUMN budget_alerts.channels IS 'JSON array of notification channels with enabled status';
COMMENT ON COLUMN alert_triggers.budget_period_id IS 'Identifier for the budget period (e.g., "2024-01-monthly")';
COMMENT ON COLUMN budget_history.alerts_triggered IS 'JSON array of alert IDs that were triggered during the period';
