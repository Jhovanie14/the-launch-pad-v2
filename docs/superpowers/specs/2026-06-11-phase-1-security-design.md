# Phase 1 — Payment & Data Security Hardening

**Date:** 2026-06-11
**Status:** Approved design, pending spec review
**Project:** The Launch Pad Wash — carwash booking & subscription web app (Next.js 16, Supabase, Stripe). Production, ~118 users / 18 subscribers.

## Context

The app is the first of a four-phase improvement effort (Security → Code Quality → Performance → Design). This spec covers **Phase 1 only**: closing payment- and access-control gaps before any refactor sits on top of them.

The codebase is mid-migration toward good patterns. Newer routes already do the right thing (`vehicles/update` verifies ownership/IDOR; `send-direct-email` verifies admin role; `create-checkout-session` wraps errors). The work here is to bring older routes up to that same standard and centralize the primitives so checks cannot drift apart again.

### Business rules that security must enforce (from product owner)
- Customers may book **with or without an account**. Guests may book but with constrained data access.
- **Cash payment is allowed only for registered (authenticated) users.** Guests pay by card only.
- **Subscribers get free bookings** on their subscribed service — "free" must be proven by a verified active subscription, server-side.
- **Admins** can create walk-in bookings for customers and walk-in subscribers, accept/edit/complete bookings, and broadcast/email customers.
- Admin status must be verified from the database, never from client-supplied data.

### Decisions locked during brainstorming
1. **Strict server price authority.** The server recomputes every booking/checkout amount from the database (`service_packages` + `add_ons` + verified subscription) and rejects mismatches. Cash is permitted only for authenticated users. "Free" requires a verified active subscription.
2. **Single role model = `profiles.role`.** `user_type` is dropped from all authorization decisions. Rationale: two sources of truth checked inconsistently is the root cause of missed checks (e.g., `broadcast` unprotected while `send-direct-email` protected). One column, one helper, backed by RLS.
3. **Rate limiting deferred** to a later phase. Phase 1 closes it partially as a side effect by adding auth to currently-unauthenticated routes.

## Findings (audit result)

### Critical
- **C1 — `create-walkin-checkout`: no auth.** Admin action callable by anyone. Trusts client `amount` and injects client-controlled `subscriber_id` / `subscription_vehicle_id` into Stripe metadata the webhook later trusts.
- **C2 — `create-booking-checkout`: no auth, client-set `amount`.** Underpayment fraud (e.g. `amount: 0.50` for a $50 wash); webhook records it paid.
- **C3 — `createBooking` action: free/cash rules client-side only.** Trusts `totalPrice`, `service_package_price`, `payment_method`. Guest can send `payment_method: "cash"`; subscriber "free" price not verified against a real subscription.
- **C4 — `broadcast`: no admin check.** Anyone can email the entire subscriber list. (Sibling `send-direct-email` correctly checks admin.)

### High
- **H1 — `invite-admin`: hardcoded default password (`launchpad2024!`)** for every new admin, and checks `user_type` instead of `role`.
- **H2 — Email HTML injection.** `broadcast` / `send-direct-email` interpolate `title`, `body`, `bannerUrl` into HTML with no escaping; `bannerUrl` unvalidated.

### Medium
- **M1 — Raw `err.message` returned to clients** across many routes; leaks internal/Stripe/DB detail.
- **M2 — ~81 files with `console.log`** printing booking data, emails, Stripe IDs into production logs.
- **M3 — Two role systems** (`role` vs `user_type`) checked inconsistently.

### Stripe-specific
- **S1 — No webhook idempotency.** Stripe retries can double-process (double booking / double subscription change). No dedupe on `event.id`.
- **S2 — Webhook trusts client-set metadata** from the unauthenticated checkout routes; should re-validate IDs it reads.
- **S3 — No Stripe API version pinning** (`new Stripe(key)` with no `apiVersion`).

### RLS (pending data)
- **R1 — RLS policies unverified.** To be reviewed via dashboard SQL paste-back (query below) during implementation. Each business rule above must have a corresponding DB-level policy so app-layer checks are defense-in-depth, not the only line.

## Approach: shared primitives, then route everything through them

Rather than hand-patch each route, establish the primitives the newer code already implies and migrate callers to them. Each primitive is small, testable, and independently shippable.

### 1. Auth helpers — `lib/auth/guards.ts`
- `requireUser()` → returns authenticated user or throws a typed `AuthError` (401).
- `requireAdmin()` → `requireUser()` + verifies `profiles.role === 'admin'` via admin client; throws (403) otherwise.
- Single definition of "who is an admin". Fixes C1, C4, H1, M3.
- Migrate: `create-walkin-checkout`, `create-booking-checkout`, `broadcast`, `invite-admin`, and audit every other route for correct guard.

### 2. Server-side price authority — `lib/pricing/computeBookingAmount.ts`
- Input: service package id, add-on ids, vehicle/subscription context, requested payment method, auth state.
- Looks up authoritative prices from `service_packages` and `add_ons`; verifies subscription for "free" eligibility; enforces cash-only-for-authenticated.
- Returns the authoritative amount + allowed payment method, or rejects.
- All checkout/booking creation paths call this; the client-sent amount is never trusted. Fixes C2, C3, S2.

### 3. Email escaping — `lib/email/escapeHtml.ts` + `bannerUrl` allowlist
- `escapeHtml()` applied to all user/admin-supplied interpolations in email templates.
- `bannerUrl` validated against the Supabase storage domain allowlist.
- Fixes H2.

### 4. Safe error wrapper — `lib/http/apiError.ts`
- `apiError(err, clientMessage, status)` logs full detail server-side, returns a sanitized message to the client.
- Adopt across all API routes. Fixes M1.

### 5. Logger — `lib/log/logger.ts`
- Thin wrapper: `debug`/`info` no-op in production, `error` always logged (without sensitive payloads).
- Replace `console.*` in the audited routes; strip logs that print bookings, emails, Stripe IDs. Addresses M2.

### 6. Stripe hardening
- Add `processed_stripe_events` table (or unique constraint) checked at webhook entry for idempotency (S1).
- Webhook re-validates IDs read from metadata against the DB before acting (S2).
- Pin `apiVersion` on the Stripe client (S3).

### 7. RLS review
- During implementation, run in Supabase Dashboard → SQL Editor:
  ```sql
  select tablename, policyname, cmd, roles, qual, with_check
  from pg_policies where schemaname = 'public' order by tablename;
  ```
- Verify each table enforces the business rules (guest insert constraints, owner-only reads, admin paths). Add/correct policies as migrations. Resolves R1.

## Rollout

Each fix is independently shippable; deploy riskiest-first so money/access gaps close earliest:
C1/C2/C3 (price authority + auth on checkout) → C4/H1 (admin guards) → S1/S2/S3 (webhook) → H2 (email) → M1/M2 (hygiene) → R1 (RLS migrations).

## Out of scope (later phases)
- Code refactor, DB type generation, breaking up monolith files (Phase 2).
- Performance / loading / server-component migration (Phase 3).
- Visual design, theming, dialog/toast replacement of `alert()` (Phase 4).
- Full rate-limiting implementation (deferred; revisit after Phase 1).

## Success criteria
- No checkout/booking path trusts a client-supplied price; mismatches are rejected.
- Cash restricted to authenticated users; "free" requires a verified active subscription — both enforced server-side.
- Every admin-only route blocks non-admins, verified against `profiles.role`.
- Webhook is idempotent and re-validates metadata.
- Email templates escape all dynamic content; `bannerUrl` is allowlisted.
- API routes return sanitized errors; sensitive `console.*` removed from audited routes.
- RLS policies reviewed and corrected to back every business rule at the database.
