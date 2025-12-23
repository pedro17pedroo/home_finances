-- Add paidAmount and cancelReason to loans and debts tables
ALTER TABLE loans ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10, 2) NOT NULL DEFAULT '0';
ALTER TABLE loans ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

ALTER TABLE debts ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10, 2) NOT NULL DEFAULT '0';
ALTER TABLE debts ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
