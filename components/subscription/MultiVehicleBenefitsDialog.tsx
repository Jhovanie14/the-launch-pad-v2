"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Car, CheckCircle2, Tag, Wallet, Zap } from "lucide-react";

interface MultiVehicleBenefitsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  familyDiscountPercent?: number;
}

const BENEFITS = [
  {
    icon: Tag,
    color: "text-green-600",
    bg: "bg-green-50",
    title: "35% Family Discount",
    description:
      "Every additional vehicle you add gets 35% off the regular subscription price — every single month.",
  },
  {
    icon: Wallet,
    color: "text-blue-600",
    bg: "bg-blue-50",
    title: "One Simple Bill",
    description:
      "All your vehicles are bundled into a single monthly charge. No juggling multiple subscriptions.",
  },
  {
    icon: Zap,
    color: "text-amber-600",
    bg: "bg-amber-50",
    title: "Full Access for Every Vehicle",
    description:
      "Each vehicle on your plan gets the complete set of features included in your chosen plan — nothing stripped out.",
  },
  {
    icon: Car,
    color: "text-purple-600",
    bg: "bg-purple-50",
    title: "Add Up to 4 Family Vehicles",
    description:
      "Bring the whole fleet. You can add up to 4 additional vehicles beyond your primary vehicle.",
  },
  {
    icon: CheckCircle2,
    color: "text-rose-600",
    bg: "bg-rose-50",
    title: "Cancel Anytime",
    description:
      "Your family vehicles follow the same hassle-free cancellation policy as your primary subscription.",
  },
];

export default function MultiVehicleBenefitsDialog({
  isOpen,
  onClose,
  familyDiscountPercent = 35,
}: MultiVehicleBenefitsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-green-600 rounded-full p-2">
              <Car className="h-5 w-5 text-white" />
            </div>
            <DialogTitle className="text-xl">Multi-Vehicle Benefits</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Add family vehicles to your plan and save on every car.
          </p>
        </DialogHeader>

        {/* Highlight badge */}
        <div className="flex justify-center my-2">
          <Badge className="bg-green-600 text-white text-sm px-4 py-1.5 rounded-full">
            🎉 {familyDiscountPercent}% off each added vehicle, every month
          </Badge>
        </div>

        <div className="space-y-3 mt-2">
          {BENEFITS.map((benefit, i) => {
            const Icon = benefit.icon;
            return (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg border border-border"
              >
                <div className={`${benefit.bg} rounded-full p-2 shrink-0`}>
                  <Icon className={`h-4 w-4 ${benefit.color}`} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{benefit.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {benefit.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-center text-muted-foreground mt-3 pb-1">
          Family discounts apply to every billing cycle — no expiry.
        </p>
      </DialogContent>
    </Dialog>
  );
}
