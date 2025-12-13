import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";
import { ensureVehicle } from "@/utils/vehicle";

export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json();
  const { planId, billingCycle, userId, vehicle, vehicles, couponId } =
    body as {
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
        planId?: string;
      }>;
      couponId?: string;
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

  // Preload all relevant plan IDs (global planId and per-vehicle planIds)
  const planIdsToFetch = new Set<string>();
  if (planId) planIdsToFetch.add(planId);
  for (const v of vehiclesList) {
    if ((v as any).planId) planIdsToFetch.add((v as any).planId);
  }

  const { data: plans, error: plansError } = await supabase
    .from("subscription_plans")
    .select(
      "id, stripe_price_id_monthly, stripe_price_id_yearly, monthly_price, yearly_price"
    )
    .in("id", Array.from(planIdsToFetch));

  if (plansError) console.error("Error fetching plans", plansError);

  console.log(
    "planId received:",
    planId,
    "lookup error:",
    plansError,
    "plan:",
    planId
  );

  // Build line items: for each vehicle, use its plan's stripe price; apply 10% discount for additional vehicles
  const lineItems: Array<{ price: string; quantity: number }> = [];
  for (let i = 0; i < vehiclesList.length; i++) {
    const isFirstVehicle = i === 0;
    const vehicle = vehiclesList[i] as any;
    const vPlanId: string = vehicle.planId ?? planId;
    const vPlan = (plans || []).find((p: any) => p.id === vPlanId) || null;

    if (!vPlan) {
      return new Response(
        JSON.stringify({ error: `Missing plan for vehicle at index ${i}` }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    let rawId = billingCycle === "monthly" ? vPlan.stripe_price_id_monthly : vPlan.stripe_price_id_yearly;
    let vPriceId: string | null = rawId ?? null;
    if (vPriceId && vPriceId.startsWith("prod_")) {
      const prices = await stripe.prices.list({
        product: vPriceId,
        active: true,
        recurring: { interval: billingCycle === "monthly" ? "month" : "year" },
        limit: 1,
      });
      vPriceId = prices.data[0]?.id ?? null;
    }

    if (!vPriceId || !vPriceId.startsWith("price_")) {
      return new Response(
        JSON.stringify({ error: "Plan missing Stripe price for vehicle" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (isFirstVehicle) {
      // Use the full price for the first vehicle
      lineItems.push({ price: vPriceId, quantity: 1 });
    } else {
      // Additional vehicles receive 10% discount
      const basePriceObj = await stripe.prices.retrieve(vPriceId);
      const baseAmount = basePriceObj.unit_amount ?? 0;
      const discountedAmount = Math.round(baseAmount * 0.9);
      const discountedPrice = await stripe.prices.create({
        currency: basePriceObj.currency,
        unit_amount: discountedAmount,
        recurring: {
          interval: billingCycle === "monthly" ? "month" : "year",
        },
        product: basePriceObj.product as string,
        metadata: {
          plan_id: vPlanId,
          is_flock_discount: "true",
          vehicle_index: i.toString(),
        },
      });
      lineItems.push({ price: discountedPrice.id, quantity: 1 });
    }
  }

  const discounts = couponId ? [{ coupon: couponId }] : undefined;

  // Optional: Validate the coupon exists in Stripe before creating session
  if (couponId) {
    try {
      const coupon = await stripe.coupons.retrieve(couponId);
      if (!coupon.valid) {
        return new Response(
          JSON.stringify({ error: "Promo code is no longer valid" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    } catch (error) {
      console.error("Invalid coupon:", error);
      return new Response(JSON.stringify({ error: "Invalid promo code" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // console.log("Creating checkout session with metadata:", {
  //   app_user_id: user?.id ?? userId ?? "",
  //   plan_id: planId,
  //   billing_cycle: billingCycle,
  //   vehicle_ids: vehicleIds.join(","),
  //   vehicle_count: vehiclesList.length,
  // });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: lineItems,
    customer_email: email,
    discounts: discounts,
    // allow_promotion_codes: true,
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
