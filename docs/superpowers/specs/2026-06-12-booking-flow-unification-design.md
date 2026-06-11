# Booking Flow Unification — Design

**Date:** 2026-06-12
**Status:** Approved design, pending spec review
**Phase:** 2 (Code Quality & Refactor) — the high-leverage item
**Branch (planned):** continue on `phase-2-foundation` or a new `phase-2-booking-unify`

## Context

The app has two near-duplicate customer booking trees that have drifted through independent edits:

- **Guest:** `app/(user)/(booking)/{service,datetime,confirmation,success}/page.tsx` (service 1017, confirmation 609 lines)
- **Logged-in:** `app/(dashboard)/dashboard/booking/{service,datetime,confirmation}/page.tsx` (service 930, confirmation 944 lines) + `action.ts`

Both follow the same steps — **service → datetime → confirmation** — passing booking state between pages via URL params. The drift is the core hazard: a pricing/validation fix made in one tree can be missed in the other (this is how the Phase 1 security gaps originated). Unifying this first also shrinks the remaining Phase 2 work (the `any`-sweep and monolith splits) because that work then happens once on shared code instead of twice.

## Decisions (locked during brainstorming)

- **Keep both URL entry points** as thin shells over one shared engine (zero broken links/bookmarks; preserves the two layouts — public chrome vs dashboard sidebar).
- **The four guest/auth differences are state-driven branches in one flow, not separate code trees:** payment options (guests card-only; logged-in cash; subscribers free), vehicle handling (saved/subscription vehicles vs plate input), post-booking redirect, surrounding layout (handled by Next.js route groups).
- **Approach A — shared step components + shared hook + thin route shells** (chosen over a single stateful `<BookingFlow mode>` which would change URL/navigation behavior, and over logic-only extraction which would leave the big JSX duplicated).
- **Server stays authoritative on price** (`lib/pricing/computeBookingAmount` + `validatePromo`). Client pricing is display-only; display drift cannot cause underpayment.

## Architecture

### Shared logic
- `hooks/useBookingFlow.ts` — single source of truth for an in-progress booking. Reads/writes step state via URL params, exposes selected service, add-ons, vehicle, date/time, displayed price, validation, and `submit()`. Takes a `BookingAuthContext` so it behaves correctly for guest vs logged-in.
- `lib/booking/pricingDisplay.ts` — client-side price *display* helpers mirroring the server rules (subscription-free detection, add-ons, holiday/promo display). Display-only.

### Shared UI (`components/booking/`)
- `ServiceStep.tsx` — service package + add-on selection + vehicle input.
- `DateTimeStep.tsx` — date/time picker.
- `ConfirmationStep.tsx` — review + payment choice + submit.
- Sub-pieces the 944-line confirmation page decomposes into: `VehiclePicker.tsx`, `AddOnList.tsx`, `PaymentChoice.tsx`, `BookingSummary.tsx`.

### Thin route shells (existing 6 `page.tsx`)
Each shrinks to: build the `BookingAuthContext` and render the matching shared step.
- Guest shells: context empty/false, `successPath = "/success"`.
- Dashboard shells: context from `useAuth` + `useSubscription` + `useUserVehicles`, `successPath = "/dashboard/bookings/success"`.

## Interfaces

```ts
interface BookingAuthContext {
  isAuthenticated: boolean;
  userId: string | null;
  subscription: Subscription | null;   // active express subscription, for free-service detection
  savedVehicles: UserVehicle[];          // [] for guests
  successPath: string;                   // "/success" | "/dashboard/bookings/success"
}
```

`useBookingFlow(ctx: BookingAuthContext)` returns the current selection (from URL params), setters that update the URL, the display price, validation state, and `submit()`.

## Data flow

URL params ⇄ `useBookingFlow` ⇄ step components. On confirm, `submit()` branches on `ctx`:
- **card** → `POST /api/checkout_sessions` (includes `promoCode`) → redirect to Stripe.
- **cash** (authenticated only) → `createBooking` server action → `ctx.successPath`.
- **free / subscription** → `createBooking` → `ctx.successPath`.

`PaymentChoice` only renders options `ctx` allows (guests: card only). The server re-validates price and payment rules regardless.

## Error handling

Uniform across both trees: inline/toast errors surfaced from the step components; server errors (now returned via `apiError`) shown consistently. No silent failures.

## Testing

- Vitest unit tests for `lib/booking/pricingDisplay.ts` (mirror the server pricing cases: non-subscriber, subscriber-free, add-ons, promo) and for the pure state transitions in `useBookingFlow`.
- The server-side price authority is already unit-tested (`computeBookingAmount`, `validatePromo`).
- No E2E framework exists and none is added here; rely on the per-step manual parity checklist + `tsc` + the existing 26 unit tests staying green.

## Migration strategy (incremental — live production flow)

Do NOT big-bang rewrite. Extract and switch one step at a time, verifying parity and committing per step:

1. Extract `useBookingFlow` + `pricingDisplay` with unit tests (pure logic first).
2. **DateTimeStep** (smallest, most similar) → switch both shells → verify parity → commit.
3. **ServiceStep** (+ `VehiclePicker`, `AddOnList`) → switch both → verify → commit.
4. **ConfirmationStep** (+ `PaymentChoice`, `BookingSummary`) — built as the superset gated by `ctx`; the dashboard version is the superset, guest is the card-only subset → switch both → verify → commit.
5. Delete the now-dead duplicated files.

**Parity check per step:** same URL params in → same options rendered → same server call out. Manual walkthrough of three real paths each step: guest card booking, logged-in cash booking, subscriber free booking.

**Drift handling:** where the two trees drifted *accidentally*, the unified flow takes the dashboard (superset) behavior gated by auth state; any guest-only difference is expressed via `ctx`. Flag ambiguous drift for the owner rather than guessing.

## Out of scope

- The remaining ~200 non-hot-path `any`s (separate Phase 2 sweep — easier after unification).
- Splitting other monolith files (`booking-view` 1094, `fleet-payment` 1090) — separate Phase 2 task.
- Any visual redesign of the booking UI (Phase 4).
- Changing URLs, payment providers, or the server-side price authority.

## Success criteria

- One shared implementation of service/datetime/confirmation; the six route files are thin shells.
- Guest card, logged-in cash, and subscriber free bookings all work identically to before (verified per step).
- No duplicated booking logic or markup remains; a future pricing/validation change is made in exactly one place.
- `tsc` clean, all unit tests green, both booking URLs and their layouts unchanged.
