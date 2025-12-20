-- Migration: Add receipt support to transactions table
-- Run this migration to add receipt storage capabilities

ALTER TABLE transactions 
ADD COLUMN receipt_path VARCHAR(500),
ADD COLUMN receipt_mime_type VARCHAR(100),
ADD COLUMN receipt_original_name VARCHAR(255),
ADD COLUMN receipt_file_size INTEGER;

-- Add index for receipt queries
CREATE INDEX idx_transactions_receipt ON transactions(receipt_path) 
WHERE receipt_path IS NOT NULL;

-- Add index for transactions with receipts by user
CREATE INDEX idx_transactions_user_receipt ON transactions(user_id, receipt_path) 
WHERE receipt_path IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN transactions.receipt_path IS 'Relative path to receipt file in uploads directory';
COMMENT ON COLUMN transactions.receipt_mime_type IS 'MIME type of the receipt file (image/jpeg, application/pdf, etc.)';
COMMENT ON COLUMN transactions.receipt_original_name IS 'Original filename of the uploaded receipt';
COMMENT ON COLUMN transactions.receipt_file_size IS 'File size in bytes of the receipt';