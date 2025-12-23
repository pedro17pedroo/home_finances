-- Add new columns to payment_methods table
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS is_instant BOOLEAN DEFAULT false;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS wait_time_seconds INTEGER DEFAULT 60;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS max_wait_time_seconds INTEGER DEFAULT 3600;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS requires_phone BOOLEAN DEFAULT false;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS requires_email BOOLEAN DEFAULT false;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS requires_reference BOOLEAN DEFAULT false;

-- Insert default payment methods (Angola)
INSERT INTO payment_methods (code, name, display_name, description, is_active, is_instant, wait_time_seconds, max_wait_time_seconds, requires_phone, requires_email, requires_reference, processing_time, icon, display_order)
VALUES 
  ('gpo', 'Multicaixa Express', 'Multicaixa Express', 'Pagamento instantâneo via Multicaixa Express. Você receberá uma notificação no seu telefone para confirmar o pagamento.', true, true, 30, 120, true, false, false, 'Imediato', 'Zap', 1),
  ('ekwanza', 'E-Kwanza', 'E-Kwanza', 'Pague usando sua conta E-Kwanza. Insira seu número de telefone para receber o código de pagamento.', true, false, 60, 300, true, false, false, '1-5 minutos', 'Smartphone', 2),
  ('ref', 'Referência Multicaixa', 'Referência Multicaixa', 'Gere uma referência para pagar em qualquer caixa Multicaixa, ATM ou homebanking. Válido por 60 minutos.', true, false, 300, 3600, false, false, true, 'Até 60 minutos', 'Building2', 3),
  ('bank_transfer', 'Transferência Bancária', 'Transferência Bancária', 'Faça uma transferência bancária para nossa conta. Envie o comprovativo para confirmação.', true, false, 600, 86400, false, true, false, '1-24 horas', 'Landmark', 4)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_instant = EXCLUDED.is_instant,
  wait_time_seconds = EXCLUDED.wait_time_seconds,
  max_wait_time_seconds = EXCLUDED.max_wait_time_seconds,
  requires_phone = EXCLUDED.requires_phone,
  requires_email = EXCLUDED.requires_email,
  requires_reference = EXCLUDED.requires_reference,
  processing_time = EXCLUDED.processing_time,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- Verify
SELECT code, name, is_instant, wait_time_seconds, requires_phone, requires_reference FROM payment_methods ORDER BY display_order;
