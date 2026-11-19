# Public services page redesign (short design)

Date: 2026-11-19. Status: decided with the user (mockup shown in a browser session and deleted after approval); pending approval of this document.

## Intent

`/services` (`app/(user)/services/page.tsx`, the public "Our services" page) still uses the old white and blue-900 look, its overview cards make claims that aren't true, and its service list is loaded in the browser, so search engines see an empty list. Restyle the page body in the 24/7 Bay look (`DESIGN.md`), make every claim come from real data, and render it on the server.

## Scope and non-goals

- **In:** the page body of `/services` only.
- **Out:** the marketing navbar and footer (unchanged, the user decided), the page's metadata in `app/(user)/services/layout.tsx` (kept), booking, pricing and self-service pages.

## Anti-goals

A claim or price that isn't in the data; a second flame button; raw palette classes; content that starts invisible (animations must not hide content from crawlers or reduced-motion users).

## Approaches

1. **Server-rendered page (picked).** The page becomes a server component that reads the active services and the cheapest membership plan per request (fresh prices, like booking), so services and prices are in the HTML.
2. **Restyle in place, browser-loaded.** Smaller, but Google keeps seeing an empty list and the hand-typed overview cards can drift from real prices. Rejected.

## Decisions

- **Navy top section** (Night, full width of the page body):
  - "Our services" (Display Hero) and "Self-service bays, express detailing and memberships, all at 10410 S Main St, Houston."
  - Three tiles on Dusk, each tinted by its service (text and icon only, per the Hue Is a Legend rule):
    - **Self-service bays** (sky, Droplets): "Open 24/7. High-pressure wash, foam brush, spot-free rinse, vacuums." Price from `lib/pricing/selfServiceRates.ts`: "$3 coins · $5 tap-to-pay" (`BAY_MINIMUM_CASH`, `BAY_MINIMUM_CARD`). Quiet link "How the bays work" → `/self-service`.
    - **Express detailing** (flame, Sparkles): "Thu–Sun by appointment. Quick service and express detail packages." Price: "From ${lowest active service price, with the holiday sale applied as the menu shows it}". Quiet link "See the menu" → `#menu`.
    - **Membership** (svc-member, Star): "Unlimited washes, monthly or yearly, no contract." Price: "From ${cheapest non-commercial plan monthly price} a month · {that plan's name} plan". Quiet link "See plans" → `/pricing`.
  - One flame "Book a detail" → `/service`.
- **Below** (Canvas): the holiday-sale line when active ("Holiday sale: {5}% off all services. Prices shown include it.", Tag icon in Detailing Mark), then `id="menu"`: each category ("Quick service", "Express detail") as a 900-weight heading with its duration range, then **cards three across** (one column on phones, two from 640px, three from 1024px). Each card: name (900), duration, the package's own `features` (a Check in Brand Blue; features starting "No" get a Minus in Ink Subtle), price in 900 with the original struck through when on sale, and a quiet ring "Book this" → `/service?service={id}`. The whole card is not a link (one clear target).
- After the menu: "Extras like interior shampoo, pet hair removal and rim shine can be added when you book." *(Claude's call: the honest home for what the old detailing card claimed.)*
- Categories: only the two that exist (`quick service`, `express detail`), in that order. Other categories, if ever added, follow under their own heading. The "Detailed Pricing by Vehicle Type" heading is removed.
- Empty state (no active services): a white card "No services are listed right now. Please call (832) 219-8320 and we'll get you booked." (today's copy, with the phone link).
- No entrance animations that start content hidden. A subtle hover lift on cards is fine, off under reduced motion. *(Claude's call.)*
- Data: one server-side loader in `lib/` (tested) that turns rows into the page model (categories, "from" prices with the sale, cheapest plan), so the claims can't drift.

## Left to the builder

Component split; exact icons; the duration range wording per category (computed from the packages).
