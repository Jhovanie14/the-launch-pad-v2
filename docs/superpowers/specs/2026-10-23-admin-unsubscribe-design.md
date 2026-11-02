# Admin-assisted unsubscribe

## Problem

Customers who aren't comfortable with the dashboard ask staff to cancel for
them — either one family vehicle or the whole subscription. Today only the
customer can do that from `/dashboard/billing`, so staff have to walk them
through it or use the Stripe Dashboard directly (which leaves our DB, emails
and vehicle records out of step).

## Decisions

- **Allowed by Stripe.** The merchant owns the subscription; the Stripe
  Dashboard does the same thing. Our obligations are to act only on the
  customer's request, record who/when/why, and confirm to the customer.
- **Same behavior as self-service.** Whole-subscription cancels are always at
  period end (no refund). Removing a family vehicle is immediate with a
  prorated credit, exactly like the customer's own button.
- **Removing the primary vehicle** (admin only — customers use the swap dialog):
  - other vehicles exist → the oldest family vehicle is promoted to primary at
    the full plan price and the old primary is removed (the swap flow);
  - it's the only vehicle → the whole subscription is cancelled at period end.
- **Self-service subscriptions** only support whole-subscription cancel; they
  have no per-vehicle Stripe items.

## Design

- `lib/subscriptions/vehicleUnsubscribe.ts` — pure helpers (no Stripe/DB):
  decide what unsubscribing a vehicle means, resolve a vehicle's Stripe item,
  build the cancel params. Shared by the server and the admin UI preview.
- `lib/subscriptions/subscriptionActions.ts` — the side-effecting actions,
  keyed by `userId` and run on the service-role client:
  `removeFamilyVehicle`, `swapPrimaryVehicle`, `cancelSubscriptionAtPeriodEnd`,
  `unsubscribeVehicle`. They never read the session, so the caller decides
  whose subscription it is.
- Customer routes (`cancel-subscription`, `cancel-self-service-subscription`,
  `subscription/remove-vehicle`, `subscription/swap-primary-vehicle`) become
  thin wrappers: `requireUser` → action with `user.id`. Response contract
  (`res.ok` + `{ error }`) is unchanged.
- `POST /api/admin/subscriptions/unsubscribe` — `requireAdmin`, validates
  `{ userId, scope, product?, subscriptionVehicleId?, reason }`, runs the
  action, writes an audit row.
- `admin_subscription_actions` table — admin id, customer id, action, plate,
  Stripe subscription id, required reason. RLS on; admins read via
  `is_admin()`, writes only through the service role.
- Admin cancels also tag the Stripe subscription
  (`cancellation_details.comment`, `metadata.canceled_by`), so the Stripe
  Dashboard shows who did it.
- Admin UI: `/admin/users` express and self-service cards get "Unsubscribe"
  per vehicle and "Cancel subscription", each behind a confirm dialog with a
  required reason and a plain-language consequence line.

## One vehicle change per 6 months

Stops one paid slot being rotated through many cars.

- **What counts:** a vehicle leaving AND a vehicle joining within the same
  6-month window, in either order (add-first can't dodge it).
- **Never blocked:** removing a vehicle, cancelling, and pure additions with
  no removal in the window.
- **When locked:** only add-vehicle is refused (403, `code:
  "vehicle_change_locked"`, `unlocksAt`) until the earlier of the latest add
  and latest removal is 6 months old.
- **History:** `subscription_vehicle_changes` (added / removed / unlocked),
  append-only, service-role writes, customers read their own rows. Existing
  customers have no rows, so nobody is locked on day one.
- **Staff override:** "Allow Vehicle Change" on `/admin/users` writes an
  `unlocked` event with the admin and reason; the rule ignores earlier events.
- **Customer UI:** `/dashboard/billing` swaps "Add a vehicle" for the unlock
  date while locked, and always shows the policy with a "Request a vehicle
  change" button → `/dashboard/help?topic=vehicle-change` (pre-filled ticket
  into the existing contacts inbox) or "visit us in the shop". FAQ entry
  `billing-5` publishes the rule.
- **Fail open:** if the history can't be read, adding is allowed and the error
  is logged — a missing table must not block paying customers.

## Staff add a vehicle

For customers who come into the shop or send a vehicle change request.

- `addSubscriptionVehicle` in `subscriptionActions.ts` now holds the whole
  add flow (flock price, prorated Stripe item, vehicle record, link, email);
  the customer route and `POST /api/admin/subscriptions/add-vehicle`
  (`{ userId, licensePlate, reason }`) both call it.
- Staff override the 6-month lock; the add is still recorded as the
  customer's change (actor `admin`, with the reason).
- Audit: `admin_subscription_actions.action = 'add_vehicle'` (migration
  `20261023020000` widens the check constraint).
- `/admin/users` express cards: "Add Vehicle" (under the 5-vehicle cap, not
  while a cancellation is pending), with the price and any lock override
  spelled out in the confirm dialog.
- Hardening: if the vehicle record fails after the Stripe item is created,
  the item is now removed (previously only a failed link rolled back).

## Fix carried along

`remove-vehicle` used to swallow a failed Stripe item delete and remove the DB
row anyway — the customer kept being billed for a vehicle that vanished from
their account. Now a Stripe failure stops the request; only Stripe's
`resource_missing` (item already gone) lets the DB cleanup proceed.

## Verification

1. Unit tests for the pure helpers (`npm test`).
2. Stripe test mode, as admin on `/admin/users`:
   - family vehicle → item gone in Stripe, proration credit, email, audit row;
   - primary with family → family promoted to full price, old primary gone;
   - sole vehicle / Cancel subscription → `cancel_at_period_end` true in
     Stripe and DB, "cancellation scheduled" email, card shows the end date;
   - self-service Cancel subscription → same.
3. Customer flows unchanged: remove family vehicle, swap primary, cancel
   express, cancel self-service.
4. Non-admin POST to the admin route → 403.
5. Vehicle change limit, as a test customer: remove a family vehicle, add a
   different one → succeeds; add another → refused with the unlock date, and
   `/dashboard/billing` shows the same date instead of "Add a vehicle". As
   admin, "Allow Vehicle Change" → customer can add again. Adding a vehicle
   with no prior removal is never refused.
6. Staff add, as admin on `/admin/users`: Add Vehicle on a locked customer →
   Stripe item at the family rate (full on commercial), proration, customer
   email, `add_vehicle` audit row, and a `subscription_vehicle_changes` row
   with actor `admin`.
