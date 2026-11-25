import type { CartItem } from "./cart";
import type { ShipAddress } from "@/lib/shipping/quote";

const ZIP = /^\d{5}(-\d{4})?$/;

export function emptyAddress(phone?: string | null): ShipAddress {
  return { name: "", street1: "", street2: "", city: "", state: "", zip: "", phone: phone ?? "" };
}

/** Every field but the apartment, and a 5-digit (or ZIP+4) ZIP. */
export function addressComplete(a: ShipAddress): boolean {
  const filled = (v: string | undefined) => (v ?? "").trim().length > 0;
  return filled(a.name) && filled(a.street1) && filled(a.city) && filled(a.state) && filled(a.phone) && ZIP.test(a.zip.trim());
}

/**
 * What a shipping price was quoted for. When the cart or the address changes
 * the key changes, and the cart drops the old price.
 */
export function quoteKey(items: CartItem[], a: ShipAddress): string {
  const t = (v: string | undefined) => (v ?? "").trim().toUpperCase();
  const cart = [...items]
    .sort((x, y) => x.productId.localeCompare(y.productId))
    .map((i) => `${i.productId}:${i.quantity}`)
    .join(",");
  return [cart, t(a.name), t(a.street1), t(a.street2), t(a.city), t(a.state), t(a.zip), t(a.phone)].join("|");
}
