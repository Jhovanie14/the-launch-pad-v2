import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireUser } from "@/lib/auth/guards";
import { apiError, ApiError } from "@/lib/http/apiError";
import { cancelReservation } from "@/lib/products/cancelReservation";
import { sendProductOrderReleasedEmail } from "@/lib/email/product-order-emails";

/** A signed-in customer cancels their own unpaid reservation. */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const user = await requireUser(supabase);
    const { order_id } = await req.json();
    if (!order_id) throw new ApiError("Missing order_id", 400);

    // Service role for the write; ownership is checked in cancelReservation.
    await cancelReservation(
      { db: createAdminClient(), now: new Date(), emails: { released: sendProductOrderReleasedEmail } },
      { userId: user.id, orderId: order_id },
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
