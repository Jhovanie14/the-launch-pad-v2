import type { SupabaseClient } from "@supabase/supabase-js";
import { houstonDateLabel, isOverdueHold, needsReminder, type FlowOrder } from "./orderFlow";
import { guardedUpdate, orderCustomer, releaseStock } from "./staffActions";

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
}): Promise<{ reminded: number; released: number; restocked: number }> {
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
      await releaseStock(db, order.id);
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
  // Closed orders whose stock return failed earlier (a network blip after the
  // order had already moved on). The database function only returns it once.
  let restocked = 0;
  const { data: stuck } = await db
    .from("product_orders")
    .select("id")
    .eq("stock_taken", true)
    .is("stock_released_at", null)
    .in("fulfilment_status", ["released", "cancelled"]);
  for (const o of stuck ?? []) {
    if (await releaseStock(db, o.id)) restocked++;
  }

  return { reminded, released, restocked };
}
