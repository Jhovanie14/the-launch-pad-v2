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
}: SwapPrimaryVehicleDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
          <DialogTitle>Unsubscribe Primary Vehicle</DialogTitle>
          <DialogDescription>
            Unsubscribing <strong>{vehicleLabel(currentPrimary)}</strong> requires
            choosing a new primary vehicle, since you still have family vehicles
            on your plan. The vehicle you choose will move to the full plan rate
            of ${basePriceMonthly.toFixed(2)}/{billingCycle} and lose its 35%
            family discount.
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
