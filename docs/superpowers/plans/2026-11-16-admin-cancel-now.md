# Admin "Cancel now" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Super admins end a membership immediately from Admin → Users, refunding full / prorated / nothing, optionally blocking, with an audit record and a formal notice.

**Architecture:** `lib/subscriptions/cancelNow.ts` holds the quote and the cancel-then-refund sequence behind an injected Stripe-like client (unit tested with a fake). A route `/api/admin/subscriptions/cancel-now` checks super admin and wires audit, block and email. The Users page fetches a quote, then opens the existing confirm dialog extended with a required choice.

**Tech Stack:** Next.js route handlers, Supabase, Stripe SDK 18 (`2025-08-27.basil`), Vitest (`lib/**/*.test.ts`).

**Spec:** `docs/superpowers/specs/2026-11-16-admin-cancel-now-design.md`

## Global Constraints

- Super admin = `profiles.user_type === "super_admin"`, enforced on the server.
- Cancel **before** refund; a refund failure never throws after a successful cancel (returned as `refundError`).
- Refund amount recomputed on the server; prorated = `floor(paid × unused / period)` cents, clamped to `[0, paid]`.
- Refund idempotency key `cancel-now/<stripe subscription id>`.
- Stripe metadata on cancel: `canceled_by: "admin"`, `canceled_by_admin_id`, `canceled_now: "true"`; reason in `cancellation_details.comment`.
- Webhook skips the rejoin email only when `metadata.canceled_now === "true"`.
- Audit action stays `cancel_subscription` with `details: { immediate: true, refund_kind, refund_amount }` (no migration).
- Notice email: formal voice, `salutation()`, `signoff()`, footer "You are receiving this email because you have a Launch Pad membership." Subject "Your Launch Pad membership has ended".
- No Co-Authored-By trailer.

## Review Focus

1. Refund succeeds but the DB/audit/email step throws → the response must still say the membership is cancelled and how much was refunded.
2. Latest invoice paid $0 (promo) → no refund call, quote shows $0.
3. Clicking confirm twice → idempotency key prevents a second refund.
4. Subscription already cancelled in Stripe → clear 4xx error, no refund.
5. A plain admin calling the route directly → 403.

---

### Task 1: Quote and cancel sequence (`lib/subscriptions/cancelNow.ts`)

**Files:** Create `lib/subscriptions/cancelNow.ts`, `lib/subscriptions/cancelNow.test.ts`.

**Produces:**
- `type RefundKind = "full" | "prorated" | "none"`
- `proratedCents(paidCents: number, periodStart: number, periodEnd: number, nowSec: number): number`
- `interface CancelNowStripe` (subscriptions.retrieve/update/cancel, invoicePayments.list, refunds.create)
- `loadCancelNowQuote(db, stripe, userId, product, now?): Promise<CancelNowQuote>` — `{ table, rowId, stripeSubscriptionId, paidCents, paymentIntentId, chargeId, periodStart, periodEnd, fullCents, proratedCents, unusedDays, periodDays }`
- `cancelNow(db, stripe, { userId, product, refund, adminId, reason }, now?): Promise<{ quote, refundedCents, refundError: string | null }>`

- [ ] Tests first: proratedCents (half period → half; past end → 0; before start → paid; rounding down); quote reads the active row, the subscription item period and the latest invoice's paid payment intent; $0 invoice → 0 amounts; no active row → 404; cancel tags metadata then cancels with `prorate: false` **before** any refund; refund full/prorated amounts and key; `none` and $0 → no refund call; refund throws → `refundError` set, no throw; row marked `canceled`.
- [ ] Implement; run `npx vitest run lib/subscriptions/cancelNow.test.ts`; commit.

### Task 2: Notice email

**Files:** Modify `lib/email/subscription-emails.ts`, `lib/email/subscription-emails.test.ts`.

**Produces:** `buildMembershipEndedNowEmail({ name, refundedAmount: number | null })`, `sendMembershipEndedNowEmail({ to, ... })`.

- [ ] Tests first: subject; "Dear James,"; with refund shows `$26.40` and "5–10 business days"; without refund no refund line; no rejoin button; one primary button (billing page).
- [ ] Implement; run tests; commit.

### Task 3: Route and webhook

**Files:** Create `app/api/admin/subscriptions/cancel-now/route.ts`. Modify `app/api/webhook/route.ts` (`handleSubscriptionDeleted`).

- [ ] Route: `requireAdmin` + `profiles.user_type === "super_admin"` else 403; body `{ userId, product, preview, refund, reason, alsoBlock }`; preview → quote in dollars; confirm → `cancelNow`, `recordAdminSubscriptionAction`, `blockAfterCancel`, `sendMembershipEndedNowEmail` via try/catch, message + `warning` when refund or block failed.
- [ ] Webhook: return before the rejoin email when `subscription.metadata?.canceled_now === "true"`.
- [ ] `npx tsc --noEmit -p .`; commit.

### Task 4: Users page and dialog

**Files:** Modify `components/admin/admin-subscription-action-dialog.tsx`, `app/admin/users/page.tsx`.

- [ ] Dialog: optional `choice: { name, label, options: { value, label }[] }`, required before confirm, sent as `{ [name]: value }`.
- [ ] Page: for super admins, a "Cancel now" button beside Cancel Subscription (express and self-service); on click fetch the preview, then open the dialog with the three refund choices showing amounts, the `alsoBlock` option and a destructive confirm "Yes, Cancel Now".
- [ ] `npx tsc`, full `npx vitest run`, eslint on touched files; commit.
