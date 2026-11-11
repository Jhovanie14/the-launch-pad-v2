"use client";

import { Check, CheckCircle2, Crown, Info, Minus } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { FIRST_SUBSCRIPTION_PROMO, firstPeriodPrice } from "@/lib/pricing/firstSubscriptionPromo";

/*
  One membership plan. Used on the public pricing page, the self-service page
  and Dashboard → Membership, so every colour is a brand token (no .lp-theme
  assumptions). Navy header with the price, white body with what you get,
  one action at the bottom: flame for the featured plan, navy for the rest.
*/

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const money = (n: number) => `$${n.toFixed(2)}`;

export default function PricingCard({
  plan,
  pricing,
  subscription,
  handleCheckout,
}: {
  plan: any;
  pricing: "monthly" | "yearly";
  subscription: any;
  handleCheckout: (planId: string) => void;
}) {
  const normalizedBillingCycle =
    subscription?.billing_cycle === "year"
      ? "yearly"
      : subscription?.billing_cycle === "month"
        ? "monthly"
        : subscription?.billing_cycle;

  const isSelfServicePlan = plan.name === "Self-Service Bay Membership";
  const hasSubscription = Boolean(subscription);
  const isCurrentPlan =
    !isSelfServicePlan &&
    subscription?.plan_id === plan.id &&
    normalizedBillingCycle === pricing;

  let buttonText = `Select ${plan.name}`;
  if (hasSubscription) {
    if (isSelfServicePlan) buttonText = "Add more vehicle";
    else if (isCurrentPlan) buttonText = "Current Plan";
    else buttonText = "Upgrade";
  }

  const popularPlans = "Express Detail";
  const isPopular = popularPlans.includes(plan.name);

  const isYearly = pricing === "yearly";
  const period = isYearly ? "year" : "month";
  const monthlyPrice = Number(plan.monthly_price) || 0;
  const yearlyPrice = Number(plan.yearly_price) || 0;
  const price = isYearly ? yearlyPrice : monthlyPrice;

  // Yearly saving against twelve monthly payments.
  const twelveMonths = monthlyPrice * 12;
  const yearlySavingPercent =
    isYearly && twelveMonths > 0 ? Math.round(((twelveMonths - yearlyPrice) / twelveMonths) * 100) : 0;

  // 10% off the first period, for first-time subscribers only.
  const showPromo = FIRST_SUBSCRIPTION_PROMO.enabled && !isSelfServicePlan && !hasSubscription && price > 0;
  const firstPrice = showPromo ? firstPeriodPrice(price) : price;

  const dailyCost = (price / (isYearly ? 365 : 30)).toFixed(2);

  const showCommercialNote =
    !isSelfServicePlan && !plan.name?.toLowerCase().includes("commercial");

  return (
    <article
      aria-labelledby={`plan-${plan.id}`}
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-2xl bg-paper text-ink ring-1",
        isPopular || isCurrentPlan ? "ring-2 ring-flame" : "ring-line",
      )}
    >
      {/* Name and price */}
      <div className="bg-night px-6 pt-6 pb-7 text-on-night">
        <div className="flex min-h-7 flex-wrap items-center gap-2">
          {isCurrentPlan ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-flame px-3 py-1 text-xs font-bold text-on-flame">
              <CheckCircle2 aria-hidden className="size-3.5" />
              Your plan
            </span>
          ) : isPopular ? (
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold text-flame ring-1 ring-flame/60">
              Best value
            </span>
          ) : null}
          {yearlySavingPercent > 0 && (
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-on-night-muted ring-1 ring-on-night-subtle/50">
              Save {yearlySavingPercent}% yearly
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center gap-4">
          {plan.image_url ? (
            <Image
              src={plan.image_url}
              alt=""
              width={56}
              height={56}
              className="size-14 shrink-0 rounded-full object-cover ring-2 ring-white/15"
            />
          ) : (
            <Crown aria-hidden className="size-12 shrink-0 stroke-[1.25] text-flame" />
          )}
          <h3 id={`plan-${plan.id}`} className="text-2xl font-black tracking-tight text-balance">
            {plan.name}
          </h3>
        </div>

        <div className="mt-6">
          {showPromo ? (
            <>
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-4xl font-black tracking-tight tabular-nums">{money(firstPrice)}</span>
                <span className="text-sm font-semibold text-on-night-muted">first {period}</span>
              </p>
              <p className="mt-1 text-sm text-on-night-muted">
                <span className="font-semibold text-flame">{FIRST_SUBSCRIPTION_PROMO.percent}% off</span> for new
                members, then <span className="tabular-nums">{money(price)}</span>/{period}
              </p>
            </>
          ) : (
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-4xl font-black tracking-tight tabular-nums">{money(price)}</span>
              <span className="text-sm font-semibold text-on-night-muted">per {period}</span>
            </p>
          )}
          <p className="mt-2 text-sm text-on-night-subtle tabular-nums">
            About ${dailyCost} a day
            {isYearly && <> · {money(price / 12)}/month billed yearly</>}
          </p>
        </div>
      </div>

      {/* What you get */}
      <div className="flex flex-1 flex-col px-6 pt-6">
        {plan.description && (
          <p className="text-base leading-relaxed text-ink-muted">{plan.description}</p>
        )}

        {(plan.features ?? []).length > 0 && (
          <ul className="mt-5 space-y-3" role="list">
            {(plan.features ?? []).map((feature: string, index: number) => {
              const excluded = feature.toLowerCase().includes("no");
              return (
                <li key={index} className="flex items-start gap-3 text-sm font-medium text-ink">
                  {excluded ? (
                    <Minus aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-subtle" />
                  ) : (
                    <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-blue" strokeWidth={3} />
                  )}
                  <span>{feature}</span>
                </li>
              );
            })}
          </ul>
        )}

        {plan.savings_info && (
          <div className="mt-6 rounded-xl bg-canvas p-4 text-sm text-ink ring-1 ring-line">
            <p>
              <strong>Savings vs. pay-per-use:</strong> {plan.savings_info}
            </p>
            {plan.savings_note && <p className="mt-1 text-xs text-ink-muted">{plan.savings_note}</p>}
          </div>
        )}
      </div>

      {/* Action */}
      <div className="px-6 pt-6 pb-6">
        <button
          type="button"
          onClick={() => handleCheckout(plan.id)}
          disabled={isCurrentPlan}
          aria-label={isCurrentPlan ? `${plan.name} is your current plan` : `${buttonText}: ${plan.name}`}
          className={cn(
            "inline-flex min-h-12 w-full items-center justify-center rounded-lg px-5 text-base font-bold transition-colors disabled:cursor-default",
            FOCUS,
            isCurrentPlan
              ? "bg-line-soft text-ink-muted"
              : isPopular
                ? "bg-flame text-on-flame hover:bg-flame-bright"
                : "bg-night text-on-night hover:bg-night-raised",
          )}
        >
          {buttonText}
        </button>
        <p className="mt-3 text-center text-xs text-ink-muted">1 vehicle per subscription</p>

        {showCommercialNote && (
          <div className="mt-4 flex gap-2.5 rounded-xl bg-canvas p-3 text-xs leading-relaxed text-ink-muted ring-1 ring-line">
            <Info aria-hidden className="mt-px size-4 shrink-0 text-ink-subtle" />
            <p>
              <span className="font-semibold text-ink">Personal vehicles only.</span> Tow trucks, 8 ft and 9 ft
              bed trucks, and sprinter vans need a commercial plan.
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
