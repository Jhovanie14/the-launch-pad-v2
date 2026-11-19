"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Check, CloudRain, Loader2, Lock, Star } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/context/auth-context";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import { MAX_VEHICLES_PER_SUBSCRIPTION } from "@/lib/pricing/flockPricing";
import { FIRST_SUBSCRIPTION_PROMO } from "@/lib/pricing/firstSubscriptionPromo";
import { formatCents, membershipCartQuote } from "@/lib/subscriptions/membershipCartQuote";
import { PENDING_CART_KEY, restorePendingCart } from "@/lib/subscriptions/pendingCart";
import { LicensePlate } from "@/components/dashboard-home/license-plate";
import StepLayout from "@/components/booking/ui/StepLayout";
import { FLAME_BUTTON, FOCUS_ON_LIGHT, FOCUS_ON_NIGHT, SURFACE } from "@/components/booking/ui/focus";
import TermsModal from "../terms-modal";
import MultiVehicleBenefitsDialog from "./MultiVehicleBenefitsDialog";

type Billing = "monthly" | "yearly";

interface SubscriptionCartProps {
  planId?: string | null;
  billingCycle?: Billing | null;
  /** Guests: save these plates and open sign-in (the page owns storage). */
  onRequireAuth?: (plates: string[]) => void;
}

interface Plan {
  id: string;
  name: string;
  description?: string | null;
  is_commercial?: boolean | null;
  monthly_price: number | string;
  yearly_price: number | string;
  features?: string[] | null;
}

const FIELD =
  "h-11 w-full rounded-lg bg-paper px-3 text-base font-semibold uppercase tracking-wider text-ink ring-1 ring-line placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue";

const WEATHER_NOTICE =
  "The Launch Pad Wash reserves the right to temporarily suspend or limit services at its sole discretion due to inclement weather conditions, including but not limited to rain, flooding, or adverse weather forecasts. Subscription fees are non-refundable for weather-related service interruptions; however, affected members retain full access to their membership benefits upon resumption of normal operations. The Launch Pad Wash shall not be liable for any inconvenience, loss, or damages arising from weather-related closures or service suspensions.";

function membershipKind(plan: Plan, isCommercial: boolean): string {
  const name = plan.name.toLowerCase();
  if (isCommercial) return "Commercial membership";
  if (name.includes("express")) return "Express membership";
  if (name.includes("quick")) return "Quick service membership";
  return "Membership";
}

export default function SubscriptionCart({
  planId: planIdProp,
  billingCycle: billingProp,
  onRequireAuth,
}: SubscriptionCartProps) {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { user, isLoading: authLoading } = useAuth();
  const isGuestPage = !!onRequireAuth;

  const planId = useMemo(() => planIdProp ?? searchParams.get("plan"), [planIdProp, searchParams]);
  const billingCycle: Billing = useMemo(
    () => (billingProp ?? (searchParams.get("billing") as Billing)) || "monthly",
    [billingProp, searchParams]
  );

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [plates, setPlates] = useState<string[]>([""]);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [termsOpen, setTermsOpen] = useState(false);
  const [benefitsOpen, setBenefitsOpen] = useState(false);
  const [hadMembership, setHadMembership] = useState(false);

  // After sign-in: put the plates back, but never the agreement and never a
  // checkout by itself. The price may have changed now that we know the
  // account (the first-membership offer), so the customer agrees again.
  useEffect(() => {
    if (!user) return;
    try {
      const restored = restorePendingCart(localStorage.getItem(PENDING_CART_KEY));
      localStorage.removeItem(PENDING_CART_KEY);
      if (restored && restored.plates.length > 0) setPlates(restored.plates);
    } catch {
      // Storage blocked: the customer types the plates again.
    }
  }, [user]);

  useEffect(() => {
    if (!planId) {
      setLoadingPlan(false);
      return;
    }
    let active = true;
    setLoadingPlan(true);
    (async () => {
      try {
        const { data, error } = await supabase.from("subscription_plans").select("*").eq("id", planId).maybeSingle();
        if (!active) return;
        setPlan(!error && data ? (data as Plan) : null);
      } finally {
        if (active) setLoadingPlan(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [planId, supabase]);

  // The offer is for a first membership only (the server enforces this);
  // hide it from someone who has had one before so the cart matches Stripe.
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    supabase
      .from("user_subscription")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => {
        if (active) setHadMembership((count ?? 0) > 0);
      });
    return () => {
      active = false;
    };
  }, [user?.id, supabase]);

  const quote = plan
    ? membershipCartQuote({ plan, billing: billingCycle, carCount: plates.length, offerEligible: !hadMembership })
    : null;

  const setCarCount = (count: number) => {
    setPlates((prev) => Array.from({ length: count }, (_, i) => prev[i] ?? ""));
    setErrors({});
  };

  const updatePlate = (index: number, value: string) => {
    setPlates((prev) => prev.map((p, i) => (i === index ? value.toUpperCase() : p)));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const validate = () => {
    const next: Record<number, string> = {};
    plates.forEach((p, i) => {
      if (!p.trim()) next[i] = "License plate is required";
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const startCheckout = async () => {
    try {
      setError("");
      if (!isAuthorized) {
        setError("You must authorize recurring charges to continue.");
        return;
      }
      if (!validate()) {
        setError("Please fill in all required vehicle information.");
        return;
      }
      setLoadingCheckout(true);
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          billingCycle,
          vehicles: plates.map((license_plate) => ({ license_plate })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout session failed");
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error("Checkout error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoadingCheckout(false);
    }
  };

  const handleCheckoutClick = () => {
    if (!user) {
      onRequireAuth?.(plates);
      return;
    }
    void startCheckout();
  };

  const backHref = isGuestPage ? "/pricing" : "/dashboard/pricing";

  if (loadingPlan) return <CartSkeleton />;

  if (!plan || !quote) {
    return (
      <div role="alert" className="rounded-2xl bg-night p-5 text-on-night ring-1 ring-paper/10 sm:p-7">
        <p className="text-xl font-black tracking-[-0.025em]">We couldn&apos;t find that plan.</p>
        <Link
          href={backHref}
          className={cn(
            "mt-4 inline-flex h-11 items-center rounded-lg px-4 font-semibold ring-1 ring-paper/20 hover:bg-paper/10",
            FOCUS_ON_NIGHT
          )}
        >
          Back to plans
        </Link>
      </div>
    );
  }

  const { period, periodShort } = quote;
  const features = Array.isArray(plan.features) ? plan.features : [];
  const showAsGuest = !authLoading && !user;

  const agreement = quote.hasOffer
    ? `I authorize The Launch Pad to charge ${formatCents(quote.firstCents)} for the first ${period}, then ${formatCents(quote.renewalCents)} every ${period} until I cancel.`
    : `I authorize The Launch Pad to charge ${formatCents(quote.renewalCents)} every ${period} until I cancel.`;

  return (
    <>
      <StepLayout
        back={{ label: "Back to plans", href: backHref }}
        title={`Join the ${plan.name} plan`}
        action={{
          summaryTitle: quote.hasOffer
            ? `${formatCents(quote.firstCents)} first ${period}`
            : `${formatCents(quote.renewalCents)} a ${period}`,
          summaryDetail: quote.hasOffer ? `then ${formatCents(quote.renewalCents)} a ${period}` : undefined,
          button: (
            <button
              type="button"
              onClick={handleCheckoutClick}
              disabled={loadingCheckout || authLoading}
              className={FLAME_BUTTON}
            >
              {loadingCheckout ? (
                <>
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
                  Opening secure checkout…
                </>
              ) : showAsGuest ? (
                "Sign in to continue"
              ) : (
                <>
                  <Lock className="size-4" aria-hidden />
                  Continue to payment
                </>
              )}
            </button>
          ),
        }}
      >
        <p className="-mt-2 max-w-prose text-base leading-relaxed text-ink-muted">
          Add your cars, agree to the billing, then pay on Stripe&apos;s secure checkout.
        </p>

        {/* The plan, as a pass */}
        <section aria-labelledby="mc-plan" className="rounded-2xl bg-night p-5 text-on-night ring-1 ring-paper/10 sm:p-7">
          <p className="text-sm font-semibold text-svc-member">{membershipKind(plan, quote.isCommercial)}</p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <h2 id="mc-plan" className="text-3xl font-black tracking-[-0.025em] text-balance sm:text-4xl">
              {plan.name}
            </h2>
            <p className="whitespace-nowrap">
              <span className="text-3xl font-black tracking-[-0.025em] tabular-nums">{formatCents(quote.cars[0].cents)}</span>
              <span className="text-base font-semibold text-on-night-muted"> / {period}</span>
            </p>
          </div>
          {features.length > 0 && (
            <>
              <h3 className="mt-6 text-sm font-semibold text-on-night-muted">What&apos;s included</h3>
              <ul className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-svc-member" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* Cars */}
        <section aria-labelledby="mc-cars" className={cn(SURFACE, "p-5 sm:p-7")}>
          <h2 id="mc-cars" className="text-xl font-black tracking-[-0.025em]">
            Your cars
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {quote.discountPercent > 0
              ? `Each extra car is ${quote.discountPercent}% off.`
              : "Commercial plans bill every vehicle at the plan rate."}{" "}
            <button
              type="button"
              onClick={() => setBenefitsOpen(true)}
              className={cn("rounded font-semibold text-brand-blue underline-offset-2 hover:underline", FOCUS_ON_LIGHT)}
            >
              How it works
            </button>
          </p>

          <fieldset className="mt-4">
            <legend className="text-sm font-semibold">How many cars?</legend>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {Array.from({ length: MAX_VEHICLES_PER_SUBSCRIPTION }, (_, i) => i + 1).map((n) => {
                const chosen = plates.length === n;
                const saving = quote.extraCarSavingCents * (n - 1);
                return (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={chosen}
                    aria-label={`${n} ${n === 1 ? "car" : "cars"}`}
                    onClick={() => setCarCount(n)}
                    className={cn(
                      "flex min-h-12 flex-col items-center justify-center rounded-lg px-1 py-1.5 transition-colors motion-reduce:transition-none",
                      chosen ? "bg-night text-on-night" : "bg-paper ring-1 ring-inset ring-line hover:bg-line-soft",
                      FOCUS_ON_LIGHT
                    )}
                  >
                    <span className="text-lg font-black leading-none">{n}</span>
                    {saving > 0 && (
                      <span className={cn("mt-1 text-xs font-semibold leading-tight", chosen ? "text-on-night-muted" : "text-ink-muted")}>
                        save {formatCents(saving)}
                        {periodShort}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-5 space-y-4">
            {plates.map((plate, i) => (
              <div key={i}>
                <label htmlFor={`mc-plate-${i}`} className="flex items-center justify-between gap-3 text-sm font-semibold">
                  <span>Car {i + 1}</span>
                  {i === 0 ? (
                    <span className="flex items-center gap-1 font-normal text-ink-muted">
                      <Star className="size-4 fill-flame text-flame" aria-hidden />
                      Primary
                    </span>
                  ) : (
                    quote.discountPercent > 0 && (
                      <span className="font-normal text-ink-muted">{quote.discountPercent}% off</span>
                    )
                  )}
                </label>
                <input
                  id={`mc-plate-${i}`}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="For example, ABC 1234"
                  value={plate}
                  onChange={(e) => updatePlate(i, e.target.value)}
                  aria-invalid={!!errors[i]}
                  aria-describedby={errors[i] ? `mc-plate-${i}-error` : undefined}
                  className={cn(FIELD, "mt-2")}
                />
                {errors[i] && (
                  <p id={`mc-plate-${i}-error`} className="mt-1 flex items-center gap-1.5 text-sm font-medium text-destructive">
                    <AlertCircle className="size-4 shrink-0" aria-hidden />
                    {errors[i]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {!quote.isCommercial && (
          <p className="text-sm leading-relaxed text-ink-muted">
            <span className="font-semibold text-ink">Personal vehicles only.</span> Tow trucks, trucks with 8 or 9 ft beds,
            sprinter and cargo vans, and other commercial or oversized vehicles need the commercial plan.
          </p>
        )}

        {/* Summary and agreement */}
        <section aria-labelledby="mc-summary" className={cn(SURFACE, "p-5 sm:p-7")}>
          <h2 id="mc-summary" className="text-xl font-black tracking-[-0.025em]">
            Summary
          </h2>
          <dl className="mt-3 divide-y divide-line-soft text-base">
            {quote.cars.map((car, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2.5">
                <dt className="flex min-w-0 flex-wrap items-center gap-2">
                  {plates[i]?.trim() ? <LicensePlate plate={plates[i].trim()} /> : <span>Car {i + 1}</span>}
                  <span className="text-sm text-ink-muted">
                    {car.primary ? "Primary" : quote.discountPercent > 0 ? `${quote.discountPercent}% off` : "Plan rate"}
                  </span>
                </dt>
                <dd className="tabular-nums">{formatCents(car.cents)}</dd>
              </div>
            ))}
            {quote.hasOffer && (
              <div className="flex items-center justify-between gap-3 py-2.5 text-ink-muted">
                <dt>First-membership offer, {quote.offerPercent}% off car 1</dt>
                <dd className="tabular-nums">−{formatCents(quote.offerCents)}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-3 pt-3 text-lg font-black tracking-[-0.02em]">
              <dt>{quote.hasOffer ? `First ${period}` : `Every ${period}`}</dt>
              <dd className="tabular-nums">{formatCents(quote.hasOffer ? quote.firstCents : quote.renewalCents)}</dd>
            </div>
          </dl>
          <p className="mt-1 text-right text-sm text-ink-muted">
            {quote.hasOffer
              ? `then ${formatCents(quote.renewalCents)} a ${period} until you cancel`
              : `${formatCents(quote.renewalCents)} a ${period} until you cancel`}
          </p>
          {quote.hasOffer && !user && FIRST_SUBSCRIPTION_PROMO.enabled && (
            <p className="mt-2 text-sm text-ink-muted">
              The offer is for a first membership. If your account has had one before, the cart updates after you sign in.
            </p>
          )}

          <div className="mt-5 flex items-start gap-3">
            <Checkbox
              id="mc-authorize"
              checked={isAuthorized}
              onCheckedChange={(checked) => {
                setIsAuthorized(!!checked);
                if (checked) setError("");
              }}
              className="mt-0.5 size-5"
            />
            <p className="text-sm leading-relaxed">
              <label htmlFor="mc-authorize" className="cursor-pointer">
                {agreement} I agree to the
              </label>{" "}
              <button
                type="button"
                onClick={() => setTermsOpen(true)}
                className={cn("rounded font-semibold text-brand-blue underline underline-offset-4 hover:text-ink", FOCUS_ON_LIGHT)}
              >
                Terms of Service
              </button>
              , including the disclaimer of warranties, limitation of liability, and arbitration agreement.
            </p>
          </div>

          <div className="mt-4 rounded-lg bg-canvas p-3 text-xs leading-relaxed text-ink-muted ring-1 ring-line">
            <p className="flex items-center gap-1.5 font-semibold text-ink">
              <CloudRain className="size-4 text-ink-subtle" aria-hidden />
              Weather and closure notice
            </p>
            <p className="mt-1">{WEATHER_NOTICE}</p>
          </div>

          {error && (
            <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}

          <p className="mt-4 text-xs leading-relaxed text-ink-muted">
            {showAsGuest
              ? "Checkout needs an account. Your plates are kept while you sign in."
              : "You pay on Stripe, then come back to your confirmation. You can cancel anytime from Billing in your account."}
          </p>
        </section>
      </StepLayout>

      <TermsModal
        isOpen={termsOpen}
        onClose={() => setTermsOpen(false)}
        onAccept={() => {
          setIsAuthorized(true);
          setError("");
        }}
      />
      <MultiVehicleBenefitsDialog
        isOpen={benefitsOpen}
        onClose={() => setBenefitsOpen(false)}
        familyDiscountPercent={quote.discountPercent}
      />
    </>
  );
}

function CartSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the membership plan" className="space-y-5">
      <div className="h-9 w-72 max-w-full rounded bg-line motion-safe:animate-pulse" />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
        <div className="space-y-4">
          <div className="h-56 rounded-2xl bg-dusk/90 motion-safe:animate-pulse" />
          <div className="h-64 rounded-2xl bg-line motion-safe:animate-pulse" />
        </div>
        <div className="mt-4 hidden h-40 rounded-2xl bg-line motion-safe:animate-pulse lg:mt-0 lg:block" />
      </div>
    </div>
  );
}
