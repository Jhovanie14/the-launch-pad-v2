# Self-service subscription cancellation — Design

Date: 2026-08-12
Status: Approved for planning

## Problem

A self-service subscriber has no way to cancel from `/dashboard/billing`. The express subscription card offers "Unsubscribe Everything"; the self-service card offers only "Update Payment Method."

Exploration found three layered gaps:

1. `POST /api/cancel-self-service-subscription` exists (sets `cancel_at_period_end: true` in Stripe) but has **zero callers** — a dead endpoint.
2. `components/self-service-subscription-status.tsx` has no cancel UI and never renders a pending-cancellation state, even though `self_service_subscriptions.cancel_at_period_end` exists and the `SelfServiceSubscription` type carries it.
3. **Webhook sync bug:** `handleSubscriptionUpdated` and `handleSubscriptionDeleted` in `app/api/webhook/route.ts` update only `user_subscription`. For a self-service Stripe subscription they match no row and bail. Consequences: a scheduled cancel never reaches the DB, renewals never refresh the period columns, no cancellation emails are sent, and when Stripe deletes the subscription the row stays `active` forever. The cancel feature is only honest if this is fixed with it.

Decision made during brainstorming: cancellation takes effect at the **end of the billing period** (matches the express flow, the existing route's behavior, and the "cancel anytime" positioning). No refunds, no immediate termination.

## Current state (for reference)

- `app/(dashboard)/dashboard/billing/page.tsx:16,75` — gets `selfSubs` from `useSelfServiceSubscription()` and renders `<SelfServiceSubscriptionStatus subscription={selfSubs} />`.
- `hooks/useSelfServiceSubscription.ts` — returns `{ subscription, loading, error }`; has an internal `loadSubscription()` it does not expose.
- `components/subscription-status.tsx:154-168, 599-694` — the express "Unsubscribe Everything" pattern to mirror: destructive `Button` + inline shadcn `AlertDialog`, `fetch` POST, `toast.success("Your subscription will be canceled at the end of the billing period.")`, refetch callback, loading state.
- `app/api/cancel-self-service-subscription/route.ts` — auth via inline `supabase.auth.getUser()`, finds the user's `active` sub, calls `stripe.subscriptions.update(id, { cancel_at_period_end: true })`, returns `{ canceled }`. Does not touch the DB row.
- `app/api/webhook/route.ts:948-1058` (`handleSubscriptionUpdated`) — updates `user_subscription` by `stripe_subscription_id` with status/periods/`cancel_at_period_end`; on `.single()` error it logs and returns. Sends `sendCancellationScheduledEmail` when `previous_attributes` shows `cancel_at_period_end` flipping false→true.
- `app/api/webhook/route.ts:1060-1091` (`handleSubscriptionDeleted`) — sets `user_subscription.status = "canceled"` and emails `sendSubscriptionCancelledEmail`; `maybeSingle`, silently no-ops for self-service.
- `processSelfServiceSubscription` (webhook, lines 882-946) already writes `cancel_at_period_end` on initial upsert, so the column is live.
- `types/index.ts` `SelfServiceSubscription` includes `cancel_at_period_end: boolean`.
- Vitest only includes `lib/**/*.test.ts`; webhook-adjacent logic is made testable by extracting it into `lib/` and passing the Supabase client as an argument (`processProductOrder` precedent).

## Scope

In scope:
- Cancel button + confirmation dialog + pending-cancellation notice in `SelfServiceSubscriptionStatus`.
- `reload()` exposed from `useSelfServiceSubscription`, threaded through the billing page.
- Harden `cancel-self-service-subscription` route: house auth/error conventions, and stamp `cancel_at_period_end: true` on the DB row after Stripe succeeds.
- Webhook: subscription updated/deleted handlers fall through to `self_service_subscriptions` when no `user_subscription` row matches, via a new testable sync helper in `lib/`.
- Cancellation-scheduled and cancellation-completed emails thereby fire for self-service subscribers (existing templates, plan-agnostic copy — no new emails).

Out of scope (YAGNI):
- Un-cancel / resume subscription.
- Immediate cancellation or prorated refunds.
- Retention offers or cancel-reason surveys.
- Stripe customer-portal configuration changes.
- Fixing unrelated express-subscription behavior.

## 1. UI — `SelfServiceSubscriptionStatus`

Mirroring the express card's inline pattern:

- **Pending-cancellation notice:** when `subscription.cancel_at_period_end` is true, render an amber notice in place of the cancel button: "Cancellation scheduled — your access ends \<formatted current_period_end\>." The "Update Payment Method" button stays (payment method can still matter until period end).
- **Cancel button:** destructive-styled `Button` ("Cancel Subscription") shown only when `status === "active"` and `cancel_at_period_end` is false. Opens a shadcn `AlertDialog`:
  - Title: "Cancel your self-service subscription?"
  - Body: "You'll keep access until \<formatted current_period_end\>, then your subscription ends. No further charges."
  - Confirm: "Yes, Cancel Subscription" (loading state "Cancelling…"); Cancel: "Keep Subscription".
- Confirm handler: `POST /api/cancel-self-service-subscription`; on success `toast.success("Your subscription will be canceled at the end of the billing period.")`, close dialog, call `onSubscriptionChange?.()`; on failure `toast.error` with the API's message. (The component currently uses `alert()` for payment errors — new code uses sonner toasts; the existing `alert()`s are left alone.)
- New optional prop: `onSubscriptionChange?: () => void`.

**Hook:** `useSelfServiceSubscription` returns `reload: loadSubscription` alongside the existing fields. **Billing page:** destructure `reload` and pass `onSubscriptionChange={reload}`.

## 2. API — `cancel-self-service-subscription` route

Same shape and success payload, brought up to house conventions and made DB-aware:

- `requireUser(supabase)` + `apiError(err)` (from `lib/auth/guards` / `lib/http/apiError`) instead of hand-rolled 401/500s.
- Import the shared `stripe` client (`@/lib/stripe/stripe`) — it already does.
- After the Stripe update succeeds, stamp the row via `createAdminClient()` (no client-side update RLS exists on this table, service role is the pattern for server writes):
  `update self_service_subscriptions set cancel_at_period_end = true where id = <subscription.id>`.
  This makes the UI's immediate refetch deterministic instead of racing the webhook; the webhook remains the source of truth and will confirm the same value.
- Return `NextResponse.json({ canceled: true })` on success.

## 3. Webhook — dual-table subscription sync

New helper `lib/subscriptions/syncStripeSubscription.ts` (under `lib/` so Vitest picks up its tests). Two exported functions:

- `applySubscriptionUpdate(db, fields)` and `applySubscriptionDeleted(db, stripeSubscriptionId)`, each returning `Promise<{ table: "user_subscription" | "self_service_subscriptions" | null; userId: string | null }>` (null table = no row matched in either). They:
  1. Attempt the existing `user_subscription` update by `stripe_subscription_id` (unchanged fields: status, periods, `cancel_at_period_end`, price/plan/billing-cycle logic stays as-is for express).
  2. If **no row matched**, update `self_service_subscriptions` by `stripe_subscription_id`: `status`, `current_period_start`, `current_period_end`, `cancel_at_period_end`.
  3. For deletion: same fall-through with `{ status: "canceled", cancel_at_period_end: false }`.
- `handleSubscriptionUpdated` / `handleSubscriptionDeleted` call the helper and then run their existing email logic against whichever row matched (profile lookup by the returned `user_id`). The cancel-just-scheduled detection (`previous_attributes.cancel_at_period_end === false` → true) applies to both tables, so self-service subscribers get `sendCancellationScheduledEmail`; deletion sends `sendSubscriptionCancelledEmail`.
- Express behavior must be bit-for-bit unchanged — the helper wraps the existing queries rather than rewriting them; the `subscription_vehicles` metadata block in `handleSubscriptionUpdated` stays express-only.

## 4. Error handling

- Route: 401 unauthenticated, 404 no active subscription, 400 no linked Stripe subscription, 500 Stripe failure — all via `apiError`, messages surfaced in the dialog's error toast.
- If the Stripe update succeeds but the DB stamp fails, log loudly and still return success (the webhook will correct the row; the UI may briefly show stale state).
- Webhook helper tolerates rows in neither table (returns null match, handlers no-op — e.g. subscriptions from other products).

## 5. Testing

Vitest (fake-db-as-argument pattern):
- Sync helper: express row matched → self-service untouched; express miss + self-service hit → row updated with status/periods/flag; deletion → `canceled` status; neither table → null result, no writes; cancel-just-scheduled derived correctly from `previous_attributes`.

Manual (Stripe test mode):
- Cancel from `/dashboard/billing`: dialog → toast → card flips to the amber "cancellation scheduled" notice (no cancel button); `self_service_subscriptions.cancel_at_period_end` is true; scheduled email arrives.
- In the Stripe test dashboard, cancel the subscription immediately (simulates period end): row flips to `canceled`, billing card shows the no-subscription state, completion email arrives.
- Express regression: an express cancel still works and emails exactly as before.
