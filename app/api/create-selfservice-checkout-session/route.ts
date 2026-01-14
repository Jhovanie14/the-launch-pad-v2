import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";
import { ensureVehicle } from "@/utils/vehicle";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { planId, userId, vehicle } = body as {
      planId: string;
      userId?: string | null;
      vehicle?: {
        license_plate?: string;
      };
    };

    // Get the authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const email = user.email;

    // Validate license plate
    if (!vehicle?.license_plate || !vehicle.license_plate.trim()) {
      return new Response(
        JSON.stringify({ error: "License plate is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Create or get existing vehicle
    const vehicleId = await ensureVehicle({
      user_id: user.id ?? userId ?? null,
      license_plate: vehicle.license_plate,
    });

    // Fetch the plan
    const { data: plan, error: planError } = await supabase
      .from("self_service_plans")
      .select("stripe_price_id_monthly")
      .eq("id", planId)
      .single();

    if (planError || !plan?.stripe_price_id_monthly) {
      console.error("Error fetching plan:", planError);
      return new Response(
        JSON.stringify({ error: "Plan not found or missing Stripe price" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: plan.stripe_price_id_monthly, quantity: 1 }],
      customer_email: email,
      allow_promotion_codes: true,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/pricing/self-service-cart/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/pricing/selfservice`,
      metadata: {
        app_user_id: user.id ?? userId ?? "",
        plan_id: planId,
        plan_type: "self_service",
        billing_cycle: "monthly",
        vehicle_id: vehicleId ?? "",
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Self-service checkout error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
