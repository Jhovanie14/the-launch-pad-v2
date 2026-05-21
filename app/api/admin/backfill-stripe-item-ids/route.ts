import { stripe } from "@/lib/stripe/stripe";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// One-time backfill: populate stripe_item_id for subscription_vehicles rows that have NULL.
// Protect with a secret so only you can trigger it.
// Usage: GET /api/admin/backfill-stripe-item-ids?secret=YOUR_BACKFILL_SECRET
//
// After running successfully, you can delete this file.

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.BACKFILL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Fetch all subscription_vehicles with NULL stripe_item_id, joined to their subscription
  const { data: nullVehicles, error: fetchError } = await admin
    .from("subscription_vehicles")
    .select("id, vehicle_id, subscription_id")
    .is("stripe_item_id", null)
    .order("id", { ascending: true });

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!nullVehicles || nullVehicles.length === 0) {
    return NextResponse.json({ message: "Nothing to backfill — all rows already have stripe_item_id." });
  }

  // Group vehicles by subscription_id
  const bySubscription = new Map<string, typeof nullVehicles>();
  for (const v of nullVehicles) {
    const group = bySubscription.get(v.subscription_id) ?? [];
    group.push(v);
    bySubscription.set(v.subscription_id, group);
  }

  const results: {
    subscription_id: string;
    stripe_subscription_id: string;
    updated: { vehicle_id: string; stripe_item_id: string; method: string }[];
    skipped: { vehicle_id: string; reason: string }[];
  }[] = [];

  for (const [subscriptionId, vehiclesWithNull] of bySubscription) {
    // Get the stripe_subscription_id for this subscription
    const { data: sub } = await admin
      .from("user_subscription")
      .select("stripe_subscription_id")
      .eq("id", subscriptionId)
      .maybeSingle();

    if (!sub?.stripe_subscription_id) {
      for (const v of vehiclesWithNull) {
        results.push({
          subscription_id: subscriptionId,
          stripe_subscription_id: "(not found)",
          updated: [],
          skipped: [{ vehicle_id: v.vehicle_id, reason: "No stripe_subscription_id in user_subscription" }],
        });
      }
      continue;
    }

    // Get ALL vehicles for this subscription (ordered by id = insertion order = position)
    const { data: allVehicles } = await admin
      .from("subscription_vehicles")
      .select("id, vehicle_id, stripe_item_id")
      .eq("subscription_id", subscriptionId)
      .order("id", { ascending: true });

    if (!allVehicles) continue;

    // Retrieve the Stripe subscription
    let stripeSub: Awaited<ReturnType<typeof stripe.subscriptions.retrieve>>;
    try {
      stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    } catch (err: any) {
      for (const v of vehiclesWithNull) {
        results.push({
          subscription_id: subscriptionId,
          stripe_subscription_id: sub.stripe_subscription_id,
          updated: [],
          skipped: [{ vehicle_id: v.vehicle_id, reason: `Stripe error: ${err?.message}` }],
        });
      }
      continue;
    }

    const stripeItems = stripeSub.items.data;
    const updated: { vehicle_id: string; stripe_item_id: string; method: string }[] = [];
    const skipped: { vehicle_id: string; reason: string }[] = [];

    // Track which stripe item IDs are already claimed (by existing DB records or matched this run)
    const claimedStripeItemIds = new Set<string>(
      allVehicles.map((v) => v.stripe_item_id).filter(Boolean) as string[]
    );

    for (let i = 0; i < allVehicles.length; i++) {
      const dbVehicle = allVehicles[i];

      // Skip rows that already have stripe_item_id
      if (dbVehicle.stripe_item_id) continue;

      // Skip rows that are not in our null-vehicles list
      if (!vehiclesWithNull.find((v) => v.id === dbVehicle.id)) continue;

      let matched: (typeof stripeItems)[number] | undefined;
      let method = "";

      // Match 1: price metadata has vehicle_index === position
      matched = stripeItems.find(
        (item) =>
          item.price?.metadata?.vehicle_index === i.toString() &&
          !claimedStripeItemIds.has(item.id)
      );
      if (matched) method = "vehicle_index metadata";

      // Match 2: position 0 = the item that is NOT a flock discount
      if (!matched && i === 0) {
        matched = stripeItems.find(
          (item) =>
            item.price?.metadata?.is_flock_discount !== "true" &&
            !claimedStripeItemIds.has(item.id)
        );
        if (matched) method = "primary (no flock flag)";
      }

      // Match 3: position 1+ = flock items in order, skipping already claimed
      if (!matched && i > 0) {
        const unclaimedFlockItems = stripeItems.filter(
          (item) =>
            item.price?.metadata?.is_flock_discount === "true" &&
            !claimedStripeItemIds.has(item.id)
        );
        // How many flock vehicles before position i already have a stripe_item_id?
        const flocksBefore = allVehicles
          .slice(1, i)
          .filter((v) => v.stripe_item_id || updated.find((u) => u.vehicle_id === v.vehicle_id)).length;
        matched = unclaimedFlockItems[flocksBefore];
        if (matched) method = "flock position";
      }

      // Match 4: positional fallback (use item at same index)
      if (!matched && stripeItems[i] && !claimedStripeItemIds.has(stripeItems[i].id)) {
        matched = stripeItems[i];
        method = "positional fallback";
      }

      if (!matched) {
        skipped.push({ vehicle_id: dbVehicle.vehicle_id, reason: "No unclaimed Stripe item found" });
        continue;
      }

      // Update DB
      const { error: updateError } = await admin
        .from("subscription_vehicles")
        .update({ stripe_item_id: matched.id })
        .eq("id", dbVehicle.id);

      if (updateError) {
        skipped.push({ vehicle_id: dbVehicle.vehicle_id, reason: `DB update error: ${updateError.message}` });
      } else {
        claimedStripeItemIds.add(matched.id);
        updated.push({ vehicle_id: dbVehicle.vehicle_id, stripe_item_id: matched.id, method });
      }
    }

    results.push({
      subscription_id: subscriptionId,
      stripe_subscription_id: sub.stripe_subscription_id,
      updated,
      skipped,
    });
  }

  const totalUpdated = results.reduce((sum, r) => sum + r.updated.length, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped.length, 0);

  return NextResponse.json({
    summary: {
      subscriptions_processed: results.length,
      vehicles_updated: totalUpdated,
      vehicles_skipped: totalSkipped,
    },
    details: results,
  });
}
