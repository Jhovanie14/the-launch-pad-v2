"use client";

import { Subscription } from "@/types";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { Button } from "./ui/button";
import {
  AlertCircle,
  ArrowRight,
  CalendarX,
  CheckCircle2,
  CreditCard,
  Info,
  Plus,
  Star,
  XCircle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "./ui/alert-dialog";
import { AddVehicleModal } from "./add-vehicle-modal";
import { RemoveVehicleDialog } from "./remove-vehicle-dialog";
import { SwapPrimaryVehicleDialog } from "./subscription/SwapPrimaryVehicleDialog";
import MultiVehicleBenefitsDialog from "./subscription/MultiVehicleBenefitsDialog";
import { LicensePlate } from "./dashboard-home/license-plate";
import {
  MAX_VEHICLES_PER_SUBSCRIPTION,
  flockDiscountPercent,
  flockVehiclePrice,
  flockVehicleSavings,
  hasFlockDiscount,
} from "@/lib/pricing/flockPricing";
import { BUSINESS_TIME_ZONE, membershipStatusLine } from "@/lib/dashboard/home";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SubscriptionStatusProps {
  subscription: Subscription | null;
  onVehicleChange?: () => void;
}

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const QUIET_ROW_ACTION = cn(
  "inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink ring-1 ring-line hover:bg-canvas",
  FOCUS,
);
const DANGER_ROW_ACTION = cn(
  "inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-destructive hover:bg-destructive/10",
  FOCUS,
);

function formatDate(date?: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: BUSINESS_TIME_ZONE,
  });
}

const money = (n: number) => `$${n.toFixed(2)}`;

export default function SubscriptionStatus({
  subscription,
  onVehicleChange,
}: SubscriptionStatusProps) {
  const [loading, setLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(true);
  const [nextInvoiceAmount, setNextInvoiceAmount] = useState<number | null>(null);
  const [recurringAmount, setRecurringAmount] = useState<number | null>(null);
  const [hasProration, setHasProration] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  type SubscriptionVehicle = NonNullable<Subscription["vehicles"]>[number];
  const [vehicleToRemove, setVehicleToRemove] = useState<SubscriptionVehicle | null>(null);
  const [showSwapPrimary, setShowSwapPrimary] = useState(false);
  const [showBenefitsInfo, setShowBenefitsInfo] = useState(false);
  const [showUnsubscribeAll, setShowUnsubscribeAll] = useState(false);
  const [unsubscribingAll, setUnsubscribingAll] = useState(false);

  const vehicleCount = subscription?.vehicles?.length ?? 0;

  // One vehicle change per 6 months — the add-vehicle route enforces it; this
  // just shows the customer when their next change is available.
  const [changeLock, setChangeLock] = useState<{ locked: boolean; unlocksAt?: string; lastChangeAt?: string }>({
    locked: false,
  });

  useEffect(() => {
    fetch("/api/subscription/vehicle-change-status")
      .then((r) => (r.ok ? r.json() : { locked: false }))
      .then((d) => setChangeLock(d))
      .catch(() => {});
  }, [vehicleCount]);

  useEffect(() => {
    setInvoiceLoading(true);
    fetch("/api/subscription-upcoming-invoice")
      .then((r) => r.json())
      .then((d) => {
        setNextInvoiceAmount(d.amount_due ?? null);
        setRecurringAmount(d.recurring_amount ?? null);
        setHasProration(d.has_proration ?? false);
      })
      .catch(() => {})
      .finally(() => setInvoiceLoading(false));
  }, [vehicleCount]);

  // Calculate pricing for vehicles
  const pricing = useMemo(() => {
    if (!subscription || !subscription.subscription_plans) {
      return {
        basePrice: 0,
        totalPrice: 0,
        totalSavings: 0,
        vehiclePricing: [],
        isFlock: false,
        hasDiscount: false,
        discountPercent: 0,
      };
    }

    const plan = subscription.subscription_plans;
    const basePrice =
      subscription.billing_cycle === "month"
        ? Number(plan.monthly_price ?? 0)
        : Number(plan.yearly_price ?? 0);

    // Commercial plans bill every vehicle at the plan rate — no family discount.
    const planHasDiscount = hasFlockDiscount(plan);

    const vehicles = subscription.vehicles || [];
    const vehiclePricing = vehicles.map((vehicle, index) => {
      const isFirstVehicle = index === 0;
      const price = isFirstVehicle
        ? basePrice
        : flockVehiclePrice(basePrice, plan);
      const discount = isFirstVehicle
        ? 0
        : flockVehicleSavings(basePrice, plan);
      return {
        vehicle,
        price,
        discount,
        isDiscounted: !isFirstVehicle && planHasDiscount,
        displayName: `${vehicle.license_plate}`,
      };
    });

    const totalPrice = vehiclePricing.reduce(
      (sum, item) => sum + item.price,
      0
    );
    const totalSavings = vehiclePricing.reduce(
      (sum, item) => sum + item.discount,
      0
    );

    return {
      basePrice,
      totalPrice,
      totalSavings,
      vehiclePricing,
      isFlock: vehicles.length > 1,
      hasDiscount: planHasDiscount,
      discountPercent: flockDiscountPercent(plan),
    };
  }, [subscription]);

  const handleUpdatePayment = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/update-payment-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // redirect to Stripe Billing Portal
      } else {
        toast.error("We couldn't open the secure payment page. Please try again in a moment.");
      }
    } catch (error) {
      console.error("Error updating payment method:", error);
      toast.error("We couldn't reach the payment page. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribeEverything = async () => {
    setUnsubscribingAll(true);
    try {
      const res = await fetch("/api/cancel-subscription", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to cancel subscription");
      toast.success("Your membership will end at the close of this billing period.");
      setShowUnsubscribeAll(false);
      onVehicleChange?.();
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setUnsubscribingAll(false);
    }
  };

  if (!subscription) {
    return (
      <section
        aria-labelledby="express-empty"
        className="rounded-2xl bg-paper p-5 ring-1 ring-line sm:p-7"
      >
        <h3 id="express-empty" className="text-xl font-black tracking-tight text-ink">
          You don&apos;t have a membership yet
        </h3>
        <p className="mt-1 max-w-prose text-ink-muted">
          One price for express detailing, billed monthly or yearly. No contract, and you can
          cancel anytime.
        </p>
        <Link
          href="/dashboard/pricing"
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-flame px-5 font-bold text-on-flame transition-colors hover:bg-flame-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:w-auto"
        >
          See membership plans
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </section>
    );
  }

  const cycle = subscription.billing_cycle;
  const cancelling = subscription.cancel_at_period_end;
  const isActive = subscription.status === "active";

  const status = (() => {
    if (cancelling) return { icon: CalendarX, tone: "text-ink", label: membershipStatusLine(subscription) };
    switch (subscription.status) {
      case "active":
        return { icon: CheckCircle2, tone: "text-ink", label: membershipStatusLine(subscription) };
      case "past_due":
      case "unpaid":
        return { icon: AlertCircle, tone: "text-destructive", label: "Payment past due. Update your card to keep washing." };
      case "canceled":
        return { icon: XCircle, tone: "text-ink-muted", label: `Ended ${formatDate(subscription.current_period_end)}` };
      default:
        return {
          icon: Info,
          tone: "text-ink-muted",
          label: subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1),
        };
    }
  })();
  const StatusIcon = status.icon;

  const savings = (() => {
    const fullPrice = pricing.basePrice * pricing.vehiclePricing.length;
    const actualCharge = nextInvoiceAmount ?? (fullPrice - pricing.totalSavings);
    const actualSavings = fullPrice - actualCharge;
    const hasPromo = actualSavings > pricing.totalSavings - (pricing.basePrice * 0.1) + 0.01;
    return { actualSavings, hasPromo };
  })();

  const canAddVehicle =
    isActive && pricing.vehiclePricing.length < MAX_VEHICLES_PER_SUBSCRIPTION;

  return (
    <section
      aria-labelledby="express-plan"
      className="rounded-2xl bg-paper p-5 ring-1 ring-line sm:p-7"
    >
      {/* Plan and where it stands */}
      <h3 id="express-plan" className="text-2xl font-black tracking-tight text-balance text-ink sm:text-3xl">
        {subscription.subscription_plans?.name || "Express detailing membership"}
      </h3>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-semibold">
        <span className={cn("inline-flex items-center gap-1.5", status.tone)}>
          <StatusIcon aria-hidden className="size-4 shrink-0" />
          {status.label}
        </span>
        <span aria-hidden className="text-ink-subtle">·</span>
        <span className="font-medium text-ink-muted">Billed {cycle}ly</span>
      </p>

      {/* What you pay */}
      <div className="mt-6 border-t border-line-soft pt-6">
        <h4 className="text-base font-bold text-ink">What you pay</h4>

        {hasProration && nextInvoiceAmount !== null && (
          <div className="mt-3 flex items-start gap-3 rounded-xl bg-line-soft p-4 text-sm text-ink">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-blue" />
            <p>
              <span className="font-semibold">Your next charge includes a one-time adjustment</span>{" "}
              for a vehicle added partway through the billing period. After that you pay{" "}
              <strong className="tabular-nums">{money(recurringAmount ?? pricing.totalPrice)}</strong> per {cycle}.
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          {cancelling ? (
            <p className="max-w-prose text-ink">
              <span className="font-semibold">No further charges.</span>{" "}
              <span className="text-ink-muted">
                Your membership ends {formatDate(subscription.current_period_end)}.
              </span>
            </p>
          ) : (
            <div>
              <p className="text-sm text-ink-muted">
                Next charge, {formatDate(subscription.current_period_end)}
              </p>
              {invoiceLoading ? (
                <div aria-hidden className="mt-1 h-9 w-32 animate-pulse rounded bg-line motion-reduce:animate-none" />
              ) : (
                <p className="mt-0.5 text-3xl font-black tracking-tight text-ink tabular-nums">
                  {money(nextInvoiceAmount ?? pricing.totalPrice)}
                  {hasProration && recurringAmount !== null && (
                    <span className="ml-2 text-sm font-medium tracking-normal text-ink-muted">
                      then {money(recurringAmount)}/{cycle}
                    </span>
                  )}
                </p>
              )}
            </div>
          )}
        </div>

        <dl className="mt-4 divide-y divide-line-soft text-sm">
          <div className="flex justify-between gap-4 py-2.5">
            <dt className="text-ink-muted">First vehicle</dt>
            <dd className="font-semibold text-ink tabular-nums">
              {money(pricing.basePrice)}/{cycle}
            </dd>
          </div>
          {pricing.vehiclePricing.length > 1 && (
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-ink-muted">
                {pricing.vehiclePricing.length - 1} more{" "}
                {pricing.vehiclePricing.length - 1 === 1 ? "vehicle" : "vehicles"}
              </dt>
              <dd className="font-semibold text-ink tabular-nums">
                {money(pricing.totalPrice - pricing.basePrice)}/{cycle}
              </dd>
            </div>
          )}
          {pricing.isFlock && savings.actualSavings > 0 && (
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-ink-muted">
                {savings.hasPromo ? "Promo and family discounts" : "Family discount"}
              </dt>
              <dd className="font-semibold text-ink tabular-nums">
                −{money(savings.actualSavings)}/{cycle}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-4 py-2.5">
            <dt className="text-ink-muted">This billing period</dt>
            <dd className="text-right font-semibold text-ink">
              {formatDate(subscription.current_period_start)} – {formatDate(subscription.current_period_end)}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm text-ink-muted">
            <CreditCard aria-hidden className="size-4 shrink-0" />
            Your card is kept by Stripe, our secure payment provider.
          </p>
          <Button
            onClick={handleUpdatePayment}
            disabled={loading}
            className="h-11 shrink-0 px-5 font-semibold hover:bg-night-raised"
          >
            {loading ? "Opening Stripe…" : "Update payment method"}
          </Button>
        </div>
      </div>

      {/* Vehicles on the plan */}
      <div className="mt-6 border-t border-line-soft pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h4 className="text-base font-bold text-ink">Vehicles on this membership</h4>
          <span className="text-sm text-ink-muted tabular-nums">
            {pricing.vehiclePricing.length} of {MAX_VEHICLES_PER_SUBSCRIPTION}
          </span>
        </div>

        {pricing.vehiclePricing.length > 0 ? (
          <ul className="mt-3 divide-y divide-line-soft border-y border-line-soft">
            {pricing.vehiclePricing.map((item, index) => {
              const v = item.vehicle;
              const isPrimary = index === 0;
              const label = [v.year, v.make, v.model].filter(Boolean).join(" ") || "Vehicle";
              return (
                <li
                  key={v.id || index}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-4"
                >
                  <div className="min-w-0 space-y-1.5">
                    <p className="flex items-center gap-2 font-semibold text-ink">
                      {isPrimary && <Star aria-hidden className="size-4 shrink-0 fill-flame text-ink" />}
                      <span className="truncate">{label}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {v.license_plate && <LicensePlate plate={v.license_plate} />}
                      {isPrimary ? (
                        <span className="text-sm text-ink-muted">Primary vehicle</span>
                      ) : item.isDiscounted ? (
                        <span className="text-sm text-ink-muted">
                          {pricing.discountPercent}% family discount
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-right text-sm tabular-nums">
                      {item.isDiscounted && (
                        <span className="block text-xs text-ink-subtle line-through">
                          {money(pricing.basePrice)}
                        </span>
                      )}
                      <span className="font-semibold text-ink">{money(item.price)}</span>
                      <span className="text-ink-muted">/{cycle}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        isPrimary
                          ? pricing.vehiclePricing.length > 1
                            ? setShowSwapPrimary(true)
                            : setShowUnsubscribeAll(true)
                          : setVehicleToRemove(item.vehicle as any)
                      }
                      className={DANGER_ROW_ACTION}
                    >
                      Unsubscribe<span className="sr-only"> {label}, plate {item.displayName}</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">
            No vehicles are on this membership yet.
          </p>
        )}

        {(pricing.isFlock || pricing.hasDiscount) && (
          <button
            type="button"
            onClick={() => setShowBenefitsInfo(true)}
            className={cn(
              "mt-2 -ml-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-ink hover:bg-line-soft",
              FOCUS,
            )}
          >
            <Info aria-hidden className="size-4 text-brand-blue" />
            How pricing works for more than one vehicle
          </button>
        )}

        {/* Vehicle change used — adding is locked until the cooldown ends */}
        {canAddVehicle && changeLock.locked && changeLock.unlocksAt && (
          <p className="mt-4 flex items-start gap-2 text-sm text-ink">
            <CalendarX aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-muted" />
            <span>
              You&apos;ve used your vehicle change
              {changeLock.lastChangeAt && ` on ${formatDate(changeLock.lastChangeAt)}`}. You can add a
              vehicle again on <strong>{formatDate(changeLock.unlocksAt)}</strong>.
            </span>
          </p>
        )}

        {canAddVehicle && !changeLock.locked && (
          <button
            type="button"
            onClick={() => setShowAddVehicle(true)}
            className={cn(QUIET_ROW_ACTION, "mt-4 w-full justify-center sm:w-auto")}
          >
            <Plus aria-hidden className="size-4" />
            Add a vehicle
            {pricing.hasDiscount && (
              <span className="font-medium text-ink-muted">
                · {pricing.discountPercent}% off
              </span>
            )}
          </button>
        )}

        {/* Vehicle change policy + a non-app route for anyone who'd rather not do it here */}
        {isActive && (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-prose text-sm text-ink-muted">
              You can change vehicles once every 6 months. Sold or replaced your car? Send us a
              request or stop by the shop and we&apos;ll switch it for you.
            </p>
            <Link href="/dashboard/help?topic=vehicle-change" className={cn(QUIET_ROW_ACTION, "shrink-0 justify-center")}>
              Request a vehicle change
            </Link>
          </div>
        )}
      </div>

      {/* Danger zone, last */}
      {isActive && !cancelling && (
        <div className="mt-6 flex flex-col gap-3 border-t border-line-soft pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-base font-bold text-ink">Cancel membership</h4>
            <p className="mt-0.5 max-w-prose text-sm text-ink-muted">
              Ends the plan for every vehicle on it. You keep your washes until{" "}
              {formatDate(subscription.current_period_end)}.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowUnsubscribeAll(true)}
            className="h-11 shrink-0 border-destructive/40 px-4 font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            Cancel membership
          </Button>
        </div>
      )}

      {/* Add Vehicle Modal */}
      <AddVehicleModal
        open={showAddVehicle}
        onClose={() => setShowAddVehicle(false)}
        onSuccess={() => onVehicleChange?.()}
        currentVehicleCount={pricing.vehiclePricing.length}
        basePriceMonthly={pricing.basePrice}
        billingCycle={subscription.billing_cycle}
        currentPeriodStart={subscription.current_period_start}
        currentPeriodEnd={subscription.current_period_end}
        currentTotalPrice={pricing.totalPrice}
        plan={subscription.subscription_plans}
      />

      {/* Remove Vehicle Dialog */}
      {vehicleToRemove && (
        <RemoveVehicleDialog
          open={!!vehicleToRemove}
          onClose={() => setVehicleToRemove(null)}
          onSuccess={() => onVehicleChange?.()}
          vehicle={vehicleToRemove}
          discountedPrice={flockVehiclePrice(
            pricing.basePrice,
            subscription.subscription_plans
          )}
          billingCycle={subscription.billing_cycle}
        />
      )}

      {/* Swap Primary Vehicle Dialog */}
      {showSwapPrimary && pricing.vehiclePricing.length > 1 && (
        <SwapPrimaryVehicleDialog
          open={showSwapPrimary}
          onClose={() => setShowSwapPrimary(false)}
          onSuccess={() => onVehicleChange?.()}
          currentPrimary={pricing.vehiclePricing[0].vehicle as any}
          familyVehicles={pricing.vehiclePricing.slice(1).map((p) => p.vehicle as any)}
          basePriceMonthly={pricing.basePrice}
          billingCycle={subscription.billing_cycle}
          plan={subscription.subscription_plans}
        />
      )}

      {/* Multi-Vehicle Benefits Info Dialog */}
      <MultiVehicleBenefitsDialog
        isOpen={showBenefitsInfo}
        onClose={() => setShowBenefitsInfo(false)}
        familyDiscountPercent={pricing.discountPercent}
      />

      {/* Cancel membership confirmation. Portals render outside .lp-theme, so
          the content opts back in. */}
      <AlertDialog open={showUnsubscribeAll} onOpenChange={(v) => !v && setShowUnsubscribeAll(false)}>
        <AlertDialogContent className="lp-theme rounded-2xl border-line bg-paper text-ink">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black tracking-tight">
              Cancel your express detailing membership?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-ink-muted">
              This ends the plan for every vehicle on it, including family vehicles, at the end of
              your billing period on {formatDate(subscription.current_period_end)}. You keep your
              washes until then and won&apos;t be charged again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unsubscribingAll} className="h-11 font-semibold">
              Keep my membership
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnsubscribeEverything}
              disabled={unsubscribingAll}
              className="h-11 bg-destructive font-semibold text-white hover:bg-destructive/90 focus-visible:ring-destructive/30"
            >
              {unsubscribingAll ? "Cancelling…" : "Yes, cancel membership"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
