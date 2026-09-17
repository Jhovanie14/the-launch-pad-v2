// GA4 ecommerce payload builders.
//
// Kept pure and separate from the sending code so the shapes can be tested
// without a browser or a live gtag. Prices come from unitPrice(), the same
// function checkout prices with, so GA4 revenue cannot drift from what Stripe
// actually charged.

import { round2, unitPrice, type CartItem } from "@/lib/products/cart";

const CURRENCY = "USD";

export interface AnalyticsItem {
  item_id: string;
  item_name: string;
  item_category: string;
  price: number;
  quantity: number;
}

type ProductLike = {
  id: string;
  name: string;
  category: string;
  price: number;
  sale_price: number | null;
};

export function toAnalyticsItem(
  product: ProductLike,
  quantity = 1,
): AnalyticsItem {
  return {
    item_id: product.id,
    item_name: product.name,
    item_category: product.category,
    price: unitPrice(product),
    quantity,
  };
}

/** Total monetary value of a set of items. */
export function itemsValue(items: AnalyticsItem[]): number {
  return round2(
    items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  );
}

/**
 * The common body of every GA4 ecommerce event. `extra` carries event-specific
 * params — `transaction_id` on purchase, for instance.
 */
export function ecommercePayload(
  items: AnalyticsItem[],
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    currency: CURRENCY,
    value: itemsValue(items),
    items,
    ...extra,
  };
}

/**
 * Join cart lines to their loaded products. Lines whose product has since been
 * removed are dropped — a half-populated item is worse than a missing one,
 * because GA4 will happily report it as a $0 sale.
 */
export function cartAnalyticsItems(
  items: CartItem[],
  products: ProductLike[],
): AnalyticsItem[] {
  return items.flatMap((item) => {
    const product = products.find((p) => p.id === item.productId);
    return product ? [toAnalyticsItem(product, item.quantity)] : [];
  });
}
