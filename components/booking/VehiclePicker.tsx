"use client";

import { useState } from "react";
import { Car } from "lucide-react";
import { cn } from "@/lib/utils";
import { LicensePlate } from "@/components/dashboard-home/license-plate";
import BookingSheet from "./ui/BookingSheet";
import { FLAME_BUTTON, RING_BUTTON, SURFACE } from "./ui/focus";

interface VehiclePickerProps {
  licensePlate: string;
  onChange: (plate: string) => void;
  onSaved: () => void;
}

// Guest plate entry. Logged-in users arrive with their vehicle preselected in
// the URL (via the dashboard booking modal), so this only renders for guests.
export default function VehiclePicker({ licensePlate, onChange, onSaved }: VehiclePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <section aria-labelledby="your-car" className={cn(SURFACE, "flex items-center justify-between gap-3 p-4 sm:p-5")}>
      <div className="min-w-0">
        <h2 id="your-car" className="text-sm font-semibold text-ink-muted">
          Your car
        </h2>
        <div className="mt-2">
          {licensePlate ? (
            <LicensePlate plate={licensePlate} className="px-3 py-1 text-base" />
          ) : (
            <p className="text-base text-ink-muted">Add your license plate so we can find your car.</p>
          )}
        </div>
      </div>
      <button type="button" onClick={() => setOpen(true)} className={RING_BUTTON}>
        {licensePlate ? "Change" : "Add plate"}
      </button>

      <BookingSheet
        open={open}
        onOpenChange={setOpen}
        title={licensePlate ? "Change your plate" : "Add your plate"}
        description="Our team uses it to find your car at the bay."
        footer={
          <button
            type="button"
            className={cn(FLAME_BUTTON, "w-full")}
            onClick={() => {
              setOpen(false);
              onSaved();
            }}
          >
            Save plate
          </button>
        }
      >
        <label htmlFor="license-plate" className="text-sm font-semibold text-ink">
          License plate
        </label>
        <div className="relative mt-2">
          <Car className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-ink-subtle" aria-hidden />
          <input
            id="license-plate"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="ABC 1234"
            value={licensePlate}
            onChange={(e) => onChange(e.target.value)}
            className="h-11 w-full rounded-lg bg-paper pl-11 pr-3 text-base uppercase text-ink ring-1 ring-line placeholder:normal-case placeholder:text-ink-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          />
        </div>
      </BookingSheet>
    </section>
  );
}
