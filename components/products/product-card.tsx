"use client";

import Image from "next/image";
import Link from "next/link";
import type { ProductRow } from "@/types/db";
import { cardMeta, productTitle } from "@/lib/products/describe";
import { cn } from "@/lib/utils";
import { FOCUS_ON_LIGHT, SURFACE } from "@/components/booking/ui/focus";
import { AddToCartButton, PriceTag } from "./product-actions";
import { ecommercePayload, toAnalyticsItem } from "@/lib/analytics/ecommerce";
import { trackEvent } from "@/lib/analytics/gtag";

/**
 * Grid card: the whole packshot on white (contained, never cropped), the short
 * title, a spec line, the price and a quiet add button. Stills only; video
 * has room to work on featured cards and the product page.
 */
export function ProductCard({ product }: { product: ProductRow }) {
  const soldOut = product.stock === 0;
  const title = productTitle(product);
  const meta = cardMeta(product.description);
  const href = `/products/${product.slug}`;

  // Fires on either route into the product page, so the click-through rate is
  // not split between the image and the title.
  const trackSelect = () => trackEvent("select_item", ecommercePayload([toAnalyticsItem(product)]));

  return (
    <article className={cn(SURFACE, "flex h-full flex-col overflow-hidden")}>
      {/* The title link is the one in the tab order; the image is a mouse shortcut. */}
      <Link
        href={href}
        onClick={trackSelect}
        tabIndex={-1}
        aria-hidden
        className="relative block aspect-square border-b border-line-soft bg-paper"
      >
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt=""
            fill
            sizes="(min-width: 1024px) 30vw, 50vw"
            className="object-contain p-3 sm:p-5"
          />
        ) : (
          <div className="h-full bg-line-soft" />
        )}
        {soldOut && (
          <span className="absolute top-2 left-2 rounded-full bg-line-soft px-2.5 py-1 text-xs font-bold text-ink-muted">
            Sold out
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="line-clamp-2 text-sm leading-snug font-semibold sm:text-base">
          <Link href={href} onClick={trackSelect} title={product.name} className={cn("rounded hover:underline", FOCUS_ON_LIGHT)}>
            {title}
          </Link>
        </h3>
        {meta && <p className="mt-1 hidden text-sm text-ink-muted sm:block">{meta}</p>}
        {/* mt-auto pins price and button to the card's foot, so they line up across a row. */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <PriceTag product={product} />
          <AddToCartButton product={product} />
        </div>
      </div>
    </article>
  );
}
