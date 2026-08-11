import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError, ApiError } from "@/lib/http/apiError";
import { canTransition } from "@/lib/products/orderStatus";
import {
  sendProductOrderOutForDeliveryEmail,
  sendProductOrderReadyForPickupEmail,
} from "@/lib/email/product-order-emails";

const ALLOWED_TARGETS = ["ready_for_pickup", "out_for_delivery", "completed"];

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    await requireAdmin(supabase, admin);

    const { order_id, to_status } = await req.json();
    if (!order_id || !ALLOWED_TARGETS.includes(to_status)) {
      throw new ApiError("Invalid status update", 400);
    }

    const { data: order } = await admin
      .from("product_orders")
      .select("*")
      .eq("id", order_id)
      .maybeSingle();
    if (!order) throw new ApiError("Order not found", 404);

    if (
      !canTransition(
        order.status,
        to_status,
        order.fulfillment_method as "pickup" | "delivery",
      )
    ) {
      throw new ApiError(
        `Cannot move a ${order.status} ${order.fulfillment_method} order to ${to_status}`,
        400,
      );
    }

    const { error } = await admin
      .from("product_orders")
      .update({ status: to_status, updated_at: new Date().toISOString() })
      .eq("id", order_id)
      .eq("status", order.status); // guard against concurrent staff clicks
    if (error) throw new ApiError("Failed to update the order", 500);

    // Notify the customer (senders log-don't-throw).
    if (to_status === "ready_for_pickup" || to_status === "out_for_delivery") {
      const { data: profile } = await admin
        .from("profiles")
        .select("email, full_name")
        .eq("id", order.user_id)
        .maybeSingle();
      if (profile?.email) {
        const args = {
          to: profile.email,
          name: profile.full_name ?? "there",
          orderId: order.id,
        };
        if (to_status === "ready_for_pickup") {
          await sendProductOrderReadyForPickupEmail(args);
        } else {
          await sendProductOrderOutForDeliveryEmail(args);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
