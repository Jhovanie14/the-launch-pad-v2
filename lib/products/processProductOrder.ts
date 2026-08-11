import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductOrderItemRow, ProductOrderRow } from "@/types/db";

/**
 * Structural view of the Stripe Checkout Session fields we read. The basil
 * API versions (2025-03+) moved shipping_details under collected_information;
 * older webhook endpoint configs still deliver the legacy top-level field, so
 * we read both.
 */
export interface ProductOrderSession {
  metadata?: Record<string, string> | null;
  payment_intent?: string | { id: string } | null;
  customer_details?: { phone?: string | null } | null;
  collected_information?: { shipping_details?: unknown } | null;
  shipping_details?: unknown;
}

export async function processProductOrderCompleted(
  db: SupabaseClient,
  session: ProductOrderSession,
): Promise<{ order: ProductOrderRow; items: ProductOrderItemRow[] } | null> {
  const orderId = session.metadata?.order_id;
  if (!orderId) return null;

  const { data: order } = await db
    .from("product_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) {
    console.error("[product-order] completed event for unknown order:", orderId);
    return null;
  }
  // Duplicate-delivery guard on top of the processed_stripe_events claim.
  if (order.status !== "pending") return null;

  const shipping =
    session.collected_information?.shipping_details ??
    session.shipping_details ??
    null;
  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  const updates = {
    status: "paid",
    stripe_payment_intent_id: paymentIntent,
    phone: session.customer_details?.phone ?? null,
    delivery_address: shipping,
    updated_at: new Date().toISOString(),
  };
  await db.from("product_orders").update(updates).eq("id", orderId);

  const { data: items } = await db
    .from("product_order_items")
    .select("*")
    .eq("order_id", orderId);

  // Decrement stock, floored at zero. Read-then-write is acceptable here:
  // the event-id claim means one webhook delivery processes this order, and
  // the rare last-unit race across two different orders is resolved by staff
  // refunding from the queue (see design spec).
  for (const item of items ?? []) {
    if (!item.product_id) continue;
    const { data: product } = await db
      .from("products")
      .select("stock")
      .eq("id", item.product_id)
      .maybeSingle();
    if (!product) continue;
    await db
      .from("products")
      .update({ stock: Math.max(0, product.stock - item.quantity) })
      .eq("id", item.product_id);
  }

  return { order: { ...order, ...updates } as ProductOrderRow, items: items ?? [] };
}

export async function processProductOrderExpired(
  db: SupabaseClient,
  session: ProductOrderSession,
): Promise<void> {
  const orderId = session.metadata?.order_id;
  if (!orderId) return;
  await db
    .from("product_orders")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "pending");
}
