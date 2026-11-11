"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertCircle,
  ArrowLeft,
  Car,
  Check,
  CloudRain,
  Droplets,
  Loader2,
  Lock,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useVehicleForm } from "@/hooks/useVehicleForm";
import { createClient } from "@/utils/supabase/client";
import TermsModal from "@/components/terms-modal";
import { LicensePlate } from "@/components/dashboard-home/license-plate";
import { cn } from "@/lib/utils";

const FOCUS_LIGHT =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const BACK_LINK = cn(
  "-ml-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-ink-muted hover:bg-line-soft hover:text-ink",
  FOCUS_LIGHT,
);

export default function SelfServiceCart() {
  const supabase = createClient();
  const router = useRouter();
  const { user } = useAuth();

  const [plan, setPlan] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { vehicleInfo, setVehicleInfo, errors, validate } = useVehicleForm();

  // Fetch active self-service plan
  useEffect(() => {
    let active = true;
    setLoadingPlan(true);

    (async () => {
      try {
        const { data, error } = await supabase
          .from("self_service_plans")
          .select("*")
          .eq("is_active", true)
          .maybeSingle();

        if (!active) return;
        if (!error && data) setPlan(data);
      } finally {
        if (active) setLoadingPlan(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [supabase]);

  const startCheckout = async () => {
    try {
      setError("");
      if (!isAuthorized) {
        setError("You must authorize recurring charges to continue.");
        return;
      }
      if (!validate()) return;

      setLoadingCheckout(true);

      const vehiclePayload = {
        license_plate: vehicleInfo.license_plate,
      };

      const res = await fetch("/api/create-selfservice-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan?.id,
          userId: user?.id,
          vehicle: vehiclePayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout session failed");

      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      console.error("Checkout error:", err);
      setError(err.message || "Something went wrong.");
      setLoadingCheckout(false);
    }
  };

  const handleCheckoutClick = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    await startCheckout();
  };

  if (loadingPlan) return <CartSkeleton />;

  if (!plan) {
    return (
      <div className="max-w-2xl">
        <Link href="/dashboard/pricing" className={BACK_LINK}>
          <ArrowLeft aria-hidden className="size-4" />
          Back to plans
        </Link>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-ink">
          Join the self-service plan
        </h1>
        <div
          role="alert"
          className="mt-6 rounded-2xl bg-night p-5 text-on-night ring-1 ring-white/10 sm:p-7"
        >
          <p className="font-semibold">Couldn&apos;t load the self-service plan.</p>
          <p className="mt-1 text-sm text-on-night-muted">
            Nothing has been charged. Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 min-h-11 rounded-lg border border-white/25 px-4 font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-flame"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const price = plan?.monthly_price;
  const plate = vehicleInfo.license_plate?.trim() ?? "";
  const features: string[] = Array.isArray(plan?.features) ? plan.features : [];

  return (
    <div>
      <Link href="/dashboard/pricing" className={BACK_LINK}>
        <ArrowLeft aria-hidden className="size-4" />
        Back to plans
      </Link>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-balance text-ink">
        Join the self-service plan
      </h1>
      <p className="mt-2 max-w-prose text-base leading-relaxed text-ink-muted">
        Add your license plate, agree to monthly billing, then finish paying
        on Stripe&apos;s secure checkout.
      </p>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          {/* The plan you're joining */}
          <section
            aria-labelledby="ss-plan"
            className="rounded-2xl bg-night p-5 text-on-night ring-1 ring-white/10 sm:p-7"
          >
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
              <div className="min-w-0">
                <h2
                  id="ss-plan"
                  className="text-3xl font-black tracking-tight text-balance sm:text-4xl"
                >
                  {plan?.name}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-base font-semibold text-svc-self">
                  <Droplets aria-hidden className="size-4" />
                  Self-service plan
                </p>
              </div>
              <p className="whitespace-nowrap">
                <span className="text-3xl font-black tracking-tight tabular-nums">
                  ${price}
                </span>
                <span className="text-base font-semibold text-on-night-muted"> / month</span>
              </p>
            </div>
            {plan?.description && (
              <p className="mt-3 max-w-prose text-sm leading-relaxed text-on-night-subtle">
                {plan.description}
              </p>
            )}

            {features.length > 0 && (
              <>
                <h3 className="mt-6 text-sm font-semibold text-on-night-muted">
                  What&apos;s included
                </h3>
                <ul className="mt-2 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                  {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-on-night">
                      <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-svc-self" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {/* Vehicle */}
          <section
            aria-labelledby="ss-vehicle"
            className="rounded-2xl bg-paper p-5 ring-1 ring-line sm:p-7"
          >
            <h2
              id="ss-vehicle"
              className="flex items-center gap-2 text-xl font-black tracking-tight text-ink"
            >
              <Car aria-hidden className="size-5 text-ink-subtle" />
              Your vehicle
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Staff at the bay use the plate to match your car to your plan.
            </p>

            <div className="mt-5 space-y-2">
              <label htmlFor="ss-plate" className="text-sm font-semibold text-ink">
                License plate
              </label>
              <Input
                id="ss-plate"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="For example, ABC1234"
                value={vehicleInfo.license_plate}
                onChange={(e) =>
                  setVehicleInfo({
                    ...vehicleInfo,
                    license_plate: e.target.value.toUpperCase(),
                  })
                }
                aria-invalid={!!errors.license_plate}
                aria-describedby={errors.license_plate ? "ss-plate-error" : undefined}
                className="h-12 max-w-sm text-lg font-semibold tracking-wider uppercase"
              />
              {errors.license_plate && (
                <p
                  id="ss-plate-error"
                  className="flex items-center gap-1.5 text-sm font-medium text-destructive"
                >
                  <AlertCircle aria-hidden className="size-4 shrink-0" />
                  {errors.license_plate}
                </p>
              )}
            </div>

            {plate && (
              <p className="mt-4 flex flex-wrap items-center gap-3 text-sm text-ink-muted">
                Shows at the bay as
                <LicensePlate plate={plate} />
              </p>
            )}
          </section>
        </div>

        {/* Summary and payment */}
        <section
          aria-labelledby="ss-summary"
          className="rounded-2xl bg-paper p-5 ring-1 ring-line sm:p-7 lg:sticky lg:top-24"
        >
          <h2 id="ss-summary" className="text-xl font-black tracking-tight text-ink">
            Summary
          </h2>

          <dl className="mt-4 divide-y divide-line-soft border-y border-line-soft text-sm">
            <div className="flex items-start justify-between gap-4 py-3">
              <dt className="text-ink-muted">Plan</dt>
              <dd className="text-right font-semibold text-ink">{plan?.name}</dd>
            </div>
            <div className="flex items-start justify-between gap-4 py-3">
              <dt className="text-ink-muted">Vehicle</dt>
              <dd className="text-right font-semibold text-ink">
                {plate ? <LicensePlate plate={plate} /> : <span className="font-normal text-ink-subtle">Not added yet</span>}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 py-3">
              <dt className="text-ink-muted">Billing</dt>
              <dd className="text-right font-semibold text-ink">Monthly, until you cancel</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="font-semibold text-ink">Monthly price</dt>
              <dd className="text-2xl font-black tracking-tight text-ink tabular-nums">
                ${price}
              </dd>
            </div>
          </dl>

          {/* Authorisation */}
          <div className="mt-5 flex items-start gap-3">
            <Checkbox
              id="ss-authorize"
              checked={isAuthorized}
              onCheckedChange={(checked) => {
                setIsAuthorized(!!checked);
                if (checked) setError("");
              }}
              className="mt-0.5 size-5"
            />
            <p className="text-sm leading-relaxed text-ink">
              <label htmlFor="ss-authorize" className="cursor-pointer">
                I authorize automatic monthly charges for this membership until
                cancelled. I have read and agree to the
              </label>{" "}
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className={cn(
                  "rounded-sm font-semibold text-brand-blue underline underline-offset-4 hover:text-ink",
                  FOCUS_LIGHT,
                )}
              >
                Terms of Service
              </button>
              .
            </p>
          </div>

          {/* Weather & closure notice */}
          <div className="mt-4 rounded-lg bg-canvas p-3 text-xs leading-relaxed text-ink-muted ring-1 ring-line">
            <p className="flex items-center gap-1.5 font-semibold text-ink">
              <CloudRain aria-hidden className="size-4 text-ink-subtle" />
              Weather and closure notice
            </p>
            <p className="mt-1">
              The Launch Pad Wash reserves the right to temporarily suspend or limit services at its sole discretion due to inclement weather conditions, including but not limited to rain, flooding, or adverse weather forecasts. Subscription fees are non-refundable for weather-related service interruptions; however, affected members retain full access to their membership benefits upon resumption of normal operations. The Launch Pad Wash shall not be liable for any inconvenience, loss, or damages arising from weather-related closures or service suspensions.
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive"
            >
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleCheckoutClick}
            disabled={loadingCheckout || !plan}
            className={cn(
              "mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-flame px-5 font-bold text-on-flame transition-colors hover:bg-flame-bright",
              "disabled:cursor-not-allowed disabled:opacity-60",
              FOCUS_LIGHT,
            )}
          >
            {loadingCheckout ? (
              <>
                <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
                Opening secure checkout…
              </>
            ) : (
              <>
                <Lock aria-hidden className="size-4" />
                Continue to payment · ${price}/month
              </>
            )}
          </button>

          <p className="mt-3 text-center text-xs leading-relaxed text-ink-muted">
            You&apos;ll pay on Stripe, then come back to your confirmation.
            You can cancel anytime from Billing in your account.
          </p>
        </section>
      </div>

      <TermsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAccept={() => {
          setIsAuthorized(true);
          setError("");
        }}
      />
    </div>
  );
}

function CartSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the self-service plan" className="space-y-6">
      <div className="h-9 w-72 max-w-full animate-pulse rounded bg-line motion-reduce:animate-none" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <div className="h-64 animate-pulse rounded-2xl bg-dusk/90 motion-reduce:animate-none" />
          <div className="h-44 animate-pulse rounded-2xl bg-line motion-reduce:animate-none" />
        </div>
        <div className="h-96 animate-pulse rounded-2xl bg-line motion-reduce:animate-none" />
      </div>
    </div>
  );
}
