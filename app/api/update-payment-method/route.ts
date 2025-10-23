// app/api/update-payment-method/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's Stripe customer ID from your DB
    const { data: subscription, error } = await supabase
      .from("user_subscription")
      .select("user_id, stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    console.log("📦 Subscription lookup:", subscription, error);

    if (error || !subscription?.stripe_customer_id) {
      console.error("No Stripe customer ID found", error);
      return NextResponse.json(
        { error: "No Stripe customer ID found" },
        { status: 404 }
      );
    }

    // ✅ Create Stripe Billing Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("Error creating billing portal session:", err);
    return NextResponse.json(
      { error: "Failed to create billing portal session" },
      { status: 500 }
    );
  }
}
