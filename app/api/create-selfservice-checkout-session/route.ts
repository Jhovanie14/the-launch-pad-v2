import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";
import { ensureVehicle } from "@/utils/vehicle";

export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json();
  const { planId, userId, vehicle } = body as {
    planId: string;
    userId?: string | null;
    vehicle?: {
      year: number;
      make: string;
      model: string;
      body_type?: string;
      color?: string;
    };
  };

  // Get the authenticated user (optional if userId is passed)
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
        body_type: vehicle.body_type,
        colors: [vehicle.color ?? ""],
      })
    : null;

  // Fetch the plan
  const { data: plan, error: planError } = await supabase
    .from("self_service_plans")
    .select("stripe_price_id_monthly")
    .eq("id", planId)
    .single();

  if (!plan?.stripe_price_id_monthly) {
    return new Response(
      JSON.stringify({ error: "Plan missing Stripe price" }),
      { status: 400 }
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: plan.stripe_price_id_monthly, quantity: 1 }],
    customer_email: email,
    allow_promotion_codes: true,
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/pricing/self-service-cart/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/pricing/selfservice`,
    metadata: {
      app_user_id: user?.id ?? userId ?? "",
      plan_id: planId,
      plan_type: "self_service",
      billing_cycle: "monthly",
      vehicle_id: vehicleId ?? "",
    },
  });

  return new Response(JSON.stringify({ url: session.url }), { status: 200 });
}
