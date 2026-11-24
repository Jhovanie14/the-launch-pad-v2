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

/**
 * Stripe Checkout completed. A card order waiting for payment becomes paid; its
 * stock was already held when the order was placed (legacy orders placed before
 * that take it now). A payment for an order in any other state is recorded,
 * logged and returns null, so no confirmation email goes out.
 */
export async function processProductOrderCompleted(
  db: SupabaseClient,
  session: ProductOrderSession,
  now: Date = new Date(),
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
  if (order.payment_status === "paid") return null;

  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);
  const paid = {
    payment_status: "paid",
    paid_via: "stripe",
    paid_at: now.toISOString(),
    stripe_payment_intent_id: paymentIntent,
    updated_at: now.toISOString(),
  };

  const waiting =
    order.payment_method === "card" &&
    order.payment_status === "unpaid" &&
    order.fulfilment_status === "placed";
  if (!waiting) {
    // Not expected (staff can't cancel a card order), but never silent: the
    // Closed tab shows it as paid so staff can refund.
    console.error("[product-order] payment for an order that is not waiting:", orderId, order.fulfilment_status);
    await db.from("product_orders").update(paid).eq("id", orderId);
    return null;
  }

  const shipping =
    session.collected_information?.shipping_details ??
    session.shipping_details ??
    null;
  const updates = {
    ...paid,
    phone: session.customer_details?.phone ?? order.phone ?? null,
    delivery_address: shipping,
  };
  await db
    .from("product_orders")
    .update(updates)
    .eq("id", orderId)
    .eq("payment_status", "unpaid")
    .eq("fulfilment_status", "placed");

  if (!order.stock_taken) {
    await db.rpc("take_product_order_stock", { p_order_id: orderId });
  }

  const { data: items } = await db
    .from("product_order_items")
    .select("*")
    .eq("order_id", orderId);

  return { order: { ...order, ...updates } as ProductOrderRow, items: items ?? [] };
}

/** Stripe Checkout expired: cancel the waiting card order and return its stock. */
export async function processProductOrderExpired(
  db: SupabaseClient,
  session: ProductOrderSession,
  now: Date = new Date(),
): Promise<void> {
  const orderId = session.metadata?.order_id;
  if (!orderId) return;
  const { data } = await db
    .from("product_orders")
    .update({ fulfilment_status: "cancelled", updated_at: now.toISOString() })
    .eq("id", orderId)
    .eq("payment_method", "card")
    .eq("payment_status", "unpaid")
    .eq("fulfilment_status", "placed")
    .select("id");
  if (data && data.length > 0) {
    await db.rpc("release_product_order_stock", { p_order_id: orderId });
  }
}
