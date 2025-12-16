/*
  # Create sales table for managing sales personnel

  1. New Tables
    - `sales`
      - `id` (uuid, primary key)
      - `name` (text, required) - Sales name
      - `phone` (text, required) - Sales phone number
      - `created_by` (uuid) - User who created this sales
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `sales` table
    - Add policy for authenticated users to read all sales
    - Add policy for authenticated users to insert sales
    - Add policy for authenticated users to update sales
    - Add policy for authenticated users to delete sales
*/

CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all sales"
  ON sales FOR SELECT
  USING (true);

CREATE POLICY "Users can insert sales"
  ON sales FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update sales"
  ON sales FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete sales"
  ON sales FOR DELETE
  USING (true);

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for better search performance
CREATE INDEX IF NOT EXISTS idx_sales_name ON sales(name);
CREATE INDEX IF NOT EXISTS idx_sales_phone ON sales(phone);
