import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface DiscountTier {
  minQuantity: number;
  discount: number;
  discount2?: number;
  unit: 'buah' | 'box' | 'karton';
  isExact?: boolean;
}

export interface ProductUnit {
  name: string;
  quantity: number;
}

export interface StockEntry {
  unit: string;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  purchase_price: number;
  stock: number;
  image_url: string;
  sku: string;
  base_price: number;
  discount_tiers: DiscountTier[];
  units: ProductUnit[];
  stock_entries: StockEntry[];
  stock_unit: string;
  stock_unit_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  transaction_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  total_amount: number;
  grand_total?: number;
  notes: string;
  sales_id?: string;
  sales_name?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  status: 'pending' | 'completed' | 'cancelled';
  reserved_stock: Array<{ product_id: string; quantity: number; unit: string }>;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_amount?: number;
  discount_percent?: number;
  subtotal: number;
  created_at: string;
}

export interface TransactionWithItems extends Transaction {
  transaction_items: TransactionItem[];
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  payment_terms: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Sales {
  id: string;
  name: string;
  phone: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}
