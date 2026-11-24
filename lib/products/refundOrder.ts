import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { ApiError } from "@/lib/http/apiError";
import { guardedUpdate, orderCustomer, ORDER_CHANGED, releaseStock } from "./staffActions";

/**
 * Refund a paid order. Card payments go back through Stripe first (money
 * before status); a payment taken at the store is recorded only, since staff
 * hand the money back. Stock returns to the shelf unless the order was
 * already handed over.
 */
export async function refundOrder(
  deps: {
    db: SupabaseClient;
    stripe: Pick<Stripe, "refunds">;
    now: Date;
    emails: {
      refunded: (args: { to: string; name: string; orderId: string; total: number; where: "card" | "store" }) => Promise<void>;
    };
  },
  orderId: string,
): Promise<void> {
  const { db } = deps;
  const { data: order } = await db.from("product_orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) throw new ApiError("Order not found", 404);
  if (order.payment_status !== "paid") throw new ApiError("Only a paid order can be refunded", 400);

  const where: "card" | "store" = order.paid_via === "stripe" ? "card" : "store";
  if (where === "card") {
    if (!order.stripe_payment_intent_id) throw new ApiError("Order has no card payment to refund", 400);
    await deps.stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id });
  }

  const handedOver = order.fulfilment_status === "completed";
  const changed = await guardedUpdate(db, order, {
    payment_status: "refunded",
    fulfilment_status: handedOver ? "completed" : "cancelled",
    updated_at: deps.now.toISOString(),
  });
  if (!changed) {
    if (where === "card") {
      // Money moved but the order didn't: surface loudly for a manual fix.
      console.error("[refund] Stripe refund succeeded but the order update failed for:", orderId);
      throw new ApiError("Refund issued but the order could not be updated. Refresh and check.", 500);
    }
    throw new ApiError(ORDER_CHANGED, 409);
  }

  if (!handedOver) {
    await releaseStock(db, order.id);
  }

  const customer = await orderCustomer(db, order.user_id);
  if (customer) {
    await deps.emails.refunded({ ...customer, orderId: order.id, total: order.total, where });
  }
}
