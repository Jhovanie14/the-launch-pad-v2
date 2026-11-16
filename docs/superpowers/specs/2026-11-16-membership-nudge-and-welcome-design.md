# Membership nudge and welcome emails (design)

Date: 2026-11-16. Size: small project, following the win-back pattern.

## Why

Win-back (`lib/marketing/winback.ts`) is the only automatic marketing email.
The user wants more of them, built inside the app (the boss ruled out n8n and
other outside tools; see `2026-11-05-marketing-consent-design.md`, whose n8n
part is replaced).

- **Membership nudge**: turn regular pay-per-wash customers into members.
  The one with a direct payoff (each conversion is $39.99+ a month).
- **Welcome**: greet people who just opted in to news and offers and aren't
  members yet.

## Decided by the user

- Build **nudge** and **welcome**. **No post-visit thank-you**: the tip email
  sent on Complete already thanks the customer and asks for a Google review.
- Nudge trigger: the customer's **second paid wash within 30 days**.
- Approach **A**: one daily cron route per email, like win-back, with the
  shared sending code factored out.
- The existing emails (tip/thank-you, member welcome, win-back) get a more
  premium, formal, plain look. That is a **separate piece of work** after
  this one; these two emails use the shared layout helpers so they pick up
  the new look automatically.

## Goals

- Opted-in, non-member customers get one nudge after their second paid wash
  in 30 days, and one welcome after they first opt in.
- Nobody gets the same email twice for the same trigger.
- Sends stay tiny next to the Resend free plan's 100 a day, which booking
  confirmations, tip emails and receipts also use.

## Non-goals

- No send log table, no migration (stateless, like win-back).
- No admin UI for these emails; no editing copy from the admin.
- No retroactive welcome for people who opted in before launch.

## Anti-goals (a failure even if it works)

- Emailing anyone not opted in (`marketing_consents.status = 'subscribed'`),
  any active member, or any blocked customer.
- The same person getting a welcome more than once.
- A nudge after every wash.
- Sending campaigns or automatic emails in a way that eats the daily cap
  needed by booking emails.

## Approaches considered

- **A. One cron route per email (picked).** `/api/cron/marketing-nudge` and
  `/api/cron/marketing-welcome` beside win-back. Proven pattern, each email
  fails on its own, each has `?dryRun=1`. Costs a small refactor of
  win-back's sending code into a shared helper.
- B. One daily route running win-back, nudge and welcome in turn. One
  schedule, but a bigger rewrite of working win-back and a failure needs care
  not to stop the later emails.
- C. Send on the event (Complete, opt-in). Dropped: the nudge would land in
  the same minute as the tip email and receipt, and it would tie marketing
  email into the attendants' Complete button.

Vercel Hobby allows 100 cron jobs per project, run daily, so two more is fine.

## Who gets each email

Dates are Houston dates (`houstonToday()`); "yesterday" = today − 1.

**Common exclusions (both emails):** not opted in (consent status other than
`subscribed`); an active `user_subscription` or `self_service_subscriptions`
row on the account (found by booking `user_id` or a profile with that email,
as win-back does). Blocked customers are covered by consent: blocking
unsubscribes them, and `recordConsent` refuses to subscribe a blocked email.

**Paid wash:** a booking with `status = 'completed'`, `payment_method` of
`card` or `cash` (not `subscription`), and `total_price > 0`.

**Nudge:** the customer (grouped by lower-cased `customer_email`, plus
`user_id` when present) had a paid wash **yesterday**, and has **exactly 2**
paid washes with `appointment_date` in the 30 days ending yesterday
(yesterday − 29 … yesterday). Exactly 2 means a third wash doesn't send it
again; a customer who later has another run of two paid washes in 30 days
can get it again, which is fine.

**Welcome:** a `marketing_consents` row whose **`created_at` Houston date is
yesterday**, `status = 'subscribed'` and `unsubscribed_at is null`.
`created_at` is set once when the row is first made; `subscribed_at` is not
used because `recordConsent` refreshes it on every opt-in (every booking with
the box ticked). First name: from the account profile or latest booking if
available, otherwise no name.

## What they say (draft copy; the restyle may make it more formal)

**Nudge.** Subject: "Two washes this month? A membership could save you money".
Greeting with first name; "You've paid $X for N washes in the last 30 days."
(N = 2, X = sum of their `total_price`); "Unlimited memberships start at
$39.99 a month" plus the first-month offer line when
`FIRST_SUBSCRIPTION_PROMO.enabled`; button "See the plans" → `/pricing`;
"No contract. Cancel any time." Never claim a specific saving.

**Welcome.** Subject: "Welcome to The Launch Pad". Thanks for signing up for
news and offers; what we are and where (10410 S Main St; express washes and
detailing, booked online); button "Book a wash" → `/service`; membership
line from $39.99 with the first-month offer when enabled.

Both: built with `emailLayout` / `heading` / `paragraph` / `button` from
`lib/email/layout.ts`, footer note "You're getting this email because you
asked for news and offers from The Launch Pad.", per-recipient HMAC
unsubscribe link, `List-Unsubscribe` + `List-Unsubscribe-Post` headers.
`$39.99` is the same hardcoded figure the site and win-back use.

## How it's built

- `lib/marketing/sendMarketingBatch.ts` (new): win-back's batch sender made
  generic: takes recipients, a builder, and an idempotency-key prefix;
  `batch.send` in chunks of 100 with key `<prefix>/<today>/<chunk>`.
  Win-back is switched to it with no behaviour change (its tests keep passing).
- `lib/marketing/nudge.ts` and `lib/marketing/welcome.ts` (new): a pure
  recipient finder (`findNudgeRecipients(db, today, deps)`,
  `findWelcomeRecipients(db, today, deps)`) and email builder each, with
  Vitest tests using the in-memory Supabase fake from `winback.test.ts`.
- `app/api/cron/marketing-nudge/route.ts`, `app/api/cron/marketing-welcome/route.ts`
  (new): copy of the win-back route: `CRON_SECRET` bearer check, skip when
  `MARKETING_UNSUBSCRIBE_SECRET` is unset, `?dryRun=1` returns counts only.
- `vercel.json`: two crons at `0 16 * * *` (10am Houston in winter), same as
  win-back.

## Left to the builder

- Exact query shapes and how the shared Supabase fake is reused.
- Copy wording within the draft above.
- Whether the shared member check is extracted from win-back or duplicated.

## How to check

- `npx vitest run`, `npx tsc --noEmit -p .`, eslint on touched files.
- After deploy: both routes return 401 without the secret; with it and
  `?dryRun=1` they return `{ today, recipients, dryRun: true }`.
- Don't call the routes without `dryRun` from here: they email real customers.
