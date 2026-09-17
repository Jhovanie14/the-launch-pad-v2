"use client";

import { useEffect } from "react";
import type { ProductRow } from "@/types/db";
import { ecommercePayload, toAnalyticsItem } from "@/lib/analytics/ecommerce";
import { trackEvent } from "@/lib/analytics/gtag";

/**
 * Fires GA4 `view_item` for a product page.
 *
 * Exists as a client component purely so the detail page itself can stay a
 * server component — it renders nothing.
 */
export function TrackViewItem({ product }: { product: ProductRow }) {
  useEffect(() => {
    trackEvent("view_item", ecommercePayload([toAnalyticsItem(product)]));
    // Keyed on the id so a re-render does not count as another view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  return null;
}
