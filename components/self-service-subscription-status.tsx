import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertCircle, ArrowRight, CalendarX, CheckCircle2, CreditCard, Info, XCircle } from "lucide-react";
import { Button } from "./ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { LicensePlate } from "./dashboard-home/license-plate";
import { SelfServiceSubscription } from "@/types";
import { BUSINESS_TIME_ZONE, membershipStatusLine } from "@/lib/dashboard/home";
import { cn } from "@/lib/utils";

interface SelfServiceSubscriptionStatusProps {
  subscription: SelfServiceSubscription | null;
  onSubscriptionChange?: () => void;
}

const formatDate = (date?: string | null) =>
  date
    ? new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: BUSINESS_TIME_ZONE,
      })
    : "—";

export default function SelfServiceSubscriptionStatus({
  subscription,
  onSubscriptionChange,
}: SelfServiceSubscriptionStatusProps) {
  const [loading, setLoading] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

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
    } catch (err) {
      console.error("Error updating payment method:", err);
      toast.error("We couldn't reach the payment page. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const res = await fetch("/api/cancel-self-service-subscription", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to cancel subscription");
      }
      toast.success(
        "Your self-service plan will end at the close of this billing period.",
      );
      setCancelOpen(false);
      onSubscriptionChange?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
    } finally {
      setCancelling(false);
    }
  };

  if (!subscription) {
    return (
      <section aria-labelledby="self-empty" className="rounded-2xl bg-paper p-5 ring-1 ring-line sm:p-7">
        <h3 id="self-empty" className="text-xl font-black tracking-tight text-ink">
          No self-service plan
        </h3>
        <p className="mt-1 max-w-prose text-ink-muted">
          The bays are open 24/7 with tap-to-pay. A plan is there if you wash often.
        </p>
        <Link
          href="/dashboard/pricing"
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-ink ring-1 ring-line hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          See self-service plans
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </section>
    );
  }

  const isActive = subscription.status === "active";
  const ending = subscription.cancel_at_period_end;
  const price = subscription.subscription_plans?.monthly_price;

  const status = (() => {
    if (ending) return { icon: CalendarX, tone: "text-ink", label: membershipStatusLine(subscription) };
    switch (subscription.status) {
      case "active":
        return { icon: CheckCircle2, tone: "text-ink", label: membershipStatusLine(subscription) };
      case "past_due":
        return { icon: AlertCircle, tone: "text-destructive", label: "Payment past due. Update your card to keep using the plan." };
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

  return (
    <section aria-labelledby="self-plan" className="rounded-2xl bg-paper p-5 ring-1 ring-line sm:p-7">
      <h3 id="self-plan" className="text-2xl font-black tracking-tight text-balance text-ink sm:text-3xl">
        {subscription.subscription_plans?.name || "Self-service plan"}
      </h3>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-semibold">
        <span className={cn("inline-flex items-center gap-1.5", status.tone)}>
          <StatusIcon aria-hidden className="size-4 shrink-0" />
          {status.label}
        </span>
      </p>

      {ending && (
        <p className="mt-4 flex items-start gap-2 text-sm text-ink">
          <CalendarX aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-muted" />
          <span>
            Cancellation is scheduled. You can use the plan until{" "}
            <strong>{formatDate(subscription.current_period_end)}</strong>, and you won&apos;t be
            charged again.
          </span>
        </p>
      )}

      <div className="mt-6 border-t border-line-soft pt-6">
        <h4 className="text-base font-bold text-ink">What you pay</h4>
        <dl className="mt-3 divide-y divide-line-soft text-sm">
          <div className="flex justify-between gap-4 py-2.5">
            <dt className="text-ink-muted">Price</dt>
            <dd className="font-semibold text-ink tabular-nums">
              {subscription.billing_cycle === "month" && price != null
                ? `$${Number(price).toFixed(2)}/month`
                : subscription.billing_cycle
                  ? `Billed ${subscription.billing_cycle}ly`
                  : "—"}
            </dd>
          </div>
          {!ending && (
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-ink-muted">Next charge</dt>
              <dd className="font-semibold text-ink">{formatDate(subscription.current_period_end)}</dd>
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
            {isActive
              ? "Your card is kept by Stripe, our secure payment provider."
              : "You can update your card while the plan is active."}
          </p>
          <Button
            variant="outline"
            onClick={handleUpdatePayment}
            disabled={loading || !isActive}
            className="h-11 shrink-0 px-5 font-semibold"
          >
            {loading ? "Opening Stripe…" : "Update payment method"}
          </Button>
        </div>
      </div>

      <div className="mt-6 border-t border-line-soft pt-6">
        <h4 className="text-base font-bold text-ink">Vehicles on this plan</h4>
        {subscription.vehicles.some(Boolean) ? (
          <ul className="mt-3 divide-y divide-line-soft border-y border-line-soft">
            {subscription.vehicles.filter(Boolean).map((v) => {
              const label = [v.year, v.make, v.model].filter(Boolean).join(" ") || "Vehicle";
              return (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
                  <span className="font-semibold text-ink">{label}</span>
                  {v.license_plate && <LicensePlate plate={v.license_plate} />}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">No vehicles are on this plan yet.</p>
        )}
      </div>

      {/* Danger zone, last */}
      {!ending && isActive && (
        <div className="mt-6 flex flex-col gap-3 border-t border-line-soft pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-base font-bold text-ink">Cancel self-service plan</h4>
            <p className="mt-0.5 max-w-prose text-sm text-ink-muted">
              You keep the plan until {formatDate(subscription.current_period_end)}. The bays stay
              open to you with tap-to-pay after that.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setCancelOpen(true)}
            className="h-11 shrink-0 border-destructive/40 px-4 font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            Cancel plan
          </Button>
        </div>
      )}

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent className="lp-theme rounded-2xl border-line bg-paper text-ink">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black tracking-tight">
              Cancel your self-service plan?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-ink-muted">
              You&apos;ll keep the plan until {formatDate(subscription.current_period_end)}, then it
              ends. No further charges.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 font-semibold">Keep my plan</AlertDialogCancel>
            <AlertDialogAction
              className="h-11 bg-destructive font-semibold text-white hover:bg-destructive/90 focus-visible:ring-destructive/30"
              disabled={cancelling}
              onClick={(e) => {
                e.preventDefault(); // keep the dialog open while in flight
                handleCancelSubscription();
              }}
            >
              {cancelling ? "Cancelling…" : "Yes, cancel plan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
