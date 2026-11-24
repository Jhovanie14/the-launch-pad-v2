"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { useProductCart } from "@/context/product-cart-context";
import { unitPrice } from "@/lib/products/cart";
import { cn } from "@/lib/utils";
import { FLAME_BUTTON, FOCUS_ON_LIGHT } from "@/components/booking/ui/focus";
import { ecommercePayload, toAnalyticsItem } from "@/lib/analytics/ecommerce";
import { trackEvent } from "@/lib/analytics/gtag";
import type { ProductRow } from "@/types/db";

const STEP = cn(
  "grid size-11 place-items-center text-ink transition-colors hover:bg-line-soft disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none",
  FOCUS_ON_LIGHT,
);

function useAddToCart(product: ProductRow, title: string) {
  const { add } = useProductCart();
  return (qty: number) => {
    add(product.id, qty, product.stock);
    trackEvent("add_to_cart", ecommercePayload([toAnalyticsItem(product, qty)]));
    toast.success(`${qty > 1 ? `${qty} × ` : ""}${title} added to cart`);
  };
}

/**
 * The product page's buy controls: stock line, then (from lg) a quantity
 * stepper and the one Flame "Add to cart". Phones get PhoneBuyBar instead.
 */
export function BuyBox({ product, title }: { product: ProductRow; title: string }) {
  const [qty, setQty] = useState(1);
  const soldOut = product.stock === 0;
  const add = useAddToCart(product, title);
  const addToCart = () => add(qty);

  const stockLine = soldOut
    ? "Sold out"
    : product.stock <= 5
      ? `Only ${product.stock} left`
      : "In stock";

  return (
    <>
      <p className="mt-1 text-sm text-ink-muted">{stockLine}</p>

      {!soldOut && (
        <div className="mt-5 hidden gap-3 lg:flex">
          <div className="flex items-center rounded-lg bg-paper ring-1 ring-line">
            <button
              type="button"
              aria-label="Decrease quantity"
              className={cn(STEP, "rounded-l-lg")}
              disabled={qty <= 1}
              onClick={() => setQty((n) => Math.max(1, n - 1))}
            >
              <Minus aria-hidden className="size-4" />
            </button>
            <span aria-live="polite" aria-label={`Quantity ${qty}`} className="w-8 text-center font-bold">
              {qty}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              className={cn(STEP, "rounded-r-lg")}
              disabled={qty >= product.stock}
              onClick={() => setQty((n) => Math.min(product.stock, n + 1))}
            >
              <Plus aria-hidden className="size-4" />
            </button>
          </div>
          <button type="button" onClick={addToCart} className={cn(FLAME_BUTTON, "flex-1")}>
            Add to cart
          </button>
        </div>
      )}
    </>
  );
}

/**
 * Phones: a sticky Night bar with the price and the Flame "Add to cart" (one
 * at a time; the cart changes quantity). Rendered at the end of the page's
 * main so it stays in reach while reading the details.
 */
export function PhoneBuyBar({ product, title }: { product: ProductRow; title: string }) {
  const add = useAddToCart(product, title);
  const soldOut = product.stock === 0;
  return (
    <div className="sticky bottom-0 z-30 flex items-center gap-3 bg-night px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] text-on-night lg:hidden">
      <span className="text-xl font-black">${unitPrice(product).toFixed(2)}</span>
      <button type="button" onClick={() => add(1)} disabled={soldOut} className={cn(FLAME_BUTTON, "flex-1")}>
        {soldOut ? "Sold out" : "Add to cart"}
      </button>
    </div>
  );
}
