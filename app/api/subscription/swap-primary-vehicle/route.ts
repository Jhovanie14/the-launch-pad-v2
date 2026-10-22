import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireUser } from "@/lib/auth/guards";
import { apiError, ApiError } from "@/lib/http/apiError";
import { swapPrimaryVehicle } from "@/lib/subscriptions/subscriptionActions";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const user = await requireUser(await createClient());

    const { newPrimarySubscriptionVehicleId } = await req.json();
    if (!newPrimarySubscriptionVehicleId) {
      throw new ApiError("newPrimarySubscriptionVehicleId is required", 400);
    }

    // Scoped to the caller's own active subscription inside the action.
    await swapPrimaryVehicle(createAdminClient(), user.id, newPrimarySubscriptionVehicleId, {
      kind: "customer",
    });

    console.log("[swap-primary-vehicle] success, new primary:", newPrimarySubscriptionVehicleId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err);
  }
}
