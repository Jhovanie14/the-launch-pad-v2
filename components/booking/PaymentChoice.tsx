"use client";

import { Banknote, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import BookingSheet from "./ui/BookingSheet";
import { FLAME_BUTTON, GHOST_BUTTON } from "./ui/focus";

interface PaymentChoiceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Only authenticated users may pay cash (the server enforces this too). */
  allowCash: boolean;
  value: "card" | "cash";
  onChange: (v: "card" | "cash") => void;
  onConfirm: () => void;
}

const OPTIONS = [
  { value: "card" as const, label: "Pay by card", detail: "Secure checkout now", icon: CreditCard },
  { value: "cash" as const, label: "Pay cash", detail: "Pay when you arrive", icon: Banknote },
];

export default function PaymentChoice({ open, onOpenChange, allowCash, value, onChange, onConfirm }: PaymentChoiceProps) {
  const options = allowCash ? OPTIONS : OPTIONS.filter((o) => o.value === "card");
  return (
    <BookingSheet
      open={open}
      onOpenChange={onOpenChange}
      title="How would you like to pay?"
      footer={
        <>
          <button type="button" onClick={onConfirm} className={cn(FLAME_BUTTON, "w-full")}>
            Continue
          </button>
          <button type="button" onClick={() => onOpenChange(false)} className={cn(GHOST_BUTTON, "w-full")}>
            Cancel
          </button>
        </>
      }
    >
      <fieldset>
        <legend className="sr-only">Payment method</legend>
        <div className="grid gap-2">
          {options.map(({ value: v, label, detail, icon: Icon }) => {
            const checked = value === v;
            return (
              <label
                key={v}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl bg-paper px-4 py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-blue",
                  checked ? "ring-2 ring-night" : "ring-1 ring-line hover:ring-ink-subtle"
                )}
              >
                <input
                  type="radio"
                  name="payment"
                  value={v}
                  checked={checked}
                  onChange={() => onChange(v)}
                  className="sr-only"
                />
                <Icon className={cn("size-6 shrink-0", checked ? "text-ink" : "text-ink-subtle")} aria-hidden />
                <span className="flex-1">
                  <span className="block text-base font-semibold">{label}</span>
                  <span className="block text-sm text-ink-muted">{detail}</span>
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "size-5 shrink-0 rounded-full",
                    checked ? "border-[6px] border-night bg-paper" : "ring-2 ring-inset ring-line"
                  )}
                />
              </label>
            );
          })}
        </div>
      </fieldset>
    </BookingSheet>
  );
}
