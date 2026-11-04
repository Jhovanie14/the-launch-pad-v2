# Marketing Consent and Unsubscribe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record marketing-email consent for account holders and guests, keep a Resend "Product news & offers" topic in step with it, and let unsubscribes made in Resend flow back, so later n8n workflows can safely send promo broadcasts.

**Architecture:** One `marketing_consents` table keyed by normalized email is the source of truth, written only through `recordConsent()` in `lib/marketing/consent.ts`. Every change is pushed to Resend (contact + topic opt-in/opt-out); a failed push leaves `resend_synced_at` null for a daily cron to retry. Consent enters from signup confirmation, the Stripe webhook (guest bookings), the settings switch, admin blocks, and a signed Resend webhook.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + RLS, service-role admin client), Resend SDK 6.11 (installed; `contacts`, `contacts.topics`, `webhooks.verify`), Stripe Checkout, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-05-marketing-consent-design.md`

## Global Constraints

- Checkboxes are **unticked by default**; consent is never inferred from accepting the Terms.
- An unticked checkbox never calls `recordConsent`. Only the settings switch, the Resend webhook/cron, and the admin block action may unsubscribe.
- The settings switch acts on the signed-in user's **auth email**, never an email from the browser.
- Blocked emails (`customer_blocks`, via `findCustomerBlock`) are never subscribed.
- A failed Resend call never fails signup, booking, settings, or blocking.
- Transactional emails (confirmations, receipts, tip, invoices) are untouched.
- n8n never gets database access; nothing in this plan exposes consent data publicly.
- Vitest only runs `lib/**/*.test.ts`: all rules live in `lib/marketing/`.
- Migrations: `supabase/migrations/<timestamp>_<name>.sql`.
- Commits: one concern per commit, **no Co-Authored-By trailer**. The user pushes and merges.
- Env vars introduced: `RESEND_MARKETING_TOPIC_ID`, `RESEND_WEBHOOK_SECRET`, `CRON_SECRET`.
- Checkbox copy: "Email me product news and offers. You can unsubscribe at any time."

## Review Focus

1. **A returning subscriber books as a guest and leaves the box unticked** → they stay subscribed. Tested in Task 4 (`bookingMetaOptsIn` false for missing `mk`) and Task 2 (no unsubscribe path from booking).
2. **The same person with different email spellings** (`John.Doe+x@Gmail.com` vs `johndoe@gmail.com`) → one row. Tested in Task 2 (upsert conflicts on `normalized_email`) and the SQL check in Task 2.
3. **Resend is down or the topic env var is missing** during signup confirmation, the Stripe webhook, or settings → the customer's action still succeeds and the row is saved with `resend_synced_at` null. Tested in Task 2.
4. **A customer who unsubscribed later uses a password-reset or magic link** through `/auth/confirm` → not re-subscribed. Tested in Task 3 (flag cleared after first use; no flag → no call).
5. **A guest later signs up with the same email** → Settings shows their existing subscription, and a later guest booking never wipes the `user_id` link. Tested in Task 2 (`user_id` omitted from the upsert when not provided).

---

### Task 1: Resend contact sync helpers

**Files:**
- Create: `lib/marketing/resendContacts.ts`
- Test: `lib/marketing/resendContacts.test.ts`

**Interfaces:**
- Produces:
  - `type TopicSubscription = "opt_in" | "opt_out"`
  - `interface ResendContactsLike { contacts: { create(o): Promise<{error: unknown}>; topics: { update(o): Promise<{error: unknown}>; list(o): Promise<{data: {data: {id: string; subscription: TopicSubscription}[]} | null; error: unknown}> } } }` (structural subset of `Resend`, so tests pass fakes)
  - `syncContactToResend(resend: ResendContactsLike, topicId: string | undefined, c: { email: string; firstName?: string | null; subscribed: boolean }): Promise<boolean>`
  - `getTopicSubscription(resend: ResendContactsLike, topicId: string, email: string): Promise<TopicSubscription | null>`
  - `getResend(): Resend` (a lazily-created singleton using `RESEND_API_KEY`)

- [ ] **Step 1: Write the failing tests** in `lib/marketing/resendContacts.test.ts`:
  - `"updates the topic to opt_in for an existing contact"`: fake `topics.update` returns `{error: null}` → result `true`, called with `{ email, topics: [{ id: "topic_1", subscription: "opt_in" }] }`, `contacts.create` not called.
  - `"creates the contact opted in when it does not exist"`: `topics.update` returns `{ error: { statusCode: 404, name: "not_found" } }` → `contacts.create` called with `{ email, firstName: "Sam", topics: [{ id: "topic_1", subscription: "opt_in" }] }`, result `true`.
  - `"does not create a contact just to opt it out"`: `subscribed: false`, update returns 404 → `contacts.create` not called, result `true`.
  - `"returns false instead of throwing when Resend fails"`: update rejects with `new Error("network")` → result `false`.
  - `"returns false when the topic id is not configured"`: `topicId` undefined → `false`, no calls.
  - `"reads the topic subscription for a contact"`: `topics.list` returns `{ data: { data: [{ id: "topic_1", subscription: "opt_out" }] }, error: null }` → `"opt_out"`; a list without `topic_1` → `null`.

- [ ] **Step 2: Run** `npx vitest run lib/marketing/resendContacts.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement** the four exports in `lib/marketing/resendContacts.ts`. Treat an error whose `statusCode` is 404 (or `name` is `"not_found"`) as "contact missing". Log failures with a `[marketing]` prefix; never throw.

- [ ] **Step 4: Run** the same command — Expected: PASS (6 tests).

- [ ] **Step 5: Commit**
```bash
git add lib/marketing/resendContacts.ts lib/marketing/resendContacts.test.ts
git commit -m "feat(marketing): Resend contact and topic sync helpers"
```

---

### Task 2: Consent table and `recordConsent`

**Files:**
- Create: `supabase/migrations/20261105000000_marketing_consents.sql`
- Create: `lib/marketing/consent.ts`
- Test: `lib/marketing/consent.test.ts`

**Interfaces:**
- Consumes: `syncContactToResend`, `getResend` (Task 1); `findCustomerBlock(db, { email })` from `lib/customers/customerBlocks.ts`.
- Produces:
  - `type ConsentSource = "signup" | "booking" | "settings" | "resend_unsubscribe" | "resend_preferences" | "block"`
  - `type ConsentStatus = "subscribed" | "unsubscribed"`
  - `interface RecordConsentInput { email: string; userId?: string | null; action: "subscribe" | "unsubscribe"; source: ConsentSource; firstName?: string | null }`
  - `interface RecordConsentResult { outcome: ConsentStatus | "skipped_blocked" | "skipped_invalid"; synced: boolean }`
  - `recordConsent(db: SupabaseClient, input: RecordConsentInput, deps?: { sync?: (c: { email: string; firstName?: string | null; subscribed: boolean }) => Promise<boolean> }): Promise<RecordConsentResult>` (default `sync` = `syncContactToResend(getResend(), process.env.RESEND_MARKETING_TOPIC_ID, c)`)
  - `getConsentStatus(db: SupabaseClient, email: string): Promise<ConsentStatus | null>` (matches on the `normalized_email` column; see Step 4)

- [ ] **Step 1: Write the migration.**
```sql
create table if not exists public.marketing_consents (
  id uuid primary key default gen_random_uuid(),
  email text not null check (position('@' in email) > 1),
  normalized_email text generated always as (public.normalize_block_email(email)) stored,
  user_id uuid references auth.users (id) on delete set null,
  status text not null check (status in ('subscribed', 'unsubscribed')),
  source text not null check (source in ('signup','booking','settings','resend_unsubscribe','resend_preferences','block')),
  subscribed_at timestamptz,
  unsubscribed_at timestamptz,
  resend_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists marketing_consents_normalized_email_key on public.marketing_consents (normalized_email);
create index if not exists marketing_consents_user_id_idx on public.marketing_consents (user_id);
create index if not exists marketing_consents_unsynced_idx on public.marketing_consents (updated_at) where resend_synced_at is null;
alter table public.marketing_consents enable row level security;
-- No policies: service-role only. Also expose normalization for lookups:
grant execute on function public.normalize_block_email(text) to service_role;
```
Add a header comment stating the purpose (consent evidence for UK PECR; source of truth; written only by `lib/marketing/consent.ts`).

- [ ] **Step 2: Write the failing tests** in `lib/marketing/consent.test.ts` with a fake db recording `from(...).upsert(row, opts)`, `.select("id").single()`, `.update(...).eq("id", ...)`, and a fake `rpc` for `find_customer_block`:
  - `"subscribes: upserts on normalized_email with status, source and subscribed_at"`: assert `opts.onConflict === "normalized_email"`, `row.status === "subscribed"`, `row.source === "booking"`, `row.subscribed_at` is an ISO string, `row.resend_synced_at === null`, `row.email === "sam@example.com"` (trimmed input `"  sam@example.com "`).
  - `"unsubscribes: sets status and unsubscribed_at"`.
  - `"does not subscribe a blocked email"`: `find_customer_block` returns a match → outcome `"skipped_blocked"`, no upsert, `sync` not called.
  - `"does not check blocks when unsubscribing"`: rpc not called for `unsubscribe`.
  - `"sets user_id only when given"` (Review Focus 5): with `userId: "u1"` → `row.user_id === "u1"`; without → `"user_id" in row === false`.
  - `"skips an invalid email"`: `"not-an-email"` → `"skipped_invalid"`, no db calls.
  - `"marks the row synced when Resend succeeds"`: `sync` resolves `true` → `update({ resend_synced_at: <ISO> }).eq("id", rowId)`, result `synced: true`, `sync` called with `{ email, firstName, subscribed: true }`.
  - `"keeps the row unsynced and does not throw when Resend fails"` (Review Focus 3): `sync` resolves `false` → no update, result `{ outcome: "subscribed", synced: false }`; `sync` rejects → same result.
  - `"getConsentStatus returns the stored status or null"`.

- [ ] **Step 3: Run** `npx vitest run lib/marketing/consent.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 4: Implement** `recordConsent` and `getConsentStatus` in `lib/marketing/consent.ts`. Order: trim + validate email → (subscribe only) `findCustomerBlock` → upsert (`updated_at: now`, the matching timestamp, `resend_synced_at: null`, `user_id` only if provided) → `.select("id").single()` → `sync` (wrapped in try/catch) → on `true`, set `resend_synced_at`. For `getConsentStatus`, normalize with `db.rpc("normalize_block_email", { p_email })` then `.eq("normalized_email", normalized).maybeSingle()`. Header comment: this is the only writer of `marketing_consents`; unticked boxes must never call it.

- [ ] **Step 5: Run** the same command — Expected: PASS. Then `npm test` — Expected: all files pass.

- [ ] **Step 6: Apply the migration** to the Supabase project the same way as earlier migrations, then verify in the SQL editor:
```sql
insert into public.marketing_consents (email, status, source) values ('John.Doe+x@Gmail.com','subscribed','settings');
insert into public.marketing_consents (email, status, source) values ('johndoe@gmail.com','subscribed','settings');
```
Expected: the second insert fails with a unique violation on `marketing_consents_normalized_email_key` (Review Focus 2). Then `delete from public.marketing_consents where normalized_email = 'johndoe@gmail.com';`

- [ ] **Step 7: Commit**
```bash
git add supabase/migrations/20261105000000_marketing_consents.sql lib/marketing/consent.ts lib/marketing/consent.test.ts
git commit -m "feat(marketing): consent table and recordConsent"
```

---

### Task 3: Signup checkbox, recorded at email confirmation

**Files:**
- Modify: `app/(user)/signup/page.tsx` (checkbox under the Terms checkbox, ~line 171-193)
- Modify: `context/auth-context.tsx:160-215` (`signUp`)
- Create: `lib/marketing/signupConsent.ts`
- Test: `lib/marketing/signupConsent.test.ts`
- Modify: `app/auth/confirm/route.ts`

**Interfaces:**
- Consumes: `recordConsent` (Task 2).
- Produces: `applySignupConsent(admin: SupabaseClient, user: { id: string; email?: string | null; email_confirmed_at?: string | null; user_metadata?: Record<string, unknown> }, deps?: { record?: typeof recordConsent }): Promise<void>`

- [ ] **Step 1: Write the failing tests** in `lib/marketing/signupConsent.test.ts`:
  - `"records a signup subscription for a confirmed user who ticked the box"`: `user_metadata: { marketing_opt_in: true, full_name: "Sam Lee" }`, `email_confirmed_at` set → `record` called with `{ email, userId: user.id, action: "subscribe", source: "signup", firstName: "Sam" }`.
  - `"clears the flag after recording so later confirm links cannot re-subscribe"` (Review Focus 4): `admin.auth.admin.updateUserById` called with `(user.id, { user_metadata: { marketing_opt_in: null } })`.
  - `"does nothing without the flag"`: `marketing_opt_in` absent or `null` → `record` and `updateUserById` not called.
  - `"does nothing for an unconfirmed email"`: `email_confirmed_at: null` → `record` not called.
  - `"never throws"`: `record` rejects → resolves without throwing.

- [ ] **Step 2: Run** `npx vitest run lib/marketing/signupConsent.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement** `applySignupConsent` (first name = first word of `full_name`).

- [ ] **Step 4: Run** it — Expected: PASS.

- [ ] **Step 5: Wire the UI and confirm route.**
  - Signup page: add an unticked `<input type="checkbox" id="marketing" name="marketing">` with the Global Constraints copy, styled like the Terms checkbox.
  - `signUp`: add `marketing_opt_in: formData.get("marketing") === "on"` to `options.data`.
  - `/auth/confirm`: in both success branches (`exchangeCodeForSession` and `verifyOtp` with no error), before redirecting, get the user (`supabase.auth.getUser()`) and `await applySignupConsent(createAdminClient(), user)`. Do not call it in the "already verified" fallback branches.

- [ ] **Step 6: Verify** `npx tsc --noEmit -p .` → exit 0, and `npm test` → all pass.

- [ ] **Step 7: Commit**
```bash
git add "app/(user)/signup/page.tsx" context/auth-context.tsx app/auth/confirm/route.ts lib/marketing/signupConsent.ts lib/marketing/signupConsent.test.ts
git commit -m "feat(marketing): signup opt-in, recorded after email confirmation"
```

---

### Task 4: Guest booking checkbox, recorded after payment

**Files:**
- Modify: `components/booking/ConfirmationStep.tsx` (guest modal, after the email field ~line 351-367; `submitGuest` ~line 120)
- Modify: `hooks/useBookingFlow.ts:34` (`GuestInfo` interface) and `:318-338` (checkout request body)
- Modify: `app/api/checkout_sessions/route.ts:107-127` (`bookingData`)
- Create: `lib/marketing/bookingConsent.ts`
- Test: `lib/marketing/bookingConsent.test.ts`
- Modify: `app/api/webhook/route.ts` (`BookingMetadata` ~line 25; `processBooking` after the successful insert ~line 664)

**Interfaces:**
- Consumes: `recordConsent` (Task 2).
- Produces: `bookingMetaOptsIn(meta: { uid: string | null; em: string; mk?: number } | null): boolean`

- [ ] **Step 1: Write the failing tests** in `lib/marketing/bookingConsent.test.ts`:
  - `"opts in a guest booking with mk: 1 and an email"` → `true`.
  - `"does not opt in when mk is missing"` (Review Focus 1) → `false`.
  - `"does not opt in a signed-in booking even with mk"` (`uid: "u1"`) → `false`.
  - `"does not opt in without an email"` (`em: ""`) → `false`.
  - `"handles null metadata"` → `false`.

- [ ] **Step 2: Run** `npx vitest run lib/marketing/bookingConsent.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement** `bookingMetaOptsIn`.

- [ ] **Step 4: Run** it — Expected: PASS.

- [ ] **Step 5: Wire it through.**
  - Guest modal: unticked checkbox (shadcn `Checkbox` from `components/ui/checkbox.tsx`) with the Global Constraints copy; `GuestInfo` gains `marketingOptIn: boolean` (initial `false`).
  - `useBookingFlow` card branch: add `marketingOptIn: opts.guest?.marketingOptIn === true` to the body.
  - `checkout_sessions`: add `...(!user && body.marketingOptIn === true ? { mk: 1 } : {})` to `bookingData` (keeps the existing 500-character check meaningful).
  - Webhook: add `mk?: number` to `BookingMetadata`; after `bookingRows` is inserted successfully in `processBooking`, `if (bookingMetaOptsIn(bookingMeta)) await recordConsent(supabase, { email: bookingMeta.em, action: "subscribe", source: "booking", firstName: bookingMeta.nm.split(" ")[0] || null })` inside its own try/catch so it can never affect the booking. The duplicate-insert (`23505`) early return stays before it, so a replayed event does not record twice.

- [ ] **Step 6: Verify** `npx tsc --noEmit -p .` → exit 0, `npm test` → all pass.

- [ ] **Step 7: Commit**
```bash
git add components/booking/ConfirmationStep.tsx hooks/useBookingFlow.ts app/api/checkout_sessions/route.ts app/api/webhook/route.ts lib/marketing/bookingConsent.ts lib/marketing/bookingConsent.test.ts
git commit -m "feat(marketing): guest booking opt-in, recorded after payment"
```

---

### Task 5: Settings switch

**Files:**
- Create: `app/(dashboard)/dashboard/settings/marketing-actions.ts` (`"use server"`)
- Create: `components/settings/marketing-consent-switch.tsx` (`"use client"`)
- Modify: `app/(dashboard)/dashboard/settings/setting.tsx` (render the switch at the end of the Profile Settings `CardContent`)

**Interfaces:**
- Consumes: `recordConsent`, `getConsentStatus` (Task 2); `requireUser` from `lib/auth/guards.ts`.
- Produces:
  - `getMyMarketingConsent(): Promise<boolean>`
  - `setMyMarketingConsent(subscribed: boolean): Promise<{ subscribed: boolean; blocked: boolean }>`

- [ ] **Step 1: Implement the server actions.** Both call `requireUser(await createClient())` and use **`user.email`** only. `setMyMarketingConsent` calls `recordConsent(createAdminClient(), { email: user.email, userId: user.id, action, source: "settings", firstName })` and returns `{ subscribed: outcome === "subscribed", blocked: outcome === "skipped_blocked" }`. All rules are already covered by Task 2's tests; these are thin wrappers.

- [ ] **Step 2: Implement the switch.** Uses `components/ui/switch.tsx`, label "Product news and offers by email", helper text "Occasional emails about new products and offers. Booking emails and receipts are always sent." Loads the initial value with `getMyMarketingConsent`, disables while saving, shows a `sonner` toast on success, and on `blocked` shows "We can't subscribe this account. Please contact us." and leaves the switch off.

- [ ] **Step 3: Verify** `npx tsc --noEmit -p .` → exit 0; `npm test` → all pass; then `npx next dev --turbopack`, sign in as a test user, open `/dashboard/settings`, toggle on then off, and confirm in the SQL editor that the user's row flips `subscribed` → `unsubscribed` with `source = 'settings'` and `user_id` set.

- [ ] **Step 4: Commit**
```bash
git add "app/(dashboard)/dashboard/settings/marketing-actions.ts" components/settings/marketing-consent-switch.tsx "app/(dashboard)/dashboard/settings/setting.tsx"
git commit -m "feat(marketing): product news switch in dashboard settings"
```

---

### Task 6: Blocking a customer unsubscribes them

**Files:**
- Modify: `app/api/admin/customer-blocks/route.ts:16-30`

**Interfaces:**
- Consumes: `recordConsent` (Task 2); `blockCustomer` already returns `{ email, plates }`.

- [ ] **Step 1: Implement.** After `blockCustomer` succeeds and `email` is non-empty, `await recordConsent(admin, { email, action: "unsubscribe", source: "block" })` in a try/catch that logs and never fails the block. Leave `unblock/route.ts` unchanged (unblocking does not re-subscribe).

- [ ] **Step 2: Verify** `npx tsc --noEmit -p .` → exit 0; `npm test` → all pass. Behaviour is covered by Task 2's `unsubscribe` tests; the manual check is in Task 8.

- [ ] **Step 3: Commit**
```bash
git add app/api/admin/customer-blocks/route.ts
git commit -m "feat(marketing): unsubscribe customers when they are blocked"
```

---

### Task 7: Resend webhook and daily re-sync cron

**Files:**
- Create: `lib/marketing/resendWebhook.ts`
- Test: `lib/marketing/resendWebhook.test.ts`
- Create: `app/api/webhooks/resend/route.ts`
- Create: `lib/marketing/resync.ts`
- Test: `lib/marketing/resync.test.ts`
- Create: `app/api/cron/marketing-sync/route.ts`
- Create: `vercel.json`

**Interfaces:**
- Consumes: `recordConsent`, `getConsentStatus` (Task 2); `getTopicSubscription`, `syncContactToResend`, `getResend` (Task 1).
- Produces:
  - `decideFromContactEvent(event: { type: "contact.updated" | "contact.deleted"; data: { email: string; unsubscribed: boolean } }, topic: TopicSubscription | null, current: ConsentStatus | null): { action: "subscribe" | "unsubscribe"; source: "resend_unsubscribe" | "resend_preferences" } | null`
  - `resyncUnsynced(db: SupabaseClient, sync: (c: { email: string; subscribed: boolean }) => Promise<boolean>, limit?: number): Promise<{ attempted: number; synced: number }>` (default `limit` 100)

- [ ] **Step 1: Write the failing tests.**
  `lib/marketing/resendWebhook.test.ts`:
  - `"contact.deleted unsubscribes a subscribed customer"` → `{ action: "unsubscribe", source: "resend_unsubscribe" }`.
  - `"a global unsubscribe unsubscribes"` (`data.unsubscribed: true`, current `subscribed`).
  - `"a topic opt-out unsubscribes"` (topic `opt_out`, current `subscribed`).
  - `"a topic opt-in re-subscribes an unsubscribed customer"` → `{ action: "subscribe", source: "resend_preferences" }`.
  - `"no change when Resend already matches us"` (topic `opt_in` + `subscribed`, and `opt_out` + `unsubscribed`) → `null`. This is what stops our own sync from looping through the webhook.
  - `"ignores contacts we have no row for"` (current `null`) → `null`.
  `lib/marketing/resync.test.ts`:
  - `"syncs unsynced rows and stamps resend_synced_at"`: fake select returns two rows (`resend_synced_at is null`, ordered by `updated_at`, limited); `sync` true for one, false for the other → one `update` call, result `{ attempted: 2, synced: 1 }`, `sync` called with `{ email, subscribed: status === "subscribed" }`.

- [ ] **Step 2: Run** `npx vitest run lib/marketing/resendWebhook.test.ts lib/marketing/resync.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement** both lib functions.

- [ ] **Step 4: Run** them — Expected: PASS.

- [ ] **Step 5: Implement the routes.**
  - `app/api/webhooks/resend/route.ts` (`POST`): `const payload = await req.text()`; `getResend().webhooks.verify({ payload, headers: req.headers, webhookSecret: process.env.RESEND_WEBHOOK_SECRET! })` inside try/catch → `400` on failure. Ignore event types other than `contact.updated` / `contact.deleted` (return `200`). Otherwise read `current` with `getConsentStatus`, `topic` with `getTopicSubscription` (skip for `contact.deleted`), apply `decideFromContactEvent`, and call `recordConsent(admin, { email, ...decision })`. If a `resend_preferences` subscribe returns `skipped_blocked`, push the opt-out back with `syncContactToResend(..., { email, subscribed: false })`. Return `200` for all handled cases so Resend does not retry forever.
  - `app/api/cron/marketing-sync/route.ts` (`GET`): reject unless `req.headers.get("authorization") === \`Bearer ${process.env.CRON_SECRET}\`` (`401`); run `resyncUnsynced(createAdminClient(), c => syncContactToResend(getResend(), process.env.RESEND_MARKETING_TOPIC_ID, c))`; return the counts as JSON.
  - `vercel.json`: `{ "crons": [{ "path": "/api/cron/marketing-sync", "schedule": "0 3 * * *" }] }`.

- [ ] **Step 6: Verify** `npx tsc --noEmit -p .` → exit 0; `npm test` → all pass; on the dev server `curl -s -o /dev/null -w "%{http_code}" -X POST localhost:3000/api/webhooks/resend -d '{}'` → `400`, and `curl -s -o /dev/null -w "%{http_code}" localhost:3000/api/cron/marketing-sync` → `401`.

- [ ] **Step 7: Commit**
```bash
git add lib/marketing/resendWebhook.ts lib/marketing/resendWebhook.test.ts lib/marketing/resync.ts lib/marketing/resync.test.ts app/api/webhooks/resend/route.ts app/api/cron/marketing-sync/route.ts vercel.json
git commit -m "feat(marketing): Resend webhook and daily re-sync cron"
```

---

### Task 8: Privacy text, Resend setup, end-to-end check

**Files:**
- Modify: `app/(user)/privacy/page.tsx` (marketing paragraph ~line 148 and the opt-out paragraph ~line 265)

- [ ] **Step 1: Update the privacy text** to say marketing emails are sent only with consent (given at signup, when booking, or in Dashboard → Settings), and that customers can unsubscribe through the link in every marketing email or in Dashboard → Settings. Flag the wording for client approval in the PR description.

- [ ] **Step 2: Commit**
```bash
git add "app/(user)/privacy/page.tsx"
git commit -m "docs(privacy): describe consent-based marketing email and how to unsubscribe"
```

- [ ] **Step 3: Resend and Vercel setup (the user does this; list it in the PR).**
  - In Resend, create the topic "Product news & offers" with default subscription **opt-out**, so only explicitly opted-in contacts receive it. Copy its ID into the Vercel env var `RESEND_MARKETING_TOPIC_ID`.
  - Create a Resend webhook to `https://www.thelaunchpadwash.com/api/webhooks/resend` for `contact.updated` and `contact.deleted`; put its signing secret in `RESEND_WEBHOOK_SECRET`.
  - Set `CRON_SECRET` (any long random string) in Vercel.

- [ ] **Step 4: End-to-end check on the preview deploy** (the spec's manual tests):
  1. Sign up with the box ticked → no row until the email is confirmed; after confirming, a `subscribed` / `signup` row exists and the Resend contact is opted in to the topic.
  2. Use "forgot password" for the same account after switching off in Settings → the row stays `unsubscribed` (Review Focus 4).
  3. Book and pay as a guest with the box ticked → a `booking` row after payment; abandon a second checkout with the box ticked using another email → no row.
  4. Block a subscribed test customer in admin → row `unsubscribed` / `block`, Resend topic opt-out.
  5. Send a Resend test broadcast to the topic and click its unsubscribe link → within a minute the row flips to `unsubscribed` / `resend_unsubscribe`.

- [ ] **Step 5: Only if check 5 does not flip the row** (Resend does not send `contact.updated` for topic changes): extend `resyncUnsynced` into the cron with a second pass that, for up to 100 `subscribed` rows per run ordered by oldest `resend_synced_at`, reads `getTopicSubscription` and applies `decideFromContactEvent` (as `contact.updated` with `unsubscribed: false`). Add a test `"pulls a Resend opt-out into our table"` to `lib/marketing/resync.test.ts` first. Commit as `feat(marketing): daily pull of Resend topic status`.
