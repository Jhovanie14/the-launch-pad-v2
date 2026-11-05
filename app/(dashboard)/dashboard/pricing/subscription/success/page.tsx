import { Car, CheckCircle2, Clock, Crown, Mail } from "lucide-react";
import Link from "next/link";
import { stripe } from "@/lib/stripe/stripe";
import Stripe from "stripe";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  flockDiscountPercent,
  flockVehiclePrice,
  flockVehicleSavings,
  hasFlockDiscount,
} from "@/lib/pricing/flockPricing";

interface SubscriptionSuccessPageProps {
  searchParams: { session_id?: string };
}

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "America/Chicago",
};

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("en-US", DATE_FORMAT);
}

export default async function SubscriptionSuccessPage({
  searchParams,
}: SubscriptionSuccessPageProps) {
  const params = await searchParams;
  const supabase = createClient();

  if (!params.session_id) {
    return redirect("/dashboard");
  }

  // Retrieve the Checkout Session from Stripe
  const session = await stripe.checkout.sessions.retrieve(params.session_id);

  if (session.status === "open") {
    return redirect("/dashboard/pricing");
  }

  if (session.mode !== "subscription" || !session.subscription) {
    return redirect("/dashboard");
  }

  // Poll Supabase for subscription (wait for webhook to complete)
  let subscription: {
    stripe_subscription_id: string;
    billing_cycle: string;
    current_period_start: string;
    current_period_end: string | null;
    status: string;
    subscription_plans: {
      name: string;
      monthly_price: number | string | null;
      yearly_price: number | string | null;
      is_commercial?: boolean | null;
    } | null;
    subscription_vehicles: Array<{
      vehicles: {
        id: string;
        make: string;
        model: string;
        year: number;
        body_type?: string;
        colors?: string[];
      } | null;
    }>;
    created_at: string;
  } | null = null;
  const timeout = Date.now() + 15000; // 15 seconds

  while (!subscription && Date.now() < timeout) {
    const { data, error } = await supabase
      .from("user_subscription")
      .select(
        `
        *,
        subscription_plans:subscription_plan_id (
          name,
          description,
          monthly_price,
          yearly_price,
          is_commercial
        ),
        subscription_vehicles (
          id,
          vehicle:vehicles (
            id,
            make,
            model,
            year,
            body_type,
            colors
          )
        )
      `
      )
      .eq("stripe_subscription_id", session.subscription as string)
      .maybeSingle();

    if (error) {
      console.error("Error fetching subscription:", error);
    }

    subscription = data;

    if (!subscription) await new Promise((res) => setTimeout(res, 1000));
  }

  // If still not found, fallback to Stripe directly
  let stripeSub: Stripe.Subscription | null = null;
  if (!subscription) {
    stripeSub = await stripe.subscriptions.retrieve(
      session.subscription as string
    );
    const subscriptionItem = stripeSub.items.data[0];
    const priceObj = stripeSub.items.data[0].price;

    const cps = Number(subscriptionItem?.current_period_start);
    const cpe = Number(subscriptionItem?.current_period_end);

    const currentPeriodStartIso = Number.isFinite(cps)
      ? new Date(cps * 1000).toISOString()
      : new Date().toISOString();
    const currentPeriodEndIso = Number.isFinite(cpe)
      ? new Date(cpe * 1000).toISOString()
      : null;

    // Fetch original plan price from Supabase using session metadata
    // so we get the unmodified price (not the promo-discounted Stripe price)
    let planName = priceObj.nickname || "Premium Plan";
    let originalMonthlyPrice: number | null = null;
    let originalYearlyPrice: number | null = null;
    let planIsCommercial: boolean | null = null;
    const metaPlanId = session.metadata?.plan_id;
    if (metaPlanId) {
      const { data: planData } = await supabase
        .from("subscription_plans")
        .select("name, monthly_price, yearly_price, is_commercial")
        .eq("id", metaPlanId)
        .maybeSingle();
      if (planData) {
        planName = planData.name;
        originalMonthlyPrice = planData.monthly_price ? Number(planData.monthly_price) : null;
        originalYearlyPrice = planData.yearly_price ? Number(planData.yearly_price) : null;
        planIsCommercial = planData.is_commercial ?? null;
      }
    }

    const interval = priceObj.recurring?.interval || "month";
    // Fallback to Stripe amount only if Supabase lookup failed
    const stripeAmount = priceObj.unit_amount ? priceObj.unit_amount / 100 : 0;

    subscription = {
      stripe_subscription_id: stripeSub.id,
      billing_cycle: interval,
      current_period_start: currentPeriodStartIso,
      current_period_end: currentPeriodEndIso,
      status: stripeSub.status,
      subscription_plans: {
        name: planName,
        monthly_price: interval === "month"
          ? (originalMonthlyPrice ?? stripeAmount)
          : (originalMonthlyPrice ?? null),
        yearly_price: interval === "year"
          ? (originalYearlyPrice ?? stripeAmount)
          : (originalYearlyPrice ?? null),
        is_commercial: planIsCommercial,
      },
      subscription_vehicles: [],
      created_at: new Date().toISOString(),
    };
  }

  const plan = subscription.subscription_plans;
  const basePrice =
    subscription.billing_cycle === "month"
      ? Number(plan?.monthly_price ?? 0)
      : Number(plan?.yearly_price ?? 0);

  // Extract all vehicles from subscription_vehicles
  // Handle both vehicle:vehicles and vehicles naming conventions
  const vehicles = (subscription.subscription_vehicles || [])
    .map((sv: any) => sv.vehicle || sv.vehicles)
    .filter((v): v is NonNullable<typeof v> => v !== null && v !== undefined);

  // If no vehicles found in DB, try to get from Stripe metadata
  let vehiclesFromStripe: Array<{
    id?: string;
    make: string;
    model: string;
    year: number;
    body_type?: string;
    colors?: string[];
  }> = [];

  if (vehicles.length === 0 && session.metadata?.vehicle_ids) {
    // Try to parse vehicle info from metadata if available
    // Note: This is a fallback - ideally vehicles should be in DB
    const vehicleCount = parseInt(session.metadata.vehicle_count || "1", 10);
    vehiclesFromStripe = Array.from({ length: vehicleCount }, (_, i) => ({
      make: "Vehicle",
      model: `${i + 1}`,
      year: new Date().getFullYear(),
    }));
  }

  // Use vehicles from DB, or fallback to Stripe metadata count
  const vehiclesToDisplay = vehicles.length > 0 ? vehicles : vehiclesFromStripe;

  // Primary vehicle at full price; additional vehicles at the plan's flock
  // rate, which is the full price again on commercial plans.
  const planHasDiscount = hasFlockDiscount(plan);
  const vehiclePricing = vehiclesToDisplay.map((vehicle, index: number) => {
    const isFirstVehicle = index === 0;
    const price = isFirstVehicle
      ? basePrice
      : flockVehiclePrice(basePrice, plan);
    const discount = isFirstVehicle ? 0 : flockVehicleSavings(basePrice, plan);
    return {
      vehicle,
      price,
      discount,
      isDiscounted: !isFirstVehicle && planHasDiscount,
      displayName: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    };
  });

  // Get Stripe subscription for total calculation if not already retrieved
  if (!stripeSub) {
    stripeSub = await stripe.subscriptions.retrieve(
      session.subscription as string
    );
  }

  // Calculate total price from vehicle pricing, or fallback to Stripe total
  let totalPrice = vehiclePricing.reduce(
    (sum: number, item) => sum + item.price,
    0
  );
  const totalSavings = vehiclePricing.reduce(
    (sum: number, item) => sum + item.discount,
    0
  );

  // If no vehicles found, calculate total from Stripe line items
  if (vehiclePricing.length === 0 && stripeSub.items.data.length > 0) {
    totalPrice = stripeSub.items.data.reduce((sum: number, item) => {
      const amount = item.price.unit_amount ? item.price.unit_amount / 100 : 0;
      return sum + amount * (item.quantity || 1);
    }, 0);
  }

  const orderData = {
    date: formatDate(subscription.created_at),
    orderNumber: subscription.stripe_subscription_id,
    paymentMethod: "Card",
    planName: plan?.name ?? "Premium Plan",
    basePrice,
    totalPrice,
    totalSavings,
    billingCycle: subscription.billing_cycle,
    startDate: formatDate(subscription.current_period_start),
    nextBillingDate: formatDate(subscription.current_period_end),
    vehicles: vehiclePricing,
    isFlock: vehiclesToDisplay.length > 1,
    discountPercent: flockDiscountPercent(plan),
    hasVehicleData: vehicles.length > 0, // Whether we have actual vehicle data from DB
  };

  const cycle =
    orderData.billingCycle === "month"
      ? "month"
      : orderData.billingCycle === "year"
        ? "year"
        : null;
  const perCycle = cycle ? ` / ${cycle}` : "";
  const status = String(subscription.status ?? "");
  const isActive = status === "active" || status === "trialing";
  const extraVehicles = orderData.vehicles.length - 1;

  return (
    <div>
      <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-balance text-ink">
        {isActive ? (
          <CheckCircle2 aria-hidden className="size-8 shrink-0 text-brand-blue" />
        ) : (
          <Clock aria-hidden className="size-8 shrink-0 text-ink-subtle" />
        )}
        {isActive ? "You're a member" : "Thanks, we're finishing your sign-up"}
      </h1>
      <p className="mt-2 max-w-prose text-base leading-relaxed text-ink-muted">
        {isActive
          ? `Your ${orderData.planName} membership is active. It's on your Home page, ready to show at the bay.`
          : `Your payment went through and ${orderData.planName} is being set up. Check Billing in a few minutes.`}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        {/* What you bought */}
        <section
          aria-labelledby="bought"
          className="rounded-2xl bg-night p-5 text-on-night shadow-[0_18px_40px_-24px_rgb(8_20_52/0.9)] ring-1 ring-white/10 sm:p-7"
        >
          <h2 id="bought" className="text-3xl font-black tracking-tight text-balance sm:text-4xl">
            {orderData.planName}
          </h2>
          <p className="mt-1 text-base font-semibold">
            <span className="inline-flex items-center gap-1.5 text-svc-member">
              <Crown aria-hidden className="size-4" />
              Express membership
            </span>
            {status && (
              <>
                <span className="text-on-night-subtle"> · </span>
                <span className="capitalize text-on-night-muted">
                  {status.replace(/_/g, " ")}
                </span>
              </>
            )}
          </p>

          {orderData.vehicles.length > 0 ? (
            <>
              <h3 className="mt-5 text-sm font-semibold text-on-night-muted">
                {orderData.vehicles.length === 1 ? "Vehicle" : `${orderData.vehicles.length} vehicles`}
                {!orderData.hasVehicleData && " (details still loading)"}
              </h3>
              <ul className="mt-2 divide-y divide-white/10 border-y border-white/10">
                {orderData.vehicles.map((item, index: number) => (
                  <li
                    key={item.vehicle.id || index}
                    className="flex items-start justify-between gap-4 py-3"
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <Car aria-hidden className="mt-0.5 size-4 shrink-0 text-on-night-subtle" />
                      <div className="min-w-0">
                        <p className="font-medium text-on-night">
                          {orderData.hasVehicleData ? item.displayName : `Vehicle ${index + 1}`}
                        </p>
                        {(item.vehicle.body_type || item.isDiscounted) && (
                          <p className="mt-0.5 text-xs text-on-night-subtle">
                            {[
                              item.vehicle.body_type,
                              item.isDiscounted ? `${orderData.discountPercent}% off as an additional vehicle` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="shrink-0 text-right tabular-nums">
                      {item.isDiscounted && (
                        <span className="block text-xs text-on-night-subtle line-through">
                          ${orderData.basePrice.toFixed(2)}
                        </span>
                      )}
                      <span className="font-semibold">${item.price.toFixed(2)}</span>
                      <span className="text-xs text-on-night-muted">{perCycle}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-5 max-w-prose text-sm leading-relaxed text-on-night-muted">
              Your vehicles are still being added. They&apos;ll appear on Home
              and in Billing within a few minutes.
            </p>
          )}

          <dl className="mt-1 divide-y divide-white/10 border-b border-white/10">
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="font-semibold text-on-night">Total</dt>
              <dd className="text-right">
                <span className="text-2xl font-black tracking-tight tabular-nums">
                  ${orderData.totalPrice.toFixed(2)}
                </span>
                <span className="text-sm font-semibold text-on-night-muted">{perCycle}</span>
              </dd>
            </div>
            {orderData.nextBillingDate && (
              <div className="flex items-baseline justify-between gap-4 py-3">
                <dt className="text-on-night-muted">Renews on</dt>
                <dd className="text-right font-semibold">{orderData.nextBillingDate}</dd>
              </div>
            )}
          </dl>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-flame px-5 font-bold text-on-flame transition-colors hover:bg-flame-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame-bright"
            >
              Go to Home
            </Link>
            <Link
              href="/dashboard/billing"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/20 px-4 font-semibold text-on-night hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-flame"
            >
              Manage in Billing
            </Link>
          </div>
        </section>

        {/* Receipt */}
        <section
          aria-labelledby="receipt"
          className="rounded-2xl bg-paper p-5 text-sm ring-1 ring-line sm:p-7"
        >
          <h2 id="receipt" className="text-xl font-black tracking-tight text-ink">
            Receipt details
          </h2>
          <dl className="mt-4 divide-y divide-line-soft border-y border-line-soft">
            <div className="flex items-start justify-between gap-4 py-3">
              <dt className="text-ink-muted">Plan price</dt>
              <dd className="text-right font-semibold text-ink tabular-nums">
                ${orderData.basePrice.toFixed(2)}
                {perCycle}
              </dd>
            </div>
            {orderData.isFlock && (
              <div className="flex items-start justify-between gap-4 py-3">
                <dt className="text-ink-muted">Additional vehicles</dt>
                <dd className="text-right font-semibold text-ink">
                  {extraVehicles}{" "}
                  {orderData.discountPercent > 0
                    ? `at ${orderData.discountPercent}% off`
                    : "at the full plan rate"}
                </dd>
              </div>
            )}
            {orderData.isFlock && orderData.totalSavings > 0 && (
              <div className="flex items-start justify-between gap-4 py-3">
                <dt className="text-ink-muted">You save</dt>
                <dd className="text-right font-semibold text-ink tabular-nums">
                  ${orderData.totalSavings.toFixed(2)}
                  {perCycle}
                </dd>
              </div>
            )}
            {orderData.startDate && (
              <div className="flex items-start justify-between gap-4 py-3">
                <dt className="text-ink-muted">Started</dt>
                <dd className="text-right font-semibold text-ink">{orderData.startDate}</dd>
              </div>
            )}
            <div className="flex items-start justify-between gap-4 py-3">
              <dt className="text-ink-muted">Next payment</dt>
              <dd className="text-right font-semibold text-ink">
                {orderData.nextBillingDate ?? "Shown in Billing"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 py-3">
              <dt className="text-ink-muted">Paid with</dt>
              <dd className="text-right font-semibold text-ink">{orderData.paymentMethod}</dd>
            </div>
            <div className="py-3">
              <dt className="text-ink-muted">Reference</dt>
              <dd className="mt-1 break-all text-xs text-ink-subtle">{orderData.orderNumber}</dd>
            </div>
          </dl>
          <p className="mt-4 flex items-start gap-2 leading-relaxed text-ink-muted">
            <Mail aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-subtle" />
            Your receipt goes to the email on your account. You can add
            vehicles, update your card or cancel anytime from Billing.
          </p>
          <Link
            href="/dashboard/help"
            className="-mx-2 mt-3 flex min-h-11 items-center rounded-lg px-2 font-semibold text-ink hover:bg-line-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Questions? Get help and support
          </Link>
        </section>
      </div>
    </div>
  );
}
