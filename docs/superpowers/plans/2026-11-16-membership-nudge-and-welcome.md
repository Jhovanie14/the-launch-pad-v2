# Membership Nudge and Welcome Emails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two daily automatic marketing emails: a membership nudge after a customer's second paid wash in 30 days, and a welcome after someone first opts in.

**Architecture:** Same shape as win-back: a pure recipient finder and email builder in `lib/marketing/`, a cron route per email with a `CRON_SECRET` check and `?dryRun=1`, sending through Resend `batch.send` with idempotency keys. Win-back's sender and member check are extracted into shared modules first.

**Tech Stack:** Next.js 16 route handlers, Supabase JS, Resend SDK, Vitest (runs `lib/**/*.test.ts` only).

**Spec:** `docs/superpowers/specs/2026-11-16-membership-nudge-and-welcome-design.md`

## Global Constraints

- Only opted-in (`marketing_consents.status = 'subscribed'`), non-member customers get either email.
- Paid wash = `status = 'completed'`, `payment_method` in (`card`, `cash`), `Number(total_price) > 0`.
- Nudge: paid wash **yesterday** (Houston) and **exactly 2** paid washes in yesterday − 29 … yesterday.
- Welcome: consent row `created_at` falls on **yesterday** in Houston, `status = 'subscribed'`, `unsubscribed_at` null. Never `subscribed_at`.
- Dates via `houstonToday()` / `addDays()` from `lib/admin/bookingQuery.ts`.
- Membership price text: `$39.99 a month`; first-month offer line only when `FIRST_SUBSCRIPTION_PROMO.enabled`.
- Nudge never claims a saving.
- Footer note: "You're getting this email because you asked for news and offers from The Launch Pad."
- Every send: per-recipient `unsubscribeUrl(...)`, headers `List-Unsubscribe: <oneClick>` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`, `batch.send` chunks of 100, idempotency key `<prefix>/<today>/<chunk>`.
- Cron schedule `0 16 * * *`. Routes skip sending when `MARKETING_UNSUBSCRIBE_SECRET` is unset.
- Never call the routes without `dryRun=1` during development: they email real customers.
- CRLF: edit existing CRLF files with the Edit tool, not sed (see repo note).
- Commits: no Co-Authored-By trailer.

## Review Focus

1. Same person booked under `Sam@x.com` and `sam@x.com` → treated as one customer, one email (Task 2 test).
2. A third paid wash yesterday (3 in window) → no nudge (Task 2 test).
3. `total_price` arriving as a string (`"25.00"`, numeric column) → summed as a number (Task 2 test).
4. Consent made at 9:30pm Houston = next UTC day → counted on the Houston date (Task 3 test).
5. An opted-in active member → no welcome and no nudge (Tasks 2 and 3 tests).

---

### Task 1: Shared sender, member check and test fake; win-back switched over

**Files:**
- Create: `lib/marketing/testing/fakeDb.ts`
- Create: `lib/marketing/sendMarketingBatch.ts`, `lib/marketing/sendMarketingBatch.test.ts`
- Create: `lib/marketing/members.ts`, `lib/marketing/members.test.ts`
- Modify: `lib/marketing/winback.ts` (use the two new modules), `lib/marketing/winback.test.ts` (import the fake)

**Interfaces:**
- Produces:
  - `fakeDb(tables: Record<string, Row[]>)`: win-back's in-memory fake moved here, plus `gte`, `lte`, `lt` (string compare, like `gt`).
  - `interface MarketingResendLike` (win-back's `WinbackResendLike` shape); `winback.ts` keeps `export type WinbackResendLike = MarketingResendLike`.
  - `sendMarketingBatch<R extends { email: string }>(resend: MarketingResendLike, recipients: R[], opts: { secret: string; siteUrl: string; today: string; keyPrefix: string; build: (r: R, unsubscribeUrl: string) => { subject: string; html: string } }): Promise<{ sent: number; failed: number }>`
  - `findMemberAccounts(db: SupabaseClient, emails: string[], userIds: string[]): Promise<(email: string, userIds: Iterable<string>) => boolean>`: returns an `isMember` check. Active rows in `user_subscription` or `self_service_subscriptions`, matched by any given user id or by a `profiles` row with that email (case-insensitive).

- [ ] **Step 1: Move the fake** from `winback.test.ts` to `lib/marketing/testing/fakeDb.ts` (export `fakeDb`, `type Row`), add `gte`/`lte`/`lt`; import it in `winback.test.ts`. Run `npx vitest run lib/marketing/winback.test.ts`; expected PASS (unchanged count).

- [ ] **Step 2: Write failing tests**
  - `sendMarketingBatch.test.ts`: "sends in chunks of 100 with key `<prefix>/<today>/<n>` and one-click headers" (250 recipients → 3 calls, keys `nudge/2026-11-16/0..2`, each email has `List-Unsubscribe-Post`); "counts a failed or throwing batch as failed and continues"; "does nothing for no recipients".
  - `members.test.ts`: "finds members by account id"; "finds members by profile email, any case"; "ignores ended plans (status other than active)"; "checks self-service plans too".

- [ ] **Step 3: Run** `npx vitest run lib/marketing/sendMarketingBatch.test.ts lib/marketing/members.test.ts`; expected FAIL (modules missing).

- [ ] **Step 4: Implement** both modules by lifting the code out of `winback.ts` (`sendWinbackEmails` body; the profiles + `activePlans` part of `findWinbackRecipients`). Then make `sendWinbackEmails(resend, recipients, opts)` call `sendMarketingBatch` with `keyPrefix: "winback"` and `build: (r, url) => buildWinbackEmail({ firstName: r.firstName, unsubscribeUrl: url })`, and `findWinbackRecipients` use `findMemberAccounts`. Log label in `sendMarketingBatch` errors: `[marketing] ${keyPrefix} batch failed:`.

- [ ] **Step 5: Run** `npx vitest run lib/marketing`; expected all PASS, win-back tests unchanged.

- [ ] **Step 6: Commit** `refactor(marketing): shared batch sender and member check (win-back unchanged)`.

### Task 2: Membership nudge

**Files:**
- Create: `lib/marketing/nudge.ts`, `lib/marketing/nudge.test.ts`

**Interfaces:**
- Consumes: `findMemberAccounts`, `fakeDb`, `getConsentStatus` (for the default `isOptedIn`, as win-back does).
- Produces:
  - `NUDGE_WINDOW_DAYS = 30`, `NUDGE_AT_PAID_WASHES = 2`
  - `isPaidWash(b: { status: string; payment_method: string | null; total_price: unknown }): boolean`
  - `interface NudgeRecipient { email: string; firstName: string | null; washes: number; spent: number }`
  - `findNudgeRecipients(db, today: string, deps?: { isOptedIn?: (email: string) => Promise<boolean> }): Promise<NudgeRecipient[]>`
  - `buildNudgeEmail(r: { firstName: string | null; washes: number; spent: number; unsubscribeUrl: string }): { subject: string; html: string }`

- [ ] **Step 1: Write failing tests** (`TODAY = "2026-11-16"`, yesterday `2026-11-15`, window start `2026-10-17`):
  - "nudges an opted-in customer whose second paid wash was yesterday" → `[{ email, firstName: "Sam", washes: 2, spent: 50 }]` from two $25 card washes on 2026-10-20 and 2026-11-15.
  - "not after a third paid wash" (three in window) → `[]`.
  - "not after a first paid wash" → `[]`.
  - "ignores washes before the window" (other wash on 2026-10-16) → `[]`.
  - "subscription, free and not-completed bookings don't count" (`payment_method: "subscription"`, `total_price: 0`, `status: "pending"` as the second booking) → `[]`.
  - "groups by email in any case and by account" (`Sam@x.com` + `sam@x.com`; and an older wash under the same `user_id` with another email) → one recipient, `washes: 2`.
  - "sums total_price given as strings" (`"25.00"`, `"33.50"`) → `spent: 58.5`.
  - "skips members and people not opted in".
  - `isPaidWash`: card $25 completed → true; cash → true; subscription → false; `"0"` → false; pending → false.
  - `buildNudgeEmail`: subject is `"Two washes this month? A membership could save you money"`; html contains `$50.00`, `2 washes`, `$39.99`, `/pricing`, the escaped first name, the unsubscribe URL; contains `10% off` only when the promo is enabled; does not contain "save $".

- [ ] **Step 2: Run** `npx vitest run lib/marketing/nudge.test.ts`; expected FAIL.

- [ ] **Step 3: Implement.** Query 1: `bookings` completed on yesterday → keep `isPaidWash`. Query 2: `bookings` completed with `appointment_date` gte window start, lte yesterday, `.in("customer_email", emails)`; query 3: same with `.in("user_id", userIds)`. Count distinct paid booking ids per person (person = lower-cased email key, plus their user ids); recipient when count equals `NUDGE_AT_PAID_WASHES`. `spent` = sum of `Number(total_price)` over those bookings. Email copy: greeting with first name; "You've paid $X for N washes in the last 30 days."; "Unlimited memberships start at $39.99 a month" + offer line; button "See the plans" → `${SITE_URL}/pricing`; "No contract. Cancel any time."; footer note from Global Constraints. Use `money()` from layout.

- [ ] **Step 4: Run** `npx vitest run lib/marketing/nudge.test.ts`; expected PASS.

- [ ] **Step 5: Commit** `feat(marketing): membership nudge recipients and email`.

### Task 3: Welcome

**Files:**
- Create: `lib/marketing/welcome.ts`, `lib/marketing/welcome.test.ts`

**Interfaces:**
- Consumes: `findMemberAccounts`, `fakeDb`, `houstonToday`, `addDays`.
- Produces:
  - `interface WelcomeRecipient { email: string; firstName: string | null }`
  - `findWelcomeRecipients(db, today: string): Promise<WelcomeRecipient[]>`
  - `buildWelcomeEmail(r: { firstName: string | null; unsubscribeUrl: string }): { subject: string; html: string }`

- [ ] **Step 1: Write failing tests** (`TODAY = "2026-11-16"`):
  - "welcomes someone whose consent row was created yesterday (Houston)" (`created_at: "2026-11-15T15:00:00Z"`).
  - "uses the Houston date: 9:30pm Houston on the 15th is 03:30Z on the 16th" (`"2026-11-16T03:30:00Z"`) → included; `"2026-11-15T04:00:00Z"` (10pm on the 14th Houston) → excluded.
  - "never by subscribed_at: an old row re-ticked yesterday is skipped" (`created_at` 2026-11-01, `subscribed_at` 2026-11-15) → `[]`.
  - "skips unsubscribed rows and rows with unsubscribed_at set".
  - "skips active members (by consent user_id or profile email)".
  - "first name from the profile, else null".
  - `buildWelcomeEmail`: subject `"Welcome to The Launch Pad"`; html contains `10410 S Main St`, `/service`, `$39.99`, escaped name, unsubscribe URL; offer line only when promo enabled.

- [ ] **Step 2: Run** `npx vitest run lib/marketing/welcome.test.ts`; expected FAIL.

- [ ] **Step 3: Implement.** Query `marketing_consents` (`email, user_id, created_at, unsubscribed_at`) with `status = subscribed`, `created_at` gte `${addDays(yesterday,-1)}T00:00:00Z` and lt `${addDays(today,1)}T00:00:00Z`; keep rows where `houstonToday(new Date(created_at)) === yesterday` and `unsubscribed_at` is null. Names: `profiles` (`id, email, full_name`) by user id or email. Exclude members via `findMemberAccounts`. Copy per spec "What they say → Welcome".

- [ ] **Step 4: Run** `npx vitest run lib/marketing/welcome.test.ts`; expected PASS.

- [ ] **Step 5: Commit** `feat(marketing): welcome email recipients and email`.

### Task 4: Cron routes and schedule

**Files:**
- Create: `app/api/cron/marketing-nudge/route.ts`, `app/api/cron/marketing-welcome/route.ts`
- Modify: `vercel.json`

**Interfaces:**
- Consumes: `findNudgeRecipients`, `buildNudgeEmail`, `findWelcomeRecipients`, `buildWelcomeEmail`, `sendMarketingBatch`, `getResend`, `houstonToday`, `SITE_URL`.

- [ ] **Step 1: Write both routes** as copies of `app/api/cron/marketing-winback/route.ts`: 401 without `Bearer ${CRON_SECRET}`; `{ skipped }` without `MARKETING_UNSUBSCRIBE_SECRET`; `?dryRun=1` returns `{ today, recipients: n, dryRun: true }`; otherwise `sendMarketingBatch` with `keyPrefix` `"nudge"` / `"welcome"`; errors logged as `[cron/marketing-nudge]` / `[cron/marketing-welcome]` and 500.

- [ ] **Step 2: Add crons** to `vercel.json`: `{ "path": "/api/cron/marketing-nudge", "schedule": "0 16 * * *" }`, `{ "path": "/api/cron/marketing-welcome", "schedule": "0 16 * * *" }`.

- [ ] **Step 3: Verify** `npx vitest run` (all pass), `npx tsc --noEmit -p .` (no output), `npx eslint lib/marketing app/api/cron` (no errors).

- [ ] **Step 4: Commit** `feat(marketing): daily cron routes for the nudge and welcome emails`.
