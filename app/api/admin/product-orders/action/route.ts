import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError, ApiError } from "@/lib/http/apiError";
import { runStaffAction } from "@/lib/products/staffActions";
import { getPickupSettings } from "@/lib/products/storeSettings";
import type { StaffAction } from "@/lib/products/orderFlow";
import {
  sendProductOrderCollectedEmail,
  sendProductOrderReadyForPickupEmail,
  sendProductOrderReleasedEmail,
} from "@/lib/email/product-order-emails";

const ACTIONS: StaffAction[] = ["mark_ready", "hand_over", "take_payment", "release"];

/** Counter actions from admin › Store orders. Rules: lib/products/orderFlow.ts. */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const staff = await requireAdmin(supabase, admin);

    const { order_id, action, paid_via } = await req.json();
    if (!order_id || !ACTIONS.includes(action)) throw new ApiError("Invalid order action", 400);

    const settings = await getPickupSettings(admin);
    await runStaffAction(
      {
        db: admin,
        now: new Date(),
        staffId: staff.id,
        holdDays: settings.holdDays,
        pickupHours: settings.pickupHours,
        emails: {
          ready: sendProductOrderReadyForPickupEmail,
          collected: sendProductOrderCollectedEmail,
          released: sendProductOrderReleasedEmail,
        },
      },
      { orderId: order_id, action, paidVia: paid_via },
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
