-- Migration: Add Subscription Management System
-- Date: 2024-12-22

-- 1. Alterações na tabela plans
ALTER TABLE plans ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT NULL;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 0;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) DEFAULT 'monthly';
ALTER TABLE plans ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 2. Alterações na tabela subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 3. Alterações na tabela campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS applicable_plans JSONB DEFAULT '[]';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS min_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS max_discount DECIMAL(10,2);

-- 4. Criar tabela subscription_notifications
CREATE TABLE IF NOT EXISTS subscription_notifications (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER REFERENCES subscriptions(id) NOT NULL,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  type VARCHAR(50) NOT NULL,
  days_before INTEGER,
  sent_at TIMESTAMP,
  channel VARCHAR(20) DEFAULT 'email',
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_subscription_notifications_subscription_id ON subscription_notifications(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_notifications_user_id ON subscription_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_notifications_status ON subscription_notifications(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends_at ON subscriptions(trial_ends_at);

-- 6. Actualizar planos existentes com valores default
UPDATE plans SET 
  duration_days = 30,
  trial_days = 0,
  billing_cycle = 'monthly',
  sort_order = CASE 
    WHEN type = 'basic' THEN 1
    WHEN type = 'premium' THEN 2
    WHEN type = 'enterprise' THEN 3
    ELSE 0
  END
WHERE duration_days IS NULL;

-- 7. Definir trial de 7 dias para plano premium (exemplo)
UPDATE plans SET trial_days = 7 WHERE type = 'premium' AND trial_days = 0;
