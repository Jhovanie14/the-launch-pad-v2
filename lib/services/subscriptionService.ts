// services/subscriptionService.ts
import { SupabaseClient } from "@supabase/supabase-js";
import { Subscription } from "@/types";

export async function getActiveSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<Subscription | null> {
  const { data: subs, error: subError } = await supabase
    .from("user_subscription")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (subError) throw subError;
  if (!subs) return null;

  const { data: plan, error: planError } = await supabase
    .from("subscription_plans")
    .select("name, description, monthly_price, yearly_price")
    .eq("id", subs.subscription_plan_id)
    .maybeSingle();

  if (planError) throw planError;

  return {
    ...subs,
    plan_id: subs.subscription_plan_id,
    subscription_plans: plan,
    billing_cycle: subs.billing_cycle || "month",
  };
}
