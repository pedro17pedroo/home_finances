-- Add logo_url column to payment_methods table
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);

-- Update with sample logos (can be updated later with real logos)
UPDATE payment_methods SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Multicaixa_logo.svg/200px-Multicaixa_logo.svg.png' WHERE code = 'gpo';
UPDATE payment_methods SET logo_url = 'https://www.ekwanza.ao/assets/images/logo.png' WHERE code = 'ekwanza';
UPDATE payment_methods SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Multicaixa_logo.svg/200px-Multicaixa_logo.svg.png' WHERE code = 'ref';
UPDATE payment_methods SET logo_url = NULL WHERE code = 'bank_transfer';

-- Verify
SELECT code, name, logo_url FROM payment_methods ORDER BY display_order;
