# Marketing footer (short design)

Date: 2026-11-20. Status: approved by the user ("go ahead").

## Intent

The public footer (`components/user/footer.tsx`, on every page in `app/(user)`) is the last old-style part of the public frame. It uses a slate hex, grey text, blue links and hover tooltips. Restyle it as the navbar's navy sibling, keeping its links, and fix two content bugs.

## Approaches

1. **Restyle with the links kept (picked):** same columns, regrouped, on the tokens. The link lists live in a tested lib file.
2. Slim one-row footer. Rejected: it would drop the address, hours and contact that people scroll down for.

## Decisions

- **Look:** Night background, tokens only, no flame control (each page has its own). The columns stack on phones and sit four across from 1024px. Links are On Night Muted and turn On Night on hover, with the Flame focus outline. Targets are at least 44px tall on phones.
- **Brand column:** the logo, "The Launch Pad", the existing one-line description, and Instagram, Facebook and TikTok as 44px icon links with correct labels.
- **Visit column:**
  - "10410 S Main St, Houston, TX 77025", linked to Google Maps (new tab);
  - "Self-service bays: open 24/7";
  - "Detailing: Thu–Sun, 9:30 AM–6:30 PM";
  - "Call (832) 219-8320" (`tel:+18322198320`);
  - "info@thelaunchpadwash.com" (mailto).
- **Services column:** Self-service `/self-service`, Detailing `/services`, Membership `/pricing`, Products `/products`.
- **"The Launch Pad" column:** About us `/about`, How it works `/how-it-works`, Reviews `/reviews`, Blog `/blog`, FAQ `/faq`, Contact `/contact`.
- **Bottom bar:** "© {current year} The Launch Pad. All rights reserved." on the left, and Terms of Service `/terms`, Privacy Policy `/privacy`, Cookie Policy `/cookies` on the right. These stack on phones.
- **Content fixes:**
  - "Professional Express Detailing" used to link to a blog post; Detailing now goes to `/services`.
  - The hard-coded "© 2026" is now the current year.
- **Removed:** the tooltips, blue links, grey hex and `#2c3e50`.
- **Left to the builder:** the exact spacing and the icon choices.
