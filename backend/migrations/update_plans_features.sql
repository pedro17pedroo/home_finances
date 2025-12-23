-- Migration: Update Plans Features and Limits
-- Date: 2024-12-23

-- Plano Teste Grátis (id=2)
-- Plano gratuito com funcionalidades básicas limitadas
UPDATE plans SET 
  features = '[
    "1 conta bancária",
    "50 transações/mês",
    "Categorias básicas",
    "Relatórios simples",
    "Suporte por email"
  ]'::jsonb,
  max_accounts = 1,
  max_transactions = 50,
  max_users = 1,
  trial_days = 0,
  description = 'Plano gratuito para experimentar o sistema com funcionalidades básicas.',
  sort_order = 1
WHERE id = 2;

-- Plano Base (id=3)
-- Plano pago com funcionalidades essenciais
UPDATE plans SET 
  features = '[
    "5 contas bancárias",
    "500 transações/mês",
    "Todas as categorias",
    "Transações recorrentes",
    "Relatórios detalhados",
    "Exportação PDF/Excel",
    "2 utilizadores",
    "Suporte prioritário"
  ]'::jsonb,
  max_accounts = 5,
  max_transactions = 500,
  max_users = 2,
  trial_days = 14,
  description = 'Plano ideal para gestão financeira pessoal ou pequenos negócios.',
  sort_order = 2
WHERE id = 3;

-- Criar Plano Premium se não existir
INSERT INTO plans (name, type, price, features, max_accounts, max_transactions, max_users, trial_days, billing_cycle, description, sort_order, is_active)
SELECT 
  'Premium',
  'premium',
  2500.00,
  '[
    "15 contas bancárias",
    "Transações ilimitadas",
    "Todas as categorias",
    "Transações recorrentes",
    "Orçamentos e metas",
    "Relatórios avançados",
    "Exportação PDF/Excel/CSV",
    "5 utilizadores",
    "Integração WhatsApp",
    "Suporte 24/7"
  ]'::jsonb,
  15,
  -1,
  5,
  7,
  'monthly',
  'Plano completo para gestão financeira avançada com todas as funcionalidades.',
  3,
  true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE type = 'premium');

-- Criar Plano Empresarial se não existir
INSERT INTO plans (name, type, price, features, max_accounts, max_transactions, max_users, trial_days, billing_cycle, description, sort_order, is_active)
SELECT 
  'Empresarial',
  'enterprise',
  5000.00,
  '[
    "Contas ilimitadas",
    "Transações ilimitadas",
    "Multi-organizações",
    "Gestão de empréstimos",
    "Gestão de dívidas",
    "Relatórios personalizados",
    "API de integração",
    "Utilizadores ilimitados",
    "Integração WhatsApp",
    "Gestor de conta dedicado",
    "SLA garantido"
  ]'::jsonb,
  -1,
  -1,
  -1,
  7,
  'monthly',
  'Plano empresarial com recursos ilimitados e suporte dedicado.',
  4,
  true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE type = 'enterprise');
