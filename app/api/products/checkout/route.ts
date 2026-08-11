import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireUser } from "@/lib/auth/guards";
import { apiError, ApiError } from "@/lib/http/apiError";
import { createPendingOrder, priceOrder } from "@/lib/products/checkout";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const user = await requireUser(supabase);

    const body = await req.json();
    const items = body?.items;
    const fulfillmentMethod = body?.fulfillment_method;

    // Service-role client: order inserts are server-side only (RLS has no
    // insert policies on product_orders by design).
    const admin = createAdminClient();

    const priced = await priceOrder(admin, items, fulfillmentMethod);
    const { orderId } = await createPendingOrder(admin, {
      userId: user.id,
      fulfillmentMethod,
      priced,
    });

    const line_items = priced.items.map((i) => ({
      price_data: {
        currency: "usd",
        product_data: { name: i.name },
        unit_amount: Math.round(i.unit_price * 100),
      },
      quantity: i.quantity,
    }));
    if (priced.deliveryFee > 0) {
      line_items.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Delivery fee" },
          unit_amount: Math.round(priced.deliveryFee * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,
      customer_email: user.email ?? undefined,
      // Staff call/text about pickup readiness and delivery runs.
      phone_number_collection: { enabled: true },
      // Stripe collects the delivery address so we build no address form.
      ...(fulfillmentMethod === "delivery"
        ? { shipping_address_collection: { allowed_countries: ["US" as const] } }
        : {}),
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/products/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/products/cart`,
      metadata: {
        payment_type: "product_order",
        order_id: orderId,
      },
    });

    if (!session.url) throw new ApiError("Stripe did not return a checkout URL", 500);

    await admin
      .from("product_orders")
      .update({ stripe_session_id: session.id })
      .eq("id", orderId);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return apiError(err);
  }
}
