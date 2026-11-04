# Marketing consent and unsubscribe (email automation, stage 1)

## Why

Launchpad Wash now sells products, and the goal is automated promotional
emails (product launches, digests, aftercare suggestions, win-back offers)
orchestrated by **n8n** and sent through **Resend**. Before any promotional
email can go out, two things must be true:

- **Legal:** UK PECR and UK GDPR require recorded consent (or a valid soft
  opt-in) and an easy way to unsubscribe in every message.
- **Deliverability:** Gmail and Yahoo require bulk senders to offer one-click
  unsubscribe; without it, promo mail lands in spam and harms the domain that
  also sends booking confirmations and receipts.

Today no marketing consent is recorded anywhere. Signup only has a "Terms and
Privacy" checkbox, guest bookings collect an email for confirmations only, and
the privacy page promises an unsubscribe link that does not exist.

This stage builds the consent record and the unsubscribe loop, so every later
n8n workflow only has to "send a Resend broadcast to the opted-in topic" and
never needs access to the customer database.

## Goals

1. Record marketing consent for **account holders and guests**, with when and
   where it was given or withdrawn.
2. Capture consent in three places:
   - an **unticked** checkbox at signup,
   - an **unticked** checkbox on the guest booking form (user's decision),
   - an on/off switch in Dashboard → Settings.
3. Keep Resend in step: a subscribed customer is a Resend contact opted in to a
   "Product news & offers" topic; an unsubscribed one is opted out.
4. Changes made through Resend (the one-click unsubscribe link in broadcasts,
   and Resend's preferences page) flow back into our database.
5. Blocked customers (`customer_blocks`, kind `email`) are never subscribed,
   and blocking an already-subscribed customer unsubscribes them.

## Non-goals (later stages)

- Sending any promotional email, and any n8n workflow.
- Audience segments (detailing customers, subscribers, product buyers). Added
  when the lifecycle workflows need them.
- Replacing `/api/broadcast` (it has no unsubscribe link; it is retired when the
  n8n digest replaces it).
- Backfilling existing customers. Waits on the client's answer about whether
  they can be emailed under soft opt-in or need a re-permission email first.
- Double opt-in (confirmation email before subscribing). My call: the booking
  confirmation already goes to that address, and the client wants low friction.
  Easy to add later.

## Anti-goals (failure even if it "works")

- A pre-ticked box, or consent inferred from accepting the Terms.
- Any unauthenticated way to change someone else's preference. In particular,
  **leaving the booking checkbox unticked must never unsubscribe anyone**:
  otherwise anyone could unsubscribe a customer by booking with their email,
  and a returning subscriber would silently lose their subscription. The only
  unauthenticated unsubscribe is Resend's own signed link.
- Giving n8n database access or the Supabase service-role key.
- Marketing preferences affecting transactional email (booking confirmations,
  receipts, tip emails, invoices stay as they are).

## Design

### Data: one consent table keyed by email

New table `public.marketing_consents`. One row per normalized email, because
guests have no profile, and one table serves both guests and account holders.

| column | notes |
|---|---|
| `id` | uuid primary key |
| `email` | as last entered |
| `normalized_email` | unique; normalize the same way as `customer_blocks` (`public.normalize_block_email`) so blocked-email checks match |
| `user_id` | nullable, references `auth.users`, `on delete set null`; set when the email belongs to an account |
| `status` | `subscribed` or `unsubscribed` |
| `source` | what caused the latest change: `signup`, `booking`, `settings`, `resend_unsubscribe`, `resend_preferences`, `block` |
| `subscribed_at`, `unsubscribed_at` | timestamps of the latest change in each direction (the consent evidence) |
| `resend_synced_at` | null when the latest change has not reached Resend yet |
| `created_at`, `updated_at` | |

RLS enabled with **no** anon or authenticated policies: all reads and writes go
through server code using the admin client. A guest who later signs up with the
same email gets `user_id` filled in on their next consent write or when the
settings page loads.

### Write rules (one tested function in `lib/`)

A single function, e.g. `recordConsent(db, { email, userId, action, source })`,
is the only writer. Rules:

- `subscribe`: upsert to `subscribed`, set `subscribed_at`. If the email is
  blocked, do nothing. Callers: signup confirmation, the Stripe webhook (guest
  booking), the settings switch, and the verified Resend webhook or
  reconciliation (`resend_preferences`).
- `unsubscribe`: set `unsubscribed`, set `unsubscribed_at`. Callers: the
  signed-in settings switch (for the user's own auth email), the verified
  Resend webhook or reconciliation (`resend_unsubscribe`), and the admin
  block action (`block`).
- Unticked checkboxes do not call it at all.
- Repeating the same action is harmless (idempotent).
- The settings switch always uses the signed-in user's **auth email** and never
  an email supplied by the browser.

### Where consent is captured

- **Signup** (`app/(user)/signup/page.tsx`): unticked checkbox under the Terms
  checkbox, worded along the lines of "Email me product news and offers. You
  can unsubscribe at any time." Signup runs in the browser
  (`supabase.auth.signUp` in `context/auth-context.tsx`) and requires email
  confirmation. The tick is stored in the new user's metadata at signup and
  **recorded only after the email is confirmed**, in `app/auth/confirm/route.ts`
  after a successful `verifyOtp` of the signup type. My call: this way nobody
  can subscribe a stranger's address by signing it up, and there is no
  unauthenticated "subscribe this email" endpoint.
- **Guest booking** (`components/booking/ConfirmationStep.tsx`, guest details
  section): the same checkbox. Guests always pay by card: the booking is sent
  to `/api/checkout_sessions` (packed into Stripe session metadata, max 500
  characters) and the booking row is only inserted by `app/api/webhook/route.ts`
  on `checkout.session.completed`. So the opt-in travels in the session
  metadata under a short key and is **recorded in the webhook after the
  booking is inserted**. An abandoned or failed checkout records nothing. The
  webhook already de-duplicates events (`processed_stripe_events`), and
  `recordConsent` is idempotent, so a repeated event is harmless. My call:
  shown to guests only; signed-in users manage it in Settings.
- **Settings** (`app/(dashboard)/dashboard/settings/setting.tsx`): an on/off
  switch in the Profile Settings card, showing the current status.

### Keeping Resend in step

- After every consent change, upsert the Resend contact (email, first name)
  and set its opt-in or opt-out on the "Product news & offers" topic. The topic
  ID comes from an environment variable (e.g. `RESEND_MARKETING_TOPIC_ID`).
- A failed Resend call must not fail the customer's action (signup, booking,
  settings). Leave `resend_synced_at` null and retry later. The builder picks
  the retry mechanism; the minimum is a way to re-sync all unsynced rows.

### Blocking a customer

When an admin blocks an email (`/api/admin/customer-blocks`, kind `email`, or a
user whose account email is blocked), call `recordConsent` with `unsubscribe` /
`block`, which also opts the contact out in Resend. Unblocking does **not**
restore the subscription; the customer can opt in again themselves. My call:
the safe default for someone the business chose to block.

### Changes coming back from Resend

- A webhook route (e.g. `/api/webhooks/resend`) verifies Resend's signature
  (secret in an environment variable) and rejects unverified requests.
- **The customer's latest choice wins, wherever they made it.** A topic opt-out
  in Resend records `unsubscribe` / `resend_unsubscribe`. A topic opt-in made on
  Resend's preferences page records `subscribe` / `resend_preferences`, unless
  the email is blocked, in which case the opt-out is pushed back to Resend. My
  call: overriding a customer's own re-subscribe would be wrong, and the block
  rule still holds.
- Requirement: our database reflects a change made in Resend **within 24
  hours**. If Resend does not emit a usable event for topic changes, a daily
  reconciliation that reads contact topic status from Resend meets this
  requirement instead, applying the same rules. Resend itself always honours an
  unsubscribe when sending broadcasts, so a short lag never causes an unwanted
  email.
- The re-sync of unsynced rows (`resend_synced_at` null) pushes our status to
  Resend; those rows are by definition our latest change.

### Privacy page

Update the marketing paragraph in `app/(user)/privacy/page.tsx` to describe
consent-based marketing email and how to unsubscribe (link in every email, or
Dashboard → Settings). The client should approve the final wording.

## Constraints

- Next.js 16 App Router, Supabase (Postgres + RLS), Resend SDK `^6.1`
  (exposes `Contacts`, `Topics`, `Segments`, `Broadcasts`), Vitest. Vitest only
  runs `lib/**/*.test.ts`, so rules and payload handling live in `lib/`.
- Migrations go in `supabase/migrations/` with the existing timestamp naming.
- Commits: one concern per commit, no co-author trailer. The user pushes and
  merges PRs.
- Not legal advice: the client confirms consent wording and the privacy text.

## Testing

- Unit tests: `recordConsent` rules (unticked never unsubscribes, blocked
  emails are not subscribed, idempotency, email normalization, user linking),
  reading the opt-in from Stripe session metadata, Resend webhook payload
  handling (opt-out, opt-in, opt-in while blocked) and signature rejection.
- Manual on a preview deploy: sign up with the box ticked and confirm nothing
  is recorded until the email is confirmed; switch off in Settings (Resend
  topic opted out); book and pay as a guest with the box ticked (row created
  after payment, none for an abandoned checkout); block a subscribed customer
  (row flips to `unsubscribed`); unsubscribe through a Resend test broadcast
  and confirm the row flips to `unsubscribed`.

## Left to the builder

Exact Resend SDK calls and webhook event names (check the installed `resend`
types and Resend docs), the retry and reconciliation mechanism, migration
details, and final UI copy within the wording above.
