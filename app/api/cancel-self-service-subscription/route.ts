import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireUser } from "@/lib/auth/guards";
import { apiError, ApiError } from "@/lib/http/apiError";

export async function POST() {
  try {
    const supabase = await createClient();
    const user = await requireUser(supabase);

    // Get the user's active self-service subscription (own-row RLS read).
    const { data: subscription } = await supabase
      .from("self_service_subscriptions")
      .select("id, stripe_subscription_id, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!subscription) {
      throw new ApiError("No active self-service subscription", 404);
    }
    if (!subscription.stripe_subscription_id) {
      throw new ApiError("No Stripe subscription linked", 400);
    }

    // Cancel at period end — never immediate, never refunded.
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // Stamp the row now so the UI's immediate refetch is deterministic; the
    // webhook (customer.subscription.updated) confirms the same value. If the
    // stamp fails, the webhook will still correct it — log, don't fail.
    const admin = createAdminClient();
    const { error: stampError } = await admin
      .from("self_service_subscriptions")
      .update({ cancel_at_period_end: true })
      .eq("id", subscription.id);
    if (stampError) {
      console.error(
        "[cancel-self-service] Stripe cancel scheduled but DB stamp failed:",
        stampError,
      );
    }

    return NextResponse.json({ canceled: true });
  } catch (err) {
    return apiError(err);
  }
}
