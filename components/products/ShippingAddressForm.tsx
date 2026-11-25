"use client";

import { cn } from "@/lib/utils";
import { FOCUS_ON_LIGHT } from "@/components/booking/ui/focus";
import { US_STATES } from "@/lib/shipping/states";
import type { ShipAddress } from "@/lib/shipping/quote";

const INPUT = cn("mt-1.5 h-11 w-full rounded-lg bg-paper px-3 text-base ring-1 ring-line placeholder:text-ink-subtle", FOCUS_ON_LIGHT);
const LABEL = "block text-sm font-semibold text-ink";

/** A US shipping address for USPS. States the owner turned off aren't offered. */
export function ShippingAddressForm({
  value,
  onChange,
  excludedStates,
}: {
  value: ShipAddress;
  onChange: (next: ShipAddress) => void;
  excludedStates: string[];
}) {
  const set = (key: keyof ShipAddress) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [key]: e.target.value });
  const states = US_STATES.filter((s) => !excludedStates.includes(s.code));

  return (
    <div className="grid grid-cols-6 gap-3">
      <label className={cn(LABEL, "col-span-6")}>
        Full name
        <input autoComplete="name" value={value.name} onChange={set("name")} required className={INPUT} />
      </label>
      <label className={cn(LABEL, "col-span-6")}>
        Street address
        <input autoComplete="address-line1" value={value.street1} onChange={set("street1")} required className={INPUT} />
      </label>
      <label className={cn(LABEL, "col-span-6")}>
        Apt, suite <span className="font-normal text-ink-muted">(optional)</span>
        <input autoComplete="address-line2" value={value.street2 ?? ""} onChange={set("street2")} className={INPUT} />
      </label>
      <label className={cn(LABEL, "col-span-6 sm:col-span-3")}>
        City
        <input autoComplete="address-level2" value={value.city} onChange={set("city")} required className={INPUT} />
      </label>
      <label className={cn(LABEL, "col-span-3 sm:col-span-1")}>
        State
        <select autoComplete="address-level1" value={value.state} onChange={set("state")} required className={INPUT}>
          <option value="" disabled>
            –
          </option>
          {states.map((s) => (
            <option key={s.code} value={s.code}>
              {s.code}
            </option>
          ))}
        </select>
      </label>
      <label className={cn(LABEL, "col-span-3 sm:col-span-2")}>
        ZIP
        <input
          autoComplete="postal-code"
          inputMode="numeric"
          value={value.zip}
          onChange={set("zip")}
          required
          maxLength={10}
          className={INPUT}
        />
      </label>
      <label className={cn(LABEL, "col-span-6")}>
        Phone <span className="font-normal text-ink-muted">(for the carrier)</span>
        <input type="tel" autoComplete="tel" value={value.phone} onChange={set("phone")} required className={INPUT} />
      </label>
    </div>
  );
}
