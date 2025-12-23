-- Migration: Update Base Plan Trial Days
-- Date: 2024-12-23

-- Definir 14 dias de trial para o plano Base
UPDATE plans SET trial_days = 14 WHERE type = 'basic';

-- Verificar se existe um plano chamado 'Base' (caso o type seja diferente)
UPDATE plans SET trial_days = 14 WHERE LOWER(name) = 'base' AND trial_days = 0;
