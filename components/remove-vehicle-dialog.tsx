"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface RemoveVehicleDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vehicle: {
    subscription_vehicle_id: string;
    license_plate: string;
    make?: string | null;
    model?: string | null;
  };
  discountedPrice: number;
  billingCycle: string;
}

export function RemoveVehicleDialog({
  open,
  onClose,
  onSuccess,
  vehicle,
  discountedPrice,
  billingCycle,
}: RemoveVehicleDialogProps) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      const res = await fetch("/api/subscription/remove-vehicle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionVehicleId: vehicle.subscription_vehicle_id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to remove vehicle");

      toast.success(`${vehicle.license_plate} removed from your subscription.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  const vehicleLabel =
    vehicle.make && vehicle.model
      ? `${vehicle.make} ${vehicle.model} (${vehicle.license_plate})`
      : vehicle.license_plate;

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Family Vehicle</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Remove <strong>{vehicleLabel}</strong> from your subscription?
            </span>
            <span className="block text-sm text-muted-foreground">
              Your billing will decrease by{" "}
              <strong>
                ${discountedPrice.toFixed(2)}/{billingCycle}
              </strong>{" "}
              starting next cycle. Stripe will create a prorated credit for the
              current period.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Keep Vehicle</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {loading ? "Removing..." : "Yes, Remove Vehicle"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
