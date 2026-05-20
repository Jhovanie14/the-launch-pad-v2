import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });

  const { data: sub } = await supabase
    .from("user_subscription")
    .select("stripe_customer_id, stripe_subscription_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    return new Response(
      JSON.stringify({ amount_due: null, recurring_amount: null, has_proration: false }),
      { status: 200 }
    );
  }

  try {
    const invoice = await stripe.invoices.createPreview({
      customer: sub.stripe_customer_id,
      subscription: sub.stripe_subscription_id,
      expand: ["lines"],
    });

    const lines = (invoice.lines?.data ?? []) as any[];

    // Proration line items have proration: true
    const hasProration = lines.some((line) => line.proration === true);

    // Recurring amount = only non-proration subscription items
    const recurringAmount =
      lines
        .filter((line) => !line.proration)
        .reduce((sum: number, line: any) => sum + (line.amount ?? 0), 0) / 100;

    return new Response(
      JSON.stringify({
        amount_due: invoice.amount_due / 100,
        recurring_amount: recurringAmount,
        has_proration: hasProration,
      }),
      { status: 200 }
    );
  } catch {
    return new Response(
      JSON.stringify({ amount_due: null, recurring_amount: null, has_proration: false }),
      { status: 200 }
    );
  }
}
