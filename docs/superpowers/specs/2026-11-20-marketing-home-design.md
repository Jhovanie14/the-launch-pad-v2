# Marketing home page (short design)

Date: 2026-11-20. Status: the user approved option B and the mockup ("looks right, go ahead").

## Intent

The home page (`app/(user)/(home)/page.tsx`) is the last public page in the old style:
- a slate, amber, violet and emerald hero with hard-coded prices;
- white and blue sections below it;
- the services shown twice;
- the unverified "4.9/5 From 500+ Reviews" badge.

Move it onto the 24/7 Bay tokens, show each service once with live prices, and render it on the server.

## Approaches

1. Restyle only: same sections and copy. Rejected, because it keeps the duplicate services, the hard-coded prices and the badge.
2. **Restyle and tighten (picked).**
3. A fresh page structure. Rejected as more than is needed.

## Decisions

### The page
- A server component with `force-dynamic`. Prices come from `getServicesPageData()`, the same source as `/services`.
- `HoursChangeDialog surface="landing"` stays.

### Hero
- Night, full-bleed, `min-h-svh`. The real photo `/self-service.png` sits under a Night scrim (70% → 65% → 90%).
- Headline: "Your car deserves better." in Display Hero.
- Lede: "24/7 self-service bays or a full professional detail, everything your car needs at **10410 S Main St, Houston.**"
- One flame "Book a detail", which opens the booking pop-up as the old "Book online" did. Next to it, a quiet outlined "Self-service bays" link to `/self-service`.
- Facts: "Bays open 24/7", "Detailing Thu–Sun, 9:30 AM–6:30 PM", "10410 S Main St".
- The three Dusk service tiles from `/services` (sky, flame, red, with live prices), shared with that page. On the home page, "See the menu" goes to `/services#menu`.
- No entrance animation. No eyebrow labels. No review count.

### "Why The Launch Pad?" (Canvas)
- `/carwash.jpg` with no badge, then the story:
  - "Founded in 2024, The Launch Pad brings every kind of car care under one roof. Wash it yourself, get it professionally detailed, or grab a quick handwash, all in one stop."
  - "Plus, while you wait, enjoy Houston's finest food trucks."
- Four facts:
  - Open around the clock / Self-service bays, 24/7
  - Pro equipment / High-pressure wash, foam brush, spot-free rinse
  - Detailing by appointment / Thursday to Sunday, booked online
  - Memberships, no contract / Monthly or yearly, cancel anytime

### "What customers say" (Night)
- The line "A few words from people who wash and detail with us."
- Three still Dusk cards with five flame stars, the quote, the author, the vehicle and "{source} review".
- The cards are the existing reviews from Ahmed S., Maria G. and Jason T.: one each for self-service, detailing and membership.

### Removed
- the duplicate "Three Amazing Services" cards and their "See details" pop-up;
- both rating claims, "Best price in town" and "Satisfaction guarantee";
- `components/user/hero.tsx`, `customers.tsx` and `service-modal.tsx`, which only the home page used.

### Left to the builder
Spacing and the icons.
