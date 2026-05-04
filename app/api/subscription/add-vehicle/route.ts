import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";
import { ensureVehicle } from "@/utils/vehicle";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { licensePlate } = await req.json();

  if (!licensePlate?.trim()) {
    return NextResponse.json(
      { error: "License plate is required" },
      { status: 400 }
    );
  }

  const normalizedPlate = licensePlate.trim().toUpperCase();

  // Get user's active subscription with current vehicle count
  const { data: sub, error: subError } = await supabase
    .from("user_subscription")
    .select(
      "id, stripe_subscription_id, subscription_plan_id, billing_cycle, subscription_vehicles(id)"
    )
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (subError || !sub) {
    return NextResponse.json(
      { error: "No active subscription found" },
      { status: 400 }
    );
  }

  const currentVehicleCount = (sub.subscription_vehicles as any[])?.length ?? 0;

  if (currentVehicleCount >= 5) {
    return NextResponse.json(
      { error: "Maximum 5 vehicles allowed per subscription" },
      { status: 400 }
    );
  }

  // Check the vehicle isn't already linked to this subscription
  const { data: existingVehicle } = await supabase
    .from("vehicles")
    .select("id")
    .eq("license_plate", normalizedPlate)
    .maybeSingle();

  if (existingVehicle) {
    const { data: alreadyLinked } = await supabase
      .from("subscription_vehicles")
      .select("id")
      .eq("subscription_id", sub.id)
      .eq("vehicle_id", existingVehicle.id)
      .maybeSingle();

    if (alreadyLinked) {
      return NextResponse.json(
        { error: "This vehicle is already on your subscription" },
        { status: 400 }
      );
    }
  }

  // Get the plan's original base price from Stripe (not the potentially discounted item price)
  const { data: plan } = await supabase
    .from("subscription_plans")
    .select(
      "stripe_price_id_monthly, stripe_price_id_yearly, monthly_price, yearly_price"
    )
    .eq("id", sub.subscription_plan_id)
    .single();

  const stripeSub = await stripe.subscriptions.retrieve(
    sub.stripe_subscription_id
  );
  const primaryItem = stripeSub.items.data[0];

  if (!primaryItem) {
    return NextResponse.json(
      { error: "Could not find subscription details in Stripe" },
      { status: 500 }
    );
  }

  // Resolve the original base price (use plan's price ID, not the primary item which may be discounted)
  let originalBaseAmount = primaryItem.price.unit_amount ?? 0;
  if (plan) {
    const planPriceId =
      sub.billing_cycle === "month"
        ? plan.stripe_price_id_monthly
        : plan.stripe_price_id_yearly;

    if (planPriceId?.startsWith("price_")) {
      const originalPrice = await stripe.prices.retrieve(planPriceId);
      originalBaseAmount = originalPrice.unit_amount ?? originalBaseAmount;
    }
  }

  // Create a discounted price for the additional vehicle (65% of base = 35% family discount)
  const additionalVehiclePrice = await stripe.prices.create({
    currency: primaryItem.price.currency,
    unit_amount: Math.round(originalBaseAmount * 0.65),
    recurring: {
      interval: primaryItem.price.recurring!.interval,
      interval_count: primaryItem.price.recurring!.interval_count ?? 1,
    },
    product: primaryItem.price.product as string,
    metadata: {
      plan_id: sub.subscription_plan_id,
      is_flock_discount: "true",
    },
  });

  // Add the new item to the existing Stripe subscription (prorated automatically)
  const newStripeItem = await stripe.subscriptionItems.create({
    subscription: sub.stripe_subscription_id,
    price: additionalVehiclePrice.id,
    proration_behavior: "create_prorations",
  });

  // Create/find the vehicle in DB
  const vehicleId = await ensureVehicle({
    license_plate: normalizedPlate,
    user_id: user.id,
  });

  if (!vehicleId) {
    // Rollback the Stripe item we just added
    await stripe.subscriptionItems.del(newStripeItem.id, {
      proration_behavior: "none",
    });
    return NextResponse.json(
      { error: "Failed to create vehicle record" },
      { status: 500 }
    );
  }

  // Link the vehicle to the subscription, storing stripe_item_id for future removal
  const { error: linkError } = await supabase
    .from("subscription_vehicles")
    .insert({
      subscription_id: sub.id,
      vehicle_id: vehicleId,
      stripe_item_id: newStripeItem.id,
    });

  if (linkError) {
    // Rollback
    await stripe.subscriptionItems.del(newStripeItem.id, {
      proration_behavior: "none",
    });
    return NextResponse.json(
      { error: "Failed to link vehicle to subscription" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, vehicleId });
}
