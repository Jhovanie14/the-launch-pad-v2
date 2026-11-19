"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BundleSuggestion } from "@/lib/booking/bundleSuggestion";
import BookingSheet from "./ui/BookingSheet";
import { FLAME_BUTTON, GHOST_BUTTON } from "./ui/focus";

const money = (n: number) => `$${n.toFixed(2)}`;

/**
 * Offered only when the package really costs less (lib/booking/bundleSuggestion.ts).
 * It lists the package's own features and never claims which extras it replaces.
 */
export default function BundleSheet({
  suggestion,
  onOpenChange,
  onSwitch,
  onKeep,
}: {
  suggestion: BundleSuggestion | null;
  onOpenChange: (open: boolean) => void;
  onSwitch: () => void;
  onKeep: () => void;
}) {
  return (
    <BookingSheet
      open={!!suggestion}
      onOpenChange={onOpenChange}
      title="A package may cost less"
      footer={
        <>
          <button type="button" onClick={onSwitch} className={cn(FLAME_BUTTON, "w-full")}>
            Switch to {suggestion?.pkg.name}
          </button>
          <button type="button" onClick={onKeep} className={cn(GHOST_BUTTON, "w-full")}>
            Keep my choice
          </button>
        </>
      }
    >
      {suggestion && (
        <>
          <p className="text-base leading-relaxed text-ink-muted">
            Your choice adds up to <span className="font-bold text-ink">{money(suggestion.currentTotal)}</span>.{" "}
            {suggestion.pkg.name} is <span className="font-bold text-ink">{money(suggestion.packageTotal)}</span>
            {suggestion.pkg.features.length > 0 ? " and includes:" : "."}
          </p>
          {suggestion.pkg.features.length > 0 && (
            <ul className="mt-3 space-y-2">
              {suggestion.pkg.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-base">
                  <Check className="mt-1 size-4 shrink-0 text-brand-blue" aria-hidden />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </BookingSheet>
  );
}
