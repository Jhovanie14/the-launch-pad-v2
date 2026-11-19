# Booking flow redesign (design)

Date: 2026-11-19. Status: decided with the user in a mockup session; pending their approval of this document.
Mockups: `.superpowers/brainstorm/1032-1795096322/content/` (`service-step-v2.html`, `steps-2-3.html`, `popups.html`), git-ignored scratch.

## Intent

The booking flow still uses the older gray and blue-900 look, while the customer world moved to "The 24/7 Bay" (`DESIGN.md`). The user wants the three booking steps and the two booking pop-ups restyled to match it, so booking looks like the rest of the customer app. Guests and signed-in customers should see the same flow.

The subscription (membership) cart is the next project and is **not** part of this one.

## Scope

- The three steps, shared by both trees through `components/booking/` (`ServiceStep`, `DateTimeStep`, `ConfirmationStep`, plus `VehiclePicker`, `AddOnList`, `BookingSummary`, `PaymentChoice` and the guest-details dialog inside `ConfirmationStep`):
  - guest: `/service`, `/datetime`, `/confirmation` (today under `app/(user)/(booking)/`);
  - signed in: `/dashboard/booking/{service,datetime,confirmation}`.
- The account sign-up pop-up shown to guests on the service step (today "Join Our Members!", inline in `ServiceStep.tsx`).
- The membership pop-up shown to guests before paying (`components/subscription-upsell-dialog.tsx`, "Go unlimited").
- The other booking dialogs, which all become the sheet dialog: the add-ons picker (`AddOnList`), the guest plate entry (`VehiclePicker`), the bundle suggestion (was "Smart Recommendation", in `ServiceStep.tsx`), payment choice (`PaymentChoice`) and guest details (in `ConfirmationStep.tsx`).
- A new guest booking layout (below).
- `DESIGN.md`: add the new booking components (booking header, step progress, bottom action bar, booking ticket, sheet dialog) and remove the booking flow from "Divergences" once built.

## Goals

- Every booking screen follows `DESIGN.md`: semantic tokens only, Geist 900 display type, white 16px surfaces with a Line ring, navy for identity and the current choice, exactly one flame-filled control per viewport, plates drawn with the License Plate style, 44px targets, focus outlines (Flame on navy, Brand Blue on white), reduced motion respected.
- Guests and signed-in customers see the same steps.
- Everything the pop-ups claim is true.

## Non-goals

- No change to pricing, promo validation, payment, `createBooking`, `/api/checkout_sessions` or the URL contract (`lib/booking/bookingParams.ts`). The server-loaded data path (`BookingStepShell`, `loadBookingStep`, the `initial` props) keeps working as it does; it may be **extended** with the welcome offer (below), nothing else.
- No change to booking rules (Thursday to Sunday, `BOOKING_TIME_SLOTS`, `isSlotPast`).
- The guest success page (`app/(user)/(booking)/success`) and the dashboard success page are not restyled here.
- The marketing navbar, footer and other marketing pages are not touched.
- The subscription cart.

## Anti-goals (a failure even if it works)

- A claim that isn't true: a promo that doesn't work, a plan benefit the plan doesn't include, an invented count or rating.
- A second flame-filled button on any screen.
- Raw palette classes (`gray-*`, `slate-*`, `blue-900`, `amber-*`, `violet-*`, `green-*`, `red-*`) left in booking code.
- A regression in the member protection: a member must never be offered payment for a free wash, and the "Loading your booking..." gate stays.

## Approaches (for the guest frame)

1. **Restyle the steps only.** Guests would still see the white marketing navbar and footer around navy booking screens. Rejected: two looks on one screen.
2. **Restyle the steps and give guest booking its own slim navy header (picked by the user).** Same look for guests and signed-in customers, a focused checkout without the full site menu. Cost: the guest step pages move to their own layout and lose the marketing menu.
3. **Restyle the marketing site first.** Most consistent but much bigger, and it would delay this work. Rejected.

## Decisions

### Guest booking layout
- The three guest step routes move out of the marketing layout into a route group with its own layout (for example `app/(booking-flow)/{service,datetime,confirmation}`). **URLs do not change.** The success page stays where it is, with the marketing layout.
- The layout wraps in `.lp-theme` on Canvas (like `app/(dashboard)/layout.tsx`), keeps the existing `metadata` (`robots: noindex`, title "Book a service"), and renders the **booking header**: a Night bar with Bar shade; the logo and "THE LAUNCH PAD" wordmark (link to `/`); a quiet outlined "Back to site" link on the right (to `/`); under it the **step progress**: three 5px bars (Flame for done and current steps, white/18 for the rest) and the labels "1 Service", "2 Date and time", "3 Confirm" (current in white, others On Night Subtle). The `Toaster` (sonner) the marketing layout provided must still be present.

### Signed-in layout
- The dashboard shell and its navy navbar stay. The step progress (same three bars and labels, in Ink / Line / Flame on Canvas) sits at the top of the page content instead of in a second navy bar. *(Claude's call.)*

### Shared page structure (all three steps)
- A back link at the top of the content ("← Back" on step 1 going back as today; on steps 2 and 3 it names what you go back to, e.g. "← Classic Complete · 30 min", "← Change date or time").
- A page title in Headline (900, 1.5rem rising to 1.875rem): "Choose your service", "Pick a day and time", "Check and confirm".
- **Bottom action bar** on phones (below 1024px): a sticky Night bar at the bottom with the current summary on the left (bold white first line, On Night Muted second line) and the one flame button on the right, with the safe-area inset. **From 1024px** the summary and flame button sit in a sticky 320px side column instead (the `DESIGN.md` side-column width), on a white surface, so the page has no full-width bar. *(Claude's call.)*
- The old "Booking Progress" side card is removed (the step progress replaces it).

### Step 1, Choose a service (layout A, "white cards")
- "Your car" white card with the plate drawn as a License Plate.
  - Guests: a "Change" link opens `VehiclePicker`'s plate entry, which becomes the **sheet dialog** (fields 44px, Line ring, Brand Blue focus; one flame button). Its behaviour stays.
  - Signed-in customers: the card is read-only (no "Change"); their car was chosen in the dashboard booking modal before arriving, and offering a typed plate here would skip their saved cars and member pricing. *(Claude's call.)*
- Quick service / Express detail as a segmented control: white track with a Line ring, the active segment Night with white text. The existing tab-gating for members stays.
- Each package is a white card: a 24px radio circle (Night with a flame check when chosen), name in 900, duration in Ink Muted, price in 900 on the right, and the package's features as a short list. The chosen card has a 2px Night ring. Packages free for the member's car show "Free with your membership" instead of the price (existing `isServiceFreeForDisplay` logic).
- Add-ons: the existing flow stays. "Continue" opens `AddOnList`, which becomes the **sheet dialog** ("Add extras", white rows with name, duration, price and a checkbox, Line Soft dividers, a running total, quiet "Skip", flame "Continue"); the sheet's flame button is the only one while it is open. Navigation from step 1 to step 2 is unchanged. *(Claude's call.)*
- Bottom bar: chosen package name, then "duration · price", and flame "Continue" (disabled until a package is chosen).

### Step 2, Pick a day and time
- Subline: "Express detailing is open Thursday to Sunday."
- Calendar on a white card (react-day-picker restyled through `classNames`): month name in 900, closed days and past days crossed out in a faint Ink, today with a Line ring, the chosen day Night with white text, 40px day cells. It stays drawn in the browser only (the existing `inBrowser` guard).
- Times on a second white card headed with the chosen day ("Saturday, November 21"): 44px buttons, three per row, tabular numerals, past slots disabled, the chosen time Night.
- Bottom bar: "Sat, Nov 21 · 10:30 AM", then "service · price", and flame "Continue" (disabled until both are chosen).

### Step 3, Check and confirm
- **Booking ticket** (Night surface, 16px, white/10 ring): the date and time in Display (900), the service name tinted Flame, the add-ons and total duration in On Night Muted, and a white/10 divider above "Your car" with the License Plate (vehicle make/model from `vehicleInfo` when available, on the same line or under it).
- **Price card** (white): one row per line (service, each add-on), the promo row when applied ("WELCOME10 (10% off)", the discount as a negative), the holiday-sale line when active, then the total in 900 with a Line Soft rule above it. Under it the promo field (44px, Line ring, Brand Blue focus, body font; Geist Mono stays for plates only) and a quiet "Apply" button.
- Member states: **today's logic is kept exactly** (`pricing`, `isVehicleSubscribed`, `isFreeForSubscriber`, the subscription banners in `ConfirmationStep`); only the look changes, as quiet white notices with an icon, keeping today's meaning:
  - covered car, service covered, no add-ons → the service is free, total $0, the promo field is disabled with today's note, the button reads "Confirm booking";
  - covered car, service covered, with add-ons → the service is free, the add-ons are paid, the promo field works, the button reads "Proceed to payment";
  - car on the membership but this kind of service not covered → today's "requires payment" message;
  - car not on the membership → today's message.
- Bottom bar: the total, a second line ("Pay by card or cash" for signed-in customers, "Pay by card" for guests, "Free with your membership" when free), and the flame button with today's labels and gate: "Loading your booking..." (disabled, spinner) until `ready`, then "Confirm booking" for a free wash, otherwise "Proceed to payment". Sentence case.
- `PaymentChoice` (card or cash) and the guest-details dialog become the **sheet dialog** (below), with 44px fields, the existing marketing opt-in checkbox unticked by default, and one flame button each.

### Sheet dialog (shared)
- One component for the booking pop-ups: on phones (below 640px) it slides up from the bottom (white, 16px top corners, a grab handle, a 44px close button); from 640px it is a centred white card (16px, max 28rem). Built on the existing Radix dialog / `sheet.tsx` primitives so focus is trapped, Escape and the close button dismiss it, and the title is announced. The entrance animation is skipped under reduced motion. Scrim: Night at 60%.

### Account pop-up (was "Join Our Members!")
- Shown, as today, to guests (not signed in) when the service step opens; dismissing it is remembered for the visit (today's `showBanner` state).
- Sheet dialog. Heading **"Create a free account"** (900). Lead line: "Book faster next time, and keep every visit in one place."
- Three points, each with a lucide icon in a 32px Canvas circle with a Line ring (no emoji): "Track and manage your bookings easily."; "See membership plans for regular savings."; "{percent}% off a booking with promo code WELCOME10". *(Wording "a booking", not "your first booking": checkout allows one use per customer, not first-booking-only. Claude's call.)*
- **The promo point shows only when checkout would accept the code**, and its percent comes from the code, not from copy. The server reads `promo_codes` for `WELCOME10` (service role; the table is staff-only) when loading the service step and adds `welcomeOffer: { code, percent } | null` to the step's initial data. The rule is checkout's own (`lib/pricing/validatePromo.ts`): `is_active`, applies to one-time bookings, under `max_uses` if set (counting redemption rows as checkout does), `discount_type = "percent"`, and not restricted to a service. It lives in `lib/` with tests and reuses validatePromo's helpers rather than copying them. **Expiry is not part of the rule**, because checkout ignores `expires_at` (nothing in the app reads it, and the admin page can't edit it); the pop-up must not disagree with checkout. As of 19 Nov `WELCOME10` passes (10%, active, no use limit).
- Buttons: flame "Create free account" (to `/signup`, as today), quiet "Continue as guest" (closes). A small line under them: "Already have an account? Sign in" (to `/login`).

### Membership pop-up ("Go unlimited")
- Shown, as today, to guests without a membership when they confirm (`shouldOfferUpsell`).
- Sheet dialog with a Night top in the Member Pass style: the kind line "Express membership" tinted `svc-member`, heading "Stop paying every visit" (900), the plan's monthly price in Display ("$59.99" + "a month, {plan name} plan"), and the comparison line "This booking is ${total}. {N} visits a month and the plan has paid for itself." (existing break-even logic; the line is omitted when it can't be computed).
- White body: **the plan's own `features` from `subscription_plans`**, as a checklist (Brand Blue check icons). The hard-coded `FEATURES` list is removed (it promised shampoo, wax, priority scheduling and 15% off add-ons, which the Express Detail plan does not list).
- Buttons: flame "Become a member, ${price} a month" (existing `onSubscribe`), quiet "No thanks, continue to pay ${total}".
- Removed: the "Exclusive Member Offer" eyebrow badge, decorative glows, crown and zap icons, scale-on-hover.
- Plan choice stays as today (name contains "express", else the cheapest).

### Bundle suggestion (was "Smart Recommendation") *(user picked "keep it, honest and calculated")*
- Today it opens when 3 or more add-ons are ticked and claims the Complete Detail packages "already include most of these features at a bundled price", which is often false.
- New rule, as a pure function in `lib/` with tests: suggest the Express Complete Detail package (found as today, by name containing "express complete") **only when** the customer is paying for the service (not a member's covered car), hasn't already chosen that package, and their chosen service plus add-ons costs **more** than that package (both with the holiday sale applied the same way the page shows prices). Otherwise nothing opens.
- Sheet dialog. Heading "A package may cost less" (900). Body: "Your choice adds up to ${current}. Express Complete Detail is ${package} and includes:" followed by **the package's own `features` from the database**. It does not claim which of the customer's extras the package replaces: nothing in the data maps add-ons to package features, so any such claim would be a guess.
- Buttons: flame "Switch to Express Complete Detail" (today's switch behaviour: select it, move to the Express tab), quiet "Keep my choice".

### Holiday sale (active: 5% off) *(Claude's call)*
- The red gradient banner is replaced by one quiet line under the step 1 title: a Tag icon (Detailing Mark) and "Holiday sale: 5% off all services. Prices shown include it." The percent comes from `HOLIDAY_SALE_DISCOUNT`; the line shows only while `HOLIDAY_SALE_ACTIVE`.
- Prices on sale show the original struck through in Ink Muted next to the sale price in 900. The price card on step 3 keeps a "Holiday sale (5% off)" row.

### Copy
- Sentence case, plain and warm (`PRODUCT.md` voice), no exclamation marks, no emoji, the product's terms (Self-service, Express detailing, Membership, Primary vehicle).

## Constraints

- Tokens from `app/globals.css` only; check contrast of any new pairing (Ink Muted on white, On Night Muted on Night are already validated in `DESIGN.md`).
- `lib/**/*.test.ts` is the only place Vitest runs; the promo-validity rule goes in `lib/` with tests.
- CRLF line endings; edit existing files with the Edit tool.
- Local env points at live Supabase and Stripe: verify with read-only requests only; never create real bookings or checkouts locally.

## Left to the builder

- Component boundaries (e.g. a `BookingHeader`, `StepProgress`, `ActionBar`, `BookingTicket`, `BookingSheet`), and whether the sheet wraps `dialog.tsx` or `sheet.tsx`.
- The exact lucide icons.
- How the step progress in the dashboard tree is placed relative to the page title.
- Loading placeholders for step content (use the shape-and-tone rule from `DESIGN.md`).
- Order of work and how to verify visually (the local UI can't be clicked through; the Vercel preview can).
