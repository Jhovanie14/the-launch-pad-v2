import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { ensureVehicle } from "@/utils/vehicle";
import { CUSTOMER_BLOCKED_MESSAGE, findCustomerBlock } from "@/lib/customers/customerBlocks";
import {
  flockPriceMetadata,
  flockUnitAmountCents,
} from "@/lib/pricing/flockPricing";
import { FIRST_SUBSCRIPTION_PROMO } from "@/lib/pricing/firstSubscriptionPromo";
import {
  firstPeriodDiscountCents,
  parseMembershipCheckout,
} from "@/lib/subscriptions/membershipCheckout";

/** Membership statuses that still hold a car (anything not ended). */
const ENDED_STATUSES = ["canceled", "cancelled", "incomplete_expired"];

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function POST(req: Request) {
  try {
    return await handler(req);
  } catch (err: any) {
    console.error("[create-checkout-session] unhandled error:", err?.message);
    return json({ error: "We could not start checkout. Please try again." }, 500);
  }
}

/**
 * Starts a membership checkout for the SIGNED-IN customer. Nothing the browser
 * sends decides who is billed, what it costs or which discount applies: the
 * account comes from the session, prices from the plan in the database and
 * Stripe, and the first-period offer is worked out here.
 */
async function handler(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return json({ error: "Please sign in to start a membership." }, 401);
  }

  const parsed = parseMembershipCheckout(await req.json().catch(() => null));
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const { planId, billingCycle, plates } = parsed.value;
  const interval = billingCycle === "monthly" ? "month" : "year";

  const admin = createAdminClient();

  // Staff-blocked customers and cars can't start a membership. Checked before
  // any vehicle row or Stripe price is created.
  const blocked = await findCustomerBlock(admin, { email: user.email, plates });
  if (blocked) return json({ error: CUSTOMER_BLOCKED_MESSAGE }, 403);

  // One membership per account: a second one would break every lookup that
  // expects a single active row (cancel, billing portal, add a car).
  const { data: memberships, error: membershipsError } = await admin
    .from("user_subscription")
    .select("id, status")
    .eq("user_id", user.id);
  if (membershipsError) throw membershipsError;
  const live = (memberships ?? []).find(
    (m) => !ENDED_STATUSES.includes(String(m.status ?? "").toLowerCase())
  );
  if (live) {
    return json(
      { error: "You already have a membership. Add more cars from your dashboard." },
      409
    );
  }
  const hadMembershipBefore = (memberships ?? []).length > 0;

  const { data: plan, error: planError } = await admin
    .from("subscription_plans")
    .select(
      "id, name, is_active, is_commercial, stripe_price_id_monthly, stripe_price_id_yearly, monthly_price, yearly_price"
    )
    .eq("id", planId)
    .maybeSingle();
  if (planError) throw planError;
  if (!plan || plan.is_active === false) {
    return json({ error: "That plan is not available. Please choose another." }, 400);
  }

  // Resolve the plan's Stripe price for this billing cycle.
  let priceId: string | null =
    (billingCycle === "monthly" ? plan.stripe_price_id_monthly : plan.stripe_price_id_yearly) ?? null;
  if (priceId && priceId.startsWith("prod_")) {
    const prices = await stripe.prices.list({
      product: priceId,
      active: true,
      recurring: { interval },
      limit: 1,
    });
    priceId = prices.data[0]?.id ?? null;
  }
  if (!priceId || !priceId.startsWith("price_")) {
    return json({ error: "This plan cannot be bought online yet. Please contact us." }, 400);
  }
  const basePrice = await stripe.prices.retrieve(priceId);
  const baseCents = basePrice.unit_amount ?? 0;

  // The cars. New ones belong to this customer.
  const vehicleIds: string[] = [];
  for (const plate of plates) {
    const id = await ensureVehicle({ license_plate: plate, user_id: user.id });
    if (!id) return json({ error: `We could not save ${plate}. Please try again.` }, 500);
    vehicleIds.push(id);
  }

  // A car can only be on one live membership.
  const { data: links, error: linksError } = await admin
    .from("subscription_vehicles")
    .select("vehicle_id, subscription_id")
    .in("vehicle_id", vehicleIds);
  if (linksError) throw linksError;
  if ((links ?? []).length > 0) {
    const { data: holders, error: holdersError } = await admin
      .from("user_subscription")
      .select("id, status")
      .in("id", [...new Set((links ?? []).map((l) => l.subscription_id))]);
    if (holdersError) throw holdersError;
    const liveIds = new Set(
      (holders ?? [])
        .filter((h) => !ENDED_STATUSES.includes(String(h.status ?? "").toLowerCase()))
        .map((h) => h.id)
    );
    const taken = (links ?? []).find((l) => liveIds.has(l.subscription_id));
    if (taken) {
      const plate = plates[vehicleIds.indexOf(taken.vehicle_id)] ?? "One of these cars";
      return json(
        { error: `${plate} is already on a membership. Please contact us if this is your car.` },
        409
      );
    }
  }

  // Line items: the primary car at the plan price; each extra car at the
  // family (or commercial) price as its own price object, because Stripe
  // rejects the same price twice and remove-vehicle matches by vehicle_index.
  const lineItems: Array<{ price: string; quantity: number }> = [{ price: priceId, quantity: 1 }];
  for (let i = 1; i < plates.length; i++) {
    const extra = await stripe.prices.create({
      currency: basePrice.currency,
      unit_amount: flockUnitAmountCents(baseCents, plan),
      recurring: { interval },
      product: basePrice.product as string,
      metadata: {
        ...flockPriceMetadata(planId, plan),
        vehicle_index: i.toString(),
      },
    });
    lineItems.push({ price: extra.id, quantity: 1 });
  }

  // First-period offer: the cart's percentage of the primary car only, as a
  // single-use coupon that Stripe applies to the first invoice and never to a
  // renewal. (It used to be a permanently discounted price, and the coupon id
  // came from the browser.)
  const discountCents = firstPeriodDiscountCents({
    hadMembershipBefore,
    promo: FIRST_SUBSCRIPTION_PROMO,
    primaryCarCents: baseCents,
  });
  let discounts: Array<{ coupon: string }> | undefined;
  if (discountCents > 0) {
    const coupon = await stripe.coupons.create({
      amount_off: discountCents,
      currency: basePrice.currency,
      duration: "once",
      max_redemptions: 1,
      redeem_by: Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60,
      name: `First ${interval} ${FIRST_SUBSCRIPTION_PROMO.percent}% off`,
      metadata: { purpose: "first_period_offer", user_id: user.id, plan_id: planId },
    });
    discounts = [{ coupon: coupon.id }];
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: lineItems,
    customer_email: user.email,
    ...(discounts ? { discounts } : {}),
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/pricing/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/pricing`,
    metadata: {
      app_user_id: user.id,
      plan_id: planId,
      billing_cycle: billingCycle,
      vehicle_ids: vehicleIds.join(","),
      vehicle_count: plates.length.toString(),
    },
  });

  return json({ url: session.url }, 200);
}
