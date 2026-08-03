"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Car, CheckCircle2 } from "lucide-react";
import {
  type FlockPlanLike,
  flockDiscountPercent,
  hasFlockDiscount,
} from "@/lib/pricing/flockPricing";
import { toast } from "sonner";

interface SwapVehicle {
  subscription_vehicle_id: string;
  license_plate: string;
  make?: string | null;
  model?: string | null;
}

interface SwapPrimaryVehicleDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentPrimary: SwapVehicle;
  familyVehicles: SwapVehicle[];
  basePriceMonthly: number;
  billingCycle: string;
  /** Drives the discount wording. Commercial plans have none to lose. */
  plan?: FlockPlanLike | null;
}

function vehicleLabel(v: SwapVehicle) {
  return v.make && v.model
    ? `${v.make} ${v.model} (${v.license_plate})`
    : v.license_plate;
}

export function SwapPrimaryVehicleDialog({
  open,
  onClose,
  onSuccess,
  currentPrimary,
  familyVehicles,
  basePriceMonthly,
  billingCycle,
  plan,
}: SwapPrimaryVehicleDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isDiscounted = hasFlockDiscount(plan);
  const discountPercent = flockDiscountPercent(plan);

  async function handleConfirm() {
    if (!selectedId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/subscription/swap-primary-vehicle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPrimarySubscriptionVehicleId: selectedId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to swap primary vehicle");

      toast.success("Primary vehicle updated.");
      onSuccess();
      handleClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setSelectedId(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Unsubscribe primary vehicle</DialogTitle>
          <DialogDescription>
            Unsubscribing <strong>{vehicleLabel(currentPrimary)}</strong>{" "}
            requires choosing a new primary vehicle, since you still have other
            vehicles on your plan.{" "}
            {isDiscounted ? (
              <>
                The vehicle you choose moves to the full plan rate of $
                {basePriceMonthly.toFixed(2)}/{billingCycle} and loses its{" "}
                {discountPercent}% family discount.
              </>
            ) : (
              <>
                Every vehicle on this plan already bills at $
                {basePriceMonthly.toFixed(2)}/{billingCycle}, so your total will
                not change.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {familyVehicles.map((v) => (
            <button
              key={v.subscription_vehicle_id}
              type="button"
              onClick={() => setSelectedId(v.subscription_vehicle_id)}
              className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                selectedId === v.subscription_vehicle_id
                  ? "border-blue-500 bg-blue-50"
                  : "border-border hover:bg-gray-50"
              }`}
            >
              <span className="flex items-center gap-3">
                <Car className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">{vehicleLabel(v)}</span>
              </span>
              {selectedId === v.subscription_vehicle_id && (
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
              )}
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !selectedId}
            className="bg-blue-900 hover:bg-blue-800"
          >
            {loading ? "Swapping..." : "Confirm Swap"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
