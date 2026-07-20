# Subscription vehicle unsubscribe & primary-vehicle swap — Design

Date: 2026-07-21
Status: Approved for planning

## Problem

The billing page's family-vehicle management has three gaps:

1. The per-vehicle removal control is a bare trash icon with "Remove" copy — not precise about what happens (this cancels that vehicle's billing item, not just a UI removal).
2. There is no way to cancel the *entire* subscription from a single, clear, confirmed action inside the vehicle-management UI — the only "cancel everything" entry point is a separate button on the billing page using a native `confirm()`.
3. The primary vehicle can never be unsubscribed — the API explicitly blocks it ("Cancel your subscription instead"). But a customer may legitimately want to drop their primary vehicle while keeping family vehicles. Family vehicles are only billed at 35% off *because* a primary vehicle anchors the plan at full price — if the primary vehicle could simply be deleted while family vehicles remain, the business would be left charging discount-only rates with nothing at full price. The fix: allow primary removal, but when family vehicles remain, require promoting one of them to primary (full price) as part of the same action.

There is also no email notification on any subscription-vehicle change (add, remove, swap) — only on full-subscription lifecycle events (invoice paid, payment failed, cancellation scheduled/completed), which already fire via the Stripe webhook.

## Current state (for reference)

- `subscription_vehicles` has no `is_primary` column. "Primary" is inferred everywhere as "the row with the smallest `id` when the subscription's vehicles are queried," relying on `id` sort order to reflect insertion order. This is fragile (`id` is a UUID) and, more importantly, cannot represent "the user explicitly chose vehicle X as primary" — which the swap feature requires.
- `app/api/subscription/remove-vehicle/route.ts` deletes a non-primary vehicle's Stripe subscription item and DB row; explicitly rejects index-0 (primary) removal.
- `app/api/subscription/add-vehicle/route.ts` adds a new vehicle at a 65%-of-base ("flock discount") Stripe price.
- `components/remove-vehicle-dialog.tsx` is a shadcn `AlertDialog` already used for family-vehicle removal — just needs copy changes, not a new component.
- `components/subscription/MultiVehicleBenefitsDialog.tsx` already exists (used today in the pricing-cart flow) and is a good fit for the new "info" icon — reuse it, don't build a new one.
- `lib/email/subscription-emails.ts` has templates for invoice/renewal, payment failed, cancellation scheduled, and cancellation completed — all fired from `app/api/webhook/route.ts`. None exist for vehicle add/remove/swap.
- `app/(dashboard)/dashboard/billing/page.tsx` has a "Cancel Subscription" button using `window.confirm()` calling `/api/cancel-subscription`.

## Scope

In scope:
- `is_primary` column + migration + backfill + all read/write sites updated to use it.
- Copy/label changes for family-vehicle removal ("Unsubscribe this vehicle").
- New "unsubscribe" control on the primary vehicle, branching to a swap dialog or the full-cancel dialog.
- New primary-vehicle swap dialog + API route.
- New "Unsubscribe Everything" button + `AlertDialog` inside `SubscriptionStatus`, replacing the billing page's existing cancel button.
- New info icon opening the existing `MultiVehicleBenefitsDialog`.
- Three new transactional emails (vehicle added, vehicle removed, primary swapped), sent synchronously from their respective API routes.

Out of scope:
- Changing how the *first* checkout (initial subscribe) flow works, beyond correctly stamping `is_primary` on the vehicle inserted there.
- Self-service subscriptions (`self_service_subscription_vehicles`) — unaffected, separate table/flow.
- Changing proration behavior, plan pricing, or the 35%/65% discount math itself.

## 1. Data model: `is_primary` column

New Supabase migration:

```sql
alter table public.subscription_vehicles
  add column is_primary boolean not null default false;

-- Backfill: earliest vehicle per subscription (by created_at) becomes primary
with ranked as (
  select id,
         row_number() over (partition by subscription_id order by created_at asc) as rn
  from public.subscription_vehicles
)
update public.subscription_vehicles sv
set is_primary = true
from ranked
where ranked.id = sv.id and ranked.rn = 1;

-- Enforce at most one primary per subscription
create unique index subscription_vehicles_one_primary_per_sub
  on public.subscription_vehicles (subscription_id)
  where is_primary;
```

Sites updated to read/write `is_primary` instead of order-inferred primary:

- `lib/services/subscriptionService.ts`: select `is_primary`, order by `is_primary desc, created_at asc` (primary first, then family vehicles oldest-first — same effective display order as today). Include `is_primary` on each mapped vehicle.
- `types/index.ts`: add `is_primary: boolean` to the `Subscription.vehicles[]` shape.
- `app/api/subscription/remove-vehicle/route.ts`: replace `vehicleIndex === 0` primary check with `vehicleToRemove.is_primary === true`. Order query by `is_primary desc, created_at asc` (kept for the Stripe-item-position fallback logic, which is unaffected).
- `app/api/webhook/route.ts`:
  - `checkout.session.completed` handler (~line 751): when inserting `newVehicleLinks`, mark the vehicle at index 0 of the `vehicleIds` array as `is_primary: true`. The later re-fetch for `stripe_item_id` mapping (~line 794) switches its `order("id")` to `order("is_primary", { ascending: false }).order("created_at", { ascending: true })`.
  - Single-vehicle update handler (~line 975): when inserting a new link because none exists yet, set `is_primary: true` (it's necessarily the only/first vehicle on that subscription in this code path).
- `app/api/subscription/add-vehicle/route.ts`: no change — new rows default `is_primary = false`, which is correct (added vehicles are always family vehicles).

## 2. New API route: swap primary vehicle

`app/api/subscription/swap-primary-vehicle/route.ts` (POST), body `{ newPrimarySubscriptionVehicleId }`:

1. Auth check, load the caller's active `user_subscription`.
2. Load all `subscription_vehicles` for the subscription (id, vehicle_id, stripe_item_id, is_primary).
3. Validate: current primary exists; target row exists, belongs to this subscription, and `is_primary === false`. 400 otherwise.
4. Resolve the plan's full base Stripe price (same plan-lookup pattern already in `add-vehicle/route.ts`: read `subscription_plans.stripe_price_id_monthly`/`yearly` per `billing_cycle`, resolving a `price_...` directly or looking up the active recurring price for a `prod_...`).
5. Promote: `stripe.subscriptionItems.update(targetRow.stripe_item_id, { price: fullPriceId, proration_behavior: "create_prorations" })`.
   - If `targetRow.stripe_item_id` is missing, resolve it via the same Stripe-retrieve-and-match fallback used in `remove-vehicle/route.ts`.
6. Demote/remove old primary: resolve its Stripe item (same fallback), `stripe.subscriptionItems.del(oldItemId, { proration_behavior: "create_prorations" })`.
7. DB (admin client, bypassing RLS like the existing delete path): delete old primary's `subscription_vehicles` row; set `is_primary = true` on the target row.
8. Fetch `profiles.email`/`full_name` for the caller, send `sendPrimaryVehicleSwappedEmail`.
9. Return `{ success: true }`. Errors follow the existing routes' style: try/catch per Stripe call, log and continue where non-fatal (e.g. old item already gone), 500 with a clear message on DB failure after Stripe succeeded.

No new endpoint is needed for "primary removed, no family vehicles left" — that path is handled client-side by routing to the existing `/api/cancel-subscription` flow instead (see §3).

## 3. Frontend changes

### `components/subscription-status.tsx`

- Family vehicle row (unchanged structurally): the trash-icon button's `title` becomes "Unsubscribe this vehicle"; opens `RemoveVehicleDialog` as today.
- Primary vehicle row: gains the same icon/button. `onClick`:
  - If `pricing.vehiclePricing.length > 1` → open `SwapPrimaryVehicleDialog` (new).
  - Else → open the "Unsubscribe Everything" `AlertDialog` (new, described below) directly, since removing the sole vehicle is equivalent to a full cancel.
- New info icon next to the "Family Vehicles" section heading → opens the existing `MultiVehicleBenefitsDialog` (reused as-is, `isOpen`/`onClose` props already match).
- New "Unsubscribe Everything" section: destructive `Button` + shadcn `AlertDialog`, placed inside the card (e.g. below the vehicles list, above "Update Payment Method"). Confirm action calls `POST /api/cancel-subscription` (existing route, unchanged), then toasts and calls `onVehicleChange?.()` to refetch. Loading/disabled state while in flight.

### `components/remove-vehicle-dialog.tsx`

Copy-only changes: title → "Unsubscribe This Vehicle", body/button/toast text switched from "remove" to "unsubscribe" language. No prop or behavior changes.

### New `components/subscription/SwapPrimaryVehicleDialog.tsx`

Shadcn `Dialog` (not `AlertDialog`, since it needs a selection control, not just confirm/cancel):
- Props: `open`, `onClose`, `onSuccess`, `currentPrimary`, `familyVehicles` (list), `basePriceMonthly`/`billingCycle` for copy.
- Body: explains the primary vehicle is being unsubscribed and, because family vehicles remain, one of them must become the new primary (at full price, losing its 35% discount). Radio list of family vehicles to choose from.
- Footer: Cancel / "Confirm Swap" (disabled until a selection is made). On confirm, `POST /api/subscription/swap-primary-vehicle` with the chosen id, toast on success/failure, `onSuccess()` + close.

### New "Unsubscribe Everything" `AlertDialog` (inline in `subscription-status.tsx`, no separate file needed — small enough to match the existing inline pattern)

Standard shadcn `AlertDialog`: title "Unsubscribe from everything?", description warns this cancels the whole plan (all vehicles) at period end, Cancel / destructive Confirm.

### `app/(dashboard)/dashboard/billing/page.tsx`

Remove the existing "Cancel Subscription" button, its `handleCancelSubscription` function, and the `canceling` state — this is now handled entirely inside `SubscriptionStatus`.

## 4. Emails (`lib/email/subscription-emails.ts`)

Three new functions, following the existing `emailWrapper`/`BASE_STYLES` pattern used by the four existing templates (consistent header/card/CTA/footer structure):

- `sendFamilyVehicleAddedEmail({ to, name, licensePlate, newTotal, billingCycle })` — confirms the vehicle was added at 35% off, states new recurring total.
- `sendFamilyVehicleRemovedEmail({ to, name, licensePlate, newTotal, billingCycle })` — confirms removal, states new recurring total.
- `sendPrimaryVehicleSwappedEmail({ to, name, oldPrimaryLabel, newPrimaryLabel, newTotal, billingCycle })` — explains the old primary was unsubscribed, the named vehicle is now the primary at full price, states new recurring total.

Wiring:
- `add-vehicle/route.ts`: call `sendFamilyVehicleAddedEmail` right before returning success, using `user.email` (from the already-loaded auth user) and `profiles.full_name` (new lookup, same pattern as webhook.ts's existing profile fetches).
- `remove-vehicle/route.ts`: call `sendFamilyVehicleRemovedEmail` right before returning success.
- `swap-primary-vehicle/route.ts`: call `sendPrimaryVehicleSwappedEmail` right before returning success.

"Unsubscribe Everything" needs no new email — it calls the existing `/api/cancel-subscription`, and the webhook already sends `sendCancellationScheduledEmail` (on `cancel_at_period_end` transitioning to true) and `sendSubscriptionCancelledEmail` (on actual deletion).

## Testing

- Unit/manual: add vehicle → email received, `is_primary` unaffected. Remove family vehicle → email received. Swap primary with 1 family vehicle remaining → email received, old primary's Stripe item gone, chosen vehicle's Stripe item now at full price, `is_primary` flips correctly, unique-index constraint never violated. Remove primary with zero family vehicles → routes to full-cancel dialog, not the swap route. Unsubscribe Everything → existing cancel-subscription behavior unchanged, still triggers existing webhook emails.
- Migration: verify backfill picks the correct (earliest) vehicle as primary on a subscription with multiple existing vehicles in a copy of production-shaped data before applying to production.
