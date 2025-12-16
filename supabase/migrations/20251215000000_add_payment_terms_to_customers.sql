/*
  # Add payment_terms column to customers table

  1. Changes
    - Add `payment_terms` (jsonb array) column to customers table
      - Stores multiple payment terms for each customer
      - Example: ["Cash", "NET 30", "NET 60"]
      - Default: empty array []

  2. Purpose
    - Allow customers to have multiple payment term options
    - These terms will be available when creating invoices
*/

-- Add payment_terms column to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS payment_terms jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN customers.payment_terms IS 'Array of payment term strings for this customer (e.g., ["Cash", "NET 30", "NET 60"])';
