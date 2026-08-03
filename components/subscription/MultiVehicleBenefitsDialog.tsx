"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Car, CheckCircle2, Tag, Wallet, Zap } from "lucide-react";
import { MAX_VEHICLES_PER_SUBSCRIPTION } from "@/lib/pricing/flockPricing";

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

export default function MultiVehicleBenefitsDialog({
  isOpen,
  onClose,
  familyDiscountPercent = 35,
}: MultiVehicleBenefitsDialogProps) {
  const hasDiscount = familyDiscountPercent > 0;
  const benefits = buildBenefits(familyDiscountPercent);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl tracking-tight">
            Multi-vehicle benefits
          </DialogTitle>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {hasDiscount
              ? `Add vehicles to your plan and every one after the first comes in at ${familyDiscountPercent}% off.`
              : "Add vehicles to your plan and manage the whole flock on one bill."}
          </p>
        </DialogHeader>

        <ul className="mt-2 divide-y divide-border">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <li key={benefit.title} className="flex gap-3.5 py-4 first:pt-1">
                <Icon
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {benefit.title}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
