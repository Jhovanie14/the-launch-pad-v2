import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError, ApiError } from "@/lib/http/apiError";
import {
  addSubscriptionVehicle,
  recordAdminSubscriptionAction,
} from "@/lib/subscriptions/subscriptionActions";

/**
 * Staff add a vehicle to a customer's express subscription — for customers
 * who come into the shop or send a vehicle change request.
 *
 *   { userId, licensePlate, reason }
 *
 * Same billing as the customer's own "Add a vehicle" (flock rate, prorated,
 * confirmation email). Overrides the one-change-per-6-months lock; the add is
 * still recorded, so it counts as the customer's change.
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
    const licensePlate = typeof body?.licensePlate === "string" ? body.licensePlate : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (typeof userId !== "string" || !UUID.test(userId)) {
      throw new ApiError("A valid userId is required", 400);
    }
    if (!reason) throw new ApiError("A reason is required", 400);
    if (reason.length > MAX_REASON_LENGTH) {
      throw new ApiError(`Keep the reason under ${MAX_REASON_LENGTH} characters`, 400);
    }

    const result = await addSubscriptionVehicle(admin, userId, licensePlate, {
      kind: "admin",
      adminId: adminUser.id,
      reason,
    });

    await recordAdminSubscriptionAction(admin, {
      adminId: adminUser.id,
      userId,
      action: "add_vehicle",
      product: "express",
      stripeSubscriptionId: result.stripeSubscriptionId,
      licensePlate: result.licensePlate,
      reason,
    });

    return NextResponse.json({
      success: true,
      message: `${result.licensePlate} was added. The customer is charged a prorated amount for this period and has been emailed.`,
    });
  } catch (err) {
    return apiError(err);
  }
}
