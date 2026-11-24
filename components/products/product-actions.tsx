"use client";

import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useProductCart } from "@/context/product-cart-context";
import { unitPrice } from "@/lib/products/cart";
import { productTitle } from "@/lib/products/describe";
import { cn } from "@/lib/utils";
import { FOCUS_ON_LIGHT } from "@/components/booking/ui/focus";
import { ecommercePayload, toAnalyticsItem } from "@/lib/analytics/ecommerce";
import { trackEvent } from "@/lib/analytics/gtag";
import type { ProductRow } from "@/types/db";

type Priced = { price: number; sale_price: number | null };

/**
 * Price, with the regular figure struck through when on sale. The selling
 * price comes from unitPrice() so the page can never disagree with checkout.
 */
export function PriceTag({
  product,
  className = "",
  size = "md",
}: {
  product: Priced;
  className?: string;
  size?: "md" | "lg";
}) {
  const onSale = product.sale_price !== null;
  return (
    <p className={cn("flex items-baseline gap-2", className)}>
      <span className={cn("font-black tracking-tight text-ink", size === "lg" ? "text-3xl" : "text-lg sm:text-xl")}>
        ${unitPrice(product).toFixed(2)}
      </span>
      {onSale && (
        <span className="text-sm text-ink-muted line-through">
          <span className="sr-only">Regular price </span>${product.price.toFixed(2)}
        </span>
      )}
    </p>
  );
}

const QUIET_ADD = cn(
  "inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-paper px-3 text-sm font-semibold text-ink ring-1 ring-line transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:text-ink-subtle disabled:hover:bg-paper motion-reduce:transition-none",
  FOCUS_ON_LIGHT,
);

/** Add one to the cart: the cards' quiet button. Icon-only on phones. */
export function AddToCartButton({ product, className = "" }: { product: ProductRow; className?: string }) {
  const { add } = useProductCart();
  const title = productTitle(product);

  if (product.stock === 0) {
    return (
      <button type="button" disabled className={cn(QUIET_ADD, className)}>
        Sold out
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={`Add ${title} to cart`}
      className={cn(QUIET_ADD, className)}
      onClick={() => {
        add(product.id, 1, product.stock);
        trackEvent("add_to_cart", ecommercePayload([toAnalyticsItem(product, 1)]));
        toast.success(`${title} added to cart`);
      }}
    >
      <Plus aria-hidden className="size-4" />
      <span className="hidden sm:inline">Add to cart</span>
    </button>
  );
}
