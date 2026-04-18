import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { data: sub } = await supabase
    .from("user_subscription")
    .select("stripe_customer_id, stripe_subscription_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    return new Response(JSON.stringify({ amount_due: null }), { status: 200 });
  }

  try {
    const invoice = await stripe.invoices.createPreview({
      customer: sub.stripe_customer_id,
      subscription: sub.stripe_subscription_id,
    });
    return new Response(JSON.stringify({ amount_due: invoice.amount_due / 100 }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ amount_due: null }), { status: 200 });
  }
}
