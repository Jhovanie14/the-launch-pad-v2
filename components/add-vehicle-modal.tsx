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
import { Car, BadgePercent } from "lucide-react";
import { toast } from "sonner";

interface AddVehicleModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentVehicleCount: number;
  basePriceMonthly: number;
  billingCycle: string;
}

export function AddVehicleModal({
  open,
  onClose,
  onSuccess,
  currentVehicleCount,
  basePriceMonthly,
  billingCycle,
}: AddVehicleModalProps) {
  const [licensePlate, setLicensePlate] = useState("");
  const [loading, setLoading] = useState(false);

  const remaining = 5 - currentVehicleCount;
  const discountedPrice = basePriceMonthly * 0.65;

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
          {/* Pricing preview */}
          <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-100 rounded-lg">
            <BadgePercent className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-green-800">35% Family Discount</p>
              <p className="text-green-700 mt-0.5">
                This vehicle will be billed at{" "}
                <span className="font-bold">
                  ${discountedPrice.toFixed(2)}/{billingCycle}
                </span>{" "}
                instead of ${basePriceMonthly.toFixed(2)}/{billingCycle}.
                Stripe will prorate the first charge to your current billing
                cycle.
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
