import { Product, DiscountTier } from '../lib/supabase';

export interface DiscountInfo {
  finalPrice: number;
  hasDiscount: boolean;
  tier: DiscountTier | null;
  discounts: number[];
}

/**
 * Calculate the final price and discount information for a product based on quantity and unit
 * @param product - The product to calculate discount for
 * @param quantity - The quantity being purchased
 * @param unit - Optional unit type (buah, box, karton)
 * @returns Object containing finalPrice, hasDiscount, tier, and discounts array
 */
export const getDiscountInfo = (product: Product, quantity: number, unit?: string): DiscountInfo => {
  if (!product.discount_tiers || product.discount_tiers.length === 0) {
    return {
      finalPrice: product.price,
      hasDiscount: false,
      tier: null,
      discounts: []
    };
  }

  // Check for exact quantity match first (isExact: true)
  const exactTier = product.discount_tiers.find(
    tier => tier.isExact && tier.minQuantity === quantity && (!unit || tier.unit === unit)
  );

  if (exactTier) {
    const basePrice = product.base_price || product.price;
    let pricePerUnit = basePrice;
    const discounts = [];

    // Apply first discount
    pricePerUnit = pricePerUnit - (pricePerUnit * exactTier.discount) / 100;
    discounts.push(exactTier.discount);

    // Apply second discount if exists
    if (exactTier.discount2 && exactTier.discount2 > 0) {
      pricePerUnit = pricePerUnit - (pricePerUnit * exactTier.discount2) / 100;
      discounts.push(exactTier.discount2);
    }

    return {
      finalPrice: pricePerUnit,
      hasDiscount: true,
      tier: exactTier,
      discounts
    };
  }

  // Find applicable tier based on minimum quantity (isExact: false)
  const sortedTiers = [...product.discount_tiers]
    .filter(tier => !tier.isExact && (!unit || tier.unit === unit))
    .sort((a, b) => b.minQuantity - a.minQuantity);

  const applicableTier = sortedTiers.find(tier => quantity >= tier.minQuantity);

  if (!applicableTier) {
    return {
      finalPrice: product.price,
      hasDiscount: false,
      tier: null,
      discounts: []
    };
  }

  const basePrice = product.base_price || product.price;
  let pricePerUnit = basePrice;
  const discounts = [];

  // Apply first discount
  pricePerUnit = pricePerUnit - (pricePerUnit * applicableTier.discount) / 100;
  discounts.push(applicableTier.discount);

  // Apply second discount if exists
  if (applicableTier.discount2 && applicableTier.discount2 > 0) {
    pricePerUnit = pricePerUnit - (pricePerUnit * applicableTier.discount2) / 100;
    discounts.push(applicableTier.discount2);
  }

  return {
    finalPrice: pricePerUnit,
    hasDiscount: true,
    tier: applicableTier,
    discounts
  };
};

/**
 * Get the final price for a product based on quantity and unit
 * Convenience wrapper around getDiscountInfo
 */
export const getPriceForQuantity = (product: Product, quantity: number, unit?: string): number => {
  return getDiscountInfo(product, quantity, unit).finalPrice;
};
