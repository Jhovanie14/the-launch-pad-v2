import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";
import { ensureVehicle } from "@/utils/vehicle";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    return await handler(req);
  } catch (err: any) {
    console.error("[add-vehicle] unhandled error:", err?.message, err?.stack);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

async function handler(req: Request) {
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
    console.error("[add-vehicle] no active subscription:", subError?.message);
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

  // Retrieve Stripe subscription to get the primary item's price details
  console.log("[add-vehicle] retrieving stripe sub:", sub.stripe_subscription_id);
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

  // Safely extract the product ID — Stripe may return a string or an expanded object
  const productId =
    typeof primaryItem.price.product === "string"
      ? primaryItem.price.product
      : (primaryItem.price.product as any).id;

  // Resolve the original base price from the plan record.
  // The primary item's price may be discounted (promo), so we read the plan's canonical price.
  // billing_cycle in DB is stored as "month" or "year" (normalized by webhook)
  let originalBaseAmount = primaryItem.price.unit_amount ?? 0;

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("stripe_price_id_monthly, stripe_price_id_yearly")
    .eq("id", sub.subscription_plan_id)
    .maybeSingle();

  if (plan) {
    // billing_cycle is constrained to 'month' | 'year' by the DB check constraint
    const planPriceId =
      sub.billing_cycle === "month"
        ? plan.stripe_price_id_monthly
        : plan.stripe_price_id_yearly;

    if (planPriceId?.startsWith("price_")) {
      console.log("[add-vehicle] fetching base price:", planPriceId);
      const originalPrice = await stripe.prices.retrieve(planPriceId);
      originalBaseAmount = originalPrice.unit_amount ?? originalBaseAmount;
    } else if (planPriceId?.startsWith("prod_")) {
      // Some plans store a product ID instead of a price ID — look up the active price
      const prices = await stripe.prices.list({
        product: planPriceId,
        active: true,
        recurring: { interval: sub.billing_cycle === "month" ? "month" : "year" },
        limit: 1,
      });
      originalBaseAmount = prices.data[0]?.unit_amount ?? originalBaseAmount;
    }
  }

  console.log("[add-vehicle] base amount (cents):", originalBaseAmount);

  // Create a discounted price for the additional vehicle (65% of base = 35% family discount)
  const additionalVehiclePrice = await stripe.prices.create({
    currency: primaryItem.price.currency,
    unit_amount: Math.round(originalBaseAmount * 0.65),
    recurring: {
      interval: primaryItem.price.recurring!.interval,
      interval_count: primaryItem.price.recurring!.interval_count ?? 1,
    },
    product: productId,
    metadata: {
      plan_id: sub.subscription_plan_id,
      is_flock_discount: "true",
    },
  });

  console.log("[add-vehicle] created price:", additionalVehiclePrice.id);

  // Add the new item to the existing Stripe subscription (prorated automatically)
  const newStripeItem = await stripe.subscriptionItems.create({
    subscription: sub.stripe_subscription_id,
    price: additionalVehiclePrice.id,
    proration_behavior: "create_prorations",
  });

  console.log("[add-vehicle] created stripe item:", newStripeItem.id);

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

  // Link the vehicle to the subscription.
  // stripe_item_id column requires the DB migration:
  //   ALTER TABLE public.subscription_vehicles ADD COLUMN stripe_item_id TEXT;
  // If the column doesn't exist yet, fall back to inserting without it.
  let linkError: any = null;

  const { error: insertError } = await supabase
    .from("subscription_vehicles")
    .insert({
      subscription_id: sub.id,
      vehicle_id: vehicleId,
      stripe_item_id: newStripeItem.id,
    });

  if (insertError) {
    // If the column doesn't exist (migration not run), retry without stripe_item_id
    if (
      insertError.message?.includes("stripe_item_id") ||
      insertError.code === "PGRST204" ||
      insertError.code === "42703"
    ) {
      console.warn(
        "[add-vehicle] stripe_item_id column missing — inserting without it. Run migration: ALTER TABLE public.subscription_vehicles ADD COLUMN stripe_item_id TEXT;"
      );
      const { error: fallbackError } = await supabase
        .from("subscription_vehicles")
        .insert({
          subscription_id: sub.id,
          vehicle_id: vehicleId,
        });
      linkError = fallbackError;
    } else {
      linkError = insertError;
    }
  }

  if (linkError) {
    console.error("[add-vehicle] db link error:", linkError.message);
    // Rollback the Stripe item
    await stripe.subscriptionItems.del(newStripeItem.id, {
      proration_behavior: "none",
    });
    return NextResponse.json(
      { error: "Failed to link vehicle to subscription" },
      { status: 500 }
    );
  }

  console.log("[add-vehicle] success, vehicleId:", vehicleId);
  return NextResponse.json({ success: true, vehicleId });
}
