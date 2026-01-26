-- Add contact information to loans and debts tables

-- Add phone and email to loans
ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS borrower_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS borrower_email VARCHAR(255);

-- Add phone and email to debts
ALTER TABLE debts 
ADD COLUMN IF NOT EXISTS creditor_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS creditor_email VARCHAR(255);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_loans_borrower_phone ON loans(borrower_phone);
CREATE INDEX IF NOT EXISTS idx_loans_borrower_email ON loans(borrower_email);
CREATE INDEX IF NOT EXISTS idx_debts_creditor_phone ON debts(creditor_phone);
CREATE INDEX IF NOT EXISTS idx_debts_creditor_email ON debts(creditor_email);

-- Comments
COMMENT ON COLUMN loans.borrower_phone IS 'Phone number of the person who borrowed money';
COMMENT ON COLUMN loans.borrower_email IS 'Email address of the person who borrowed money';
COMMENT ON COLUMN debts.creditor_phone IS 'Phone number of the creditor';
COMMENT ON COLUMN debts.creditor_email IS 'Email address of the creditor';
