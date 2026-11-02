import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireUser } from "@/lib/auth/guards";
import { apiError, ApiError } from "@/lib/http/apiError";
import { removeFamilyVehicle } from "@/lib/subscriptions/subscriptionActions";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const user = await requireUser(await createClient());

    const { subscriptionVehicleId } = await req.json();
    if (!subscriptionVehicleId) {
      throw new ApiError("subscriptionVehicleId is required", 400);
    }

    // Scoped to the caller's own active subscription inside the action.
    await removeFamilyVehicle(createAdminClient(), user.id, subscriptionVehicleId, {
      kind: "customer",
    });

    console.log("[remove-vehicle] success, removed subscription_vehicle:", subscriptionVehicleId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err);
  }
}
