-- Create banks table
CREATE TABLE IF NOT EXISTS banks (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(50),
  logo_url VARCHAR(500),
  swift_code VARCHAR(20),
  country VARCHAR(2) DEFAULT 'AO',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add bank_id column to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS bank_id INTEGER REFERENCES banks(id);

-- Make bank column nullable (since we now have bank_id)
ALTER TABLE accounts ALTER COLUMN bank DROP NOT NULL;

-- Insert Angolan banks (source: ABANC - Angolan Banking Association 2024)
INSERT INTO banks (code, name, short_name, swift_code, display_order) VALUES
  ('BAI', 'Banco Angolano de Investimentos S.A.', 'BAI', 'BAIAAOLU', 1),
  ('BFA', 'Banco de Fomento Angola S.A.', 'BFA', 'BFMXAOLU', 2),
  ('BIC', 'Banco BIC S.A.', 'BIC', 'BICXAOLU', 3),
  ('BPC', 'Banco de Poupança e Crédito S.A.', 'BPC', 'BPCXAOLU', 4),
  ('BMA', 'Banco Millennium Atlântico S.A.', 'Atlântico', 'ATLAAOLU', 5),
  ('BCI', 'Banco de Comércio e Indústria S.A.', 'BCI', 'BCIDAOLU', 6),
  ('BNI', 'Banco de Negócios Internacional S.A.', 'BNI', 'BNIAOLU', 7),
  ('BCA', 'Banco Comercial Angolano S.A.', 'BCA', 'BCANAOLU', 8),
  ('BECO', 'Banco Económico S.A.', 'Económico', 'BECOAOLU', 9),
  ('SOL', 'Banco Sol S.A.', 'Sol', 'BSOLAOLU', 10),
  ('KEVE', 'Banco Keve S.A.', 'Keve', 'BKEVAOLU', 11),
  ('YETU', 'Banco Yetu S.A.', 'Yetu', 'BYETAOLU', 12),
  ('BDA', 'Banco de Desenvolvimento de Angola S.A.', 'BDA', 'BDAAAOLU', 13),
  ('BIR', 'Banco de Investimento Rural S.A.', 'BIR', 'BIRAOLU', 14),
  ('BCH', 'Banco Comercial do Huambo S.A.', 'BCH', 'BCHAOLU', 15),
  ('BCS', 'Banco de Crédito do Sul S.A.', 'BCS', 'BCSAOLU', 16),
  ('BVAL', 'Banco Valor S.A.', 'Valor', 'BVALAOLU', 17),
  ('SBA', 'Standard Bank de Angola S.A.', 'Standard Bank', 'SBICAOLU', 18),
  ('SCB', 'Standard Chartered S.A.', 'Standard Chartered', 'SCBLAOLU', 19),
  ('ACCESS', 'Access Bank Angola S.A.', 'Access Bank', 'ACBKAOLU', 20),
  ('CGD', 'Banco Caixa Geral Angola S.A.', 'Caixa Geral', 'CGDIAOLU', 21),
  ('BOC', 'Banco da China Limitada - Sucursal em Luanda', 'Bank of China', 'BABORAOLU', 22),
  ('VTB', 'Banco VTB África S.A.', 'VTB', 'VTBAAOLU', 23),
  ('OTHER', 'Outro Banco', 'Outro', NULL, 99)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  short_name = EXCLUDED.short_name,
  swift_code = EXCLUDED.swift_code,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- Verify
SELECT code, name, short_name FROM banks ORDER BY display_order;
