"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { FOCUS_ON_NIGHT } from "@/components/booking/ui/focus";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/** Quiet "Cancel reservation" on a Pickup Pass, with a confirm step. */
export function CancelReservationButton({
  orderId,
  orderRef,
  onCancelled,
}: {
  orderId: string;
  orderRef: string;
  /** Called after a successful cancel; defaults to refreshing server data. */
  onCancelled?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function cancel() {
    setBusy(true);
    try {
      const res = await fetch("/api/products/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Couldn't cancel the reservation");
      toast.success(`Reservation ${orderRef} cancelled`);
      if (onCancelled) onCancelled();
      else router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't cancel the reservation");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        className={cn(
          "inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold text-on-night-muted transition-colors hover:bg-white/8 hover:text-on-night disabled:opacity-60 motion-reduce:transition-none",
          FOCUS_ON_NIGHT,
        )}
        disabled={busy}
      >
        Cancel reservation
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel reservation {orderRef}?</AlertDialogTitle>
          <AlertDialogDescription>
            The items go back on the shelf. Nothing was charged.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction onClick={cancel} disabled={busy}>
            Cancel reservation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
