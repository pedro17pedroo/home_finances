-- Create account_types table
CREATE TABLE IF NOT EXISTS account_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default account types
INSERT INTO account_types (code, name, description, icon, color, display_order) VALUES
  ('corrente', 'Conta Corrente', 'Conta bancária para movimentações diárias', 'CreditCard', '#3B82F6', 1),
  ('poupanca', 'Poupança', 'Conta para guardar dinheiro e render juros', 'PiggyBank', '#10B981', 2),
  ('investimento', 'Investimento', 'Conta para investimentos e aplicações', 'TrendingUp', '#8B5CF6', 3),
  ('carteira', 'Carteira', 'Dinheiro em espécie', 'Wallet', '#F59E0B', 4),
  ('outro', 'Outro', 'Outro tipo de conta', 'MoreHorizontal', '#6B7280', 5)
ON CONFLICT (code) DO NOTHING;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_account_types_active ON account_types(is_active);
CREATE INDEX IF NOT EXISTS idx_account_types_display_order ON account_types(display_order);

-- Update existing accounts to use the new codes (if needed)
-- This ensures backward compatibility
UPDATE accounts SET type = 'corrente' WHERE type = 'corrente' OR type IS NULL;
UPDATE accounts SET type = 'poupanca' WHERE type = 'poupanca';
