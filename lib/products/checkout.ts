import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/http/apiError";
import { round2, unitPrice, type CartItem } from "./cart";

export type FulfillmentMethod = "pickup" | "delivery";

/**
 * Fulfillment methods a NEW order may choose.
 *
 * Delivery is paused until a third-party courier is integrated. This list
 * governs new checkouts only: the database still accepts 'delivery', and past
 * delivery orders keep their fee, their address, and every render and webhook
 * path they had before. Restoring delivery is this list plus the choice in the
 * cart UI — the pricing and fulfillment code below never stopped supporting it.
 */
export const OFFERED_FULFILLMENT_METHODS: readonly FulfillmentMethod[] = ["pickup"];

function isOffered(method: string): method is FulfillmentMethod {
  return (OFFERED_FULFILLMENT_METHODS as readonly string[]).includes(method);
}

export interface PricedOrderItem {
  product_id: string;
  name: string;
  unit_price: number;
  quantity: number;
}

export interface PricedOrder {
  items: PricedOrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

/**
 * Re-price the cart entirely from the database — client prices are never
 * trusted. Throws ApiError(400) with a customer-readable message on any
 * problem so the cart page can surface it directly.
 */
export async function priceOrder(
  db: SupabaseClient,
  items: CartItem[],
  fulfillmentMethod: string,
): Promise<PricedOrder> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError("Your cart is empty", 400);
  }
  if (!isOffered(fulfillmentMethod)) {
    // Delivery gets its own message: it is a method the customer may have seen
    // offered before, not a malformed request.
    throw new ApiError(
      fulfillmentMethod === "delivery"
        ? "Delivery is not available at the moment — please choose pickup"
        : "Choose a fulfillment method",
      400,
    );
  }
  for (const item of items) {
    if (
      !item ||
      typeof item.productId !== "string" ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1
    ) {
      throw new ApiError("Invalid cart item", 400);
    }
  }

  const ids = items.map((i) => i.productId);
  const { data: products, error } = await db
    .from("products")
    .select("id, name, price, sale_price, stock, is_active")
    .in("id", ids);
  if (error) throw new ApiError("Could not load products", 500);

  const priced: PricedOrderItem[] = items.map((item) => {
    const product = products?.find((p) => p.id === item.productId);
    if (!product || !product.is_active) {
      throw new ApiError("A product in your cart is no longer available", 400);
    }
    if (item.quantity > product.stock) {
      throw new ApiError(
        `Not enough stock for ${product.name} — only ${product.stock} left`,
        400,
      );
    }
    return {
      product_id: product.id,
      name: product.name,
      unit_price: unitPrice(product),
      quantity: item.quantity,
    };
  });

  const subtotal = round2(
    priced.reduce((sum, i) => sum + i.unit_price * i.quantity, 0),
  );

  // Always zero while pickup is the only offered method. The field stays on
  // PricedOrder because product_orders.delivery_fee is NOT NULL and past
  // orders carry real values in it.
  const deliveryFee = 0;

  return { items: priced, subtotal, deliveryFee, total: round2(subtotal + deliveryFee) };
}

/** Insert the pending order + item snapshots. Cleans up the order row if the
 * item insert fails so no headless orders linger. */
export async function createPendingOrder(
  db: SupabaseClient,
  args: { userId: string; fulfillmentMethod: FulfillmentMethod; priced: PricedOrder },
): Promise<{ orderId: string }> {
  const { data: order, error: orderError } = await db
    .from("product_orders")
    .insert({
      user_id: args.userId,
      status: "pending",
      fulfillment_method: args.fulfillmentMethod,
      subtotal: args.priced.subtotal,
      delivery_fee: args.priced.deliveryFee,
      total: args.priced.total,
    })
    .select()
    .single();
  if (orderError || !order) {
    throw new ApiError("Could not create the order", 500);
  }

  const { error: itemsError } = await db.from("product_order_items").insert(
    args.priced.items.map((i) => ({
      order_id: order.id,
      product_id: i.product_id,
      name: i.name,
      unit_price: i.unit_price,
      quantity: i.quantity,
    })),
  );
  if (itemsError) {
    await db.from("product_orders").delete().eq("id", order.id);
    throw new ApiError("Could not create the order", 500);
  }

  return { orderId: order.id };
}
