import type { SupabaseClient } from "@supabase/supabase-js";
import { orderCustomer } from "@/lib/products/staffActions";
import type { ShippoFetch } from "./shippo";
import { applyShippedTransaction, type ShippedEmailArgs, type ShippoTransaction } from "./syncShipped";

export interface ShippoEventDeps {
  db: SupabaseClient;
  shippo: ShippoFetch;
  emails: {
    shipped: (args: ShippedEmailArgs) => Promise<void>;
    delivered: (args: { to: string; name: string; orderId: string }) => Promise<void>;
  };
  now?: Date;
}

export interface ShippoEvent {
  event?: string;
  data?: Record<string, any> | null;
}

const MAX_PROBLEM = 200;

/**
 * One Shippo webhook event. Shippo doesn't sign webhooks, so the body is only
 * a hint: every change is made from the object re-fetched with our key, and
 * every update is guarded on the order's current state (retries are no-ops).
 * Returns a short outcome for the log.
 */
export async function handleShippoEvent(deps: ShippoEventDeps, event: ShippoEvent): Promise<string> {
  const data = event?.data ?? {};
  switch (event?.event) {
    case "transaction_created":
    case "transaction_updated":
      return handleTransaction(deps, typeof data.object_id === "string" ? data.object_id : null);
    case "track_updated":
      return handleTrack(deps, typeof data.tracking_number === "string" ? data.tracking_number : null);
    default:
      return "ignored";
  }
}

async function handleTransaction(deps: ShippoEventDeps, transactionId: string | null): Promise<string> {
  if (!transactionId) return "ignored";
  const tx = (await deps.shippo("GET", `/transactions/${encodeURIComponent(transactionId)}`)) as ShippoTransaction & {
    object_status?: string;
  };
  if (!tx?.order) return "ignored";

  const { data: order } = await deps.db.from("product_orders").select("*").eq("shippo_order_id", tx.order).maybeSingle();
  if (!order || order.fulfillment_method !== "delivery") return "ignored";

  if (tx.status === "REFUNDED" || tx.object_status === "REFUNDED") {
    if (order.fulfilment_status !== "out_for_delivery" || order.tracking_number !== tx.tracking_number) return "skipped";
    const { data: hit } = await deps.db
      .from("product_orders")
      .update({
        fulfilment_status: "placed",
        tracking_number: null,
        tracking_url: null,
        label_url: null,
        shipped_at: null,
        updated_at: (deps.now ?? new Date()).toISOString(),
      })
      .eq("id", order.id)
      .eq("fulfilment_status", "out_for_delivery")
      .eq("tracking_number", tx.tracking_number)
      .select("id");
    return hit && hit.length > 0 ? "label voided" : "skipped";
  }

  if (order.fulfilment_status !== "placed") return "skipped";
  return applyShippedTransaction(
    { db: deps.db, shippo: deps.shippo, sendShipped: deps.emails.shipped, now: deps.now },
    order,
    tx,
  );
}

async function handleTrack(deps: ShippoEventDeps, trackingNumber: string | null): Promise<string> {
  if (!trackingNumber) return "ignored";
  const { data: order } = await deps.db
    .from("product_orders")
    .select("*")
    .eq("tracking_number", trackingNumber)
    .maybeSingle();
  if (!order || order.fulfillment_method !== "delivery") return "ignored";
  if (order.fulfilment_status !== "out_for_delivery") return "skipped";

  const carrier = String(order.carrier ?? "usps").toLowerCase();
  const track = await deps.shippo("GET", `/tracks/${encodeURIComponent(carrier)}/${encodeURIComponent(trackingNumber)}`);
  const status: string = track?.tracking_status?.status ?? "UNKNOWN";
  const now = (deps.now ?? new Date()).toISOString();

  if (status === "DELIVERED") {
    const { data: hit } = await deps.db
      .from("product_orders")
      .update({ fulfilment_status: "completed", delivered_at: now, completed_at: now, updated_at: now })
      .eq("id", order.id)
      .eq("fulfilment_status", "out_for_delivery")
      .select("id");
    if (!hit || hit.length === 0) return "skipped";
    const customer = await orderCustomer(deps.db, order.user_id);
    if (customer) await deps.emails.delivered({ ...customer, orderId: order.id });
    return "delivered";
  }

  if (status === "RETURNED" || status === "FAILURE") {
    const details = String(track?.tracking_status?.status_details ?? "").trim();
    const problem = (details ? `${status}: ${details}` : status).slice(0, MAX_PROBLEM);
    await deps.db
      .from("product_orders")
      .update({ shipping_problem: problem, updated_at: now })
      .eq("id", order.id)
      .eq("fulfilment_status", "out_for_delivery");
    return "problem";
  }

  return "in transit";
}
