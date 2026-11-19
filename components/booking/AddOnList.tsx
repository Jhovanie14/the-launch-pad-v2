"use client";

import { cn } from "@/lib/utils";
import type { AddOnRow, ServicePackageRow } from "@/types/db";
import { HOLIDAY_SALE_ACTIVE } from "@/lib/booking/holidaySale";
import { applySale } from "@/lib/booking/pricingDisplay";
import BookingSheet from "./ui/BookingSheet";
import { FLAME_BUTTON, GHOST_BUTTON } from "./ui/focus";

interface AddOnListProps {
  open: boolean;
  onClose: () => void;
  service: ServicePackageRow;
  addOns: AddOnRow[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  /** Service price for the footer; 0 when subscription-free. */
  serviceDisplayPrice: number;
  isServiceFree: boolean;
  onSkip: () => void;
  onNext: () => void;
}

const money = (n: number) => `$${n.toFixed(2)}`;

export default function AddOnList({
  open,
  onClose,
  service,
  addOns,
  selectedIds,
  onToggle,
  serviceDisplayPrice,
  isServiceFree,
  onSkip,
  onNext,
}: AddOnListProps) {
  // Hide add-ons already included as features of the selected service
  const visibleAddOns = addOns.filter((a) => {
    const serviceFeatures = service.features ?? [];
    return !serviceFeatures.some(
      (feature) => feature.toLowerCase().trim() === (a.name ?? "").toLowerCase().trim()
    );
  });

  const addOnsOriginal = selectedIds.reduce((sum, id) => {
    const addOn = addOns.find((a) => a.id === id);
    return sum + (addOn ? Number(addOn.price) : 0);
  }, 0);
  const originalTotal = Number(service.price) + addOnsOriginal;
  const finalTotal = applySale(serviceDisplayPrice) + applySale(addOnsOriginal);
  const free = isServiceFree && addOnsOriginal === 0;

  return (
    <BookingSheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Add extras"
      description={`Optional. Anything you'd like on top of ${service.name}.`}
      footer={
        <>
          <div className="flex items-baseline justify-between gap-3 pb-2">
            <span className="text-sm font-semibold text-ink-muted">{service.name}</span>
            <span className="text-right">
              {!free && HOLIDAY_SALE_ACTIVE && originalTotal !== finalTotal && (
                <span className="mr-2 text-sm text-ink-muted line-through">{money(originalTotal)}</span>
              )}
              <span className="text-lg font-black tracking-[-0.02em]">{free ? "Free" : money(finalTotal)}</span>
            </span>
          </div>
          {selectedIds.length === 0 ? (
            <button type="button" onClick={onSkip} className={cn(FLAME_BUTTON, "w-full")}>
              Continue without extras
            </button>
          ) : (
            <>
              <button type="button" onClick={onNext} className={cn(FLAME_BUTTON, "w-full")}>
                Continue
              </button>
              <button type="button" onClick={onSkip} className={cn(GHOST_BUTTON, "w-full")}>
                Skip extras
              </button>
            </>
          )}
        </>
      }
    >
      <ul className="divide-y divide-line-soft">
        {visibleAddOns.map((a) => {
          const isSelected = selectedIds.includes(a.id);
          return (
            <li key={a.id}>
              <label className="flex min-h-14 cursor-pointer items-center gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold">{a.name}</span>
                  <span className="block text-sm text-ink-muted">
                    {a.duration ? `${a.duration} min` : "No extra time"}
                    {a.description ? ` · ${a.description}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-base font-bold">{money(Number(a.price))}</span>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(a.id)}
                  className="size-6 shrink-0 cursor-pointer rounded accent-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
                />
              </label>
            </li>
          );
        })}
      </ul>
    </BookingSheet>
  );
}
