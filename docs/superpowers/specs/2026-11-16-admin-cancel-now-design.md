# Admin "Cancel now" (design)

Date: 2026-11-16. Size: small project. Moves real money (refunds), so the
design is approved before building.

## Why

Admins can only cancel a membership **at the end of the paid period**
(Users → Cancel Subscription). When the business ends a membership on the
spot, as with Devon (2026-11-13), the user had to cancel and refund by hand
in Stripe. "Cancel now" does that from the app, with the refund choice,
the block option and the customer notice in one step.

## Decided by the user (2026-11-16)

- **Refund: chosen per cancel**, in the dialog: full refund of the latest
  payment, prorated refund for the unused days, or no refund.
- **Super admins only** (`profiles.user_type = 'super_admin'`), checked on
  the server, like Delete booking.
- **A formal notice email** to the customer: the membership ended today,
  and the refund amount and timing when refunded. No "rejoin" pitch.

## Goals

- One dialog ends the membership immediately, refunds as chosen, optionally
  blocks the customer (reusing #11's "Also block this customer"), records it
  in the audit log, and emails the customer.
- The amount is shown before confirming, for each refund choice.

## Non-goals

- No change to the end-of-period Cancel Subscription.
- No partial refunds by custom amount (full / prorated / none only).
- No database migration.

## Anti-goals (a failure even if it works)

- Money refunded while the membership stays active.
- Two emails to the customer (our notice plus Stripe-triggered "rejoin").
- A non-super-admin able to call it (UI hiding alone is not enough).
- A refund larger than what the customer paid for the current period.

## Approaches

- **Server route + `lib/subscriptions/cancelNow.ts` (picked).** Same
  shape as the existing admin unsubscribe route: the route checks roles,
  the lib function talks to Stripe through an injected client so it is
  unit tested with a fake.
- Do it in the Stripe dashboard (today's way): no code, but the refund,
  block, audit record and notice are separate manual steps, and the step
  was missed with Devon.

## How it works

1. **Preview** (`GET`-like `POST /api/admin/subscriptions/cancel-now` with
   `preview: true`): loads the active subscription (express or
   self-service), its latest paid invoice, and returns
   `{ paid, periodStart, periodEnd, full, prorated }` in dollars, so the
   dialog can show "Full refund $39.99 / Prorated $26.40 (20 of 30 days
   unused) / No refund".
2. **Confirm** (`preview: false`, with `refund: "full" | "prorated" | "none"`,
   `reason`, `alsoBlock`):
   1. Tag the Stripe subscription `metadata.canceled_by = "admin"`,
      `canceled_now = "true"`, with the reason in `cancellation_details`.
   2. `stripe.subscriptions.cancel(id, { prorate: false })`: access ends now.
   3. Refund (if chosen) against the latest paid invoice's payment intent,
      with an idempotency key `cancel-now/<subscription id>`. Amount is
      recomputed on the server, never taken from the client.
   4. Mark the row `status = 'canceled'` (the webhook confirms it).
   5. Audit: `recordAdminSubscriptionAction` with action
      `cancel_subscription` and `details: { immediate: true, refund_kind,
      refund_amount }` (no migration: the action check stays as is).
   6. Optional block (`blockAfterCancel`, from #11).
   7. Email the customer the formal notice.
   - Cancel happens **before** the refund: if the refund then fails, the
     response says "Cancelled, but the refund failed: refund it in Stripe",
     rather than money leaving while the plan stays active.
3. **Webhook:** `customer.subscription.deleted` skips the "membership ended,
   rejoin" email when `metadata.canceled_now === "true"` (our notice was
   already sent). Not on `canceled_by === "admin"` alone: end-of-period
   admin cancels carry that tag too and still get the email when the
   period ends. Customer-initiated and payment-failure deletions still get it.

**Prorated amount:** `paid × unused / period`, where `unused` is the time
from now to the period end and `period` is the billing period length,
rounded down to the cent, never above `paid`, never below 0.

## UI

Users page, beside Cancel Subscription, for super admins only: **Cancel
now** (red outline). Its dialog reuses `AdminSubscriptionActionDialog`,
extended with a required refund choice showing each amount, plus the
existing "Also block this customer" box and reason field.

## Constraints

- Stripe SDK 18, API `2025-08-27.basil`: the invoice's payment intent is
  read via `stripe.invoicePayments.list({ invoice })`; billing period
  from the subscription item (`items.data[0].current_period_*`).
- Local Stripe key is test mode and the CLI login has expired, so this is
  verified by unit tests with a fake Stripe client, not against live Stripe.

## Left to the builder

Exact dialog layout within the admin console style; error wording.
