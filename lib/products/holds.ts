import type { SupabaseClient } from "@supabase/supabase-js";
import { houstonDateLabel, isOverdueHold, needsReminder, type FlowOrder } from "./orderFlow";
import { guardedUpdate, orderCustomer } from "./staffActions";

/**
 * The daily hold job for unpaid pay-at-store orders that are ready: a reminder
 * on the Houston day before the hold date, and release once the hold date has
 * passed. Every step is guarded, so running it twice changes nothing more.
 */
export async function runHoldJob(deps: {
  db: SupabaseClient;
  now: Date;
  pickupHours: string | null;
  emails: {
    reminder: (args: { to: string; name: string; orderId: string; total: number; holdDate: string; pickupHours: string | null }) => Promise<void>;
    released: (args: { to: string; name: string; orderId: string; byCustomer: boolean }) => Promise<void>;
  };
}): Promise<{ reminded: number; released: number }> {
  const { db, now } = deps;
  const { data } = await db
    .from("product_orders")
    .select("*")
    .eq("payment_method", "at_store")
    .eq("payment_status", "unpaid")
    .eq("fulfilment_status", "ready");

  let reminded = 0;
  let released = 0;
  for (const order of data ?? []) {
    const flow = order as FlowOrder & { id: string; user_id: string; hold_until: string };

    if (isOverdueHold(flow, now)) {
      const changed = await guardedUpdate(db, order, {
        fulfilment_status: "released",
        released_at: now.toISOString(),
        updated_at: now.toISOString(),
      });
      if (!changed) continue;
      await db.rpc("release_product_order_stock", { p_order_id: order.id });
      released++;
      const customer = await orderCustomer(db, order.user_id);
      if (customer) await deps.emails.released({ ...customer, orderId: order.id, byCustomer: false });
      continue;
    }

    if (needsReminder(flow, now)) {
      // Claim the reminder first so a second run can't send it again.
      const { data: claimed } = await db
        .from("product_orders")
        .update({ reminder_sent_at: now.toISOString() })
        .eq("id", order.id)
        .is("reminder_sent_at", null)
        .select("id");
      if (!claimed || claimed.length === 0) continue;
      reminded++;
      const customer = await orderCustomer(db, order.user_id);
      if (customer) {
        await deps.emails.reminder({
          ...customer,
          orderId: order.id,
          total: order.total,
          holdDate: houstonDateLabel(flow.hold_until),
          pickupHours: deps.pickupHours,
        });
      }
    }
  }
  return { reminded, released };
}
