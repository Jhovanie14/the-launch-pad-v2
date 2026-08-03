"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Car, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  MAX_VEHICLES_PER_SUBSCRIPTION,
  type FlockPlanLike,
  flockDiscountPercent,
  flockVehiclePrice,
  hasFlockDiscount,
} from "@/lib/pricing/flockPricing";

interface AddVehicleModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentVehicleCount: number;
  basePriceMonthly: number;
  billingCycle: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  currentTotalPrice?: number;
  /** Drives whether the family discount applies. Commercial plans get none. */
  plan?: FlockPlanLike | null;
}

export function AddVehicleModal({
  open,
  onClose,
  onSuccess,
  currentVehicleCount,
  basePriceMonthly,
  billingCycle,
  currentPeriodStart,
  currentPeriodEnd,
  currentTotalPrice = 0,
  plan,
}: AddVehicleModalProps) {
  const [licensePlate, setLicensePlate] = useState("");
  const [loading, setLoading] = useState(false);

  const remaining = MAX_VEHICLES_PER_SUBSCRIPTION - currentVehicleCount;
  const vehiclePrice = flockVehiclePrice(basePriceMonthly, plan);
  const isDiscounted = hasFlockDiscount(plan);
  const discountPercent = flockDiscountPercent(plan);

  // Estimate proration for the remaining days in the current billing cycle
  const prorationEstimate = (() => {
    if (!currentPeriodStart || !currentPeriodEnd) return null;
    const now = Date.now();
    const start = new Date(currentPeriodStart).getTime();
    const end = new Date(currentPeriodEnd).getTime();
    const totalMs = end - start;
    const remainingMs = end - now;
    if (totalMs <= 0 || remainingMs <= 0) return null;
    const fraction = remainingMs / totalMs;
    return vehiclePrice * fraction;
  })();

  const nextRecurring = currentTotalPrice + vehiclePrice;

  async function handleSubmit() {
    const plate = licensePlate.trim().toUpperCase();
    if (!plate) {
      toast.error("Please enter a license plate");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/subscription/add-vehicle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licensePlate: plate }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add vehicle");

      toast.success(`${plate} added to your subscription`);
      setLicensePlate("");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;
    setLicensePlate("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2 tracking-tight">
            <Car className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
            Add a vehicle
          </DialogTitle>
          <DialogDescription>
            You can add {remaining} more vehicle{remaining !== 1 ? "s" : ""} to
            your subscription.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* License plate input — the only thing the customer has to do */}
          <div className="space-y-1.5">
            <Label htmlFor="license-plate">License plate</Label>
            <Input
              id="license-plate"
              placeholder="e.g. ABC 1234"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              disabled={loading}
              autoComplete="off"
              className="font-mono tracking-wider uppercase"
            />
            <p className="text-xs text-muted-foreground">
              Year, make and model can be added later from your dashboard.
            </p>
          </div>

          {/* What this costs — one reconciled summary, not scattered callouts */}
          <div className="rounded-lg border bg-muted/40 p-4 space-y-2.5">
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="text-muted-foreground">This vehicle</span>
              <span className="font-semibold tabular-nums">
                {isDiscounted && (
                  <span className="mr-1.5 font-normal text-muted-foreground line-through">
                    ${basePriceMonthly.toFixed(2)}
                  </span>
                )}
                ${vehiclePrice.toFixed(2)}/{billingCycle}
              </span>
            </div>

            {isDiscounted ? (
              <p className="text-xs text-muted-foreground">
                Includes the {discountPercent}% family discount, applied every
                billing cycle with no expiry.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Commercial plans bill every vehicle at the full plan rate.
              </p>
            )}

            <div className="border-t pt-2.5 space-y-2.5">
              {prorationEstimate !== null && (
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">
                    One-time proration on your next bill
                  </span>
                  <span className="font-medium tabular-nums">
                    ~${prorationEstimate.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <span className="text-muted-foreground">
                  Recurring from the next {billingCycle}
                </span>
                <span className="font-semibold tabular-nums">
                  ${nextRecurring.toFixed(2)}/{billingCycle}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !licensePlate.trim()}
              className="flex-1 bg-blue-900 hover:bg-blue-800"
            >
              {loading && (
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              {loading ? "Adding…" : "Add vehicle"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
