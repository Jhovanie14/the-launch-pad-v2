import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/http/apiError";
import { customerCanCancel, type FlowOrder } from "./orderFlow";
import { guardedUpdate, orderCustomer, ORDER_CHANGED } from "./staffActions";

/**
 * A customer cancels their own unpaid pay-at-store reservation (placed or
 * ready). The same transition as a staff release: the items go back on the
 * shelf and the customer gets the "cancelled" email.
 */
export async function cancelReservation(
  deps: {
    db: SupabaseClient;
    now: Date;
    emails: { released: (args: { to: string; name: string; orderId: string; byCustomer: boolean }) => Promise<void> };
  },
  input: { userId: string; orderId: string },
): Promise<void> {
  const { db, now } = deps;
  const { data: order } = await db.from("product_orders").select("*").eq("id", input.orderId).maybeSingle();
  // Someone else's order reads the same as one that can't be cancelled.
  if (!order || order.user_id !== input.userId || !customerCanCancel(order as FlowOrder)) {
    throw new ApiError("This order can't be cancelled here: contact us.", 400);
  }

  const changed = await guardedUpdate(db, order, {
    fulfilment_status: "released",
    released_at: now.toISOString(),
    updated_at: now.toISOString(),
  });
  if (!changed) throw new ApiError(ORDER_CHANGED, 409);

  await db.rpc("release_product_order_stock", { p_order_id: order.id });

  const customer = await orderCustomer(db, order.user_id);
  if (customer) await deps.emails.released({ ...customer, orderId: order.id, byCustomer: true });
}
