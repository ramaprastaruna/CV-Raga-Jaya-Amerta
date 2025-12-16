/*
  # Add sales information to transactions table

  1. Changes
    - Add `sales_id` (uuid) column to transactions table - References sales table
    - Add `sales_name` (text) column to transactions table - Denormalized sales name for historical records

  2. Purpose
    - Track which sales person handled each transaction
    - Store sales name for historical purposes (even if sales is deleted later)
*/

-- Add sales columns to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS sales_id uuid REFERENCES sales(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sales_name text;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_sales_id ON transactions(sales_id);

-- Add comment for documentation
COMMENT ON COLUMN transactions.sales_id IS 'Reference to sales person who handled this transaction';
COMMENT ON COLUMN transactions.sales_name IS 'Sales person name (denormalized for historical records)';
