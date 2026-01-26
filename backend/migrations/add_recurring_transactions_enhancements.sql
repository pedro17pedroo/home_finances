-- Add enhanced recurring transactions support with notifications

-- Add notification preferences enum
DO $$ BEGIN
  CREATE TYPE notification_channel AS ENUM ('app', 'email', 'sms');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create recurring transactions table (standalone)
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Transaction details
  type transaction_type NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category VARCHAR(255) NOT NULL,
  
  -- Recurrence configuration
  frequency VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly'
  interval INTEGER DEFAULT 1, -- Every X days/weeks/months/years
  day_of_week INTEGER, -- 0-6 for weekly (0=Sunday)
  day_of_month INTEGER, -- 1-31 for monthly
  month_of_year INTEGER, -- 1-12 for yearly
  
  -- Schedule dates
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP, -- Optional end date
  next_execution_date TIMESTAMP NOT NULL,
  last_execution_date TIMESTAMP,
  
  -- Status and control
  is_active BOOLEAN DEFAULT true,
  max_occurrences INTEGER, -- Optional limit
  execution_count INTEGER DEFAULT 0,
  
  -- Notification settings
  notify_before_days INTEGER DEFAULT 1, -- Notify X days before execution
  notification_channels JSONB DEFAULT '["app"]'::jsonb, -- Array of channels: app, email, sms
  last_notification_sent TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT valid_frequency CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  CONSTRAINT valid_day_of_week CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),
  CONSTRAINT valid_day_of_month CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31)),
  CONSTRAINT valid_month_of_year CHECK (month_of_year IS NULL OR (month_of_year >= 1 AND month_of_year <= 12))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_user ON recurring_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_org ON recurring_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_account ON recurring_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_next_execution ON recurring_transactions(next_execution_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_active ON recurring_transactions(is_active);

-- Create recurring transaction executions history table
CREATE TABLE IF NOT EXISTS recurring_transaction_executions (
  id SERIAL PRIMARY KEY,
  recurring_transaction_id INTEGER NOT NULL REFERENCES recurring_transactions(id) ON DELETE CASCADE,
  transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
  
  -- Execution details
  scheduled_date TIMESTAMP NOT NULL,
  executed_date TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'skipped'
  error_message TEXT,
  
  -- Snapshot of values at execution time
  amount DECIMAL(10, 2) NOT NULL,
  account_balance_before DECIMAL(10, 2),
  account_balance_after DECIMAL(10, 2),
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_execution_status CHECK (status IN ('pending', 'completed', 'failed', 'skipped'))
);

CREATE INDEX IF NOT EXISTS idx_recurring_executions_recurring_id ON recurring_transaction_executions(recurring_transaction_id);
CREATE INDEX IF NOT EXISTS idx_recurring_executions_status ON recurring_transaction_executions(status);
CREATE INDEX IF NOT EXISTS idx_recurring_executions_scheduled ON recurring_transaction_executions(scheduled_date);

-- Create recurring transaction notifications table
CREATE TABLE IF NOT EXISTS recurring_transaction_notifications (
  id SERIAL PRIMARY KEY,
  recurring_transaction_id INTEGER NOT NULL REFERENCES recurring_transactions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Notification details
  scheduled_execution_date TIMESTAMP NOT NULL,
  notification_type VARCHAR(50) NOT NULL, -- 'upcoming', 'executed', 'failed'
  channel VARCHAR(20) NOT NULL, -- 'app', 'email', 'sms'
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  sent_at TIMESTAMP,
  error_message TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_notification_type CHECK (notification_type IN ('upcoming', 'executed', 'failed')),
  CONSTRAINT valid_notification_channel CHECK (channel IN ('app', 'email', 'sms')),
  CONSTRAINT valid_notification_status CHECK (status IN ('pending', 'sent', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_recurring_notifications_recurring_id ON recurring_transaction_notifications(recurring_transaction_id);
CREATE INDEX IF NOT EXISTS idx_recurring_notifications_user ON recurring_transaction_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_notifications_status ON recurring_transaction_notifications(status);

-- Add comment
COMMENT ON TABLE recurring_transactions IS 'Standalone recurring transactions (standing orders) with advanced scheduling and notification support';
COMMENT ON TABLE recurring_transaction_executions IS 'History of recurring transaction executions';
COMMENT ON TABLE recurring_transaction_notifications IS 'Notifications sent for recurring transactions';
