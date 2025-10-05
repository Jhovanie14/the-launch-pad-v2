import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";
import { ensureVehicle } from "@/utils/vehicle";

export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json();
  const { planId, billingCycle, userId, vehicle } = body as {
    planId: string;
    billingCycle: "monthly" | "yearly";
    userId?: string | null;
    vehicle?: {
      year: number;
      make: string;
      model: string;
      trim: string;
      body_type?: string;
      color?: string;
    };
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email;

  const vehicleId = vehicle
    ? await ensureVehicle({
        user_id: user?.id ?? userId ?? null,
        year: Number(vehicle.year),
        make: vehicle.make,
        model: vehicle.model,
        trim: vehicle.trim,
        body_type: vehicle.body_type,
        colors: [vehicle.color ?? ""],
      })
    : null;

  const { data: plan, error: planError } = await supabase
    .from("subscription_plans")
    .select("stripe_price_id_monthly, stripe_price_id_yearly")
    .eq("id", planId)
    .single();

  console.log(
    "planId received:",
    planId,
    "lookup error:",
    planError,
    "plan:",
    plan
  );

  const rawId =
    billingCycle === "monthly"
      ? (plan as any)?.stripe_price_id_monthly
      : (plan as any)?.stripe_price_id_yearly;

  let priceId: string | null = rawId ?? null;

  if (priceId && priceId.startsWith("prod_")) {
    const prices = await stripe.prices.list({
      product: priceId,
      active: true,
      recurring: { interval: billingCycle === "monthly" ? "month" : "year" },
      limit: 1,
    });
    priceId = prices.data[0]?.id ?? null;
  }

  if (!priceId || !priceId.startsWith("price_")) {
    return new Response(
      JSON.stringify({ error: "Plan missing Stripe price" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  console.log("Creating checkout session with metadata:", {
    app_user_id: user?.id ?? userId ?? "",
    plan_id: planId,
    billing_cycle: billingCycle,
    vehicle_id: vehicleId,
  });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: email,
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/pricing/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/pricing`,
    metadata: {
      app_user_id: user?.id ?? userId ?? "",
      plan_id: planId,
      billing_cycle: billingCycle,
      vehicle_id: vehicleId ?? "",
    },
  });

  return new Response(JSON.stringify({ url: session.url }), { status: 200 });
}
