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
import { Car, BadgePercent, Info } from "lucide-react";
import { toast } from "sonner";

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
}: AddVehicleModalProps) {
  const [licensePlate, setLicensePlate] = useState("");
  const [loading, setLoading] = useState(false);

  const remaining = 5 - currentVehicleCount;
  const discountedPrice = basePriceMonthly * 0.65;

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
    return discountedPrice * fraction;
  })();

  const nextRecurring = currentTotalPrice + discountedPrice;

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

      toast.success("Vehicle added successfully!");
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
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-900" />
            Add a Family Vehicle
          </DialogTitle>
          <DialogDescription>
            You can add {remaining} more vehicle{remaining !== 1 ? "s" : ""} to
            your subscription.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recurring discount */}
          <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-100 rounded-lg">
            <BadgePercent className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-green-800">35% Family Discount</p>
              <p className="text-green-700 mt-0.5">
                This vehicle is billed at{" "}
                <span className="font-bold">
                  ${discountedPrice.toFixed(2)}/{billingCycle}
                </span>{" "}
                instead of ${basePriceMonthly.toFixed(2)}/{billingCycle}.
              </p>
            </div>
          </div>

          {/* Proration notice */}
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-blue-800">Billing adjustment on next charge</p>
              <p className="text-blue-700 mt-0.5">
                Since you're adding this vehicle mid-cycle, your{" "}
                <span className="font-bold">next bill</span> will include a
                one-time prorated amount for the remaining days of this billing
                period
                {prorationEstimate !== null
                  ? ` (~$${prorationEstimate.toFixed(2)})`
                  : ""}
                .
              </p>
              <p className="text-blue-700 mt-1">
                From the following {billingCycle}, your regular charge will be{" "}
                <span className="font-bold">${nextRecurring.toFixed(2)}/{billingCycle}</span>.
              </p>
            </div>
          </div>

          {/* License plate input */}
          <div className="space-y-1.5">
            <Label htmlFor="license-plate">License Plate</Label>
            <Input
              id="license-plate"
              placeholder="e.g. ABC 1234"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              You can add the vehicle details (year, make, model) later from
              your dashboard.
            </p>
          </div>

          <div className="flex gap-2 pt-1">
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
              {loading ? "Adding..." : "Add Vehicle"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
