# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Three real audiences. When they compete for design attention, the priority order is **retail → admin → fleet**.

1. **Retail car owners (primary).** Houston drivers, mostly local to the S Main St corridor, deciding how to get their car cleaned. They arrive in two different situations: (a) discovering the business and comparing options — self-wash it themselves, book a professional detail, or commit to a membership; (b) returning as an account holder to book a slot, check in at a self-service bay, manage vehicles on a subscription, or handle billing. Their job is to get a clean car on their own schedule without a phone call.
2. **Admin and staff operators (secondary).** The people running the day at the site and behind it: bookings and walk-ins, subscription and add-on management, promo codes, QR codes, broadcasts, blog and contact triage, and revenue review. Their job is to keep the day running and answer customer situations quickly.
3. **Fleet / B2B clients (tertiary).** Businesses with multiple vehicles, moving through inquiry → contract → invoicing. This is a live program, not a build-ahead feature.

## Product Purpose

The Launch Pad is a car care destination in Houston, TX, founded in 2024. The product is the full digital surface of that physical business: it lets customers discover the three service lines, book and pay online, subscribe to and manage an unlimited-wash membership, log self-service bay usage, and get support — and it gives staff the console to operate all of it.

Success is a customer completing the whole loop online (choose service → book or subscribe → pay → return) without needing to call, and staff resolving the resulting operational work in one place.

## Positioning

**Everything under one roof.** Self-service bays, professional express detailing, and an unlimited membership at a single location — the customer never has to pick a lane or a competitor for the job they didn't come in for. This is the durable claim; a neighboring wash offering only one of the three cannot truthfully make it.

Site copy expresses this as "Three Amazing Services, One Location."

## Operating Context

- **One physical location:** 10410 S Main St, Houston, TX 77025.
- **Contact:** info@thelaunchpadwash.com · (832) 219-8320.
- **Domain:** https://www.thelaunchpadwash.com
- **Self-service bays run 24/7** with tap-to-pay or dollar coins; professional detailing is appointment-based.
- **Food trucks operate on site** — rotating local vendors with seating, positioned as part of the visit rather than a wait.
- Customers move between the marketing site (anonymous), a signed-in dashboard (bookings, billing, vehicles, self-service log, help, settings), and in-person bay or detail service. QR codes bridge the physical site to the digital flow.
- Traffic and conversion are measured through Meta Pixel and Google Analytics; the site is verified in Google Search Console and carries deliberate local-SEO metadata for Houston car wash and detailing terms.

## Capabilities and Constraints

**Service lines**
- Self-service car wash bays — professional-grade equipment, high-pressure hoses, vacuum stations, 24/7.
- Professional express car detailing — interior deep clean, waxing, polishing, window and trim.
- Express detailing subscription / unlimited wash membership — any vehicle, one price, monthly or yearly billing, no contract, cancel anytime. Multiple vehicles can sit on a subscription, with one designated primary.

**Customer capabilities**
- Account signup, login, password reset (Supabase auth).
- Multi-step booking flow: service → date/time → confirmation, available both signed-out and inside the dashboard, plus a booking modal reachable from marketing pages.
- Stripe checkout for bookings, subscriptions, self-service plans, and walk-ins; customer portal, payment-method updates, subscription upgrades, and cancellation.
- Vehicle management on a subscription: add, update, remove/unsubscribe, and swap the primary vehicle.
- Self-service check-in and usage logging.
- Reviews, FAQ, blog, contact and help forms.

**Admin capabilities**
- Bookings (including walk-in), users, subscriptions, services, add-ons, promo codes, QR codes, broadcast email, blog posts, contact triage, settings.
- Fleet inquiries, fleet contracts, fleet invoices, and fleet payment management.
- Revenue breakdown reporting; Excel and PDF export.

**Stack and technical constraints**
- Next.js 16 App Router (Turbopack), React 19, TypeScript.
- Tailwind CSS v4 with shadcn/ui and Radix primitives; `lucide-react` icons; `motion` for animation; Geist Sans / Geist Mono via `next/font`.
- Supabase for auth, database, and row-level security; middleware refreshes the session on nearly every request.
- Stripe for all payments and subscription state, with webhook-driven event idempotency.
- Resend + `@react-email/render` for transactional and broadcast email.
- A service worker is registered; the app behaves as an installable web app.
- Route groups map to the three audiences: `app/(user)` marketing and public booking, `app/(dashboard)` signed-in customer, `app/admin` operator console.
- Vitest for tests; ESLint via `eslint-config-next`.

**Terminology** (use these exact words in UI copy)
- *Self-service* — the DIY bays, not a support concept.
- *Express detailing* — the staffed professional service.
- *Membership* / *subscription* — the recurring unlimited plan.
- *Primary vehicle* — the one designated vehicle on a multi-vehicle subscription.
- *Unsubscribe* (not "remove") — taking a vehicle off a subscription.
- *Fleet* — the B2B program, distinct from a customer with several personal vehicles.

**Open / undecided**
- Whether the `/products` retail storefront is a real merchandise line is **not confirmed**. Treat it as unverified: leave existing code alone, but do not add navigation, promotion, or proof that presents it as a live store until it is confirmed.

## Brand Commitments

- **Name:** The Launch Pad. Full SEO title pattern: "The Launch Pad | Car Wash & Express Detailing in Houston, TX".
- **Logo assets:** `/public/thelaunchpad.png` (primary, also the OG image) and `/public/xmas-launchpad-logo.png` (seasonal).
- **Seasonal branding is deliberate and must be preserved.** The Christmas logo swap and the snow effect (`components/snow-effect.tsx`, currently commented out in `app/layout.tsx`) are an intentional recurring seasonal treatment, not dead code. Do not delete them as cleanup.
- Voice on the marketing site is warm and plain-spoken, addressing the driver directly, with a light aspirational streak ("where we guarantee your shine"). It is not luxury-formal and not aggressively salesy.

## Evidence on Hand

**Real:**
- Photography of the actual location and services in `/public`: `carwash.jpg`, `hero.jpg`, `launchpad-wash.jpg`, `self-service*.{png,jpg}`, `professional-express-car-detailing*.png`, `express-detailing-subscription*.{png,jpg}`.
- A how-it-works video: `/public/how-it-work.mp4`.
- Review assets under `/public/reviews`, social assets under `/public/social`, QR images under `/public/qr-images`.
- Live fleet program — inquiries, contracts, and invoices reflect real business customers.
- Verified business facts: address, phone, email, domain, 2024 founding, 24/7 self-service hours.

**Unverified — do not build new proof on these:**
- The "4.9/5 from 500+ Reviews" badge on the homepage and About page is **not confirmed**. Existing instances stay as-is, but do not repeat, amplify, or design new social-proof moments around that number until it is verified against a real source.
- The `/products` storefront (see Capabilities).

**Must never be fabricated:** testimonials, customer names, review counts, ratings, wash volumes, revenue figures, awards, certifications, or partner logos. If a proof element is needed and no real evidence exists, ask before inventing one.

## Product Principles

1. **One roof, one flow.** Every surface should make the other two service lines legible and reachable. A visitor who came for a self-wash should never have to leave to discover detailing or the membership.
2. **Retail first, but operators are real users.** Customer-facing work wins ties, yet the admin console is a daily-use tool for a small team — it gets genuine design investment, not leftovers.
3. **Finish the loop online.** Anything a customer would otherwise phone about — booking, rescheduling, billing, adding a vehicle, cancelling — should be completable in the product.
4. **Physical and digital are one product.** QR codes, bay check-ins, tap-to-pay, and food trucks are part of the experience; the interface should assume a person standing at the site, phone in hand, as often as one at a desk.
5. **Only claim what is true.** Proof comes from real photography, real evidence, and specific facts about the location and services — never from invented numbers.

## Accessibility & Inclusion

No product-specific standard has been established. Baseline expectations apply: the marketing site and dashboard must work on a phone in daylight at the physical site, and interactive controls must remain keyboard- and screen-reader-accessible through the Radix primitives already in use.
