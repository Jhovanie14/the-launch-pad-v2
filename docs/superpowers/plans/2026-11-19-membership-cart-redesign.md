# Membership Cart Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The membership cart is in the 24/7 Bay look in both places it appears, every number and sentence matches what Stripe charges, and after sign-in the cart asks for a fresh agreement instead of a broken auto-checkout.

**Architecture:**
- Two pure `lib/` functions carry the logic:
  - `membershipCartQuote` produces every price and period word, using the server's own cent math.
  - `restorePendingCart` reads the sign-in hand-off.
- `SubscriptionCart` is redrawn on the booking pieces from PR #27 (`StepLayout`, `BookingSheet`, `focus.ts`, `LicensePlate`).
- The guest `/pricing/cart` page moves into the `(booking-flow)` frame, and `BookingHeader` shows step progress only on the booking steps.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4 semantic tokens, Radix dialog (through `BookingSheet`), Vitest (`lib/**/*.test.ts`).

**Spec:** `docs/superpowers/specs/2026-11-19-membership-cart-redesign-design.md`

## Global Constraints

- Branch `feat/membership-cart-redesign`, stacked on `feat/booking-redesign` (PR #27).
- No change to `/api/create-checkout-session`, `lib/subscriptions/membershipCheckout.ts`, `lib/pricing/flockPricing.ts` or `lib/pricing/firstSubscriptionPromo.ts`.
- `TermsModal` and `AuthPromptModal` keep their look.
- Tokens only. No `gray-*`, `slate-*`, `blue-*`, `amber-*`, `yellow-*`, `green-*`, `red-*`, `sky-*` or `orange-*` classes in files this plan touches. One flame-filled button per viewport. 44px targets. Animations behind `motion-safe:` or with `motion-reduce:animate-none` on non-data-state classes.
- No Monthly / Yearly switch. Billing comes from the URL `billing` param, defaulting to monthly.
- Copy: sentence case, no exclamation marks, no emoji. The weather notice text stays verbatim.
- CRLF: edit existing files with the Edit tool. For new files, after `Write` run `node -e "const f=process.argv[1],fs=require('fs');fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace(/\r?\n/g,'\r\n'))" <file>`.
- Read-only GETs against the user's dev server on `http://localhost:3000`. Never start a checkout. No Co-Authored-By trailer.

## Review Focus

1. **Yearly billing.** Every period word says "year"/"/yr", never "month"/"/mo". Pinned in Task 1.
2. **A returning member** (or the offer disabled). There is no offer row, one total, and the agreement has no "first period" clause. Pinned in Task 1 (`offerCents === 0`, `firstCents === renewalCents`). Task 4 renders from `hasOffer`.
3. **Commercial plan.** Extras are billed at full price, there is no "35% off" anywhere, and the commercial note is hidden. Pinned in Task 1 (`discountPercent === 0`), and Task 4 uses `quote.isCommercial` for the note.
4. **Storage restore edge cases** (corrupt JSON, more than 5 plates, old entries carrying `isAuthorized`/`autoCheckout`). The cart restores plates only, never the tick, and never starts checkout. Pinned in Task 2.
5. **Guest taps the button.** The plates are saved and the sign-in prompt opens. Nothing is sent to Stripe as a guest. This is checked in Task 4 step 2 against the code path. The button reads "Sign in to continue" for guests.

---

### Task 1: `membershipCartQuote`, every number the cart shows

**Files:**
- Create: `lib/subscriptions/membershipCartQuote.ts`
- Test: `lib/subscriptions/membershipCartQuote.test.ts`

**Interfaces:**
- Produces:

```ts
export interface CartQuote {
  period: "month" | "year";
  periodShort: "/mo" | "/yr";
  isCommercial: boolean;
  discountPercent: number;          // flockDiscountPercent(plan): 35 or 0
  cars: { cents: number; primary: boolean }[];  // car 1 = base; extras = flockUnitAmountCents(base, plan)
  extraCarSavingCents: number;      // base − one extra car, 0 on commercial
  offerPercent: number;             // FIRST_SUBSCRIPTION_PROMO.percent when it applies, else 0
  offerCents: number;               // firstPeriodDiscountCents({ hadMembershipBefore: !offerEligible, promo: FIRST_SUBSCRIPTION_PROMO, primaryCarCents: base })
  hasOffer: boolean;                // offerCents > 0
  firstCents: number;               // Σ cars − offerCents
  renewalCents: number;             // Σ cars
}
export function membershipCartQuote(input: {
  plan: { name?: string | null; is_commercial?: boolean | null; monthly_price: number | string; yearly_price: number | string };
  billing: "monthly" | "yearly";
  carCount: number;                 // clamped to 1..MAX_VEHICLES_PER_SUBSCRIPTION
  offerEligible: boolean;           // FIRST_SUBSCRIPTION_PROMO.enabled is applied inside via firstPeriodDiscountCents
}): CartQuote
export const formatCents: (cents: number) => string  // "$92.98"
```

The base is `Math.round(Number(price) * 100)`.

- [ ] **Step 1: Write the failing tests.** Use a plan `{ name: "Express Detail", is_commercial: false, monthly_price: 59.99, yearly_price: 647.89 }`.
  - `"monthly, 2 cars, first membership → $92.98 first month, then $98.98"`: cars `[5999, 3899]`, `offerCents 600`, `firstCents 9298`, `renewalCents 9898`, `period "month"`, `periodShort "/mo"`, `discountPercent 35`, `extraCarSavingCents 2100`.
  - `"yearly uses the yearly price and year words"`: 1 car gives `cars [64789]`, `offerCents 6479`, `period "year"`, `periodShort "/yr"`.
  - `"returning member → no offer, one total"`: `offerEligible false` gives `offerCents 0`, `hasOffer false`, `firstCents === renewalCents`.
  - `"commercial plan → extras at full price, no discount"`: `is_commercial true` and 3 cars give `cars` all equal to the base, `discountPercent 0`, `extraCarSavingCents 0`, `isCommercial true`.
  - `"commercial by name when the column is null"`: `name: "Commercial Wash"`, `is_commercial: null` gives `isCommercial true`.
  - `"car count is clamped to 1..5"`: 0 gives 1 car, and 9 gives 5 cars.
  - `"formatCents"`: 9298 gives `"$92.98"`, and 600 gives `"$6.00"`.
- [ ] **Step 2: Run, expect FAIL** with `npx vitest run lib/subscriptions/membershipCartQuote.test.ts`.
- [ ] **Step 3: Implement** with `flockUnitAmountCents`, `flockDiscountPercent`, `isCommercialPlan`, `MAX_VEHICLES_PER_SUBSCRIPTION` (flockPricing), `firstPeriodDiscountCents` (membershipCheckout) and `FIRST_SUBSCRIPTION_PROMO`.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `feat(membership): cart quote with the server's own cent math`

---

### Task 2: `restorePendingCart`, the sign-in hand-off

**Files:**
- Create: `lib/subscriptions/pendingCart.ts`
- Test: `lib/subscriptions/pendingCart.test.ts`

**Interfaces:**
- Produces:
  - `export const PENDING_CART_KEY = "pendingSubscriptionCart"`
  - `export function pendingCartPayload(plates: string[], planId: string | null, billing: "monthly" | "yearly"): string`. This is the JSON the guest page stores: `{ vehicles: [{ license_plate }], planId, billingCycle }`, with no `isAuthorized` and no `autoCheckout`.
  - `export function restorePendingCart(raw: string | null): { plates: string[] } | null`. It returns the plates (trimmed, at most `MAX_VEHICLES_PER_SUBSCRIPTION`), or `null` for missing, corrupt or empty input. Other fields are ignored.

- [ ] **Step 1: Write the failing tests.**
  - `"round trip keeps the plates"`
  - `"old entries with isAuthorized and autoCheckout restore plates only"`: the result equals `{ plates: [...] }` exactly.
  - `"corrupt JSON → null"`
  - `"no vehicles → null"`
  - `"more than 5 plates are cut to 5"`
  - `"payload never contains isAuthorized or autoCheckout"`
- [ ] **Step 2: Run, expect FAIL** with `npx vitest run lib/subscriptions/pendingCart.test.ts`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `feat(membership): restore plates after sign-in, never the agreement`

---

### Task 3: Guest cart in the booking frame, plus the multi-vehicle sheet

**Files:**
- Move (`git mv`): `app/(user)/pricing/cart/page.tsx` → `app/(booking-flow)/pricing/cart/GuestCart.tsx`. It stays a `"use client"` component, exported as `GuestCart`.
- Create: `app/(booking-flow)/pricing/cart/page.tsx`, a server page with `export const metadata = { title: "Join a membership", robots: { index: false, follow: false } }` that renders `<Suspense fallback={null}><GuestCart /></Suspense>`.
- Modify: `components/booking/BookingHeader.tsx` (progress only on `/service`, `/datetime` and `/confirmation`); `components/subscription/MultiVehicleBenefitsDialog.tsx`.

**Interfaces:**
- Produces: `MultiVehicleBenefitsDialog` keeps its props (`isOpen`, `onClose`, `familyDiscountPercent`). It renders a `BookingSheet` titled "Multi-vehicle benefits", with the same five points, each icon in a 32px Canvas circle with a Line ring, and one quiet "Close" button (`GHOST_BUTTON`), with no flame.

- [ ] **Step 1: Move the page, add the server wrapper, change the header and restyle the sheet.**
  - `GuestCart` drops its old `<main>` container, because the frame provides one.
  - When it stores the pending cart it uses `pendingCartPayload` (Task 2). `SubscriptionCart` will call `onRequireAuth(plates)` (Task 4), so the signature becomes `onRequireAuth?: (plates: string[]) => void`.
  - Delete `.next/types` and `.next/dev/types` after the move.
- [ ] **Step 2: Run** `npx tsc --noEmit -p .` and the palette grep over the touched files. Expect no output and no matches.
- [ ] **Step 3: Probe** `GET http://localhost:3000/pricing/cart?plan=<express detail id>&billing=monthly`. Expect 200, "Back to site" present, and none of "1 Service" or "Book Online". Probe `/service` too: "1 Service" is still present.
- [ ] **Step 4: Commit** `feat(membership): guest cart in the navy booking frame`

---

### Task 4: The cart itself

**Files:**
- Modify: `components/subscription/SubscriptionCart.tsx` (a rewrite of its render, and of the restore and checkout trigger). Optionally split it into `components/subscription/cart/{PlanCard,CarsCard,CartSummary}.tsx`.

**Interfaces:**
- Consumes: `membershipCartQuote`, `formatCents`, `CartQuote` (Task 1); `restorePendingCart`, `PENDING_CART_KEY` (Task 2); `StepLayout`, `BookingSheet`, `FLAME_BUTTON`, `SURFACE`, `FOCUS_ON_LIGHT` (booking ui); `LicensePlate`; `MultiVehicleBenefitsDialog` (Task 3).
- Produces: `SubscriptionCart({ planId?, billingCycle?, onRequireAuth? }: { planId?: string | null; billingCycle?: "monthly" | "yearly" | null; onRequireAuth?: (plates: string[]) => void })`. The `auto` prop is removed.

- [ ] **Step 1: Rewrite per the spec's "Page structure", "After sign-in" and "Loading" sections.**
  - **Numbers:** compute `quote = membershipCartQuote({ plan, billing, carCount, offerEligible: !hadMembership })`. Every price and period word on the page comes from `quote`.
  - **Restore:** on mount with a user, `restorePendingCart(localStorage.getItem(PENDING_CART_KEY))` sets the plates and car count, then removes the key. It never sets the tick and never starts checkout.
  - **Guests:** the flame reads "Sign in to continue" and calls `onRequireAuth(plates)` without requiring the tick, because the tick is asked for again after sign-in.
  - **Signed-in customers:** the flame reads "Continue to payment" and keeps today's checks and messages: the tick is required, plates are required, and the server error shows in an inline `role="alert"`.
  - **Action panel:** the title is `${formatCents(firstCents)} first ${period}` when `hasOffer`, otherwise `${formatCents(renewalCents)} a ${period}`. The detail is `then ${formatCents(renewalCents)} a ${period}` only when `hasOffer`.
  - **Agreement copy:** exactly as in the spec, with these numbers.
  - **Commercial note:** shown when `!quote.isCommercial`.
  - **Back link:** `/pricing` when `onRequireAuth` is set (guest page), otherwise `/dashboard/pricing`.
  - **Unknown plan:** when the plan lookup returns nothing for a `planId`, show the Night error card "We couldn't find that plan." with a quiet "Back to plans".
- [ ] **Step 2: Code-path checks.**
  - `rg -n "autoCheckout|setTimeout\(\(\) => \{\s*startCheckout|auto\b" components/subscription/SubscriptionCart.tsx` finds no auto-checkout.
  - The guest path calls only `onRequireAuth`, never `fetch("/api/create-checkout-session")`.
  - `startCheckout` reads current state, with no stale closure from a timer.
- [ ] **Step 3: Static checks.** Run `npx tsc --noEmit -p .`, `npx eslint components/subscription "app/(booking-flow)"` and the palette grep over `components/subscription` and `app/(booking-flow)/pricing`. Expect no tsc output, 0 errors and no matches.
- [ ] **Step 4: Probe** `/pricing/cart?plan=<id>&billing=monthly` and `/dashboard/pricing/subscription?plan=<id>&billing=yearly`. The first returns 200 with no "Promo Code Auto-Applied". The dashboard one, when signed out, redirects as before.
- [ ] **Step 5: Commit** `feat(membership): membership cart in the 24/7 Bay look, with true prices`

---

### Task 5: DESIGN.md, full checks, PR

**Files:**
- Modify: `DESIGN.md`. Under Layout, in "Booking flow", add that `/pricing/cart` uses the same frame without step progress. Under Components, add a short "Membership Cart" entry: the plan card in the Member Pass style, the cars card with the 1 to 5 picker, and a summary whose numbers come from `membershipCartQuote`.

- [ ] **Step 1: Edit `DESIGN.md`.**
- [ ] **Step 2: Full checks.** Run `npx vitest run`, `npx tsc --noEmit -p .` and `npx eslint lib app components`. Expect all tests to pass, no tsc output, and 0 errors with no new warnings.
- [ ] **Step 3: Commit** `docs(design): membership cart`, then push and open the PR against `feat/booking-redesign`, retargeted to `main` once #27 merges. The body lists the preview checks:
  - **Guest:** `/pricing/cart` monthly and yearly.
  - **Sign-in hand-off:** after sign-in, the plates are restored, the tick is cleared and there is no error.
  - **Returning member:** no offer line.
  - **Commercial plan:** no 35% anywhere.
  - **Layout:** the phone bottom bar and the desktop side column.
