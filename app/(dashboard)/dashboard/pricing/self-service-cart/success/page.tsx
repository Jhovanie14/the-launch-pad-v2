import { CheckCircle2, Clock, Crown, Droplets, Mail } from "lucide-react";
import Link from "next/link";
import { stripe } from "@/lib/stripe/stripe";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

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
  const supabase = createClient();
  const { session_id } = await searchParams;

  if (!session_id) return redirect("/dashboard");

  // Retrieve Stripe Checkout session
  const session = await stripe.checkout.sessions.retrieve(session_id);

  if (session.status === "open") return redirect("/dashboard/pricing");
  if (session.mode !== "subscription" || !session.subscription)
    return redirect("/dashboard");

  let subscription: any = null;
  const timeout = Date.now() + 15000; // 15s polling

  // Determine subscription type via metadata
  const isSelfService = session.metadata?.plan_type === "self_service";

  while (!subscription && Date.now() < timeout) {
    if (isSelfService) {
      const { data } = await supabase
        .from("self_service_subscriptions")
        .select(
          `
          *,
          subscription_plans:self_service_plan_id (
            name,
            description,
            monthly_price,
            yearly_price
          ),
          subscription_vehicles:self_service_subscription_vehicles (
            vehicles (
              make,
              model,
              year
            )
          )
        `
        )
        .eq("stripe_subscription_id", session.subscription as string)
        .maybeSingle();

      subscription = data;
    } else {
      const { data } = await supabase
        .from("user_subscription")
        .select(
          `
          *,
          subscription_plans:subscription_plan_id (
            name,
            description,
            monthly_price,
            yearly_price
          ),
          subscription_vehicles (
            vehicles (
              make,
              model,
              year
            )
          )
        `
        )
        .eq("stripe_subscription_id", session.subscription as string)
        .maybeSingle();

      subscription = data;
    }

    if (!subscription) await new Promise((res) => setTimeout(res, 1000));
  }

  // Fallback to Stripe if no record found in Supabase
  if (!subscription) {
    const stripeSub = await stripe.subscriptions.retrieve(
      session.subscription as string
    );
    const subItem = stripeSub.items.data[0];
    const priceObj = subItem.price;
    const cps = Number(subItem.current_period_start);
    const cpe = Number(subItem.current_period_end);

    subscription = {
      stripe_subscription_id: stripeSub.id,
      billing_cycle: priceObj.recurring?.interval || "month",
      current_period_start: Number.isFinite(cps)
        ? new Date(cps * 1000).toISOString()
        : new Date().toISOString(),
      current_period_end: Number.isFinite(cpe)
        ? new Date(cpe * 1000).toISOString()
        : null,
      status: stripeSub.status,
      subscription_plans: isSelfService
        ? {
            name: priceObj.nickname || "Self-Service Plan",
            monthly_price:
              priceObj.recurring?.interval === "month" && priceObj.unit_amount
                ? priceObj.unit_amount / 100
                : null,
            yearly_price:
              priceObj.recurring?.interval === "year" && priceObj.unit_amount
                ? priceObj.unit_amount / 100
                : null,
          }
        : {
            name: priceObj.nickname || "Premium Plan",
            monthly_price:
              priceObj.recurring?.interval === "month" && priceObj.unit_amount
                ? priceObj.unit_amount / 100
                : null,
            yearly_price:
              priceObj.recurring?.interval === "year" && priceObj.unit_amount
                ? priceObj.unit_amount / 100
                : null,
          },
      subscription_vehicles: [],
      created_at: new Date().toISOString(),
    };
  }

  // Extract plan and vehicle info
  const plan = subscription.subscription_plans;
  const vehicle = subscription.subscription_vehicles?.[0]?.vehicles;
  const planPrice =
    subscription.billing_cycle === "month"
      ? (plan?.monthly_price ?? 0)
      : (plan?.yearly_price ?? 0);

  const orderData = {
    date: formatDate(subscription.created_at),
    orderNumber: subscription.stripe_subscription_id,
    paymentMethod: "Card",
    planName: plan?.name ?? "Plan",
    planPrice: Number(planPrice),
    billingCycle: subscription.billing_cycle,
    startDate: formatDate(subscription.current_period_start),
    nextBillingDate: formatDate(subscription.current_period_end),
    vehicle: vehicle
      ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
      : null,
  };

  const cycle =
    orderData.billingCycle === "month"
      ? "month"
      : orderData.billingCycle === "year"
        ? "year"
        : null;
  const status = String(subscription.status ?? "");
  const isActive = status === "active" || status === "trialing";
  const kind = isSelfService
    ? { label: "Self-service plan", tone: "text-svc-self", Icon: Droplets }
    : { label: "Express membership", tone: "text-svc-member", Icon: Crown };

  return (
    <div>
      <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-balance text-ink">
        {isActive ? (
          <CheckCircle2 aria-hidden className="size-8 shrink-0 text-brand-blue" />
        ) : (
          <Clock aria-hidden className="size-8 shrink-0 text-ink-subtle" />
        )}
        {isActive ? "You're all set" : "Thanks, we're finishing your sign-up"}
      </h1>
      <p className="mt-2 max-w-prose text-base leading-relaxed text-ink-muted">
        {isActive
          ? `Your ${orderData.planName} is active. It's on your Home page, ready to show at the bay.`
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
            <span className={`inline-flex items-center gap-1.5 ${kind.tone}`}>
              <kind.Icon aria-hidden className="size-4" />
              {kind.label}
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

          <dl className="mt-5 divide-y divide-white/10 border-y border-white/10">
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-on-night-muted">Price</dt>
              <dd className="text-right">
                <span className="text-2xl font-black tracking-tight tabular-nums">
                  ${orderData.planPrice.toFixed(2)}
                </span>
                {cycle && (
                  <span className="text-sm font-semibold text-on-night-muted"> / {cycle}</span>
                )}
              </dd>
            </div>
            {orderData.nextBillingDate && (
              <div className="flex items-baseline justify-between gap-4 py-3">
                <dt className="text-on-night-muted">Renews on</dt>
                <dd className="text-right font-semibold">{orderData.nextBillingDate}</dd>
              </div>
            )}
            {orderData.vehicle && (
              <div className="flex items-baseline justify-between gap-4 py-3">
                <dt className="text-on-night-muted">Vehicle</dt>
                <dd className="text-right font-semibold">{orderData.vehicle}</dd>
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
            Your receipt goes to the email on your account. You can update your
            card or cancel anytime from Billing.
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
