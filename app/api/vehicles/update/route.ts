import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { vehicleId, year, make, model, body_type, colors } = await req.json();
    if (!vehicleId) return Response.json({ error: "Missing vehicleId" }, { status: 400 });

    const admin = createAdminClient();

    // Verify user owns the vehicle directly or via a subscription
    const { data: vehicle } = await admin
      .from("vehicles")
      .select("id, user_id")
      .eq("id", vehicleId)
      .maybeSingle();

    if (!vehicle) return Response.json({ error: "Vehicle not found" }, { status: 404 });

    const isDirectOwner = vehicle.user_id === user.id;

    // Check subscription ownership
    let isSubOwner = false;
    if (!isDirectOwner) {
      const { data: subLink } = await admin
        .from("subscription_vehicles")
        .select("subscription_id, user_subscription!inner(user_id)")
        .eq("vehicle_id", vehicleId)
        .maybeSingle();

      if ((subLink as any)?.user_subscription?.user_id === user.id) isSubOwner = true;
    }

    if (!isSubOwner) {
      const { data: selfLink } = await admin
        .from("self_service_subscription_vehicles")
        .select("subscription_id, self_service_subscriptions!inner(user_id)")
        .eq("vehicle_id", vehicleId)
        .maybeSingle();

      if ((selfLink as any)?.self_service_subscriptions?.user_id === user.id) isSubOwner = true;
    }

    if (!isDirectOwner && !isSubOwner) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await admin
      .from("vehicles")
      .update({
        user_id: user.id,
        year: year ? parseInt(year, 10) : null,
        make: make || null,
        model: model || null,
        body_type: body_type || null,
        colors: colors?.length > 0 ? colors : null,
      })
      .eq("id", vehicleId);

    if (error) {
      console.error("Vehicle update error:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err: any) {
    console.error("[vehicles/update]", err?.message);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
