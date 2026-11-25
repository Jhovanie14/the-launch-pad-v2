import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError, ApiError } from "@/lib/http/apiError";
import { sendProductOrderShippedEmail } from "@/lib/email/product-order-emails";
import { pushOrderToShippo } from "@/lib/shipping/pushOrder";
import { shippoConfigured, shippoFromEnv } from "@/lib/shipping/shippo";
import { syncShippedFromShippo } from "@/lib/shipping/syncShipped";

const ACTIONS = ["push", "check"] as const;

/**
 * Admin › Store orders, shipping orders: "Send to Shippo" (retry a failed push)
 * and "Check Shippo" (look for a label bought there whose webhook never came).
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    await requireAdmin(supabase, admin);
    if (!shippoConfigured()) throw new ApiError("Shippo isn't set up yet", 503);

    const { order_id, action } = await req.json();
    if (!order_id || !ACTIONS.includes(action)) throw new ApiError("Invalid Shippo action", 400);

    const shippo = shippoFromEnv();
    if (action === "push") {
      const out = await pushOrderToShippo({ db: admin, shippo }, order_id);
      if (!out.ok && !out.skipped) throw new ApiError("Shippo didn't accept the order. Try again in a minute.", 502);
      return NextResponse.json({ ok: true, result: out.skipped ? "skipped" : "pushed" });
    }
    const result = await syncShippedFromShippo({ db: admin, shippo, sendShipped: sendProductOrderShippedEmail }, order_id);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return apiError(err);
  }
}
