import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
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
    .select("id, stripe_subscription_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!sub) {
    return NextResponse.json(
      { error: "No active subscription found" },
      { status: 400 }
    );
  }

  // Fetch all subscription vehicles ordered by insertion (first = primary)
  const { data: allSubVehicles } = await supabase
    .from("subscription_vehicles")
    .select("id, vehicle_id, stripe_item_id")
    .eq("subscription_id", sub.id)
    .order("id", { ascending: true });

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

  if (vehicleIndex === 0) {
    return NextResponse.json(
      {
        error:
          "Cannot remove the primary vehicle. Cancel your subscription instead.",
      },
      { status: 400 }
    );
  }

  const vehicleToRemove = allSubVehicles[vehicleIndex];
  let stripeItemId: string | null = vehicleToRemove.stripe_item_id ?? null;

  // If no stored stripe_item_id, attempt to match by position in Stripe subscription items
  if (!stripeItemId) {
    const stripeSub = await stripe.subscriptions.retrieve(
      sub.stripe_subscription_id
    );
    // Stripe items match DB vehicle order (same insertion order from checkout)
    const stripeItemAtIndex = stripeSub.items.data[vehicleIndex];
    stripeItemId = stripeItemAtIndex?.id ?? null;
  }

  if (stripeItemId) {
    await stripe.subscriptionItems.del(stripeItemId, {
      proration_behavior: "create_prorations",
    });
  }

  // Remove the link from subscription_vehicles
  await supabase
    .from("subscription_vehicles")
    .delete()
    .eq("id", subscriptionVehicleId);

  return NextResponse.json({ success: true });
}
