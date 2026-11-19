"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePricingPlans } from "@/hooks/usePricingPlans";
import BookingSheet, { BookingSheetTitle } from "@/components/booking/ui/BookingSheet";
import { FLAME_BUTTON, GHOST_BUTTON } from "@/components/booking/ui/focus";

interface SubscriptionUpsellDialogProps {
  open: boolean;
  bookingTotal: number;
  onDismiss: () => void;
  onSubscribe: (planId: string) => void;
}

const money = (n: number) => `$${n.toFixed(2)}`;

/**
 * Offered to guests before they pay. It reads like the member pass and lists
 * the plan's own features from the database, so it never promises something
 * the plan doesn't include.
 */
export default function SubscriptionUpsellDialog({
  open,
  bookingTotal,
  onDismiss,
  onSubscribe,
}: SubscriptionUpsellDialogProps) {
  const { plans } = usePricingPlans();

  const expressDetailPlan =
    plans.find((p) => p.name.toLowerCase().includes("express")) ??
    [...plans].sort((a, b) => a.monthly_price - b.monthly_price)[0];

  const monthlyPrice = expressDetailPlan?.monthly_price ?? 0;
  const visitsToBreakEven =
    monthlyPrice > 0 && bookingTotal > 0 ? Math.ceil(monthlyPrice / bookingTotal) : null;
  const features = expressDetailPlan?.features ?? [];
  const kind = expressDetailPlan?.name.toLowerCase().includes("express") ? "Express membership" : "Membership";

  return (
    <BookingSheet
      open={open}
      onOpenChange={(o) => !o && onDismiss()}
      title="Stop paying every visit"
      description={expressDetailPlan ? `${expressDetailPlan.name} plan, ${money(monthlyPrice)} a month.` : undefined}
      header={
        <div className="bg-night px-5 pb-6 pr-14 pt-5 text-on-night sm:px-6 sm:pt-6">
          <p className="text-sm font-semibold text-svc-member">{kind}</p>
          <BookingSheetTitle className="mt-1 text-3xl">Stop paying every visit</BookingSheetTitle>
          {monthlyPrice > 0 ? (
            <p className="mt-4 flex flex-wrap items-baseline gap-x-2">
              <span className="text-4xl font-black tracking-[-0.03em]">{money(monthlyPrice)}</span>
              <span className="text-base text-on-night-muted">a month, {expressDetailPlan?.name} plan</span>
            </p>
          ) : (
            <p className="mt-4 h-10 w-40 rounded-lg bg-dusk/90 motion-safe:animate-pulse" aria-hidden />
          )}
          {bookingTotal > 0 && (
            <p className="mt-2 text-base leading-relaxed text-on-night-muted">
              This booking is <span className="font-semibold text-on-night">{money(bookingTotal)}</span>.
              {visitsToBreakEven !== null &&
                ` ${visitsToBreakEven === 1 ? "One visit" : `${visitsToBreakEven} visits`} a month and the plan has paid for itself.`}
            </p>
          )}
        </div>
      }
      footer={
        <>
          <button
            type="button"
            className={cn(FLAME_BUTTON, "w-full")}
            onClick={() => expressDetailPlan && onSubscribe(expressDetailPlan.id)}
            disabled={!expressDetailPlan}
          >
            Become a member, {money(monthlyPrice)} a month
          </button>
          <button type="button" onClick={onDismiss} className={cn(GHOST_BUTTON, "h-auto min-h-11 w-full text-center")}>
            No thanks, continue to pay {money(bookingTotal)}
          </button>
        </>
      }
    >
      {features.length > 0 && (
        <ul className="space-y-2">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-base">
              <Check className="mt-1 size-4 shrink-0 text-brand-blue" aria-hidden />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}
    </BookingSheet>
  );
}
