import { supabase, Product, TransactionItem } from '../lib/supabase';

export interface CartItem {
  product: Product;
  quantity: number;
  unit: string;
}

/**
 * Parse a transaction item back to cart format for editing
 * Extracts quantity and unit from product_name format: "Product Name (12 box)"
 * Fetches the full product data from database
 *
 * @param item - TransactionItem to parse
 * @returns CartItem with full product data, quantity, and unit
 */
export const parseTransactionItemToCartItem = async (item: TransactionItem): Promise<CartItem | null> => {
  try {
    // Fetch the full product data
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', item.product_id)
      .single();

    if (error || !product) {
      console.error('Failed to fetch product:', error);
      return null;
    }

    return {
      product,
      quantity: item.quantity,
      unit: item.unit
    };
  } catch (error) {
    console.error('Error parsing transaction item:', error);
    return null;
  }
};

/**
 * Parse multiple transaction items to cart items
 * Filters out any items that fail to parse
 *
 * @param items - Array of TransactionItems to parse
 * @returns Array of CartItems
 */
export const parseTransactionItemsToCart = async (items: TransactionItem[]): Promise<CartItem[]> => {
  const promises = items.map(item => parseTransactionItemToCartItem(item));
  const results = await Promise.all(promises);

  // Filter out null results (failed parses)
  return results.filter((item): item is CartItem => item !== null);
};
