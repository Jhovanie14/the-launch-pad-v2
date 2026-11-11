// services/subscriptionService.ts
import { SupabaseClient } from "@supabase/supabase-js";
import { Subscription } from "@/types";
import { BILLING_VISIBLE_STATUSES, pickBillingSubscription } from "@/lib/subscriptions/billingStatus";

/**
 * The customer's membership. Default: active only (what booking and pricing
 * use). includeOverdue: also past_due / unpaid, for the Billing page.
 */
export async function getActiveSubscription(
  supabase: SupabaseClient,
  userId: string,
  opts: { includeOverdue?: boolean } = {},
): Promise<Subscription | null> {
  const query = supabase.from("user_subscription").select("*").eq("user_id", userId);
  const { data: subs, error: subError } = opts.includeOverdue
    ? await query
        .in("status", [...BILLING_VISIBLE_STATUSES])
        .then((r) => ({ ...r, data: pickBillingSubscription(r.data) }))
    : await query.eq("status", "active").maybeSingle();

  if (subError) throw subError;
  if (!subs) return null;

  const { data: plan, error: planError } = await supabase
    .from("subscription_plans")
    .select("name, description, monthly_price, yearly_price, is_commercial")
    .eq("id", subs.subscription_plan_id)
    .maybeSingle();

  if (planError) throw planError;

  // Fetch vehicles linked to this subscription
  const { data: vehicles, error: vehicleError } = await supabase
    .from("subscription_vehicles")
    .select(
      `
      id,
      stripe_item_id,
      is_primary,
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
    .eq("subscription_id", subs.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (vehicleError) {
    console.error("Error fetching subscription vehicles:", vehicleError);
  }

  return {
    ...subs,
    plan_id: subs.subscription_plan_id,
    subscription_plans: plan,
    billing_cycle: subs.billing_cycle || "month",
    vehicles: (vehicles || [])
      .map((v: any) =>
        v.vehicle
          ? {
              ...v.vehicle,
              subscription_vehicle_id: v.id,
              stripe_item_id: v.stripe_item_id ?? null,
              is_primary: v.is_primary ?? false,
            }
          : null
      )
      .filter(Boolean),
  };
}
