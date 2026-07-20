import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendPrimaryVehicleSwappedEmail } from "@/lib/email/subscription-emails";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    return await handler(req);
  } catch (err: any) {
    console.error("[swap-primary-vehicle] unhandled error:", err?.message, err?.stack);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

async function handler(req: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { newPrimarySubscriptionVehicleId } = await req.json();

  if (!newPrimarySubscriptionVehicleId) {
    return NextResponse.json(
      { error: "newPrimarySubscriptionVehicleId is required" },
      { status: 400 }
    );
  }

  const { data: sub } = await supabase
    .from("user_subscription")
    .select("id, stripe_subscription_id, subscription_plan_id, billing_cycle")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!sub) {
    return NextResponse.json(
      { error: "No active subscription found" },
      { status: 400 }
    );
  }

  const { data: allSubVehicles } = await supabase
    .from("subscription_vehicles")
    .select("id, vehicle_id, stripe_item_id, is_primary, vehicles(license_plate)")
    .eq("subscription_id", sub.id);

  if (!allSubVehicles || allSubVehicles.length === 0) {
    return NextResponse.json(
      { error: "No vehicles found on this subscription" },
      { status: 404 }
    );
  }

  const oldPrimary = allSubVehicles.find((v) => v.is_primary);
  const target = allSubVehicles.find((v) => v.id === newPrimarySubscriptionVehicleId);

  if (!oldPrimary) {
    return NextResponse.json(
      { error: "No primary vehicle found on this subscription" },
      { status: 404 }
    );
  }

  if (!target) {
    return NextResponse.json(
      { error: "Chosen vehicle not found on this subscription" },
      { status: 404 }
    );
  }

  if (target.is_primary) {
    return NextResponse.json(
      { error: "Chosen vehicle is already the primary vehicle" },
      { status: 400 }
    );
  }

  // Resolve the plan's full base Stripe price (same lookup pattern as add-vehicle)
  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("stripe_price_id_monthly, stripe_price_id_yearly")
    .eq("id", sub.subscription_plan_id)
    .maybeSingle();

  const planPriceId =
    sub.billing_cycle === "month"
      ? plan?.stripe_price_id_monthly
      : plan?.stripe_price_id_yearly;

  let fullPriceId: string | null = null;

  if (planPriceId?.startsWith("price_")) {
    fullPriceId = planPriceId;
  } else if (planPriceId?.startsWith("prod_")) {
    const prices = await stripe.prices.list({
      product: planPriceId,
      active: true,
      recurring: { interval: sub.billing_cycle === "month" ? "month" : "year" },
      limit: 1,
    });
    fullPriceId = prices.data[0]?.id ?? null;
  }

  if (!fullPriceId) {
    return NextResponse.json(
      { error: "Could not resolve full-price Stripe price for this plan" },
      { status: 500 }
    );
  }

  // Resolve the old primary's Stripe item id (fallback if not stored in DB)
  let oldPrimaryItemId: string | null = oldPrimary.stripe_item_id ?? null;
  let stripeSub: Awaited<ReturnType<typeof stripe.subscriptions.retrieve>> | null = null;

  if (!oldPrimaryItemId || !target.stripe_item_id) {
    stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
  }

  if (!oldPrimaryItemId && stripeSub) {
    const byMetadata = stripeSub.items.data.find(
      (item: any) => item.price?.metadata?.vehicle_index === "0"
    );
    oldPrimaryItemId = byMetadata?.id ?? stripeSub.items.data[0]?.id ?? null;
  }

  let targetItemId: string | null = target.stripe_item_id ?? null;

  if (!targetItemId && stripeSub) {
    const targetIndex = allSubVehicles.findIndex((v) => v.id === target.id);
    targetItemId = stripeSub.items.data[targetIndex]?.id ?? null;
  }

  if (!targetItemId) {
    return NextResponse.json(
      { error: "Could not resolve the chosen vehicle's Stripe billing item" },
      { status: 500 }
    );
  }

  // Promote the target vehicle's Stripe item to the full base price
  await stripe.subscriptionItems.update(targetItemId, {
    price: fullPriceId,
    proration_behavior: "create_prorations",
  });

  console.log("[swap-primary-vehicle] promoted item to full price:", targetItemId);

  // Remove the old primary's Stripe item
  if (oldPrimaryItemId) {
    try {
      await stripe.subscriptionItems.del(oldPrimaryItemId, {
        proration_behavior: "create_prorations",
      });
      console.log("[swap-primary-vehicle] old primary stripe item deleted:", oldPrimaryItemId);
    } catch (stripeErr: any) {
      console.warn(
        "[swap-primary-vehicle] stripe delete of old primary failed, continuing with DB update:",
        stripeErr?.message
      );
    }
  } else {
    console.warn("[swap-primary-vehicle] no old primary stripe item id found — skipping Stripe delete");
  }

  // DB: remove old primary row, promote target row
  const { error: deleteError } = await admin
    .from("subscription_vehicles")
    .delete()
    .eq("id", oldPrimary.id);

  if (deleteError) {
    console.error("[swap-primary-vehicle] db delete error:", deleteError.message);
    return NextResponse.json(
      { error: "Vehicles updated in billing but failed to update records. Please contact support." },
      { status: 500 }
    );
  }

  const { error: updateError } = await admin
    .from("subscription_vehicles")
    .update({ is_primary: true })
    .eq("id", target.id);

  if (updateError) {
    console.error("[swap-primary-vehicle] db update error:", updateError.message);
    return NextResponse.json(
      { error: "Vehicles updated in billing but failed to update records. Please contact support." },
      { status: 500 }
    );
  }

  const { data: plan2 } = await supabase
    .from("subscription_plans")
    .select("monthly_price, yearly_price")
    .eq("id", sub.subscription_plan_id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (user.email && plan2) {
    const basePrice =
      sub.billing_cycle === "year"
        ? Number(plan2.yearly_price ?? 0)
        : Number(plan2.monthly_price ?? 0);
    const remainingFamilyCount = allSubVehicles.length - 2; // total minus old primary minus promoted target
    const newTotal = basePrice + basePrice * 0.65 * Math.max(remainingFamilyCount, 0);

    const oldPrimaryLabel = (oldPrimary as any).vehicles?.license_plate ?? "your old primary vehicle";
    const newPrimaryLabel = (target as any).vehicles?.license_plate ?? "your new primary vehicle";

    await sendPrimaryVehicleSwappedEmail({
      to: user.email,
      name: profile?.full_name ?? "there",
      oldPrimaryLabel,
      newPrimaryLabel,
      newTotal,
      billingCycle: sub.billing_cycle ?? "month",
    });
  }

  console.log("[swap-primary-vehicle] success, new primary:", target.id);
  return NextResponse.json({ success: true });
}
