import { SupabaseClient } from "@supabase/supabase-js";
import { SelfServiceSubscription } from "@/types";

export async function getActiveSelfServiceSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<SelfServiceSubscription | null> {
  // Query the self_service_subscriptions table
  const { data: subs, error: subError } = await supabase
    .from("self_service_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  console.log("📌 Subscription row:", subs);
  console.log("📌 Subscription error:", subError);

  if (subError) throw subError;
  if (!subs) return null;

  const { data: plan, error: planError } = await supabase
    .from("self_service_plans")
    .select("name, description, monthly_price")
    .eq("id", subs.self_service_plan_id)
    .maybeSingle();

  // fetching user vechile
  const { data: vehicles, error: vehicleError } = await supabase
    .from("self_service_subscription_vehicles")
    .select(
      `
    id,
    vehicle:vehicles (
      id,
      year,
      make,
      model,
      body_type,
      colors,
      license_plate
    )
  `
    )
    .eq("subscription_id", subs.id);

  console.log("📌 Vehicle join result:", vehicles);
  console.log("📌 Vehicle join error:", vehicleError);

  if (planError) throw planError;

  return {
    ...subs,
    plan_id: subs.self_service_plan_id,
    subscription_plans: plan,
    billing_cycle: subs.billing_cycle || "month",
    vehicles: (vehicles || []).map((v) => v.vehicle),

  };
}
