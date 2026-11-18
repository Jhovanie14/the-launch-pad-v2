import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * A vehicle id sent by a customer's browser, kept only if that car is theirs:
 * they own it, or it is on their active membership. Anything else (another
 * customer's car, a made-up id, a guest) gives null, and the booking falls
 * back to the plate they typed.
 */
export async function customerVehicleId(
  db: SupabaseClient,
  userId: string | null,
  vehicleId: string | null | undefined
): Promise<string | null> {
  if (!userId || !vehicleId) return null;

  const { data: vehicle } = await db
    .from("vehicles")
    .select("id, user_id")
    .eq("id", vehicleId)
    .maybeSingle();
  if (!vehicle) return null;
  if (vehicle.user_id === userId) return vehicle.id;

  const { data: sub } = await db
    .from("user_subscription")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!sub) return null;

  const { data: onPlan } = await db
    .from("subscription_vehicles")
    .select("id")
    .eq("subscription_id", sub.id)
    .eq("vehicle_id", vehicle.id)
    .limit(1)
    .maybeSingle();
  return onPlan ? vehicle.id : null;
}
