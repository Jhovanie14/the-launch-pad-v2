import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Dual-table Stripe subscription sync. The webhook's subscription events
 * carry no marker for which product they belong to, so we try the express
 * table (user_subscription) first and fall through to
 * self_service_subscriptions when no row matched. Express queries replicate
 * the webhook's original behavior exactly.
 */

export interface StripeSubscriptionUpdateFields {
  stripeSubscriptionId: string;
  status: string;
  currentPeriodStartIso: string;
  currentPeriodEndIso: string | null;
  cancelAtPeriodEnd: boolean;
  priceId: string | null;
  /** subscription.metadata.plan_id (express checkout sets it) */
  metadataPlanId: string | null;
  /** subscription.metadata.billing_cycle — raw "monthly" | "yearly" | null */
  metadataBillingCycle: string | null;
}

export interface SubscriptionSyncResult {
  table: "user_subscription" | "self_service_subscriptions" | null;
  userId: string | null;
  rowId: string | null;
}

const NO_MATCH: SubscriptionSyncResult = { table: null, userId: null, rowId: null };

export async function applySubscriptionUpdate(
  db: SupabaseClient,
  f: StripeSubscriptionUpdateFields,
): Promise<SubscriptionSyncResult> {
  // Express arm — replicates the original handleSubscriptionUpdated queries.
  const { data: existingSub } = await db
    .from("user_subscription")
    .select("subscription_plan_id, billing_cycle")
    .eq("stripe_subscription_id", f.stripeSubscriptionId)
    .maybeSingle();

  const planId = f.metadataPlanId ?? existingSub?.subscription_plan_id ?? null;
  const billingCycle =
    f.metadataBillingCycle === "monthly"
      ? "month"
      : f.metadataBillingCycle === "yearly"
        ? "year"
        : (existingSub?.billing_cycle ?? null);

  const { data: expressRow, error: expressError } = await db
    .from("user_subscription")
    .update({
      status: f.status,
      current_period_start: f.currentPeriodStartIso,
      current_period_end: f.currentPeriodEndIso,
      cancel_at_period_end: f.cancelAtPeriodEnd,
      price_id: f.priceId,
      billing_cycle: billingCycle,
      subscription_plan_id: planId,
    })
    .eq("stripe_subscription_id", f.stripeSubscriptionId)
    .select("id, user_id")
    .maybeSingle();

  if (expressError) {
    console.error("Error updating subscription:", expressError);
    return NO_MATCH;
  }
  if (expressRow) {
    return { table: "user_subscription", userId: expressRow.user_id, rowId: expressRow.id };
  }

  // Self-service arm — slim column set; plan/price/billing live elsewhere.
  const { data: selfRow, error: selfError } = await db
    .from("self_service_subscriptions")
    .update({
      status: f.status,
      current_period_start: f.currentPeriodStartIso,
      current_period_end: f.currentPeriodEndIso,
      cancel_at_period_end: f.cancelAtPeriodEnd,
    })
    .eq("stripe_subscription_id", f.stripeSubscriptionId)
    .select("id, user_id")
    .maybeSingle();

  if (selfError) {
    console.error("Error updating self-service subscription:", selfError);
    return NO_MATCH;
  }
  if (selfRow) {
    return {
      table: "self_service_subscriptions",
      userId: selfRow.user_id,
      rowId: selfRow.id,
    };
  }
  return NO_MATCH;
}

export async function applySubscriptionDeleted(
  db: SupabaseClient,
  stripeSubscriptionId: string,
): Promise<SubscriptionSyncResult> {
  const cancelled = { status: "canceled", cancel_at_period_end: false };

  const { data: expressRow, error: expressError } = await db
    .from("user_subscription")
    .update(cancelled)
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .select("id, user_id")
    .maybeSingle();

  if (expressError) {
    console.error("Error canceling subscription:", expressError);
    return NO_MATCH;
  }
  if (expressRow) {
    return { table: "user_subscription", userId: expressRow.user_id, rowId: expressRow.id };
  }

  const { data: selfRow, error: selfError } = await db
    .from("self_service_subscriptions")
    .update(cancelled)
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .select("id, user_id")
    .maybeSingle();

  if (selfError) {
    console.error("Error canceling self-service subscription:", selfError);
    return NO_MATCH;
  }
  if (selfRow) {
    return {
      table: "self_service_subscriptions",
      userId: selfRow.user_id,
      rowId: selfRow.id,
    };
  }
  return NO_MATCH;
}

/** True when Stripe's previous_attributes shows cancel_at_period_end flipping
 * false -> true on this event (the moment a cancellation is scheduled). */
export function wasCancelJustScheduled(
  prevAttrs: Record<string, unknown>,
  cancelAtPeriodEnd: boolean,
): boolean {
  return (
    "cancel_at_period_end" in prevAttrs &&
    prevAttrs.cancel_at_period_end === false &&
    cancelAtPeriodEnd === true
  );
}
