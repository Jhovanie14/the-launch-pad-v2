import { SupabaseClient } from "@supabase/supabase-js";
import { SelfServiceSubscription } from "@/types";
import { BILLING_VISIBLE_STATUSES, pickBillingSubscription } from "@/lib/subscriptions/billingStatus";

/**
 * The customer's self-service plan. Default: active only. includeOverdue:
 * also past_due / unpaid, for the Billing page.
 */
export async function getActiveSelfServiceSubscription(
  supabase: SupabaseClient,
  userId: string,
  opts: { includeOverdue?: boolean } = {},
): Promise<SelfServiceSubscription | null> {
  const query = supabase.from("self_service_subscriptions").select("*").eq("user_id", userId);
  const { data: subs, error: subError } = opts.includeOverdue
    ? await query
        .in("status", [...BILLING_VISIBLE_STATUSES])
        .then((r) => ({ ...r, data: pickBillingSubscription(r.data) }))
    : await query.eq("status", "active").maybeSingle();

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
