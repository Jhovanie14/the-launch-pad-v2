import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendFamilyVehicleRemovedEmail } from "@/lib/email/subscription-emails";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    return await handler(req);
  } catch (err: any) {
    console.error("[remove-vehicle] unhandled error:", err?.message, err?.stack);
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

  const { subscriptionVehicleId } = await req.json();

  if (!subscriptionVehicleId) {
    return NextResponse.json(
      { error: "subscriptionVehicleId is required" },
      { status: 400 }
    );
  }

  // Get user's active subscription
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

  // Fetch all subscription vehicles, primary first (matches subscriptionService.ts ordering)
  const { data: allSubVehicles } = await supabase
    .from("subscription_vehicles")
    .select("id, vehicle_id, stripe_item_id, is_primary")
    .eq("subscription_id", sub.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (!allSubVehicles || allSubVehicles.length === 0) {
    return NextResponse.json(
      { error: "No vehicles found on this subscription" },
      { status: 404 }
    );
  }

  const vehicleIndex = allSubVehicles.findIndex(
    (v) => v.id === subscriptionVehicleId
  );

  if (vehicleIndex === -1) {
    return NextResponse.json(
      { error: "Vehicle not found on this subscription" },
      { status: 404 }
    );
  }

  const vehicleToRemove = allSubVehicles[vehicleIndex];

  if (vehicleToRemove.is_primary) {
    return NextResponse.json(
      {
        error:
          "Cannot remove the primary vehicle here. Use the primary-vehicle unsubscribe control instead.",
      },
      { status: 400 }
    );
  }
  let stripeItemId: string | null = vehicleToRemove.stripe_item_id ?? null;

  // If no stored stripe_item_id, retrieve Stripe subscription and match by metadata or position
  if (!stripeItemId) {
    const stripeSub = await stripe.subscriptions.retrieve(
      sub.stripe_subscription_id
    );

    // Primary match: vehicle_index in price metadata (set at checkout for each vehicle)
    const byMetadata = stripeSub.items.data.find(
      (item: any) => item.price?.metadata?.vehicle_index === vehicleIndex.toString()
    );

    // Secondary match: find by is_flock_discount among items that don't have a DB-matched stripe_item_id
    const storedItemIds = new Set(
      allSubVehicles.map((v) => v.stripe_item_id).filter(Boolean)
    );
    const unmatchedFlockItems = stripeSub.items.data.filter(
      (item: any) =>
        item.price?.metadata?.is_flock_discount === "true" &&
        !storedItemIds.has(item.id)
    );

    // How many family vehicles before this one also lack a stripe_item_id?
    const familyVehiclesBeforeThis = allSubVehicles
      .slice(1, vehicleIndex)
      .filter((v) => !v.stripe_item_id).length;

    const byFlockPosition = unmatchedFlockItems[familyVehiclesBeforeThis];

    stripeItemId =
      byMetadata?.id ?? byFlockPosition?.id ?? stripeSub.items.data[vehicleIndex]?.id ?? null;

    console.log(
      "[remove-vehicle] stripe item resolved:",
      stripeItemId,
      "via",
      byMetadata ? "metadata" : byFlockPosition ? "flock-position" : "index-fallback"
    );
  }

  if (stripeItemId) {
    try {
      await stripe.subscriptionItems.del(stripeItemId, {
        proration_behavior: "create_prorations",
      });
      console.log("[remove-vehicle] stripe item deleted:", stripeItemId);
    } catch (stripeErr: any) {
      console.warn("[remove-vehicle] stripe delete failed, continuing with DB removal:", stripeErr?.message);
      // Non-fatal: item may already be gone or mismatched — still remove from DB
    }
  } else {
    console.warn("[remove-vehicle] no stripe item ID found — skipping Stripe delete");
  }

  // Use admin client to bypass RLS on subscription_vehicles delete
  const { error: deleteError } = await admin
    .from("subscription_vehicles")
    .delete()
    .eq("id", subscriptionVehicleId);

  if (deleteError) {
    console.error("[remove-vehicle] db delete error:", deleteError.message);
    return NextResponse.json(
      { error: "Vehicle removed from billing but failed to update records. Please contact support." },
      { status: 500 }
    );
  }

  const { data: vehicleRow } = await supabase
    .from("vehicles")
    .select("license_plate")
    .eq("id", vehicleToRemove.vehicle_id)
    .maybeSingle();

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("monthly_price, yearly_price")
    .eq("id", sub.subscription_plan_id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (user.email && plan) {
    const remainingFamilyCount = allSubVehicles.length - 2; // minus primary, minus the one just removed
    const basePrice =
      sub.billing_cycle === "year"
        ? Number(plan.yearly_price ?? 0)
        : Number(plan.monthly_price ?? 0);
    const newTotal = basePrice + basePrice * 0.65 * Math.max(remainingFamilyCount, 0);

    await sendFamilyVehicleRemovedEmail({
      to: user.email,
      name: profile?.full_name ?? "there",
      licensePlate: vehicleRow?.license_plate ?? "your vehicle",
      newTotal,
      billingCycle: sub.billing_cycle ?? "month",
    });
  }

  console.log("[remove-vehicle] success, removed subscription_vehicle:", subscriptionVehicleId);
  return NextResponse.json({ success: true });
}
