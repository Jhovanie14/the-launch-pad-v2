import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/http/apiError";
import type { ShipAddress } from "@/lib/shipping/quote";
import type { ShippedEmailArgs } from "@/lib/shipping/syncShipped";
import {
  applyStaffAction,
  houstonDateLabel,
  isUnpaidReservation,
  type FlowOrder,
  type PaidVia,
  type StaffAction,
} from "./orderFlow";

type Item = { name: string; quantity: number; unit_price: number };

export interface StaffActionEmails {
  ready: (args: {
    to: string;
    name: string;
    orderId: string;
    amountDue: number | null;
    holdDate: string | null;
    pickupHours: string | null;
    pickupNote: string | null;
  }) => Promise<void>;
  collected: (args: { to: string; name: string; orderId: string; items: Item[]; total: number; paidVia: PaidVia }) => Promise<void>;
  released: (args: { to: string; name: string; orderId: string; byCustomer: boolean }) => Promise<void>;
  shipped: (args: ShippedEmailArgs) => Promise<void>;
  delivered: (args: { to: string; name: string; orderId: string }) => Promise<void>;
}

/** Who the order belongs to, for its emails. Null when there is no email. */
export async function orderCustomer(db: SupabaseClient, userId: string): Promise<{ to: string; name: string } | null> {
  const { data } = await db.from("profiles").select("email, full_name").eq("id", userId).maybeSingle();
  return data?.email ? { to: data.email, name: data.full_name ?? "there" } : null;
}

export async function orderItems(db: SupabaseClient, orderId: string): Promise<Item[]> {
  const { data } = await db.from("product_order_items").select("name, quantity, unit_price").eq("order_id", orderId);
  return (data ?? []) as Item[];
}

/**
 * Apply a status change to an order only if it is still in the state it was
 * read in. Returns false when someone else changed it first.
 */
export async function guardedUpdate(
  db: SupabaseClient,
  order: { id: string; fulfilment_status: string; payment_status: string },
  patch: Record<string, unknown>,
): Promise<boolean> {
  const { data, error } = await db
    .from("product_orders")
    .update(patch)
    .eq("id", order.id)
    .eq("fulfilment_status", order.fulfilment_status)
    .eq("payment_status", order.payment_status)
    .select("id");
  if (error) throw new ApiError("Failed to update the order", 500);
  return Boolean(data && data.length > 0);
}

export const ORDER_CHANGED = "This order just changed. Refresh to see it.";

/**
 * Put an order's stock back on the shelf (the database function only does it
 * once). A failure is logged loudly rather than thrown: the order has already
 * moved on, and the daily hold job sweeps up stock that never came back.
 */
export async function releaseStock(db: SupabaseClient, orderId: string): Promise<boolean> {
  const { error } = await db.rpc("release_product_order_stock", { p_order_id: orderId });
  if (error) {
    console.error(`[product-order] stock for ${orderId} was not returned; the daily hold job will retry`, error);
    return false;
  }
  return true;
}

/** A counter action from the admin Store orders screen. */
export async function runStaffAction(
  deps: {
    db: SupabaseClient;
    now: Date;
    staffId: string;
    holdDays: number;
    pickupHours: string | null;
    pickupNote: string | null;
    emails: StaffActionEmails;
  },
  input: { orderId: string; action: StaffAction; paidVia?: PaidVia | string; trackingNumber?: string },
): Promise<void> {
  const { db, now } = deps;
  const { data: order } = await db.from("product_orders").select("*").eq("id", input.orderId).maybeSingle();
  if (!order) throw new ApiError("Order not found", 404);

  const patch = applyStaffAction(order as FlowOrder, input.action, {
    now,
    holdDays: deps.holdDays,
    staffId: deps.staffId,
    paidVia: input.paidVia,
    trackingNumber: input.trackingNumber,
  });
  const changed = await guardedUpdate(db, order, { ...patch, updated_at: now.toISOString() });
  if (!changed) throw new ApiError(ORDER_CHANGED, 409);

  if (input.action === "release") {
    await releaseStock(db, order.id);
  }

  // Emails log and never throw, so a failed send can't undo the change.
  const customer = await orderCustomer(db, order.user_id);
  if (!customer) return;
  const base = { ...customer, orderId: order.id };

  switch (input.action) {
    case "mark_ready":
      await deps.emails.ready({
        ...base,
        amountDue: isUnpaidReservation(order as FlowOrder) ? order.total : null,
        holdDate: patch.hold_until ? houstonDateLabel(patch.hold_until as string) : null,
        pickupHours: deps.pickupHours,
        pickupNote: deps.pickupNote,
      });
      break;
    case "hand_over":
    case "take_payment":
      await deps.emails.collected({
        ...base,
        items: await orderItems(db, order.id),
        total: order.total,
        paidVia: ((patch.paid_via as PaidVia) ?? order.paid_via ?? "stripe") as PaidVia,
      });
      break;
    case "release":
      await deps.emails.released({ ...base, byCustomer: false });
      break;
    case "mark_shipped":
      await deps.emails.shipped({
        ...base,
        trackingNumber: patch.tracking_number as string,
        trackingUrl: (patch.tracking_url as string) ?? "",
        carrier: (patch.carrier as string) ?? "USPS",
        address: order.delivery_address as ShipAddress,
      });
      break;
    case "mark_delivered":
      await deps.emails.delivered(base);
      break;
  }
}
