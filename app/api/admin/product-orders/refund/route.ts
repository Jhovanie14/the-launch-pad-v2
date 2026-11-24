import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError, ApiError } from "@/lib/http/apiError";
import { refundOrder } from "@/lib/products/refundOrder";
import { sendProductOrderRefundedEmail } from "@/lib/email/product-order-emails";

/** Refund a paid store order. Rules: lib/products/refundOrder.ts. */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    await requireAdmin(supabase, admin);

    const { order_id } = await req.json();
    if (!order_id) throw new ApiError("Missing order_id", 400);

    await refundOrder(
      { db: admin, stripe, now: new Date(), emails: { refunded: sendProductOrderRefundedEmail } },
      order_id,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
