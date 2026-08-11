// Pure cart math for the product store. The React provider
// (context/product-cart-context.tsx) and the checkout API both build on these
// so the logic stays inside Vitest's lib/** include.

export interface CartItem {
  productId: string;
  quantity: number;
}

export const PRODUCT_CART_STORAGE_KEY = "productCart";

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function unitPrice(p: { price: number; sale_price: number | null }): number {
  return p.sale_price ?? p.price;
}

function clamp(quantity: number, maxStock?: number): number {
  return maxStock === undefined ? quantity : Math.min(quantity, maxStock);
}

export function addItem(
  items: CartItem[],
  productId: string,
  quantity = 1,
  maxStock?: number,
): CartItem[] {
  const existing = items.find((i) => i.productId === productId);
  if (!existing) {
    return [...items, { productId, quantity: clamp(quantity, maxStock) }];
  }
  return items.map((i) =>
    i.productId === productId
      ? { ...i, quantity: clamp(i.quantity + quantity, maxStock) }
      : i,
  );
}

export function removeItem(items: CartItem[], productId: string): CartItem[] {
  return items.filter((i) => i.productId !== productId);
}

export function setQuantity(
  items: CartItem[],
  productId: string,
  quantity: number,
  maxStock?: number,
): CartItem[] {
  if (quantity <= 0) return removeItem(items, productId);
  return items.map((i) =>
    i.productId === productId ? { ...i, quantity: clamp(quantity, maxStock) } : i,
  );
}

export function itemCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

/** Safe parse of the localStorage payload: anything malformed becomes []. */
export function readCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.every(
      (i) =>
        i &&
        typeof i.productId === "string" &&
        typeof i.quantity === "number" &&
        Number.isInteger(i.quantity) &&
        i.quantity > 0,
    );
    if (!valid) return [];
    return parsed.map((i) => ({ productId: i.productId, quantity: i.quantity }));
  } catch {
    return [];
  }
}

export function cartTotals(
  items: CartItem[],
  products: Array<{ id: string; price: number; sale_price: number | null }>,
  deliveryFee: number,
  method: "pickup" | "delivery",
): { subtotal: number; deliveryFee: number; total: number } {
  const subtotal = round2(
    items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return sum;
      return sum + unitPrice(product) * item.quantity;
    }, 0),
  );
  const fee = method === "delivery" ? round2(deliveryFee) : 0;
  return { subtotal, deliveryFee: fee, total: round2(subtotal + fee) };
}
