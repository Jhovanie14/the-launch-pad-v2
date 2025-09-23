import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json();
  const { planId, billingCycle, userId } = body as {
    planId: string;
    billingCycle: "monthly" | "yearly";
    userId?: string | null;
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email;

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
    return new Response(JSON.stringify({ error: "Plan missing Stripe price" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: email,
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing?cancelled=1`,
    metadata: {
      app_user_id: user?.id ?? userId ?? "",
      plan_id: planId,
      billing_cycle: billingCycle,
    },
  });

  return new Response(JSON.stringify({ url: session.url }), { status: 200 });
}
