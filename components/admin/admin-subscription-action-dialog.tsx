"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** A subscription change staff make on a customer's behalf. */
export interface AdminSubscriptionAction {
  endpoint: string;
  /** Sent as JSON with `reason` added. */
  body: Record<string, unknown>;
  customerName: string;
  title: string;
  /** Plain-language description of what will happen, shown before confirming. */
  consequence: string;
  confirmLabel: string;
  /** Destructive actions get the red confirm button. */
  destructive: boolean;
  /** Which subscriber list to reload afterwards. */
  refresh: "express" | "self_service";
  /** A required text input sent alongside the reason, e.g. the plate to add. */
  field?: { name: string; label: string; placeholder?: string; uppercase?: boolean };
}

interface AdminSubscriptionActionDialogProps {
  action: AdminSubscriptionAction | null;
  onClose: () => void;
  onDone: (action: AdminSubscriptionAction) => void;
}

/**
 * Confirm step for changing a subscription on a customer's behalf. A reason
 * is required — it goes into the audit trail (and onto the Stripe
 * subscription for cancellations).
 */
export function AdminSubscriptionActionDialog({ action, onClose, onDone }: AdminSubscriptionActionDialogProps) {
  const [reason, setReason] = useState("");
  const [fieldValue, setFieldValue] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setReason("");
    setFieldValue("");
  }, [action]);

  const ready = !!reason.trim() && (!action?.field || !!fieldValue.trim());

  async function handleConfirm() {
    if (!action || !ready) return;
    setLoading(true);
    try {
      const res = await fetch(action.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...action.body,
          ...(action.field ? { [action.field.name]: fieldValue.trim() } : {}),
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");

      toast.success(data.message ?? "Done.");
      onDone(action);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog open={!!action} onOpenChange={(v) => !v && !loading && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{action?.title}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Customer: <strong>{action?.customerName}</strong>
            </span>
            <span className="block">{action?.consequence}</span>
            <span className="block text-sm text-muted-foreground">
              Only do this when the customer has asked for it.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {action?.field && (
          <div className="space-y-2">
            <Label htmlFor="admin-action-field">{action.field.label}</Label>
            <Input
              id="admin-action-field"
              value={fieldValue}
              onChange={(e) =>
                setFieldValue(action.field?.uppercase ? e.target.value.toUpperCase() : e.target.value)
              }
              placeholder={action.field.placeholder}
              maxLength={20}
              disabled={loading}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="admin-action-reason">Reason (required)</Label>
          <Textarea
            id="admin-action-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder="e.g. Customer phoned on 23 Oct — sold their second car"
            disabled={loading}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Go Back</AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            disabled={loading || !ready}
            className={action?.destructive ? "bg-red-600 hover:bg-red-700 text-white" : undefined}
          >
            {loading ? "Working..." : action?.confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
