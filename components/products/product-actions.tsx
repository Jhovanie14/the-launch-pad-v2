"use client";

import { toast } from "sonner";
import { ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProductCart } from "@/context/product-cart-context";
import { unitPrice } from "@/lib/products/cart";
import { cn } from "@/lib/utils";
import { ecommercePayload, toAnalyticsItem } from "@/lib/analytics/ecommerce";
import { trackEvent } from "@/lib/analytics/gtag";
import type { ProductRow } from "@/types/db";

type Priced = { price: number; sale_price: number | null };

/**
 * Price, with the pre-sale figure struck through when one is set. The selling
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
    <div className={cn("flex items-baseline gap-2", className)}>
      <span
        className={
          size === "lg"
            ? "font-display text-3xl text-gold"
            : "font-display text-xl text-gold"
        }
      >
        ${unitPrice(product).toFixed(2)}
      </span>
      {onSale && (
        <span className="text-sm text-muted-foreground line-through">
          ${product.price.toFixed(2)}
        </span>
      )}
    </div>
  );
}

export function AddToCartButton({
  product,
  className = "",
  size = "default",
}: {
  product: ProductRow;
  className?: string;
  size?: "sm" | "default" | "lg";
}) {
  const { add } = useProductCart();

  if (product.stock === 0) {
    return (
      <Button disabled size={size} className={cn("rounded-none", className)}>
        Out of stock
      </Button>
    );
  }

  return (
    <Button
      size={size}
      className={cn("rounded-none uppercase tracking-widest", className)}
      onClick={() => {
        add(product.id, 1, product.stock);
        trackEvent("add_to_cart", ecommercePayload([toAnalyticsItem(product, 1)]));
        toast.success(`${product.name} added to cart`);
      }}
    >
      <ShoppingBasket className="mr-2 h-4 w-4" />
      Add to cart
    </Button>
  );
}
