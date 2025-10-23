import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";
import { ensureVehicle } from "@/utils/vehicle";

export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json();

  const { stripeSubscriptionId, newPlanId, billingCycle, vehicle, userId } =
    body as {
      stripeSubscriptionId: string;
      newPlanId: string;
      billingCycle: "monthly" | "yearly";
      vehicle?: {
        year: number;
        make: string;
        model: string;
        body_type?: string;
        color?: string;
      };
      userId?: string | null;
    };

  try {
    // 1️⃣ Ensure vehicle exists (or create)
    const vehicleId = vehicle
      ? await ensureVehicle({
          user_id: userId ?? null,
          year: Number(vehicle.year),
          make: vehicle.make,
          model: vehicle.model,
          body_type: vehicle.body_type,
          colors: [vehicle.color ?? ""],
        })
      : null;

    // 2️⃣ Fetch the plan’s price IDs
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("stripe_price_id_monthly, stripe_price_id_yearly")
      .eq("id", newPlanId)
      .single();

    if (planError || !plan) {
      return new Response(JSON.stringify({ error: "Plan not found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let priceId =
      billingCycle === "monthly"
        ? plan.stripe_price_id_monthly
        : plan.stripe_price_id_yearly;

    // 3️⃣ Verify the Stripe price object interval matches expectation
    const price = await stripe.prices.retrieve(priceId);
    if (price.recurring?.interval !== billingCycle.slice(0, -2)) {
      return new Response(
        JSON.stringify({
          error: `Price interval mismatch. Expected ${billingCycle}, got ${price.recurring?.interval}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4️⃣ Retrieve and update existing subscription
    const subscription =
      await stripe.subscriptions.retrieve(stripeSubscriptionId);
    const subscriptionItemId = subscription.items.data[0].id;

    const updatedSubscription = await stripe.subscriptions.update(
      stripeSubscriptionId,
      {
        cancel_at_period_end: false,
        proration_behavior: "create_prorations",
        items: [{ id: subscriptionItemId, price: priceId }],
        metadata: {
          app_user_id: userId ?? "",
          plan_id: newPlanId,
          billing_cycle: billingCycle,
          vehicle_id: vehicleId ?? "",
        },
      }
    );

    console.log("✅ Updated subscription interval:", price.recurring?.interval);

    return new Response(
      JSON.stringify({ subscription: updatedSubscription, vehicleId }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("❌ Error updating subscription:", err);
    return new Response(
      JSON.stringify({ error: "Failed to update subscription" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
