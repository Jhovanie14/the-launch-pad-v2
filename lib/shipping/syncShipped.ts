import type { SupabaseClient } from "@supabase/supabase-js";
import { orderCustomer } from "@/lib/products/staffActions";
import type { ShipAddress } from "./quote";
import type { ShippoFetch } from "./shippo";

export interface ShippedEmailArgs {
  to: string;
  name: string;
  orderId: string;
  trackingNumber: string;
  trackingUrl: string;
  carrier: string;
  address: ShipAddress;
}

export interface SyncDeps {
  db: SupabaseClient;
  shippo: ShippoFetch;
  sendShipped: (args: ShippedEmailArgs) => Promise<void>;
  now?: Date;
}

/** A Shippo transaction (label) as re-fetched from the API. */
export interface ShippoTransaction {
  object_id: string;
  status?: string;
  order?: string | null;
  tracking_number?: string | null;
  tracking_url_provider?: string | null;
  label_url?: string | null;
}

type Outcome = "shipped" | "waiting" | "skipped";

/**
 * A label was bought: move the order from "placed" to Shipped and email the
 * customer. Guarded on "placed", so webhooks, the daily job and the admin
 * button can all call it and only the first one changes anything.
 */
export async function applyShippedTransaction(deps: SyncDeps, order: Record<string, any>, tx: ShippoTransaction): Promise<Outcome> {
  if (tx.status !== "SUCCESS" || !tx.tracking_number) return "waiting";
  const now = (deps.now ?? new Date()).toISOString();
  const patch = {
    fulfilment_status: "out_for_delivery",
    tracking_number: tx.tracking_number,
    tracking_url: tx.tracking_url_provider ?? null,
    carrier: "USPS",
    label_url: tx.label_url ?? null,
    shipped_at: now,
    updated_at: now,
  };
  const { data } = await deps.db
    .from("product_orders")
    .update(patch)
    .eq("id", order.id)
    .eq("fulfilment_status", "placed")
    .select("id");
  if (!data || data.length === 0) return "skipped";

  const customer = await orderCustomer(deps.db, order.user_id);
  if (customer) {
    await deps.sendShipped({
      ...customer,
      orderId: order.id,
      trackingNumber: patch.tracking_number,
      trackingUrl: patch.tracking_url ?? "",
      carrier: patch.carrier,
      address: order.delivery_address as ShipAddress,
    });
  }
  return "shipped";
}

/**
 * Ask Shippo whether a label was bought for this order (the fallback for a
 * missed webhook): used by the daily job and the admin's "Check Shippo".
 */
export async function syncShippedFromShippo(deps: SyncDeps, orderId: string): Promise<Outcome> {
  const { data: order } = await deps.db.from("product_orders").select("*").eq("id", orderId).maybeSingle();
  if (
    !order ||
    order.fulfillment_method !== "delivery" ||
    order.fulfilment_status !== "placed" ||
    order.payment_status !== "paid" ||
    !order.shippo_order_id
  ) {
    return "skipped";
  }

  const shippoOrder = await deps.shippo("GET", `/orders/${order.shippo_order_id}`);
  const transactions = (shippoOrder?.transactions ?? []) as { object_id: string }[];
  for (const t of transactions) {
    const tx = (await deps.shippo("GET", `/transactions/${t.object_id}`)) as ShippoTransaction;
    if (tx?.status === "SUCCESS") return applyShippedTransaction(deps, order, tx);
  }
  return "waiting";
}
