# Booking Flow Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two near-duplicate booking trees (guest `app/(user)/(booking)/*` and dashboard `app/(dashboard)/dashboard/booking/*`) with one shared engine — shared pure pricing/param libs, one `useBookingFlow` hook, three shared step components — leaving the six route files as thin shells.

**Architecture:** Approach A from the spec (`docs/superpowers/specs/2026-06-12-booking-flow-unification-design.md`): shared step components + shared hook + thin route shells. Guest/auth differences are state-driven branches on a `BookingAuthContext`. Server stays authoritative on price (`lib/pricing/computeBookingAmount.ts` + `validatePromo.ts` — untouched); everything client-side is display-only.

**Tech Stack:** Next.js 16 (app router, route groups), React 19, Supabase JS client, Vitest, Tailwind/shadcn, Stripe checkout via existing `/api/checkout_sessions`.

**Branch:** continue on `phase-2-foundation`. Commit per task. Working tree has unrelated untracked/modified files (`.mcp.json`, `supabase/*`, `.claude/*`) — always `git add` specific paths, never `git add -A`.

**Verification commands** (used in every task):
- Typecheck: `npx tsc --noEmit`
- Tests: `npm test` (vitest run; 26 tests green today)

---

## Drift resolutions (locked here so tasks don't re-decide)

Where the two trees disagree, the unified code does the following. Items marked **FLAG** must be repeated to the owner in the final summary.

| # | Divergence | Resolution |
|---|---|---|
| D1 | Holiday discount: service pages display 5%, both confirmation pages compute 10%, banner copy says "5% OFF" everywhere, **server applies no holiday discount at all** | One shared constant module (`lib/booking/holidaySale.ts`, 5%). Display-only. **FLAG**: displayed totals are lower than what the server actually charges while the sale flag is on — owner must decide to either end the sale display or add the discount server-side (out of scope here). |
| D2 | Guest confirmation displays "service free" for ANY active subscription (`isSubscribed` only); dashboard + server require plan-covers-category AND vehicle-on-subscription | Adopt the server rules (category + vehicle check) for all display pricing. This is exactly the Phase-1-style drift the spec exists to kill. |
| D3 | Promo input UI exists only in dashboard confirmation (guest page has `promoCode` state but no input — accidental) | Show promo UI for everyone. Server already validates promos for guests. Per-user redemption pre-check skipped when no `userId` (server re-checks anyway). **FLAG** (superset adoption). |
| D4 | Client promo check matches `restricted_to_service` against service *name/category*; server `validatePromo` compares it to the service *id* | Keep the dashboard client check verbatim (display/UX only), server stays authoritative. **FLAG**: a promo can appear applied client-side but be silently ignored server-side — pre-existing, not widened by this work. |
| D5 | Subscription upsell dialog only in guest tree | Gate on `ctx.variant === "guest" && !ctx.subscription`. Preserves both trees' behavior exactly. |
| D6 | Payment: guest tree card-only (even for logged-in users); dashboard card/cash modal + free-subscription direct booking | State-driven per spec: cash and free-direct-booking gated on `ctx.isAuthenticated` (server enforces both). A logged-in user on the guest URL now gets the cash option — **FLAG** (spec-intended unification). |
| D7 | Dashboard confirmation only fetches service/add-ons/date/time when a user is logged in (latent bug) | Hook fetches unconditionally from URL params. |
| D8 | Errors: guest uses `alert()`, dashboard logs to console silently | `toast.error(...)` uniformly (spec: no silent failures). |
| D9 | Guest service page: `BODY_TYPES` list, `normalizeBodyType`, `UNIVERSAL_CATEGORIES` filter and its "No services found" empty state are dead/no-op code (filter always returns universal categories; both tabs have their own empty states) | Drop. |
| D10 | Dashboard service page imports `{ is } from "zod/v4/locales"` (junk) | Drop. |
| D11 | Quick-tab feature icons: guest shows red X for features containing "no" + yellow checks; dashboard shows green checks | Adopt guest rendering on the quick tab (strictly more informative for "No interior"-style features), green checks on express tab (both trees agree there). **FLAG** (cosmetic). |
| D12 | Loading UI: guest `<LoadingDots />`, dashboard bare `<Loader2Icon />` | `<LoadingDots />`. |
| D13 | Empty `addons=`/`license_plate=` params were still written to URLs | `buildBookingSearch` omits empty params; `parseBookingSelection` tolerates both forms and scrubs literal `"null"`/`"undefined"` values (guest confirmation already had a `rawPlate === "null"` hack). |

## File structure

**Create:**
- `lib/booking/holidaySale.ts` — display-only sale constants (one place to end the sale).
- `lib/booking/pricingDisplay.ts` + `lib/booking/pricingDisplay.test.ts` — pure display pricing mirroring server rules.
- `lib/booking/bookingParams.ts` + `lib/booking/bookingParams.test.ts` — pure URL-param parse/build (the hook's "state transitions").
- `hooks/useBookingAuthContext.ts` — `BookingAuthContext` interface + the one hook both shells call.
- `hooks/useBookingFlow.ts` — single source of truth for an in-progress booking (fetches, promo, navigation, `submit()`).
- `components/booking/DateTimeStep.tsx`
- `components/booking/ServiceStep.tsx`, `components/booking/VehiclePicker.tsx`, `components/booking/AddOnList.tsx`
- `components/booking/ConfirmationStep.tsx`, `components/booking/BookingSummary.tsx`, `components/booking/PaymentChoice.tsx`

**Shrink to thin shells (replace file contents):**
- `app/(user)/(booking)/service/page.tsx`, `app/(user)/(booking)/datetime/page.tsx`, `app/(user)/(booking)/confirmation/page.tsx`
- `app/(dashboard)/dashboard/booking/service/page.tsx`, `app/(dashboard)/dashboard/booking/datetime/page.tsx`, `app/(dashboard)/dashboard/booking/confirmation/page.tsx`

**Untouched:** `app/(user)/(booking)/success/page.tsx`, `app/(dashboard)/dashboard/booking/action.ts` (`createBooking` stays where it is; shared code imports it), `/api/checkout_sessions`, `lib/pricing/*`.

---

### Task 1: Pure display-pricing lib (`holidaySale.ts` + `pricingDisplay.ts`)

**Files:**
- Create: `lib/booking/holidaySale.ts`
- Create: `lib/booking/pricingDisplay.ts`
- Test: `lib/booking/pricingDisplay.test.ts`

- [ ] **Step 1: Create `lib/booking/holidaySale.ts`**

```ts
// Display-only holiday sale. The server NEVER applies this discount
// (lib/pricing/computeBookingAmount.ts is authoritative); these constants only
// control badges and strikethrough prices in the booking UI.
export const HOLIDAY_SALE_ACTIVE = true; // Set to false when sale ends
export const HOLIDAY_SALE_DISCOUNT = 0.05; // 5% off
```

- [ ] **Step 2: Write the failing tests**

Create `lib/booking/pricingDisplay.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  computeDisplayPricing,
  computeTotalDuration,
  isServiceFreeForDisplay,
  planCoversCategory,
} from "./pricingDisplay";
import { HOLIDAY_SALE_ACTIVE, HOLIDAY_SALE_DISCOUNT } from "./holidaySale";

const sale = (n: number) =>
  Number((HOLIDAY_SALE_ACTIVE ? n * (1 - HOLIDAY_SALE_DISCOUNT) : n).toFixed(2));

describe("planCoversCategory (mirrors lib/pricing/computeBookingAmount.ts)", () => {
  it("quick service is covered by quick/exterior plans", () => {
    expect(planCoversCategory("Exterior Shine", "Quick Service")).toBe(true);
    expect(planCoversCategory("Quick Service Plan", "quick service")).toBe(true);
    expect(planCoversCategory("Express Detail", "quick service")).toBe(false);
  });
  it("express detail is covered by express/commercial plans", () => {
    expect(planCoversCategory("Express Detail", "Express Detail")).toBe(true);
    expect(planCoversCategory("Commercial Wash", "express detail")).toBe(true);
    expect(planCoversCategory("Exterior Shine", "express detail")).toBe(false);
  });
  it("unknown categories are never covered", () => {
    expect(planCoversCategory("Express Detail", "ceramic coating")).toBe(false);
  });
});

describe("isServiceFreeForDisplay", () => {
  it("requires a plan name AND the vehicle on the subscription", () => {
    expect(
      isServiceFreeForDisplay({ planName: "Express Detail", isVehicleSubscribed: true, category: "express detail" })
    ).toBe(true);
    expect(
      isServiceFreeForDisplay({ planName: "Express Detail", isVehicleSubscribed: false, category: "express detail" })
    ).toBe(false);
    expect(
      isServiceFreeForDisplay({ planName: null, isVehicleSubscribed: true, category: "express detail" })
    ).toBe(false);
  });
});

describe("computeDisplayPricing", () => {
  const service = { price: 100, category: "quick service" };
  const addOns = [
    { id: "a1", price: 10 },
    { id: "a2", price: 5 },
  ];

  it("non-subscriber: service + add-ons, sale applied for display", () => {
    const p = computeDisplayPricing({
      service, addOns, planName: null, isVehicleSubscribed: false, promo: null,
    });
    expect(p.isServiceFree).toBe(false);
    expect(p.originalTotal).toBe(115);
    expect(p.saleTotal).toBe(sale(115));
    expect(p.finalTotal).toBe(sale(115));
  });

  it("subscriber-free: only add-ons are charged", () => {
    const p = computeDisplayPricing({
      service, addOns, planName: "Exterior Shine", isVehicleSubscribed: true, promo: null,
    });
    expect(p.isServiceFree).toBe(true);
    expect(p.originalTotal).toBe(15);
    expect(p.finalTotal).toBe(sale(15));
  });

  it("subscriber whose vehicle is NOT on the subscription pays full", () => {
    const p = computeDisplayPricing({
      service, addOns, planName: "Exterior Shine", isVehicleSubscribed: false, promo: null,
    });
    expect(p.isServiceFree).toBe(false);
    expect(p.originalTotal).toBe(115);
  });

  it("percent promo applies after the sale", () => {
    const p = computeDisplayPricing({
      service, addOns: [], planName: null, isVehicleSubscribed: false,
      promo: { type: "percent", value: 10 },
    });
    expect(p.finalTotal).toBe(Number((sale(100) * 0.9).toFixed(2)));
  });

  it("flat promo floors at zero", () => {
    const p = computeDisplayPricing({
      service: { price: 5, category: "quick service" }, addOns: [],
      planName: null, isVehicleSubscribed: false,
      promo: { type: "flat", value: 50 },
    });
    expect(p.finalTotal).toBe(0);
  });

  it("savings = original − final", () => {
    const p = computeDisplayPricing({
      service, addOns, planName: null, isVehicleSubscribed: false, promo: null,
    });
    expect(p.savings).toBe(Number((115 - sale(115)).toFixed(2)));
  });

  it("handles missing service (still loading)", () => {
    const p = computeDisplayPricing({
      service: null, addOns, planName: null, isVehicleSubscribed: false, promo: null,
    });
    expect(p.originalTotal).toBe(15);
  });
});

describe("computeTotalDuration", () => {
  it("sums service and add-on durations", () => {
    expect(computeTotalDuration({ duration: 30 }, [{ duration: 10 }, { duration: 5 }])).toBe(45);
    expect(computeTotalDuration(null, [])).toBe(0);
  });
});
```

- [ ] **Step 3: Run tests, verify they fail**

Run: `npx vitest run lib/booking/pricingDisplay.test.ts`
Expected: FAIL — `Cannot find module './pricingDisplay'` (or equivalent resolution error).

- [ ] **Step 4: Implement `lib/booking/pricingDisplay.ts`**

```ts
// Client-side price DISPLAY helpers. They mirror the server's authoritative
// rules in lib/pricing/computeBookingAmount.ts + validatePromo.ts so the UI
// previews what the server will charge. They must never feed a charge amount.
import { HOLIDAY_SALE_ACTIVE, HOLIDAY_SALE_DISCOUNT } from "./holidaySale";

export interface DisplayService {
  price: number;
  category: string | null;
}

export interface DisplayAddOn {
  id: string;
  price: number;
}

export interface AppliedPromo {
  type: "percent" | "flat";
  value: number;
}

/** Mirror of planCoversCategory in lib/pricing/computeBookingAmount.ts. */
export function planCoversCategory(planName: string, category: string): boolean {
  const name = planName.toLowerCase();
  const cat = category.toLowerCase();
  if (cat === "quick service")
    return name.includes("quick") || name.includes("exterior");
  if (cat === "express detail")
    return name.includes("express") || name.includes("commercial");
  return false;
}

export function isServiceFreeForDisplay(opts: {
  planName: string | null | undefined;
  isVehicleSubscribed: boolean;
  category: string | null | undefined;
}): boolean {
  if (!opts.planName || !opts.isVehicleSubscribed) return false;
  return planCoversCategory(opts.planName, opts.category ?? "");
}

/** Display-only holiday sale discount. */
export function applySale(amount: number): number {
  return HOLIDAY_SALE_ACTIVE ? amount * (1 - HOLIDAY_SALE_DISCOUNT) : amount;
}

export interface DisplayPricing {
  isServiceFree: boolean;
  /** Before sale and promo; service counted as 0 when subscription-free. */
  originalTotal: number;
  /** After the display-only holiday sale. */
  saleTotal: number;
  /** After sale and applied promo — what the UI shows as "Total". */
  finalTotal: number;
  savings: number;
}

export function computeDisplayPricing(opts: {
  service: DisplayService | null;
  addOns: DisplayAddOn[];
  planName: string | null | undefined;
  isVehicleSubscribed: boolean;
  promo: AppliedPromo | null;
}): DisplayPricing {
  const isServiceFree = isServiceFreeForDisplay({
    planName: opts.planName,
    isVehicleSubscribed: opts.isVehicleSubscribed,
    category: opts.service?.category,
  });
  const servicePrice = isServiceFree ? 0 : Number(opts.service?.price ?? 0);
  const addOnsTotal = opts.addOns.reduce((sum, a) => sum + Number(a.price), 0);
  const originalTotal = servicePrice + addOnsTotal;
  const saleTotal = applySale(originalTotal);

  let finalTotal = saleTotal;
  if (opts.promo) {
    finalTotal =
      opts.promo.type === "flat"
        ? Math.max(0, saleTotal - opts.promo.value)
        : saleTotal * (1 - opts.promo.value / 100);
  }

  return {
    isServiceFree,
    originalTotal: round2(originalTotal),
    saleTotal: round2(saleTotal),
    finalTotal: round2(finalTotal),
    savings: round2(originalTotal - finalTotal),
  };
}

export function computeTotalDuration(
  service: { duration: number } | null,
  addOns: { duration: number }[]
): number {
  const base = Number(service?.duration) || 0;
  return base + addOns.reduce((sum, a) => sum + Number(a.duration), 0);
}

function round2(n: number): number {
  return Number(n.toFixed(2));
}
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `npx vitest run lib/booking/pricingDisplay.test.ts`
Expected: PASS (all tests).

- [ ] **Step 6: Full suite + typecheck**

Run: `npm test` then `npx tsc --noEmit`
Expected: all tests pass (26 existing + new), tsc clean.

- [ ] **Step 7: Commit**

```bash
git add lib/booking/holidaySale.ts lib/booking/pricingDisplay.ts lib/booking/pricingDisplay.test.ts
git commit -m "feat(booking): add shared display-pricing lib mirroring server rules"
```

---

### Task 2: Pure URL-param lib (`bookingParams.ts`)

**Files:**
- Create: `lib/booking/bookingParams.ts`
- Test: `lib/booking/bookingParams.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/booking/bookingParams.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildBookingSearch, parseBookingSelection } from "./bookingParams";

describe("parseBookingSelection", () => {
  it("parses a full param set", () => {
    const sp = new URLSearchParams(
      "license_plate=ABC123&vehicle_id=v1&service=s1&addons=a1,a2&date=2026-06-15&time=9:30"
    );
    expect(parseBookingSelection(sp)).toEqual({
      licensePlate: "ABC123",
      vehicleId: "v1",
      serviceId: "s1",
      addOnIds: ["a1", "a2"],
      date: "2026-06-15",
      time: "9:30",
    });
  });

  it('scrubs literal "null"/"undefined" and empty values', () => {
    const sp = new URLSearchParams("license_plate=null&vehicle_id=undefined&addons=");
    const sel = parseBookingSelection(sp);
    expect(sel.licensePlate).toBe("");
    expect(sel.vehicleId).toBe("");
    expect(sel.addOnIds).toEqual([]);
    expect(sel.serviceId).toBeNull();
    expect(sel.date).toBeNull();
    expect(sel.time).toBeNull();
  });

  it("filters empty add-on ids from trailing commas", () => {
    const sp = new URLSearchParams("addons=a1,,a2,");
    expect(parseBookingSelection(sp).addOnIds).toEqual(["a1", "a2"]);
  });
});

describe("buildBookingSearch", () => {
  it("omits empty fields", () => {
    const search = buildBookingSearch({
      licensePlate: "",
      vehicleId: "",
      serviceId: "s1",
      addOnIds: [],
      date: null,
      time: null,
    });
    expect(search).toBe("service=s1");
  });

  it("round-trips through parse", () => {
    const sel = {
      licensePlate: "ABC123",
      vehicleId: "v1",
      serviceId: "s1",
      addOnIds: ["a1", "a2"],
      date: "2026-06-15",
      time: "9:30",
    };
    expect(parseBookingSelection(new URLSearchParams(buildBookingSearch(sel)))).toEqual(sel);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run lib/booking/bookingParams.test.ts`
Expected: FAIL — cannot find module `./bookingParams`.

- [ ] **Step 3: Implement `lib/booking/bookingParams.ts`**

```ts
// The booking flow's step state lives in the URL (service → datetime →
// confirmation pass params). These pure helpers are the only place that
// reads/writes that contract.

export interface BookingSelection {
  licensePlate: string;
  vehicleId: string;
  serviceId: string | null;
  addOnIds: string[];
  date: string | null; // YYYY-MM-DD
  time: string | null; // 24h "H:MM"
}

const clean = (v: string | null): string =>
  !v || v === "null" || v === "undefined" ? "" : v;

export function parseBookingSelection(sp: URLSearchParams): BookingSelection {
  return {
    licensePlate: clean(sp.get("license_plate")),
    vehicleId: clean(sp.get("vehicle_id")),
    serviceId: clean(sp.get("service")) || null,
    addOnIds: clean(sp.get("addons")).split(",").filter(Boolean),
    date: clean(sp.get("date")) || null,
    time: clean(sp.get("time")) || null,
  };
}

export function buildBookingSearch(sel: BookingSelection): string {
  const params = new URLSearchParams();
  if (sel.licensePlate) params.set("license_plate", sel.licensePlate);
  if (sel.vehicleId) params.set("vehicle_id", sel.vehicleId);
  if (sel.serviceId) params.set("service", sel.serviceId);
  if (sel.addOnIds.length > 0) params.set("addons", sel.addOnIds.join(","));
  if (sel.date) params.set("date", sel.date);
  if (sel.time) params.set("time", sel.time);
  return params.toString();
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run lib/booking/bookingParams.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/booking/bookingParams.ts lib/booking/bookingParams.test.ts
git commit -m "feat(booking): add shared URL-param parse/build helpers"
```

---

### Task 3: `BookingAuthContext` + `useBookingFlow`

**Files:**
- Create: `hooks/useBookingAuthContext.ts`
- Create: `hooks/useBookingFlow.ts`

No direct unit tests (no @testing-library/react in this repo; the pure logic was tested in Tasks 1–2). Verification is `tsc` here; behavioral verification happens when each step component switches over (Tasks 4–6).

- [ ] **Step 1: Check the `apiError` response shape**

Read `lib/http/apiError.ts` and note the JSON error field name (expected: `{ error: string }`). If different, adjust the `submit()` card-error handling below to match.

- [ ] **Step 2: Create `hooks/useBookingAuthContext.ts`**

```ts
"use client";

import { useAuth } from "@/context/auth-context";
import { useSubscription } from "@/hooks/useSubscription";
import { useUserVehicles, UserVehicle } from "@/hooks/useUserVehicles";
import type { Subscription } from "@/types";

export type BookingVariant = "guest" | "dashboard";

// The spec interface plus: variant (gates guest-tree-only UI like the
// subscription upsell), user email/name (the checkout payload needs them),
// and stepBasePath (the two trees mount the same steps at different URLs).
export interface BookingAuthContext {
  variant: BookingVariant;
  isAuthenticated: boolean;
  userId: string | null;
  userEmail: string | null;
  userFullName: string | null;
  subscription: Subscription | null;
  savedVehicles: UserVehicle[];
  stepBasePath: "" | "/dashboard/booking";
  successPath: "/success" | "/dashboard/bookings/success";
}

// Both route shells call this. For real guests, useAuth/useSubscription/
// useUserVehicles all no-op to null/[] — which yields the spec's
// "empty/false" guest context. A logged-in user visiting the guest URLs gets
// real auth state, preserving the old guest tree's logged-in handling.
export function useBookingAuthContext(variant: BookingVariant): BookingAuthContext {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const { vehicles } = useUserVehicles();
  const dashboard = variant === "dashboard";
  return {
    variant,
    isAuthenticated: !!user,
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
    userFullName: (user?.user_metadata?.full_name as string | undefined) ?? null,
    subscription,
    savedVehicles: dashboard ? vehicles : [],
    stepBasePath: dashboard ? "/dashboard/booking" : "",
    successPath: dashboard ? "/dashboard/bookings/success" : "/success",
  };
}
```

- [ ] **Step 3: Create `hooks/useBookingFlow.ts`**

```ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { createBooking } from "@/app/(dashboard)/dashboard/booking/action";
import { getVehicleDisplay, VehicleDisplay } from "@/app/actions/vehicle";
import {
  BookingSelection,
  buildBookingSearch,
  parseBookingSelection,
} from "@/lib/booking/bookingParams";
import {
  AppliedPromo,
  DisplayPricing,
  computeDisplayPricing,
  computeTotalDuration,
} from "@/lib/booking/pricingDisplay";
import type { BookingAuthContext } from "@/hooks/useBookingAuthContext";
import type { ServicePackage } from "@/lib/data/services";
import type { ServicePackageRow } from "@/types/db";
import type { AddOn } from "@/types";

export type BookingStep = "service" | "datetime" | "confirmation";

export interface GuestInfo {
  name: string;
  email: string;
  phone: string;
}

export function useBookingFlow(ctx: BookingAuthContext, step: BookingStep) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const selection = useMemo(
    () => parseBookingSelection(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Catalogs (service step only)
  const [services, setServices] = useState<ServicePackageRow[]>([]);
  const [allAddOns, setAllAddOns] = useState<AddOn[]>([]);

  // Selected entities (resolved from URL params on every step)
  const [service, setService] = useState<ServicePackageRow | null>(null);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [vehicleInfo, setVehicleInfo] = useState<VehicleDisplay | null>(null);
  const [isVehicleSubscribed, setIsVehicleSubscribed] = useState(false);

  // Promo (display-side; the server re-validates on submit)
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [appliedPromoId, setAppliedPromoId] = useState<number | null>(null);

  // --- Catalog fetch (service step) ---
  useEffect(() => {
    if (step !== "service") return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: pkgs, error: pkgErr }, { data: adds, error: addErr }] =
        await Promise.all([
          supabase
            .from("service_packages")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: true }),
          supabase
            .from("add_ons")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: true }),
        ]);
      if (cancelled) return;
      if (pkgErr) console.error(pkgErr);
      if (addErr) console.error(addErr);
      setServices(pkgs ?? []);
      setAllAddOns(adds ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [step, supabase]);

  // --- Selected service + add-ons (all steps; resolves URL params) ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (selection.serviceId) {
        const { data } = await supabase
          .from("service_packages")
          .select("*")
          .eq("id", selection.serviceId)
          .single();
        if (!cancelled) setService(data);
      } else {
        setService(null);
      }
      if (selection.addOnIds.length > 0) {
        const { data, error } = await supabase
          .from("add_ons")
          .select("*")
          .in("id", selection.addOnIds);
        if (error) console.error(error);
        else if (!cancelled) setAddOns(data ?? []);
      } else {
        setAddOns([]);
      }
      if (step !== "service" && !cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selection.serviceId, selection.addOnIds.join(","), step, supabase]);

  // --- Vehicle display info (confirmation step) ---
  useEffect(() => {
    if (step !== "confirmation") return;
    const { licensePlate, vehicleId } = selection;
    if (!licensePlate && !vehicleId) return;
    getVehicleDisplay({ licensePlate, vehicleId }).then(setVehicleInfo);
  }, [step, selection.licensePlate, selection.vehicleId]);

  // --- Is the selected vehicle on the active subscription? ---
  useEffect(() => {
    const plate = selection.licensePlate;
    const subId = ctx.subscription?.id;
    if (!plate || !subId) {
      setIsVehicleSubscribed(false);
      return;
    }
    supabase
      .from("subscription_vehicles")
      .select("id, vehicle:vehicles!inner(license_plate)")
      .eq("subscription_id", subId)
      .eq("vehicles.license_plate", plate)
      .maybeSingle()
      .then(({ data }) => setIsVehicleSubscribed(!!data));
  }, [selection.licensePlate, ctx.subscription?.id, supabase]);

  const planName = ctx.subscription?.subscription_plans?.name ?? null;

  const pricing: DisplayPricing = useMemo(
    () =>
      computeDisplayPricing({
        service: service
          ? { price: Number(service.price), category: service.category }
          : null,
        addOns: addOns.map((a) => ({ id: a.id, price: Number(a.price) })),
        planName,
        isVehicleSubscribed,
        promo: appliedPromo,
      }),
    [service, addOns, planName, isVehicleSubscribed, appliedPromo]
  );

  const duration = useMemo(
    () => computeTotalDuration(service, addOns),
    [service, addOns]
  );

  // --- Promo validation (display/UX only — server re-validates on submit).
  // Ported verbatim from the dashboard confirmation page. ---
  const applyPromoCode = useCallback(async () => {
    if (!promoCode) return;

    const { data, error } = await supabase
      .from("promo_codes")
      .select(
        "id, discount_type, discount_percent, discount_amount, is_active, applies_to, max_uses, used_count, restricted_to_service"
      )
      .ilike("code", promoCode.trim())
      .maybeSingle();

    if (error || !data) {
      toast.error("Invalid promo code");
      return;
    }
    if (!data.is_active) {
      toast.error("This promo code is not active");
      return;
    }
    if (data.applies_to !== "one_time" && data.applies_to !== "both") {
      toast.error("This promo code cannot be used for one-time bookings");
      return;
    }

    if (data.restricted_to_service) {
      const serviceName = (service?.name ?? "").toLowerCase();
      const serviceCategory = (service?.category ?? "").toLowerCase();
      const restriction = data.restricted_to_service.toLowerCase();
      if (!serviceName.includes(restriction) && !serviceCategory.includes(restriction)) {
        toast.error(
          `This promo code is only valid for "${data.restricted_to_service}" bookings`
        );
        return;
      }
      if (ctx.subscription) {
        toast.error("This promo code is only available for non-subscribers");
        return;
      }
    }

    if (ctx.userId) {
      const { data: existing } = await supabase
        .from("promo_code_redemptions")
        .select("id")
        .eq("promo_code_id", data.id)
        .eq("user_id", ctx.userId)
        .maybeSingle();
      if (existing) {
        toast.error("You have already used this promo code");
        return;
      }
    }

    const dtype = (data.discount_type ?? "percent") as "percent" | "flat";
    setAppliedPromoId(data.id);
    if (dtype === "flat") {
      setAppliedPromo({ type: "flat", value: Number(data.discount_amount) });
      toast.success(
        `Promo applied! $${Number(data.discount_amount).toFixed(2)} off your total`
      );
    } else {
      setAppliedPromo({ type: "percent", value: Number(data.discount_percent) });
      toast.success(`Promo applied! ${data.discount_percent}% off your total`);
    }
  }, [promoCode, service, ctx.userId, ctx.subscription, supabase]);

  const recordPromoRedemption = useCallback(
    async (guestEmail?: string) => {
      if (!appliedPromoId) return;
      await supabase.from("promo_code_redemptions").insert({
        promo_code_id: appliedPromoId,
        user_id: ctx.userId,
        customer_email: guestEmail ?? ctx.userEmail,
      });
    },
    [appliedPromoId, ctx.userId, ctx.userEmail, supabase]
  );

  // --- Navigation between steps ---
  const goToDateTime = useCallback(
    (patch: Partial<BookingSelection> = {}) => {
      router.push(
        `${ctx.stepBasePath}/datetime?${buildBookingSearch({ ...selection, ...patch })}`
      );
    },
    [router, ctx.stepBasePath, selection]
  );

  const goToConfirmation = useCallback(
    (patch: Partial<BookingSelection> = {}) => {
      router.push(
        `${ctx.stepBasePath}/confirmation?${buildBookingSearch({ ...selection, ...patch })}`
      );
    },
    [router, ctx.stepBasePath, selection]
  );

  // --- Submit. Branches on payment method; the server re-validates price
  // and payment rules regardless of what we send. ---
  const submit = useCallback(
    async (opts: {
      paymentMethod: "card" | "cash" | "subscription";
      guest?: GuestInfo;
    }) => {
      if (!service) {
        toast.error("Missing service selection. Please start over.");
        return;
      }
      setIsSubmitting(true);
      try {
        if (opts.paymentMethod === "cash" || opts.paymentMethod === "subscription") {
          const isFree = opts.paymentMethod === "subscription";
          const booking = await createBooking({
            license_plate: selection.licensePlate,
            vehicle_id: selection.vehicleId || undefined,
            servicePackage: {
              ...service,
              price: pricing.isServiceFree ? 0 : service.price,
            } as ServicePackage,
            addOnsId: isFree ? [] : addOns.map((a) => a.id),
            appointmentDate: new Date(selection.date!),
            appointmentTime: selection.time!,
            totalPrice: isFree ? 0 : pricing.finalTotal,
            totalDuration: duration,
            payment_method: opts.paymentMethod,
            promoCode,
          });
          if (!isFree) await recordPromoRedemption();
          window.location.href = `${ctx.successPath}?booking_id=${booking.id}`;
          return;
        }

        // Card → Stripe checkout
        await recordPromoRedemption(opts.guest?.email);
        const res = await fetch("/api/checkout_sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vehicleSpecs: {
              license_plate: selection.licensePlate,
              vehicle_id: selection.vehicleId,
            },
            servicePackageId: service.id,
            servicePackageName: service.name,
            servicePackagePrice: pricing.isServiceFree ? 0 : service.price,
            addOns: addOns.map((a) => ({ id: a.id, name: a.name, price: a.price })),
            appointmentDate: selection.date,
            appointmentTime: selection.time,
            totalPrice: pricing.finalTotal,
            totalDuration: duration,
            payment_method: "card",
            customerName: opts.guest?.name ?? ctx.userFullName ?? "Guest",
            customerEmail: opts.guest?.email ?? ctx.userEmail ?? "",
            customerPhone: opts.guest?.phone,
            promoCode,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.url) {
          throw new Error(data?.error ?? "Failed to create checkout session");
        }
        window.location.href = data.url;
      } catch (err) {
        console.error("Booking submit failed:", err);
        toast.error(
          err instanceof Error ? err.message : "Failed to complete booking. Please try again."
        );
        setIsSubmitting(false);
      }
    },
    [
      service,
      addOns,
      selection,
      pricing,
      duration,
      promoCode,
      ctx.successPath,
      ctx.userFullName,
      ctx.userEmail,
      recordPromoRedemption,
    ]
  );

  return {
    selection,
    loading,
    services,
    allAddOns,
    service,
    addOns,
    vehicleInfo,
    isVehicleSubscribed,
    planName,
    pricing,
    duration,
    promoCode,
    setPromoCode,
    appliedPromo,
    applyPromoCode,
    goToDateTime,
    goToConfirmation,
    isSubmitting,
    submit,
  };
}
```

Implementation notes:
- `createBooking` (a `"use server"` action) is legal to import from a client hook; Next.js wires the RPC.
- On success, `window.location.href` (not `router.push`) matches the existing pages and guarantees fresh server data on the success page. `setIsSubmitting(false)` is intentionally NOT called on success (page navigates away) but IS on error.
- `selection.addOnIds.join(",")` in the dependency array keeps the effect stable across re-parses of identical params.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. (Nothing renders these yet; tests still pass: `npm test`.)

- [ ] **Step 5: Commit**

```bash
git add hooks/useBookingAuthContext.ts hooks/useBookingFlow.ts
git commit -m "feat(booking): add BookingAuthContext and useBookingFlow shared engine"
```

---

### Task 4: `DateTimeStep` + switch both datetime shells

The two datetime pages are byte-identical except the next-route prefix and `vehicle_id` passthrough — both handled by the hook.

**Files:**
- Create: `components/booking/DateTimeStep.tsx`
- Replace contents: `app/(user)/(booking)/datetime/page.tsx`
- Replace contents: `app/(dashboard)/dashboard/booking/datetime/page.tsx`

- [ ] **Step 1: Create `components/booking/DateTimeStep.tsx`**

This is `app/(dashboard)/dashboard/booking/datetime/page.tsx` with: the page wrapper removed, supabase/param plumbing replaced by `useBookingFlow`, dead commented code dropped. Full file:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  PackageCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import LoadingDots from "@/components/loading";
import { useBookingFlow } from "@/hooks/useBookingFlow";
import type { BookingAuthContext } from "@/hooks/useBookingAuthContext";

const timeSlots = [
  "9:00", "9:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30",
];

export default function DateTimeStep({ ctx }: { ctx: BookingAuthContext }) {
  const router = useRouter();
  const { duration, goToConfirmation } = useBookingFlow(ctx, "datetime");

  const [navigating, setNavigating] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (selectedDate && bottomRef.current) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedTime && summaryRef.current && window.innerWidth < 1024) {
      setTimeout(() => {
        summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [selectedTime]);

  useEffect(() => {
    if (selectedDate) {
      setAvailableSlots(timeSlots);
    }
  }, [selectedDate]);

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const formatLocaleDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // The shop runs on America/Chicago time; compare slots in that zone.
  const getChicagoTime = () => {
    const now = new Date();
    return new Date(now.toLocaleString("en-US"));
  };

  const isToday = (date: Date) => {
    const chicagoNow = getChicagoTime();
    const chicagoDate = new Date(date.toLocaleString("en-US"));
    return (
      chicagoNow.getFullYear() === chicagoDate.getFullYear() &&
      chicagoNow.getMonth() === chicagoDate.getMonth() &&
      chicagoNow.getDate() === chicagoDate.getDate()
    );
  };

  const isPastTime = (time: string) => {
    if (!selectedDate || !isToday(selectedDate)) return false;
    const chicagoNow = getChicagoTime();
    const chicagoDate = new Date(selectedDate.toLocaleString("en-US"));
    const [hours, minutes] = time.split(":").map(Number);
    const chicagoSlot = new Date(
      chicagoDate.getFullYear(),
      chicagoDate.getMonth(),
      chicagoDate.getDate(),
      hours,
      minutes,
      0,
      0
    );
    return chicagoSlot <= chicagoNow;
  };

  const handleContinue = () => {
    if (!selectedDate || !selectedTime) return;
    setNavigating(true);
    goToConfirmation({ date: formatLocaleDate(selectedDate), time: selectedTime });
  };

  if (navigating) {
    return <LoadingDots />;
  }

  return (
    /* JSX copied verbatim from app/(dashboard)/dashboard/booking/datetime/page.tsx
       lines 256-434 ("return (" body), with two adjustments:
       1. `{calculateDuration()} min` → `{duration} min`
       2. drop the commented-out `disabled={[...]}` line inside DayPicker */
  );
}
```

When implementing, paste the JSX from `app/(dashboard)/dashboard/booking/datetime/page.tsx:256-434` verbatim and apply only the two listed adjustments. Do not restyle.

- [ ] **Step 2: Replace `app/(user)/(booking)/datetime/page.tsx` with the guest shell**

```tsx
"use client";

import { Suspense } from "react";
import LoadingDots from "@/components/loading";
import DateTimeStep from "@/components/booking/DateTimeStep";
import { useBookingAuthContext } from "@/hooks/useBookingAuthContext";

function GuestDateTimePage() {
  const ctx = useBookingAuthContext("guest");
  return <DateTimeStep ctx={ctx} />;
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingDots />}>
      <GuestDateTimePage />
    </Suspense>
  );
}
```

- [ ] **Step 3: Replace `app/(dashboard)/dashboard/booking/datetime/page.tsx` with the dashboard shell**

```tsx
"use client";

import { Suspense } from "react";
import LoadingDots from "@/components/loading";
import DateTimeStep from "@/components/booking/DateTimeStep";
import { useBookingAuthContext } from "@/hooks/useBookingAuthContext";

function DashboardDateTimePage() {
  const ctx = useBookingAuthContext("dashboard");
  return <DateTimeStep ctx={ctx} />;
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingDots />}>
      <DashboardDateTimePage />
    </Suspense>
  );
}
```

- [ ] **Step 4: Verify parity**

- Run: `npx tsc --noEmit` → clean.
- Run: `npm test` → green.
- Parity review (same params in → same options rendered → same call out): the old pages forwarded `license_plate` (+ `vehicle_id` on dashboard), `service`, `addons` and appended `date`/`time` to `(/dashboard/booking)/confirmation`. Confirm `goToConfirmation` + `buildBookingSearch` produce the same params (empty ones now omitted — D13).

- [ ] **Step 5: Commit**

```bash
git add components/booking/DateTimeStep.tsx "app/(user)/(booking)/datetime/page.tsx" "app/(dashboard)/dashboard/booking/datetime/page.tsx"
git commit -m "refactor(booking): unify datetime step into shared DateTimeStep"
```

---

### Task 5: `ServiceStep` (+ `VehiclePicker`, `AddOnList`) + switch both service shells

The dashboard service page is the superset (subscription tab gating, FREE badges); guest-only pieces (membership banner, vehicle plate input) are gated on `!ctx.isAuthenticated`.

**Files:**
- Create: `components/booking/VehiclePicker.tsx`
- Create: `components/booking/AddOnList.tsx`
- Create: `components/booking/ServiceStep.tsx`
- Replace contents: `app/(user)/(booking)/service/page.tsx`
- Replace contents: `app/(dashboard)/dashboard/booking/service/page.tsx`

- [ ] **Step 1: Create `components/booking/VehiclePicker.tsx`** (guest plate-entry card + modal)

Source: guest service page `app/(user)/(booking)/service/page.tsx` — card at lines 410-435, modal at lines 894-978. Full component:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Car, Check, X } from "lucide-react";

interface VehiclePickerProps {
  licensePlate: string;
  onChange: (plate: string) => void;
  onSaved: () => void;
}

export default function VehiclePicker({ licensePlate, onChange, onSaved }: VehiclePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-6">
      {/* Card: copy verbatim from app/(user)/(booking)/service/page.tsx:412-434,
          replacing vehicleSpecs.license_plate with the licensePlate prop, the
          showVehicleError styling branches with the non-error variants (the
          error state was already dead code — the validation that set it is
          commented out), and onClick={() => setVehicleModalOpen(true)} with
          onClick={() => setOpen(true)} */}
      {open && (
        /* Modal: copy verbatim from app/(user)/(booking)/service/page.tsx:895-977 with:
           - vehicleSpecs.year heading branch → licensePlate ? "Edit Vehicle Information" : "Add Vehicle Information"
           - Input value {vehicleSpecs.license_plate || ""} → {licensePlate}
           - Input onChange setVehicleSpecs(...) → onChange(e.target.value)
           - setVehicleModalOpen(false) → setOpen(false)
           - Save button onClick: setOpen(false); onSaved();  (keep no scroll here —
             the parent owns scrolling, see ServiceStep) */
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `components/booking/AddOnList.tsx`** (the add-ons modal)

Source: dashboard service page lines 648-828 (modal + footer totals + recommendation handled by parent). Full component:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { AddOn } from "@/types";
import type { ServicePackageRow } from "@/types/db";
import {
  HOLIDAY_SALE_ACTIVE,
  HOLIDAY_SALE_DISCOUNT,
} from "@/lib/booking/holidaySale";
import { applySale } from "@/lib/booking/pricingDisplay";

interface AddOnListProps {
  open: boolean;
  onClose: () => void;
  service: ServicePackageRow;
  addOns: AddOn[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  /** Service price for the footer; 0 when subscription-free. */
  serviceDisplayPrice: number;
  isServiceFree: boolean;
  onSkip: () => void;
  onNext: () => void;
}

export default function AddOnList({
  open, onClose, service, addOns, selectedIds, onToggle,
  serviceDisplayPrice, isServiceFree, onSkip, onNext,
}: AddOnListProps) {
  if (!open) return null;

  // Hide add-ons already included as features of the selected service
  const visibleAddOns = addOns.filter((a) => {
    const serviceFeatures = service.features ?? [];
    return !serviceFeatures.some(
      (feature) => feature.toLowerCase().trim() === a.name.toLowerCase().trim()
    );
  });

  const addOnsOriginal = selectedIds.reduce((sum, id) => {
    const addOn = addOns.find((a) => a.id === id);
    return sum + (addOn ? Number(addOn.price) : 0);
  }, 0);
  const originalTotal = serviceDisplayPrice + addOnsOriginal;
  const finalTotal = applySale(serviceDisplayPrice) + applySale(addOnsOriginal);

  return (
    /* Copy the modal JSX verbatim from
       app/(dashboard)/dashboard/booking/service/page.tsx:649-827 with:
       - selectserv → service; selectedAddOnIds → selectedIds; toggleAddOn → onToggle
       - addOns.filter(...) block → visibleAddOns (computed above)
       - setAddOnOpen(false) → onClose()
       - the footer's inline IIFE price block (lines 723-799) → use the
         precomputed values: when isServiceFree && addOnsOriginal === 0 render
         the FREE branch with ${originalTotal.toFixed(2)} struck through;
         otherwise the HOLIDAY_SALE_ACTIVE branch with originalTotal struck
         through and finalTotal bold (identical markup, just these variables)
       - skipAddOns → onSkip; goNext() → onNext() */
  );
}
```

- [ ] **Step 3: Create `components/booking/ServiceStep.tsx`**

Skeleton with all logic (JSX bodies copied from the dashboard page as marked):

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft, Car, Check, Clock, Hourglass, PackageCheck, Sparkles, X,
} from "lucide-react";
import LoadingDots from "@/components/loading";
import { useBookingFlow } from "@/hooks/useBookingFlow";
import type { BookingAuthContext } from "@/hooks/useBookingAuthContext";
import VehiclePicker from "./VehiclePicker";
import AddOnList from "./AddOnList";
import {
  HOLIDAY_SALE_ACTIVE,
  HOLIDAY_SALE_DISCOUNT,
} from "@/lib/booking/holidaySale";
import { isServiceFreeForDisplay } from "@/lib/booking/pricingDisplay";

export default function ServiceStep({ ctx }: { ctx: BookingAuthContext }) {
  const router = useRouter();
  const {
    selection, loading, services, allAddOns, isVehicleSubscribed, planName,
    goToDateTime,
  } = useBookingFlow(ctx, "service");

  const [navigating, setNavigating] = useState(false);
  const [addOnOpen, setAddOnOpen] = useState(false);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(
    selection.serviceId
  );
  const [licensePlate, setLicensePlate] = useState(selection.licensePlate);
  const [showBanner, setShowBanner] = useState(!ctx.isAuthenticated);
  const [activeTab, setActiveTab] = useState<"quick" | "express">("quick");
  const [recommendModalOpen, setRecommendModalOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Keep selection in sync when the URL changes underneath us (e.g. the
  // dashboard booking modal navigates here with params).
  useEffect(() => {
    setLicensePlate(selection.licensePlate);
    if (selection.serviceId) setSelectedService(selection.serviceId);
  }, [selection.licensePlate, selection.serviceId]);

  const selectserv = services.find((s) => s.id === selectedService);

  const isServiceFree = (category: string | null) =>
    isServiceFreeForDisplay({ planName, isVehicleSubscribed, category });

  // Tab gating: a subscribed vehicle only sees the tab its plan doesn't cover
  // hidden. (Ported from the dashboard page.)
  const lowerPlan = planName?.toLowerCase() ?? "";
  const showQuickTab =
    !isVehicleSubscribed || !planName ||
    !(lowerPlan.includes("express detail") || lowerPlan.includes("express") || lowerPlan.includes("commercial"));
  const showExpressTab =
    !isVehicleSubscribed || !planName || !lowerPlan.includes("exterior");

  const quickServices = services.filter(
    (s) => s.category?.toLowerCase() === "quick service"
  );
  const expressServices = services.filter(
    (s) => s.category?.toLowerCase() === "express detail"
  );

  // Auto-select the tab the subscription covers, or the URL-selected service's tab.
  useEffect(() => {
    if (isVehicleSubscribed && planName) {
      const lower = planName.toLowerCase();
      setActiveTab(
        lower.includes("express detail") || lower.includes("express") || lower.includes("commercial")
          ? "express"
          : "quick"
      );
      return;
    }
    if (selection.serviceId && services.length) {
      const svc = services.find((s) => s.id === selection.serviceId);
      const cat = svc?.category?.toLowerCase();
      if (cat === "express detail") setActiveTab("express");
      else if (cat === "quick service") setActiveTab("quick");
    }
  }, [isVehicleSubscribed, planName, selection.serviceId, services]);

  const handlePackageSelect = (serviceId: string) => {
    setSelectedService(serviceId);
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const handleContinue = () => {
    if (!selectserv) return;
    setAddOnOpen(true);
  };

  const isCompleteService =
    selectserv?.name.toLowerCase().includes("complete") || false;
  const shouldShowRecommendation =
    !isCompleteService && selectedAddOnIds.length >= 3;

  const toggleAddOn = (addOnId: string) => {
    setSelectedAddOnIds((prev) =>
      prev.includes(addOnId)
        ? prev.filter((id) => id !== addOnId)
        : [...prev, addOnId]
    );
  };

  const goNext = (force = false) => {
    if (!force && shouldShowRecommendation) {
      setRecommendModalOpen(true);
      return;
    }
    setNavigating(true);
    setAddOnOpen(false);
    goToDateTime({
      licensePlate,
      serviceId: selectedService,
      addOnIds: selectedAddOnIds,
    });
  };

  const skipAddOns = () => {
    setNavigating(true);
    setAddOnOpen(false);
    goToDateTime({ licensePlate, serviceId: selectedService, addOnIds: [] });
  };

  if (loading || navigating) {
    return <LoadingDots />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Holiday banner: copy from dashboard service page lines 289-297 */}

      {/* Guest membership banner: render only when !ctx.isAuthenticated &&
          showBanner — copy from guest service page lines 335-386 */}

      {/* Header: copy from dashboard service page lines 302-321 */}

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        {!ctx.isAuthenticated && (
          <VehiclePicker
            licensePlate={licensePlate}
            onChange={setLicensePlate}
            onSaved={() =>
              setTimeout(() => {
                bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 300)
            }
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[800px_1fr] gap-8">
          <div className="space-y-6">
            {/* Tabs: copy from dashboard service page lines 327-580 with:
                - shouldShowQuickTab() / shouldShowExpressTab() → showQuickTab / showExpressTab
                - isServiceFreeForSubscription(service.category || "") → isServiceFree(service.category)
                - quick-tab feature icons use the guest variant (red X for
                  features containing "no", yellow checks) from guest service
                  page lines 541-555 (D11); express tab keeps green checks
                - "commercial" tab type union dropped (no commercial TabsTrigger exists) */}

            {/* Bottom bar (selected service + price + Continue): copy from
                dashboard service page lines 585-646 with the same
                isServiceFree(...) substitution */}

            <AddOnList
              open={addOnOpen}
              onClose={() => setAddOnOpen(false)}
              service={selectserv!}
              addOns={allAddOns}
              selectedIds={selectedAddOnIds}
              onToggle={toggleAddOn}
              serviceDisplayPrice={
                selectserv && isServiceFree(selectserv.category) ? 0 : Number(selectserv?.price ?? 0)
              }
              isServiceFree={!!selectserv && isServiceFree(selectserv.category)}
              onSkip={skipAddOns}
              onNext={() => goNext()}
            />
            {/* Only render AddOnList when selectserv exists:
                {selectserv && addOnOpen && <AddOnList ... />} */}

            {/* Recommendation modal: copy from dashboard service page lines
                830-888 (identical in both trees) — its primary button selects
                the "express complete" service + setActiveTab("express"),
                secondary calls goNext(true) */}
          </div>

          {/* Booking Progress sidebar: copy from dashboard service page lines 893-917 */}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Replace both service shells** (same pattern as Task 4, with `ServiceStep`)

`app/(user)/(booking)/service/page.tsx`:

```tsx
"use client";

import { Suspense } from "react";
import LoadingDots from "@/components/loading";
import ServiceStep from "@/components/booking/ServiceStep";
import { useBookingAuthContext } from "@/hooks/useBookingAuthContext";

function GuestServicePage() {
  const ctx = useBookingAuthContext("guest");
  return <ServiceStep ctx={ctx} />;
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingDots />}>
      <GuestServicePage />
    </Suspense>
  );
}
```

`app/(dashboard)/dashboard/booking/service/page.tsx`: identical except `useBookingAuthContext("dashboard")` and the function name `DashboardServicePage`.

- [ ] **Step 5: Verify parity**

- `npx tsc --noEmit` clean; `npm test` green.
- Parity review against both old pages: guest in → vehicle card + membership banner + both tabs, no FREE badges, continue → `/datetime?license_plate=…&service=…&addons=…`. Dashboard subscriber in → tab gating + FREE badges + auto-tab, continue → `/dashboard/booking/datetime?…` including `vehicle_id` (carried through `selection` from the URL).

- [ ] **Step 6: Commit**

```bash
git add components/booking/ServiceStep.tsx components/booking/VehiclePicker.tsx components/booking/AddOnList.tsx "app/(user)/(booking)/service/page.tsx" "app/(dashboard)/dashboard/booking/service/page.tsx"
git commit -m "refactor(booking): unify service step into shared ServiceStep"
```

---

### Task 6: `ConfirmationStep` (+ `BookingSummary`, `PaymentChoice`) + switch both confirmation shells

Dashboard confirmation is the superset; guest-only pieces (guest info modal, upsell) gate on auth/variant.

**Files:**
- Create: `components/booking/BookingSummary.tsx`
- Create: `components/booking/PaymentChoice.tsx`
- Create: `components/booking/ConfirmationStep.tsx`
- Replace contents: `app/(user)/(booking)/confirmation/page.tsx`
- Replace contents: `app/(dashboard)/dashboard/booking/confirmation/page.tsx`

- [ ] **Step 1: Create `components/booking/BookingSummary.tsx`** (vehicle + appointment cards)

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Car } from "lucide-react";
import type { VehicleDisplay } from "@/app/actions/vehicle";
import type { ServicePackageRow } from "@/types/db";
import type { AddOn } from "@/types";
import type { DisplayPricing } from "@/lib/booking/pricingDisplay";
import { HOLIDAY_SALE_ACTIVE } from "@/lib/booking/holidaySale";

interface BookingSummaryProps {
  licensePlate: string;
  vehicleInfo: VehicleDisplay | null;
  service: ServicePackageRow | null;
  addOns: AddOn[];
  date: string | null;
  time: string | null;
  duration: number;
  pricing: DisplayPricing;
  promoApplied: boolean;
}

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const formattedHours = hours % 12 || 12;
  return `${formattedHours}:${minutes.toString().padStart(2, "0")} ${period}`;
};

export default function BookingSummary({
  licensePlate, vehicleInfo, service, addOns, date, time, duration, pricing, promoApplied,
}: BookingSummaryProps) {
  return (
    <>
      {/* Vehicle Details card: copy verbatim from
          app/(dashboard)/dashboard/booking/confirmation/page.tsx:572-622 with
          vehicleSpecs.license_plate → licensePlate */}

      {/* Appointment Details card: copy verbatim from
          app/(dashboard)/dashboard/booking/confirmation/page.tsx:625-716 with:
          - appointmentDate/appointmentTime → date/time props
          - selectedPackages → service; selectedAddOns → addOns
          - isServiceFree → pricing.isServiceFree
          - calculateDuration() → duration
          - the Total block: strike-through shows pricing.originalTotal when
            HOLIDAY_SALE_ACTIVE && !pricing.isServiceFree; the bold figure is
            pricing.finalTotal (promo included when promoApplied) */}
    </>
  );
}
```

- [ ] **Step 2: Create `components/booking/PaymentChoice.tsx`** (payment-method modal; cash gated)

```tsx
"use client";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Banknote, CreditCard } from "lucide-react";

interface PaymentChoiceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Only authenticated users may pay cash (server enforces this too). */
  allowCash: boolean;
  value: "card" | "cash";
  onChange: (v: "card" | "cash") => void;
  onConfirm: () => void;
}

export default function PaymentChoice({
  open, onOpenChange, allowCash, value, onChange, onConfirm,
}: PaymentChoiceProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Choose Payment Method</AlertDialogTitle>
          <AlertDialogDescription>
            Please select how you'd like to pay for your booking.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className={`grid ${allowCash ? "grid-cols-2" : "grid-cols-1"} gap-4 mt-4`}>
          {/* Card label: copy verbatim from
              app/(dashboard)/dashboard/booking/confirmation/page.tsx:863-890
              with paymentMethod → value, setPaymentMethod("card") → onChange("card") */}
          {/* Cash label: wrap in {allowCash && ( ... )} — copy verbatim from
              lines 893-920 with the same substitutions */}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction className="bg-blue-900 hover:bg-blue-800" onClick={onConfirm}>
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 3: Create `components/booking/ConfirmationStep.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, CheckCircle2, Crown, Loader2, PackageCheck,
} from "lucide-react";
import LoadingDots from "@/components/loading";
import SubscriptionUpsellDialog from "@/components/subscription-upsell-dialog";
import { useBookingFlow, GuestInfo } from "@/hooks/useBookingFlow";
import type { BookingAuthContext } from "@/hooks/useBookingAuthContext";
import BookingSummary from "./BookingSummary";
import PaymentChoice from "./PaymentChoice";
import { HOLIDAY_SALE_ACTIVE, HOLIDAY_SALE_DISCOUNT } from "@/lib/booking/holidaySale";
import { planCoversCategory } from "@/lib/booking/pricingDisplay";

const validateGuestInfo = (info: GuestInfo) => {
  const errors: Record<string, string> = {};
  if (!info.name || info.name.trim().length === 0) {
    errors.name = "Name is required";
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!info.email || !emailRegex.test(info.email)) {
    errors.email = "Invalid email address";
  }
  return errors;
};

export default function ConfirmationStep({ ctx }: { ctx: BookingAuthContext }) {
  const router = useRouter();
  const {
    selection, service, addOns, vehicleInfo, isVehicleSubscribed, planName,
    pricing, duration, promoCode, setPromoCode, appliedPromo, applyPromoCode,
    isSubmitting, submit,
  } = useBookingFlow(ctx, "confirmation");

  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash">("card");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const [upsellDismissed, setUpsellDismissed] = useState(false);
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({ name: "", email: "", phone: "" });
  const [guestErrors, setGuestErrors] = useState<Record<string, string>>({});

  const isFreeForSubscriber =
    pricing.isServiceFree && addOns.length === 0 && ctx.isAuthenticated;

  // Upsell only exists on the guest tree (D5).
  const shouldOfferUpsell =
    ctx.variant === "guest" && !ctx.subscription && !upsellDismissed;

  const handleConfirmBooking = () => {
    if (shouldOfferUpsell) {
      setShowUpsell(true);
      return;
    }
    if (isFreeForSubscriber) {
      submit({ paymentMethod: "subscription" });
      return;
    }
    if (!ctx.isAuthenticated) {
      setShowGuestModal(true);
      return;
    }
    setShowPaymentModal(true);
  };

  const handleUpsellDismiss = () => {
    setShowUpsell(false);
    setUpsellDismissed(true);
    if (isFreeForSubscriber) {
      submit({ paymentMethod: "subscription" });
    } else if (!ctx.isAuthenticated) {
      setShowGuestModal(true);
    } else {
      setShowPaymentModal(true);
    }
  };

  const handleUpsellSubscribe = (planId: string) => {
    setShowUpsell(false);
    window.location.href = `/pricing/cart?plan=${encodeURIComponent(planId)}&billing=monthly`;
  };

  const confirmPaymentChoice = () => {
    setShowPaymentModal(false);
    submit({ paymentMethod });
  };

  const submitGuest = () => {
    const errors = validateGuestInfo(guestInfo);
    if (Object.keys(errors).length > 0) {
      setGuestErrors(errors);
      return;
    }
    setGuestErrors({});
    setShowGuestModal(false);
    submit({ paymentMethod: "card", guest: guestInfo });
  };

  // Subscription status helpers for the info banners (dashboard page parity)
  const subscribedLabel = planName
    ? planCoversCategory(planName, "quick service")
      ? "Quick Service"
      : planName.toLowerCase().includes("commercial")
        ? "Commercial Wash"
        : "Express Detail"
    : "";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header: copy verbatim from
          app/(dashboard)/dashboard/booking/confirmation/page.tsx:550-567 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <BookingSummary
              licensePlate={selection.licensePlate}
              vehicleInfo={vehicleInfo}
              service={service}
              addOns={addOns}
              date={selection.date}
              time={selection.time}
              duration={duration}
              pricing={pricing}
              promoApplied={!!appliedPromo}
            />

            {/* Holiday sale banner: copy from dashboard confirmation lines
                720-730 with the saved amount = pricing.savings (only render
                when HOLIDAY_SALE_ACTIVE) */}

            {/* Subscription status banners: copy from dashboard confirmation
                lines 734-773 replacing the IIFE with:
                - pricing.isServiceFree branch (uses subscribedLabel)
                - else ctx.subscription && isVehicleSubscribed branch
                - else ctx.subscription && !isVehicleSubscribed branch */}

            {appliedPromo && (
              <p className="text-green-600 text-sm mt-2">
                Promo applied:{" "}
                {appliedPromo.type === "flat"
                  ? `$${appliedPromo.value.toFixed(2)} off`
                  : `${appliedPromo.value}% off`}{" "}
                — New Total: ${pricing.finalTotal.toFixed(2)}
              </p>
            )}
            {isFreeForSubscriber && (
              <p className="text-sm text-gray-500 mt-1">
                Promo codes are not applicable — your wash is free under your
                subscription.
              </p>
            )}

            {/* Promo input + confirm button row: copy verbatim from dashboard
                confirmation lines 789-824 with validatePromoCode →
                applyPromoCode and the button label logic unchanged */}
          </div>

          {/* Booking Progress sidebar: copy verbatim from dashboard
              confirmation lines 826-850 */}
        </div>
      </div>

      <PaymentChoice
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        allowCash={ctx.isAuthenticated}
        value={paymentMethod}
        onChange={setPaymentMethod}
        onConfirm={confirmPaymentChoice}
      />

      {ctx.variant === "guest" && (
        <SubscriptionUpsellDialog
          open={showUpsell}
          bookingTotal={pricing.finalTotal}
          onDismiss={handleUpsellDismiss}
          onSubscribe={handleUpsellSubscribe}
        />
      )}

      {/* Guest info modal: copy verbatim from
          app/(user)/(booking)/confirmation/page.tsx:511-598 with the final
          button onClick body → submitGuest() */}
    </div>
  );
}
```

Note: the guest tree's old behavior of skipping the payment modal entirely (card-only, straight to guest modal or checkout) is preserved for real guests via `!ctx.isAuthenticated → setShowGuestModal`. Logged-in users on either URL get the payment modal (D6).

- [ ] **Step 4: Replace both confirmation shells** (same shell pattern as Tasks 4–5, with `ConfirmationStep` and variants `"guest"` / `"dashboard"`).

- [ ] **Step 5: Verify parity**

- `npx tsc --noEmit` clean; `npm test` green.
- Parity review of the three paths:
  1. **Guest card**: confirm → (upsell once) → guest modal → `POST /api/checkout_sessions` with `servicePackageId`, add-ons, date/time, guest fields, promoCode → redirect to Stripe `url`. Matches old guest page payload (plus `servicePackageId`, which the route reads first and previously fell back to `spid`).
  2. **Logged-in cash**: confirm → payment modal → cash → `createBooking(payment_method: "cash")` → `/dashboard/bookings/success?booking_id=…`.
  3. **Subscriber free** (covered category, vehicle on sub, no add-ons): confirm → `createBooking(payment_method: "subscription", totalPrice: 0, addOnsId: [])` → success.

- [ ] **Step 6: Commit**

```bash
git add components/booking/ConfirmationStep.tsx components/booking/BookingSummary.tsx components/booking/PaymentChoice.tsx "app/(user)/(booking)/confirmation/page.tsx" "app/(dashboard)/dashboard/booking/confirmation/page.tsx"
git commit -m "refactor(booking): unify confirmation step into shared ConfirmationStep"
```

---

### Task 7: Cleanup + final verification

- [ ] **Step 1: Hunt dead code**

The six page files were replaced in place, so there are no files to delete; verify nothing else references removed internals:

Run: `grep -rn "HOLIDAY_SALE" app components hooks --include=*.tsx --include=*.ts | grep -v lib/booking`
Expected: only imports from `@/lib/booking/holidaySale` (other pages outside the booking flow that define their own copy — e.g. landing/pricing pages — are out of scope; leave them).

Run: `grep -rn "zod/v4/locales" app components`
Expected: no matches.

- [ ] **Step 2: Full verification**

Run: `npx tsc --noEmit` → clean.
Run: `npm test` → all green (26 pre-existing + new lib tests).
Run: `npm run build` → compiles (catches route-group/client-boundary issues tsc can miss).

- [ ] **Step 3: Line-count sanity check (success criterion: thin shells)**

Run: `wc -l "app/(user)/(booking)/service/page.tsx" "app/(user)/(booking)/datetime/page.tsx" "app/(user)/(booking)/confirmation/page.tsx" "app/(dashboard)/dashboard/booking/service/page.tsx" "app/(dashboard)/dashboard/booking/datetime/page.tsx" "app/(dashboard)/dashboard/booking/confirmation/page.tsx"`
Expected: every file ≲ 25 lines.

- [ ] **Step 4: Commit any cleanup, then report**

```bash
git add -u
git commit -m "chore(booking): post-unification cleanup"
```

Final report to the owner must include the **FLAG**ged drift items (D1, D3, D4, D6, D11) and this manual walkthrough checklist (cannot be automated here — no E2E framework, per spec):

1. Guest card booking: `/service` → pick package + add-ons → `/datetime` → `/confirmation` → guest info → Stripe checkout page loads with correct line items.
2. Logged-in cash booking: dashboard booking modal → service → datetime → confirmation → cash → success page shows booking.
3. Subscriber free booking: subscribed vehicle + covered category → FREE badges on service step → confirmation books directly without payment modal.

---

## Self-review (done at planning time)

- **Spec coverage:** shared hook ✔ (Task 3), pricingDisplay ✔ (Task 1), three step components + 4 sub-pieces ✔ (Tasks 4–6), thin shells ✔ (Tasks 4–6), incremental order datetime→service→confirmation matches spec's "smallest first" ✔ (spec lists hook+pricing first, then DateTime — same order), delete dead duplication ✔ (in-place replacement + Task 7), tests ✔ (Tasks 1–2; server pricing already tested), drift flagged not guessed ✔ (drift table).
- **Deviation from spec text:** spec's step 4 calls ConfirmationStep "the superset gated by ctx" — implemented; spec's `BookingAuthContext` gained `variant`/`userEmail`/`userFullName`/`stepBasePath` (justified in Task 3 comment).
- **Type consistency:** `BookingSelection` (Task 2) is what `useBookingFlow.selection` exposes and what `goToDateTime`/`goToConfirmation` patch; `DisplayPricing` flows hook → BookingSummary; `GuestInfo` flows ConfirmationStep → `submit`. `ServicePackageRow` from `@/types/db` used consistently for service rows; `AddOn` from `@/types`.
