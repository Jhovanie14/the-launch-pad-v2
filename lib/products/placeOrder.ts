import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { ApiError } from "@/lib/http/apiError";
import { priceOrder } from "./checkout";
import type { CartItem } from "./cart";

/** Stripe's minimum Checkout expiry is 30 minutes; one more for margin. */
const CHECKOUT_EXPIRY_SECONDS = 31 * 60;

export interface PlaceOrderDeps {
  db: SupabaseClient;
  stripe: Pick<Stripe, "checkout">;
  siteUrl: string;
  now: Date;
  pickupHours: string | null;
  sendReserved: (args: {
    to: string;
    name: string;
    orderId: string;
    items: { name: string; quantity: number; unit_price: number }[];
    subtotal: number;
    total: number;
    pickupHours: string | null;
  }) => Promise<void>;
}

export interface PlaceOrderInput {
  userId: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  items: CartItem[];
  fulfillmentMethod: string;
  paymentMethod: string;
}

const ref = (id: string) => id.slice(0, 8).toUpperCase();

/**
 * Price the cart, place the order with its stock held (one database call that
 * succeeds or fails as a whole), then either open Stripe Checkout (card) or
 * confirm the reservation (pay at the store).
 */
export async function placeOrder(deps: PlaceOrderDeps, input: PlaceOrderInput): Promise<{ url: string }> {
  const { db } = deps;
  const method = input.paymentMethod;
  if (method !== "card" && method !== "at_store") throw new ApiError("Choose how to pay", 400);

  const priced = await priceOrder(db, input.items, input.fulfillmentMethod);

  if (method === "at_store") {
    const { data: open } = await db
      .from("product_orders")
      .select("id")
      .eq("user_id", input.userId)
      .eq("payment_method", "at_store")
      .eq("payment_status", "unpaid")
      .in("fulfilment_status", ["placed", "ready"])
      .limit(1)
      .maybeSingle();
    if (open) {
      throw new ApiError(
        `You already have a reservation waiting (ref ${ref(open.id)}). Collect or cancel it before reserving more.`,
        409,
      );
    }
  }

  const { data: orderId, error } = await db.rpc("place_product_order", {
    p_user_id: input.userId,
    p_payment_method: method,
    p_items: priced.items,
    p_subtotal: priced.subtotal,
    p_total: priced.total,
    p_phone: input.phone,
  });
  if (error || !orderId) {
    const short = error?.message?.match(/insufficient_stock:(.+)$/);
    if (short) throw new ApiError(`Not enough stock for ${short[1].trim()}`, 400);
    throw new ApiError("Could not create the order", 500);
  }
  const id = orderId as string;

  if (method === "at_store") {
    if (input.email) {
      await deps.sendReserved({
        to: input.email,
        name: input.name ?? "there",
        orderId: id,
        items: priced.items.map((i) => ({ name: i.name, quantity: i.quantity, unit_price: i.unit_price })),
        subtotal: priced.subtotal,
        total: priced.total,
        pickupHours: deps.pickupHours,
      });
    }
    return { url: `/products/success?order=${id}` };
  }

  try {
    const session = await deps.stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: priced.items.map((i) => ({
        price_data: {
          currency: "usd",
          product_data: { name: i.name },
          unit_amount: Math.round(i.unit_price * 100),
        },
        quantity: i.quantity,
      })),
      customer_email: input.email ?? undefined,
      // Staff call or text the customer when the order is ready to collect.
      phone_number_collection: { enabled: true },
      // Stock is held from now, so an abandoned checkout should return it soon.
      expires_at: Math.floor(deps.now.getTime() / 1000) + CHECKOUT_EXPIRY_SECONDS,
      success_url: `${deps.siteUrl}/products/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${deps.siteUrl}/products/cart`,
      metadata: { payment_type: "product_order", order_id: id },
    });
    if (!session.url) throw new ApiError("Stripe did not return a checkout URL", 500);

    await db.from("product_orders").update({ stripe_session_id: session.id }).eq("id", id);
    return { url: session.url };
  } catch (err) {
    // The order exists and holds stock; give both back before reporting.
    await db.rpc("release_product_order_stock", { p_order_id: id });
    await db
      .from("product_orders")
      .update({ fulfilment_status: "cancelled", updated_at: deps.now.toISOString() })
      .eq("id", id);
    throw err;
  }
}
