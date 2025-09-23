import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // Look up Stripe customer ID from your DB
  const { data: existing } = await supabase
    .from("user_subscription")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const stripeCustomerId = existing?.stripe_customer_id;
  if (!stripeCustomerId) return new Response("No Stripe customer", { status: 400 });

  const portal = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
  });

  return new Response(JSON.stringify({ url: portal.url }), { status: 200 });
}