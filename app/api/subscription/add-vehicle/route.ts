import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireUser } from "@/lib/auth/guards";
import { apiError } from "@/lib/http/apiError";
import { addSubscriptionVehicle } from "@/lib/subscriptions/subscriptionActions";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const user = await requireUser(await createClient());

    const { licensePlate } = await req.json();

    // Scoped to the caller's own active subscription inside the action, which
    // also enforces the one-vehicle-change-per-6-months rule for customers.
    const { vehicleId } = await addSubscriptionVehicle(
      createAdminClient(),
      user.id,
      typeof licensePlate === "string" ? licensePlate : "",
      { kind: "customer" },
    );

    console.log("[add-vehicle] success, vehicleId:", vehicleId);
    return NextResponse.json({ success: true, vehicleId });
  } catch (err) {
    return apiError(err);
  }
}
