"use client";

import { Car, CheckCircle2, Tag, Wallet, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_VEHICLES_PER_SUBSCRIPTION } from "@/lib/pricing/flockPricing";
import BookingSheet from "@/components/booking/ui/BookingSheet";
import { GHOST_BUTTON } from "@/components/booking/ui/focus";

interface MultiVehicleBenefitsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** 0 on commercial plans, where every vehicle bills at the plan rate. */
  familyDiscountPercent?: number;
}

const MAX_ADDITIONAL_VEHICLES = MAX_VEHICLES_PER_SUBSCRIPTION - 1;

function buildBenefits(discountPercent: number) {
  const pricingBenefit =
    discountPercent > 0
      ? {
          icon: Tag,
          title: `${discountPercent}% off every additional vehicle`,
          description:
            "The discount applies to each vehicle beyond your primary one, every billing cycle, with no expiry.",
        }
      : {
          icon: Tag,
          title: "Every vehicle at the same plan rate",
          description:
            "Commercial plans are already priced at cost, so additional vehicles bill at the full plan rate rather than a discounted one.",
        };

  return [
    pricingBenefit,
    {
      icon: Wallet,
      title: "One bill for the whole flock",
      description:
        "Every vehicle is bundled into a single charge on one billing date — no separate subscriptions to track.",
    },
    {
      icon: Zap,
      title: "Full access for every vehicle",
      description:
        "Each vehicle on your plan gets everything your plan includes. Nothing is stripped out for the additional ones.",
    },
    {
      icon: Car,
      title: `Add up to ${MAX_ADDITIONAL_VEHICLES} more vehicles`,
      description: `Your subscription covers a primary vehicle plus up to ${MAX_ADDITIONAL_VEHICLES} additional vehicles.`,
    },
    {
      icon: CheckCircle2,
      title: "Unsubscribe any vehicle, anytime",
      description:
        "Additional vehicles follow the same cancellation terms as your primary subscription. No contract, no penalty.",
    },
  ];
}

/** Information only: one quiet "Close", no flame button. */
export default function MultiVehicleBenefitsDialog({
  isOpen,
  onClose,
  familyDiscountPercent = 35,
}: MultiVehicleBenefitsDialogProps) {
  const hasDiscount = familyDiscountPercent > 0;
  const benefits = buildBenefits(familyDiscountPercent);

  return (
    <BookingSheet
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Multi-vehicle benefits"
      description={
        hasDiscount
          ? `Add vehicles to your plan and every one after the first comes in at ${familyDiscountPercent}% off.`
          : "Add vehicles to your plan and manage the whole flock on one bill."
      }
      footer={
        <button type="button" onClick={onClose} className={cn(GHOST_BUTTON, "w-full ring-1 ring-line")}>
          Close
        </button>
      }
    >
      <ul className="divide-y divide-line-soft">
        {benefits.map(({ icon: Icon, title, description }) => (
          <li key={title} className="flex gap-3 py-3 first:pt-0">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-canvas ring-1 ring-line">
              <Icon className="size-4 text-brand-blue" aria-hidden />
            </span>
            <div>
              <p className="text-base font-semibold">{title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{description}</p>
            </div>
          </li>
        ))}
      </ul>
    </BookingSheet>
  );
}
