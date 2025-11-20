import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's active self-service subscription
    const { data: subscription, error } = await supabase
      .from("self_service_subscriptions")
      .select("id, stripe_subscription_id, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (error || !subscription) {
      return NextResponse.json(
        { error: "No active self-service subscription" },
        { status: 404 }
      );
    }

    if (!subscription.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No Stripe subscription linked" },
        { status: 400 }
      );
    }

    // Cancel Stripe subscription at period end
    const canceled = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      { cancel_at_period_end: true }
    );

    return NextResponse.json({ canceled });
  } catch (err) {
    console.error("Error canceling self-service subscription:", err);
    return NextResponse.json(
      { error: "Failed to cancel self-service subscription" },
      { status: 500 }
    );
  }
}
