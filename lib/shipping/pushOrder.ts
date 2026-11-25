import type { SupabaseClient } from "@supabase/supabase-js";
import { SHIP_FROM } from "./origin";
import type { ShipAddress } from "./quote";
import type { ShippoFetch } from "./shippo";

const MAX_ERROR = 300;
const ref = (id: string) => id.slice(0, 8).toUpperCase();
const money = (n: number) => Number(n).toFixed(2);
const oz = (n: number) => String(Math.ceil(n * 10 - 1e-9) / 10);

/**
 * Put a paid shipping order on Shippo's Orders page, where staff buy the label.
 * Never throws: a failure is stored on the order ("Not in Shippo yet") and
 * retried by the daily job or the admin's "Send to Shippo" button.
 */
export async function pushOrderToShippo(
  deps: { db: SupabaseClient; shippo: ShippoFetch },
  orderId: string,
): Promise<{ ok: boolean; skipped?: true }> {
  const { db } = deps;
  const { data: order } = await db.from("product_orders").select("*").eq("id", orderId).maybeSingle();
  if (
    !order ||
    order.fulfillment_method !== "delivery" ||
    order.payment_status !== "paid" ||
    order.fulfilment_status !== "placed" ||
    order.shippo_order_id
  ) {
    return { ok: false, skipped: true };
  }

  try {
    const [{ data: items }, { data: profile }] = await Promise.all([
      db.from("product_order_items").select("product_id, name, quantity, unit_price").eq("order_id", orderId),
      db.from("profiles").select("email").eq("id", order.user_id).maybeSingle(),
    ]);
    const lines = (items ?? []) as { product_id: string | null; name: string; quantity: number; unit_price: number }[];
    const ids = lines.map((l) => l.product_id).filter((id): id is string => Boolean(id));
    const { data: products } = await db.from("products").select("id, weight_oz").in("id", ids);
    const weightOf = (id: string | null) => Number((products ?? []).find((p: { id: string }) => p.id === id)?.weight_oz ?? 0);

    const a = order.delivery_address as ShipAddress;
    const total = lines.reduce((sum, l) => sum + weightOf(l.product_id) * l.quantity, 0);
    const created = await deps.shippo("POST", "/orders/", {
      order_number: ref(order.id),
      order_status: "PAID",
      placed_at: order.paid_at ?? new Date().toISOString(),
      to_address: {
        name: a.name,
        street1: a.street1,
        street2: a.street2 || undefined,
        city: a.city,
        state: a.state,
        zip: a.zip,
        country: "US",
        phone: a.phone,
        email: profile?.email ?? undefined,
      },
      from_address: SHIP_FROM,
      line_items: lines.map((l) => ({
        title: l.name,
        quantity: l.quantity,
        total_price: money(l.unit_price * l.quantity),
        currency: "USD",
        weight: oz(weightOf(l.product_id) * l.quantity),
        weight_unit: "oz",
      })),
      weight: oz(total),
      weight_unit: "oz",
      shipping_cost: money(order.delivery_fee),
      shipping_cost_currency: "USD",
      shipping_method: order.shipping_service ?? "USPS",
    });

    await db
      .from("product_orders")
      .update({ shippo_order_id: created.object_id, shippo_push_error: null, updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .is("shippo_order_id", null);
    return { ok: true };
  } catch (err) {
    const message = (err instanceof Error ? err.message : String(err)).slice(0, MAX_ERROR);
    console.error(`[shipping] could not send ${ref(orderId)} to Shippo:`, message);
    await db.from("product_orders").update({ shippo_push_error: message }).eq("id", orderId);
    return { ok: false };
  }
}
