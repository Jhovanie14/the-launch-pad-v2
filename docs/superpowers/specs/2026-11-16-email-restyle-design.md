# Email restyle: quiet formal (design)

Date: 2026-11-16. Size: small change across the shared email layout and five emails' copy.

## Why

The user wants the emails to feel **more premium and formal, plain and simple**.
From side-by-side previews of the thank-you/tip email they picked
**A. Quiet formal** over the current look and a "classic premium" serif option.

## Decided by the user

- Look A applies to **every** email (one shared layout, `lib/email/layout.ts`).
- Formal wording for the **tip/thank-you**, **new-member welcome**, **win-back**,
  and the **nudge** and **welcome** from PR #13 (as previewed: "Dear James,",
  "Kind regards, The Launch Pad").
- Previews of the rewritten emails before the PR.

## The look (A)

- White page, no tinted canvas, no navy band, no rounded card.
- Header: small centred logo (40px) over the wordmark "THE LAUNCH PAD" in
  12px, letter-spacing 0.28em, navy, then a 1px `#e5e8ec` rule.
- `heading()`: 22px, weight 500, navy, letter-spacing -0.01em.
- Body text 15px, line-height 1.7, ink `#1f2a3a`; muted text `#5b6675`.
- `button()` primary: navy `#041335` background, white text, 2px radius,
  13px uppercase, letter-spacing 0.12em, weight 600. Secondary: an underlined
  navy text link (no box).
- `details()`: hairline rows (`#e5e8ec`), no tinted box; last row emphasis
  weight 600 instead of 900.
- `notice()`: kept, quieter tints, 2px radius.
- Footer: 12px grey `#7a8594`, centred, after a 1px rule.
- `signoff()`: "Kind regards,<br>The Launch Pad" (used by 16 emails).
- Mobile: the existing media query stays (button full width, tighter padding).

## Approaches

- **Restyle the shared helpers in place (picked).** Every email changes together.
- A second layout for marketing only: rejected, it would leave booking,
  receipt and billing emails casual next to formal marketing ones.

## Copy (formal, US spelling, no exclamation marks)

- Tip: subject "Thank you for visiting The Launch Pad", wording as previewed.
- Member welcome (first payment of `buildSubscriptionInvoiceEmail`), win-back,
  nudge, welcome: same register. Facts (prices, dates, offer, links) unchanged.
- Other emails keep their wording; they get the new look and sign-off only.

## Constraints

- Inline styles, presentational tables, `text()` on every dynamic value (as now).
- Tests that find the primary button by the old flame colour switch to the
  new navy button style; one h1 and one primary button per email still hold.
- Supabase account emails (`supabase/templates/`) are regenerated with
  `node scripts/build-auth-emails.mjs`; the user pastes them into Supabase.

## Left to the builder

Exact copy within the register above; spacing details within the look above.
