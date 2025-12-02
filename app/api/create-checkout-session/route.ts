import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";
import { ensureVehicle } from "@/utils/vehicle";

export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json();
  const { planId, billingCycle, userId, vehicle, vehicles } = body as {
    planId: string;
    billingCycle: "monthly" | "yearly";
    userId?: string | null;
    vehicle?: {
      year: number;
      make: string;
      model: string;
      body_type?: string;
      color?: string;
    };
    vehicles?: Array<{
      year: number;
      make: string;
      model: string;
      body_type?: string;
      color?: string;
      licensePlate?: string;
    }>;
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email;

  // Support both single vehicle (legacy) and multiple vehicles
  const vehiclesList = vehicles || (vehicle ? [vehicle] : []);

  if (vehiclesList.length === 0) {
    return new Response(
      JSON.stringify({ error: "At least one vehicle is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Ensure all vehicles exist and get their IDs
  const vehicleIds: (string | null)[] = [];
  for (const vehicle of vehiclesList) {
    const vehicleId = await ensureVehicle({
      user_id: user?.id ?? userId ?? null,
      year: Number(vehicle.year),
      make: vehicle.make,
      model: vehicle.model,
      body_type: vehicle.body_type,
      colors: [vehicle.color ?? ""],
    });
    vehicleIds.push(vehicleId);
  }

  const { data: plan, error: planError } = await supabase
    .from("subscription_plans")
    .select("stripe_price_id_monthly, stripe_price_id_yearly, monthly_price, yearly_price")
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
      ? plan?.stripe_price_id_monthly
      : plan?.stripe_price_id_yearly;

  let basePriceId: string | null = rawId ?? null;

  if (basePriceId && basePriceId.startsWith("prod_")) {
    const prices = await stripe.prices.list({
      product: basePriceId,
      active: true,
      recurring: { interval: billingCycle === "monthly" ? "month" : "year" },
      limit: 1,
    });
    basePriceId = prices.data[0]?.id ?? null;
  }

  if (!basePriceId || !basePriceId.startsWith("price_")) {
    return new Response(
      JSON.stringify({ error: "Plan missing Stripe price" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Get the base price object to create discounted prices
  const basePrice = await stripe.prices.retrieve(basePriceId);
  const baseAmount = basePrice.unit_amount ?? 0;

  // Build line items: first vehicle at full price, others at 10% discount
  const lineItems: Array<{ price: string; quantity: number }> = [];

  for (let i = 0; i < vehiclesList.length; i++) {
    const isFirstVehicle = i === 0;
    
    if (isFirstVehicle) {
      // First vehicle uses the base price
      lineItems.push({ price: basePriceId, quantity: 1 });
    } else {
      // Additional vehicles get 10% discount
      // Create a discounted price for this vehicle
      const discountedAmount = Math.round(baseAmount * 0.9);
      
      // Check if we already have a discounted price for this plan
      // For simplicity, we'll create a new price each time, but in production
      // you might want to cache these prices
      const discountedPrice = await stripe.prices.create({
        currency: basePrice.currency,
        unit_amount: discountedAmount,
        recurring: {
          interval: billingCycle === "monthly" ? "month" : "year",
        },
        product: basePrice.product as string,
        metadata: {
          plan_id: planId,
          is_flock_discount: "true",
          vehicle_index: i.toString(),
        },
      });

      lineItems.push({ price: discountedPrice.id, quantity: 1 });
    }
  }

  console.log("Creating checkout session with metadata:", {
    app_user_id: user?.id ?? userId ?? "",
    plan_id: planId,
    billing_cycle: billingCycle,
    vehicle_ids: vehicleIds.join(","),
    vehicle_count: vehiclesList.length,
  });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: lineItems,
    customer_email: email,
    allow_promotion_codes: true,
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/pricing/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/pricing`,
    metadata: {
      app_user_id: user?.id ?? userId ?? "",
      plan_id: planId,
      billing_cycle: billingCycle,
      vehicle_ids: vehicleIds.filter(Boolean).join(","),
      vehicle_count: vehiclesList.length.toString(),
    },
  });

  return new Response(JSON.stringify({ url: session.url }), { status: 200 });
}
