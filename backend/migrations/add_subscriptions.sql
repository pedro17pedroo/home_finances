-- Subscriptions table - TPagamento integration
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  plan_id VARCHAR(50) NOT NULL DEFAULT 'free',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  payment_type VARCHAR(50) NOT NULL DEFAULT 'one_time',
  payment_method VARCHAR(50),
  start_date TIMESTAMP NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subscription Payments table - TPagamento transactions
CREATE TABLE IF NOT EXISTS subscription_payments (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_id VARCHAR(255),
  reference_code VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_user_id ON subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription_id ON subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments(status);

-- Insert default plans (if not exists)
INSERT INTO plans (name, type, price, features, max_accounts, max_transactions, is_active)
SELECT 'Gratuito', 'basic', 0, '["Até 2 contas", "Até 50 transações/mês", "Relatórios básicos", "Suporte por email"]'::jsonb, 2, 50, true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE type = 'basic' AND price = 0);

INSERT INTO plans (name, type, price, features, max_accounts, max_transactions, is_active)
SELECT 'Básico', 'basic', 2500, '["Até 5 contas", "Transações ilimitadas", "Relatórios avançados", "Metas de poupança", "Suporte prioritário"]'::jsonb, 5, -1, true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE type = 'basic' AND price = 2500);

INSERT INTO plans (name, type, price, features, max_accounts, max_transactions, is_active)
SELECT 'Premium', 'premium', 5000, '["Contas ilimitadas", "Transações ilimitadas", "Relatórios completos", "Metas ilimitadas", "Empréstimos e dívidas", "Exportação de dados", "Suporte 24/7"]'::jsonb, -1, -1, true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE type = 'premium');
