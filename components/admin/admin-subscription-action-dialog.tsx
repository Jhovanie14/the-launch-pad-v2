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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  /** Small print under the consequence; defaults to the "only when asked" reminder. */
  note?: string;
  /** An extra step staff can tick, sent as `{ [name]: true | false }`. Unticked by default. */
  option?: { name: string; label: string; description: string; confirmLabel: string };
  /** A required pick from a few options, sent as `{ [name]: value }` (e.g. the refund for Cancel now). */
  choice?: { name: string; label: string; options: { value: string; label: string }[] };
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
  const [optionChecked, setOptionChecked] = useState(false);
  const [choiceValue, setChoiceValue] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setReason("");
    setFieldValue("");
    setOptionChecked(false);
    setChoiceValue("");
  }, [action]);

  const ready =
    !!reason.trim() && (!action?.field || !!fieldValue.trim()) && (!action?.choice || !!choiceValue);

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
          ...(action.option ? { [action.option.name]: optionChecked } : {}),
          ...(action.choice ? { [action.choice.name]: choiceValue } : {}),
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");

      // Part of it worked (e.g. cancelled, but the block failed): keep it on screen until read.
      if (data.warning) toast.warning(data.message, { duration: Infinity, closeButton: true });
      else toast.success(data.message ?? "Done.");
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
              {action?.note ?? "Only do this when the customer has asked for it, or a manager has approved it."}
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

        {action?.choice && (
          <fieldset className="space-y-2" disabled={loading}>
            <legend className="mb-2 text-sm font-medium">{action.choice.label} (required)</legend>
            <RadioGroup value={choiceValue} onValueChange={setChoiceValue} className="gap-2">
              {action.choice.options.map((o) => (
                <Label
                  key={o.value}
                  htmlFor={`admin-action-choice-${o.value}`}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 font-normal has-[[data-state=checked]]:border-slate-900"
                >
                  <RadioGroupItem id={`admin-action-choice-${o.value}`} value={o.value} />
                  {o.label}
                </Label>
              ))}
            </RadioGroup>
          </fieldset>
        )}

        {action?.option && (
          <div className="flex items-start gap-3 rounded-md border p-3">
            <Checkbox
              id="admin-action-option"
              checked={optionChecked}
              onCheckedChange={(v) => setOptionChecked(v === true)}
              disabled={loading}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <Label htmlFor="admin-action-option" className="cursor-pointer">
                {action.option.label}
              </Label>
              <p className="text-sm text-muted-foreground">{action.option.description}</p>
            </div>
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
            {loading ? "Working..." : optionChecked && action?.option ? action.option.confirmLabel : action?.confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
