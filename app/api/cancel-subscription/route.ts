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

    // Get the user's active subscription from Supabase
    const { data: subscription, error } = await supabase
      .from("user_subscription")
      .select("stripe_subscription_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (error || !subscription) {
      return NextResponse.json(
        { error: "No active subscription" },
        { status: 404 }
      );
    }

    // Cancel at period end (or immediate)
    const canceled = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        cancel_at_period_end: true, // set to false and use `stripe.subscriptions.del()` for immediate cancel
      }
    );

    return NextResponse.json({ canceled });
  } catch (err) {
    console.error("Error canceling subscription:", err);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
