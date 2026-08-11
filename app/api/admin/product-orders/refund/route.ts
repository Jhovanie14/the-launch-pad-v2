import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError, ApiError } from "@/lib/http/apiError";
import { canTransition } from "@/lib/products/orderStatus";
import { sendProductOrderRefundedEmail } from "@/lib/email/product-order-emails";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    await requireAdmin(supabase, admin);

    const { order_id } = await req.json();
    if (!order_id) throw new ApiError("Missing order_id", 400);

    const { data: order } = await admin
      .from("product_orders")
      .select("*")
      .eq("id", order_id)
      .maybeSingle();
    if (!order) throw new ApiError("Order not found", 404);
    if (
      !canTransition(
        order.status,
        "refunded",
        order.fulfillment_method as "pickup" | "delivery",
      )
    ) {
      throw new ApiError(`A ${order.status} order cannot be refunded`, 400);
    }
    if (!order.stripe_payment_intent_id) {
      throw new ApiError("Order has no payment to refund", 400);
    }

    // Refund the money FIRST; only mark refunded if Stripe succeeded.
    await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
    });

    const { error } = await admin
      .from("product_orders")
      .update({ status: "refunded", updated_at: new Date().toISOString() })
      .eq("id", order_id);
    if (error) {
      // Money moved but status didn't — surface loudly for manual fix.
      console.error(
        "[refund] Stripe refund succeeded but status update failed for order:",
        order_id,
        error,
      );
      throw new ApiError(
        "Refund issued but the order status could not be updated — refresh and check",
        500,
      );
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("email, full_name")
      .eq("id", order.user_id)
      .maybeSingle();
    if (profile?.email) {
      await sendProductOrderRefundedEmail({
        to: profile.email,
        name: profile.full_name ?? "there",
        orderId: order.id,
        total: order.total,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
