# Booking Flow Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The three booking steps, the guest booking frame and every booking dialog follow `DESIGN.md` ("The 24/7 Bay"), and every claim the pop-ups make is true.

**Architecture:** Two pure `lib/` rules (welcome offer, bundle suggestion) are tested first, and the welcome offer joins the server-loaded step data. A small set of shared booking UI pieces (`BookingSheet`, `StepProgress`, `StepLayout` with its responsive action panel) carries the look. Each step and dialog is then restyled onto them without touching pricing, payment or booking logic. The guest step routes move to their own route group with a navy booking header; URLs stay the same.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4 semantic tokens from `app/globals.css`, shadcn/Radix (`components/ui/dialog.tsx`), lucide-react, react-day-picker, Vitest (`lib/**/*.test.ts` only).

**Spec:** `docs/superpowers/specs/2026-11-19-booking-flow-redesign-design.md` (read it; this plan does not repeat its copy or visual decisions).

## Global Constraints

- Semantic token utilities only (`bg-night`, `bg-dusk`, `bg-canvas`, `bg-paper`, `bg-flame`, `hover:bg-flame-bright`, `text-on-flame`, `text-on-night-muted`, `text-on-night-subtle`, `text-ink`, `text-ink-muted`, `text-ink-subtle`, `ring-line`, `border-line-soft`, `text-brand-blue`, `text-svc-member`, `text-svc-detail-mark`, `outline-flame`, `outline-brand-blue`). No `gray-*`, `slate-*`, `blue-*`, `amber-*`, `yellow-*`, `violet-*`, `green-*`, `red-*` classes in any file this plan touches.
- Exactly one flame-filled control per viewport. When a sheet is open, its flame button is the only one in the sheet.
- 44px minimum targets (calendar days 40px). Focus: 2px Flame outline on navy, 2px Brand Blue outline with 2px offset on white.
- Reduced motion: every entrance or pulse has `motion-reduce:animate-none` / `motion-reduce:transition-none`.
- Display type is Geist 900 with `tracking-[-0.025em]`. Geist Mono only through `LicensePlate` (`components/dashboard-home/license-plate.tsx`).
- No change to `lib/pricing/*`, `createBooking`, `checkPromoCode`, `/api/checkout_sessions`, `lib/booking/bookingParams.ts`, `computeDisplayPricing`, `isServiceFreeForDisplay`, the `ready` gate or `isFreeForSubscriber`.
- Copy: sentence case, no exclamation marks, no emoji, product terms (Self-service, Express detailing, Membership, Primary vehicle).
- CRLF files: edit with the Edit tool; for new files, after `Write` run `node -e "const f=process.argv[1],fs=require('fs');fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace(/\r?\n/g,'\r\n'))" <file>`.
- Local env is live Supabase/Stripe: read-only GETs only, never submit a booking or checkout locally.
- No Co-Authored-By trailer on commits.

## Review Focus

1. **A member's covered car with add-ons.** Today's behaviour must hold: the service is free, add-ons are paid, the promo field works, and the button reads "Proceed to payment". It must not be "Confirm booking" with $0. This is checked in Task 7 step 2 by diffing that `isFreeForSubscriber`, `pricing` and the button-label expression are unchanged.
2. **`WELCOME10` turned into a flat code, restricted to a service, deactivated or maxed out.** The account pop-up must drop the promo line, never show "NaN%" or a wrong percent. Pinned in Task 1.
3. **Bundle suggestion edge cases.** A covered member, a customer who already chose Express Complete, a missing package, or a total equal to the package price must get no suggestion. Pinned in Task 2.
4. **Moving the guest routes.** `/service`, `/datetime` and `/confirmation` must still answer 200 with the booking header and without the marketing navbar. `/success` must keep the marketing layout. Probed in Task 4 step 4.
5. **A signed-in customer on the guest URLs.** They get the guest booking header, their membership pricing (server data, unchanged) and a read-only car card. Checked in Task 5 step 2.

---

### Task 1: Welcome offer rule

**Files:**
- Create: `lib/booking/welcomeOffer.ts`
- Test: `lib/booking/welcomeOffer.test.ts`

**Interfaces:**
- Produces:
  - `export const WELCOME_CODE = "WELCOME10"`
  - `export interface WelcomeOffer { code: string; percent: number }`
  - `export function welcomeOfferFromPromo(promo: { code: string; is_active: boolean | null; applies_to: string | null; discount_type: string | null; discount_percent: number | null; max_uses: number | null; used_count: number | null; restricted_to_service: string | null } | null, redemptions: number): WelcomeOffer | null`. It mirrors `validatePromo`'s acceptance rules (`promoAppliesToOneTime` from `lib/pricing/promoRules.ts`, uses = `max(used_count, redemptions)`), requires `discount_type === "percent"`, a percent in (0, 100], and no `restricted_to_service`. `expires_at` is deliberately ignored, because checkout ignores it.
  - `export async function loadWelcomeOffer(admin: SupabaseClient): Promise<WelcomeOffer | null>`. It selects the code with `ilike("code", WELCOME_CODE)`, counts `promo_code_redemptions` only when `max_uses` is set, and returns `null` on any error.

- [ ] **Step 1: Write the failing tests** (`describe("welcomeOfferFromPromo")`). Use a base `{ code: "WELCOME10", is_active: true, applies_to: "one_time", discount_type: "percent", discount_percent: 10, max_uses: null, used_count: 0, restricted_to_service: null }`.
  - `"live percent code → { code: 'WELCOME10', percent: 10 }"`
  - `"inactive → null"`
  - `"flat code → null"`
  - `"service-restricted → null"`
  - `"applies only to subscriptions → null"`: `applies_to: "subscription"`
  - `"max_uses reached by redemption rows → null"`: `max_uses: 5`, `used_count: 0`, `redemptions: 5`
  - `"under max_uses → offer"`: `max_uses: 5`, `redemptions: 4`
  - `"missing promo → null"`
  - `"percent 0 or null → null"`

- [ ] **Step 2: Run, expect FAIL** with `npx vitest run lib/booking/welcomeOffer.test.ts` (cannot find module).
- [ ] **Step 3: Implement both functions.**
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `feat(booking): welcome offer follows checkout's promo rules`

---

### Task 2: Bundle suggestion rule

**Files:**
- Create: `lib/booking/bundleSuggestion.ts`
- Test: `lib/booking/bundleSuggestion.test.ts`

**Interfaces:**
- Consumes: `applySale` from `lib/booking/pricingDisplay.ts`.
- Produces: `export function bundleSuggestion(opts: { chosen: { id: string; price: number }; addOns: { price: number }[]; catalog: { id: string; name: string; price: number; features: string[] | null }[]; isServiceFree: boolean }): { pkg: { id: string; name: string; features: string[] }; currentTotal: number; packageTotal: number } | null`
  - The package is the first catalog entry whose `name.toLowerCase().trim()` includes `"express complete"`.
  - `currentTotal = applySale(chosen.price + Σ addOns)` and `packageTotal = applySale(pkg.price)`, each rounded to cents.
  - It returns a suggestion only when `!isServiceFree`, a package exists, `chosen.id !== pkg.id`, and `currentTotal > packageTotal`.

- [ ] **Step 1: Write the failing tests**, using a catalog with Classic Complete ($45), Express Complete Detail ($65, features `["Express Exterior","Express Interior"]`) and Quick Exterior Wash ($25).
  - `"Classic Complete + $30 of extras → suggests Express Complete, totals with the sale"`: `currentTotal === applySale(75)` rounded and `packageTotal === applySale(65)` rounded.
  - `"total below the package → null"`: Quick Exterior plus $10.
  - `"total equal to the package → null"`: Classic plus $20.
  - `"already chose Express Complete → null"`
  - `"member's covered service → null"`: `isServiceFree: true`.
  - `"no Express Complete in the catalog → null"`
  - `"features null → []"`

- [ ] **Step 2: Run, expect FAIL** with `npx vitest run lib/booking/bundleSuggestion.test.ts`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `feat(booking): bundle suggestion only when the package really costs less`

---

### Task 3: Welcome offer in the server step data

**Files:**
- Modify: `lib/booking/loadBookingStep.ts`, `lib/booking/loadBookingStep.test.ts`, `lib/booking/bookingStepRequest.ts`

**Interfaces:**
- Consumes: `WelcomeOffer`, `loadWelcomeOffer` (Task 1).
- Produces:
  - `BookingInitialData` gains `welcomeOffer: WelcomeOffer | null`.
  - `loadBookingStep` args gain `getWelcomeOffer: () => Promise<WelcomeOffer | null>`. It is called only on the `"service"` step when `user === null` (a real guest). Otherwise it isn't called and the result is `null`. A rejection gives `null`.
  - `getBookingStepData` passes `() => loadWelcomeOffer(createAdminClient())`.

- [ ] **Step 1: Add the failing tests** to `loadBookingStep.test.ts`. `deps()` gains `getWelcomeOffer: vi.fn(async () => ({ code: "WELCOME10", percent: 10 }))`.
  - `"guest on the service step gets the welcome offer"`
  - `"signed-in customer: no welcome offer lookup"`: not called, `null`.
  - `"guest on confirmation: no welcome offer lookup"`
  - `"welcome offer lookup fails → null, page still loads"`
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.** Run it inside the existing `Promise.all`.
- [ ] **Step 4: Run** `npx vitest run` and `npx tsc --noEmit -p .`. Expect all pass and no tsc output.
- [ ] **Step 5: Commit** `feat(booking): service step loads the welcome offer for guests`

---

### Task 4: Shared booking UI and the guest frame

**Files:**
- Create: `components/booking/ui/BookingSheet.tsx`, `components/booking/ui/StepProgress.tsx`, `components/booking/ui/StepLayout.tsx`, `components/booking/BookingHeader.tsx`
- Create: `app/(booking-flow)/layout.tsx`
- Move (git mv): `app/(user)/(booking)/{service,datetime,confirmation}/` → `app/(booking-flow)/{service,datetime,confirmation}/`. `app/(user)/(booking)/success` and `app/(user)/(booking)/layout.tsx` stay.

**Interfaces:**
- Produces:
  - `BookingSheet({ open, onOpenChange, title, description?, children, footer }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; children: React.ReactNode; footer: React.ReactNode })`.
    - Built on `components/ui/dialog.tsx`. On phones (below 640px) it is anchored to the bottom, full width, with 16px top corners, a grab handle and a slide-up entrance.
    - From `sm` it is a centred card, `max-w-md`, with 16px corners.
    - It has a 44px close button, a Night/60 overlay, `motion-reduce:animate-none`, and a 900-weight title. `footer` holds the buttons.
  - `StepProgress({ current, tone }: { current: 1 | 2 | 3; tone: "night" | "canvas" })`: three 5px bars plus the labels "1 Service", "2 Date and time", "3 Confirm". The current step gets `aria-current="step"`, and the whole thing is an ordered list for screen readers.
  - `StepLayout({ back, title, children, action }: { back?: { label: string; href?: string; onClick?: () => void }; title: string; children: React.ReactNode; action: { summaryTitle: string; summaryDetail?: string; button: React.ReactNode } })`.
    - The content column comes first. At `lg` it becomes a grid of `minmax(0,1fr)` plus `20rem`.
    - The action panel is fixed to the bottom on phones (Night, safe-area inset, page bottom padding so content clears it). At `lg` it is a sticky white surface at `top-24` in the side column.
    - `button` is the step's one flame button.
  - `BookingHeader()`: Night bar with Bar shade, the logo plus wordmark linking to `/`, a quiet outlined "Back to site" linking to `/`, and `StepProgress tone="night"`. It derives `current` from `usePathname()` (`/service` gives 1, `/datetime` 2, `/confirmation` 3).
  - `app/(booking-flow)/layout.tsx`:
    - `metadata` is copied from `app/(user)/(booking)/layout.tsx`.
    - The `<div className="lp-theme min-h-screen bg-canvas text-ink">` wrapper holds `BookingHeader`, a `<main id="main">` capped at `max-w-7xl` with the dashboard gutters, and `<Toaster richColors position="top-right" />`.
    - It keeps `ProductCartProvider` only if a booking component uses its context (check with grep; drop it if nothing does).

- [ ] **Step 1: Write the four components and the layout. Move the three route folders.** Delete `.next/types` and `.next/dev/types` after the move (`HANDOFF.md` gotcha).
- [ ] **Step 2: Static checks.** Run `npx tsc --noEmit -p .`, then `npx eslint components/booking app/(booking-flow)`. Expect no tsc output and 0 errors.
- [ ] **Step 3: Grep for raw palette classes** in the new files: `rg -n "(gray|slate|blue|amber|yellow|violet|green|red)-[0-9]" components/booking/ui components/booking/BookingHeader.tsx "app/(booking-flow)"`. Expect no matches.
- [ ] **Step 4: Route probe on the dev server** (port 3001, read-only GETs).
  - `/service`, `/datetime?service=<id>` and `/confirmation?service=<id>&license_plate=TEST123` return 200. Their HTML contains "Back to site" and does **not** contain the marketing navbar's "Book Online".
  - `/success` still returns its old page. It contains "Book Online" or the footer.
  - Stop the dev server.
- [ ] **Step 5: Commit** `feat(booking): shared booking UI and a navy booking header for guests`

---

### Task 5: Step 1 (service) and its dialogs

**Files:**
- Modify: `components/booking/ServiceStep.tsx`, `components/booking/VehiclePicker.tsx`, `components/booking/AddOnList.tsx`
- Create: `components/booking/AccountSheet.tsx`, `components/booking/BundleSheet.tsx`

**Interfaces:**
- Consumes: `StepLayout`, `StepProgress`, `BookingSheet` (Task 4); `bundleSuggestion` (Task 2); `initial.welcomeOffer` (Task 3); `LicensePlate`.
- Produces:
  - `AccountSheet({ open, onOpenChange, welcomeOffer }: { open: boolean; onOpenChange: (o: boolean) => void; welcomeOffer: WelcomeOffer | null })`. Copy and buttons are as in the spec, with "Create free account" going to `/signup`, "Continue as guest" closing the sheet, and "Sign in" going to `/login`.
  - `BundleSheet({ open, onOpenChange, suggestion, onSwitch, onKeep })`, where `suggestion` is the non-null return of `bundleSuggestion`.
  - `VehiclePicker` and `AddOnList` keep their current props and render inside `BookingSheet`.

- [ ] **Step 1: Restyle step 1 to the spec's "Step 1" and "Holiday sale" sections.**
  - **Page frame:** `StepLayout` with title "Choose your service". In the dashboard tree only (`ctx.variant === "dashboard"`), put `StepProgress tone="canvas" current={1}` above it.
  - **Car card:** guests get a "Change" link that opens `VehiclePicker`; signed-in customers get a read-only card.
  - **Service list:** segmented Quick service / Express detail control (keep today's tab-gating), package cards, and the sale line.
  - **Continue:** opens `AddOnList` as today. Its "Continue" (`onNext`) first computes `bundleSuggestion({ chosen, addOns: selected, catalog: services, isServiceFree: isServiceFree(selectserv.category) })`.
    - If there is a suggestion, it opens `BundleSheet`. "Switch" does today's switch: `handlePackageSelect(pkg.id)`, `setActiveTab("express")`, clear the selected add-ons, close both sheets. "Keep my choice" navigates on as today.
    - If there is no suggestion, it navigates as today.
    - Remove the old `recommendModalOpen` trigger at 3 or more add-ons.
  - **Account pop-up:** replace the inline "Join Our Members!" block with `AccountSheet`, opened by today's `showBanner` state.
  - **Clean-up:** remove the old header bar and the old "Booking Progress" card.
- [ ] **Step 2: Signed-in on the guest URL check.**
  - Read the code path: `ctx.isAuthenticated` drives the read-only car card and hides `AccountSheet`, and `initial.welcomeOffer` is `null` for signed-in customers (Task 3).
  - Run `npx tsc --noEmit -p .` and expect no output.
- [ ] **Step 3: Palette grep** over the three modified files and the two new ones (same pattern as Task 4). Expect no matches.
- [ ] **Step 4: Dev-server HTML probe.** GET `/service`. Its HTML contains "Choose your service" and a real service name. It contains none of "Join Our Members", "Smart Recommendation" or "5% OFF ALL SERVICES".
- [ ] **Step 5: Commit** `feat(booking): service step and its dialogs in the 24/7 Bay look`

---

### Task 6: Step 2 (date and time)

**Files:**
- Modify: `components/booking/DateTimeStep.tsx`

- [ ] **Step 1: Restyle to the spec's "Step 2" section.**
  - Use `StepLayout` with the back link "← {service name} · {duration} min", and add `StepProgress tone="canvas" current={2}` in the dashboard tree.
  - Style the calendar through `DayPicker`'s `classNames` / `modifiersClassNames`, keeping the `inBrowser` guard and its placeholder.
  - Show the slots in a 3-column grid of 44px buttons.
  - The action panel shows the chosen date and time, or "Pick a day and time" before a choice, plus flame "Continue".
  - Remove `react-day-picker/style.css` only if the `classNames` cover every part. Otherwise keep it and override.
- [ ] **Step 2: Palette grep and tsc.** Expect no matches and no output.
- [ ] **Step 3: Dev-server probe.** GET `/datetime?service=<id>` returns 200 with "Pick a day and time" and still has no `rdp-day` cells in the server HTML.
- [ ] **Step 4: Commit** `feat(booking): date and time step in the 24/7 Bay look`

---

### Task 7: Step 3 (confirm), payment dialogs and the membership pop-up

**Files:**
- Modify: `components/booking/ConfirmationStep.tsx`, `components/booking/PaymentChoice.tsx`, `components/subscription-upsell-dialog.tsx`
- Create: `components/booking/BookingTicket.tsx`
- Delete: `components/booking/BookingSummary.tsx`, once nothing imports it (check with `rg BookingSummary`).

**Interfaces:**
- Produces: `BookingTicket({ date, time, service, addOns, duration, plate, vehicleInfo }: { date: string | null; time: string | null; service: ServicePackageRow | null; addOns: AddOnRow[]; duration: number; plate: string; vehicleInfo: VehicleDisplay | null })`. Dates are formatted with `formatCalendarDate` (UTC-safe).
- `SubscriptionUpsellDialog` keeps its props (`open`, `bookingTotal`, `onDismiss`, `onSubscribe`). Features come from the chosen plan's `features` (`usePricingPlans` already returns them). The `FEATURES` constant is deleted.

- [ ] **Step 1: Restyle to the spec's "Step 3", "Sheet dialog" and "Membership pop-up" sections.**
  - `BookingTicket` and the price card, with the sale row, promo row and promo field.
  - Member notices.
  - The action panel shows the total, the second line per the spec, and the flame button with today's label logic and gate. Use sentence case: "Loading your booking...", "Confirm booking", "Proceed to payment".
  - `PaymentChoice` and the guest-details dialog become `BookingSheet`s.
  - The membership pop-up becomes a `BookingSheet` with a Night top section.
- [ ] **Step 2: Logic-unchanged check.**
  - Run `git diff main -- components/booking/ConfirmationStep.tsx` and confirm the expressions for `isFreeForSubscriber`, `shouldOfferUpsell`, `proceedAfterUpsell`, `confirmPaymentChoice`, `disabled={isSubmitting || !ready}` and the label ternary have the same conditions. Only case and markup change.
  - Run `npx vitest run lib/booking/pricingDisplay.test.ts` and expect it to pass.
- [ ] **Step 3: Palette grep** over the modified and new files, and tsc. Expect no matches and no output.
- [ ] **Step 4: Dev-server probe.** GET `/confirmation?service=<id>&license_plate=TEST123&date=2026-11-20&time=9:30` returns 200 with "Check and confirm", the service name and `TEST123`, and without "Booking Progress".
- [ ] **Step 5: Commit** `feat(booking): confirm step, payment dialogs and membership pop-up in the 24/7 Bay look`

---

### Task 8: DESIGN.md, full checks, PR

**Files:**
- Modify: `DESIGN.md`

- [ ] **Step 1: Update `DESIGN.md`.**
  - In Components, add "Booking header and step progress", "Step layout and action panel", "Booking sheet" and "Booking ticket", as built, in the document's style.
  - In Divergences, remove the booking flow from the inner-pages line if it is listed. In Layout, note the guest booking frame (`app/(booking-flow)`).
- [ ] **Step 2: Full checks.** Run `npx vitest run`, `npx tsc --noEmit -p .` and `npx eslint lib app components`. Expect all tests to pass, no tsc output, and 0 errors with no new warnings over 55.
- [ ] **Step 3: Repo-wide palette grep** across `components/booking`, `components/subscription-upsell-dialog.tsx` and `app/(booking-flow)`. Expect no matches.
- [ ] **Step 4: Commit, push, open the PR.** Use the push command from `HANDOFF.md`. The PR body lists what to check on the Vercel preview:
  - **Guest:** all three steps, the account sheet with the `WELCOME10` line, the plate sheet, extras, a bundle suggestion (pick Classic Complete plus 2 or more extras worth over $20), and the membership pop-up with the plan's real features.
  - **Member:** a covered car shows free and "Confirm booking". A covered car plus extras shows "Proceed to payment".
  - **Layout:** the phone bottom bar, and the desktop side column from 1024px.
  - **Accessibility:** reduced motion, keyboard focus in the sheets, and Escape to close.
