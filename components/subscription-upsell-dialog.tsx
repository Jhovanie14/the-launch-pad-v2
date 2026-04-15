"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Crown, Sparkles, X, Zap } from "lucide-react";
import { usePricingPlans } from "@/hooks/usePricingPlans";

interface SubscriptionUpsellDialogProps {
  open: boolean;
  bookingTotal: number;
  onDismiss: () => void;
  onSubscribe: (planId: string) => void;
}

const FEATURES = [
  "Unlimited express detail visits every month",
  "Interior deep vacuum & shampoo",
  "Premium wash, wax & tire shine",
  "Window cleaning & dashboard shine",
  "Priority scheduling — no waiting",
  "15% off all paid add-ons",
];

export default function SubscriptionUpsellDialog({
  open,
  bookingTotal,
  onDismiss,
  onSubscribe,
}: SubscriptionUpsellDialogProps) {
  const { plans } = usePricingPlans();

  const expressDetailPlan =
    plans.find((p) => p.name.toLowerCase().includes("express")) ??
    plans.sort((a, b) => a.monthly_price - b.monthly_price)[0];

  const monthlyPrice = expressDetailPlan?.monthly_price ?? 0;
  const visitsToBreakEven =
    monthlyPrice > 0 && bookingTotal > 0
      ? Math.ceil(monthlyPrice / bookingTotal)
      : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onDismiss()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden rounded-3xl border-0 shadow-2xl gap-0 [&>button]:hidden">

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          aria-label="Close"
          className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ── Hero ── */}
        <div className="relative bg-blue-950 px-6 pt-8 pb-16 overflow-hidden">
          {/* Decorative glows */}
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 bg-yellow-400/15 border border-yellow-400/30 rounded-full px-3 py-1 mb-5">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-yellow-400 text-xs font-semibold tracking-wide uppercase">
              Exclusive Member Offer
            </span>
          </div>

          <DialogTitle className="text-2xl font-extrabold text-white leading-snug mb-3">
            Stop paying every visit.{" "}
            <span className="text-yellow-400">Go unlimited.</span>
          </DialogTitle>

          <p className="text-blue-300 text-sm leading-relaxed">
            You&apos;re paying{" "}
            <span className="text-white font-semibold">
              ${bookingTotal.toFixed(2)}
            </span>{" "}
            each time.
            {visitsToBreakEven !== null && (
              <>
                {" "}
                A membership covers itself after just{" "}
                <span className="text-yellow-400 font-semibold">
                  {visitsToBreakEven} visit{visitsToBreakEven > 1 ? "s" : ""}
                </span>
                .
              </>
            )}
          </p>
        </div>

        {/* ── Price pill (overlapping) ── */}
        <div className="flex justify-center -mt-7 relative z-10 mb-1">
          <div className="bg-white rounded-2xl shadow-xl px-6 py-3 flex items-end gap-1">
            {monthlyPrice > 0 ? (
              <>
                <span className="text-4xl font-black text-blue-950 leading-none">
                  ${monthlyPrice}
                </span>
                <span className="text-gray-400 text-sm mb-1 font-medium">
                  / month
                </span>
              </>
            ) : (
              <span className="text-gray-400 text-sm animate-pulse">Loading…</span>
            )}
          </div>
        </div>

        {/* ── Features ── */}
        <div className="px-6 pt-4 pb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Everything included
          </p>
          <ul className="grid grid-cols-1 gap-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-green-500/15 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-green-500" strokeWidth={3} />
                </span>
                <span className="text-sm text-gray-700 leading-snug">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── CTAs ── */}
        <div className="px-6 pt-5 pb-6 space-y-3">
          <Button
            className="w-full h-13 rounded-xl bg-blue-950 hover:bg-blue-900 text-white font-bold text-base shadow-lg shadow-blue-950/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => expressDetailPlan && onSubscribe(expressDetailPlan.id)}
            disabled={!expressDetailPlan}
          >
            <Crown className="w-4 h-4 mr-2 text-yellow-400 shrink-0" />
            Subscribe &amp; Save — ${monthlyPrice}/mo
            <Zap className="w-4 h-4 ml-2 text-yellow-400 shrink-0" />
          </Button>

          <button
            onClick={onDismiss}
            className="w-full text-xs text-gray-400 hover:text-gray-500 transition-colors py-1 leading-relaxed"
          >
            No thanks — I&apos;ll keep paying ${bookingTotal.toFixed(2)} per visit
          </button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
