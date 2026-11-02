import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError, ApiError } from "@/lib/http/apiError";
import { recordVehicleChange } from "@/lib/subscriptions/subscriptionActions";

/**
 * Lift a customer's "one vehicle change per 6 months" lock early — for a
 * genuine case such as a car sold or written off. Writes an "unlocked" event;
 * the rule ignores everything before it. The admin and reason are kept on
 * that row as the audit trail.
 *
 *   { userId, reason }
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_REASON_LENGTH = 500;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const adminUser = await requireAdmin(supabase, admin);

    const body = await req.json().catch(() => null);
    const userId = body?.userId;
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (typeof userId !== "string" || !UUID.test(userId)) {
      throw new ApiError("A valid userId is required", 400);
    }
    if (!reason) throw new ApiError("A reason is required", 400);
    if (reason.length > MAX_REASON_LENGTH) {
      throw new ApiError(`Keep the reason under ${MAX_REASON_LENGTH} characters`, 400);
    }

    const saved = await recordVehicleChange(
      admin,
      userId,
      "unlocked",
      { kind: "admin", adminId: adminUser.id, reason },
      null,
    );
    if (!saved) throw new ApiError("Could not save the unlock. Please try again.", 500);

    return NextResponse.json({
      success: true,
      message: "Vehicle change unlocked. The customer can add a vehicle now.",
    });
  } catch (err) {
    return apiError(err);
  }
}
