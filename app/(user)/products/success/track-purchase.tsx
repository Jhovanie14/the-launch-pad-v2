"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/gtag";

type PurchasedItem = { name: string; unit_price: number; quantity: number };

/**
 * Fires GA4 `purchase` once the order lands on the confirmation page.
 *
 * Order items snapshot the name and price at purchase time, not the product id
 * or category, so the items here carry no `item_id`. Revenue, order count and
 * conversion all work; per-product attribution comes from `add_to_cart` and
 * `view_item`, which do have ids.
 *
 * A refresh re-fires this, which is expected — GA4 de-duplicates on
 * `transaction_id`.
 */
export default function TrackPurchase({
  orderId,
  total,
  items,
}: {
  orderId: string;
  total: number;
  items: PurchasedItem[];
}) {
  useEffect(() => {
    trackEvent("purchase", {
      transaction_id: orderId,
      currency: "USD",
      value: total,
      items: items.map((item) => ({
        item_name: item.name,
        price: item.unit_price,
        quantity: item.quantity,
      })),
    });
    // Keyed on the order so a re-render is not a second purchase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  return null;
}
