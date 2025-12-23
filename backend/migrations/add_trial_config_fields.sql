-- Migration: Add Trial Configuration Fields
-- Date: 2024-12-23

-- Adicionar campo para controlar se trial é uso único
ALTER TABLE plans ADD COLUMN IF NOT EXISTS trial_one_time_only BOOLEAN DEFAULT true;

-- Adicionar campo para tempo máximo de uso gratuito (em dias) - para planos gratuitos
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_free_days INTEGER DEFAULT NULL;

-- Adicionar campo na subscrição para rastrear se trial já foi usado
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT false;

-- Adicionar campo para indicar se é primeira subscrição do usuário
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS is_first_subscription BOOLEAN DEFAULT false;

-- Atualizar planos existentes
-- Plano gratuito: trial não aplicável, mas tem limite de 30 dias de uso
UPDATE plans SET trial_one_time_only = true, max_free_days = 30 WHERE price = 0;

-- Planos pagos: trial é uso único por padrão
UPDATE plans SET trial_one_time_only = true WHERE price > 0;
