# Membership cart redesign (design)

Date: 2026-11-19. Status: decided with the user (mockups shown in a browser session and deleted after approval); pending approval of this document.
Builds on PR #27 (booking flow redesign): its shared pieces in `components/booking/ui/` and the guest frame in `app/(booking-flow)/`. While #27 is open, this branch starts from `feat/booking-redesign` and its PR is stacked on #27.

## Intent

The membership cart still uses the older gray, blue-900, green and amber look. The user wants it in the same "24/7 Bay" look as the booking flow and the self-service cart (`app/(dashboard)/dashboard/pricing/self-service-cart/page.tsx`, already on the tokens), so joining a membership feels like the rest of the app. Its wording must also be true.

## Scope

- `components/subscription/SubscriptionCart.tsx`, used in two places:
  - guest: `/pricing/cart` (`app/(user)/pricing/cart/page.tsx`, with `AuthPromptModal` for sign-in before checkout);
  - signed in: `/dashboard/pricing/subscription` (dashboard shell, navy navbar).
- `components/subscription/MultiVehicleBenefitsDialog.tsx` (restyle onto the booking sheet; its copy is accurate and stays).
- The guest page moves into the guest booking frame (navy header, no marketing navbar or footer). **URL unchanged.**
- `DESIGN.md`: note the membership cart under the booking frame.

## Goals

- The cart follows `DESIGN.md`: tokens only, Geist 900 display, white 16px surfaces with a Line ring, a navy plan card in the Member Pass style, plates drawn as plates, one flame button per viewport, 44px targets, visible focus, reduced motion respected.
- Every price and sentence the cart shows matches what Stripe will charge.

## Non-goals

- No change to `/api/create-checkout-session`, `lib/subscriptions/membershipCheckout.ts` validation, `lib/pricing/flockPricing.ts` or the first-membership offer rules. The sign-in hand-off keeps its storage keys (`pendingSubscriptionCart` / `pendingSubscriptionIntent`) and the `AuthPromptModal` redirect, but changes as decided below.
- No Monthly / Yearly switch in the cart (the user decided): billing stays as chosen on the plans page (URL `billing=`).
- `TermsModal` and `AuthPromptModal` are shared with other pages and keep their current look.
- The self-service cart and the plans pages are not touched.

## Anti-goals

- A total, offer or renewal price on screen that differs from what Stripe charges.
- Offering the first-membership discount to someone who has had a membership.
- "First month" wording on yearly billing, or "/mo" on yearly.
- A second flame-filled button, or raw palette classes left in the cart.

## Approaches

1. **Restyle in place on the booking pieces (picked).** Keep the cart's logic and hand-off; redraw it with the shared pieces from #27; fix the wording through one tested function.
2. **Restyle plus load the plan on the server.** Faster first paint, but it must re-plumb the localStorage restore and auto-checkout after sign-in. Rejected for now: small speed gain, real risk; can be a later step.

## Decisions

### Guest frame
- Move `app/(user)/pricing/cart/` to `app/(booking-flow)/pricing/cart/` (URL stays `/pricing/cart`). The booking frame's `metadata` (title "Book a service", `noindex`) is per-layout; the cart page sets its own title "Join a membership" (keep `noindex`). *(Claude's call: a cart is not a landing page.)*
- `BookingHeader` shows the 3-step progress only on `/service`, `/datetime` and `/confirmation`; on `/pricing/cart` it shows the logo and "Back to site" only.

### Page structure (both places)
- `StepLayout` with back link "← Back to plans" (guest: `/pricing`; signed in: `/dashboard/pricing`), title "Join the {plan name} plan" (while loading: a skeleton), and a lead line: "Add your cars, agree to the billing, then pay on Stripe's secure checkout."
- **Plan card (Night, Member Pass style):** kind line "{Express|Commercial|…} membership" tinted `svc-member` ("Membership" when the plan name has no recognisable kind), plan name in Display, price in 900 with "/ month" or "/ year" from the billing in the URL, then "What's included" from the plan's own `features` (check icons in `svc-member`).
- **Your cars (white card):**
  - Lead line: on personal plans "Each extra car is {35}% off." with a "How it works" link (opens the multi-vehicle sheet); on commercial plans "Commercial plans bill every vehicle at the plan rate." The percent comes from `flockDiscountPercent(plan)`.
  - A 1 to 5 picker (`MAX_VEHICLES_PER_SUBSCRIPTION`): five 48px buttons, chosen one Night. Each button may show the saving for that count per billing period ("save $X/mo" monthly, "save $X/yr" yearly), only when the saving is above 0.
  - One plate field per car, 44px, Line ring, Brand Blue focus, uppercase. Car 1 is labelled "Car 1" with "★ Primary" (Flame star, as on the member pass); extras show "{35}% off" on personal plans. Errors per field in `text-destructive` under the field with `aria-describedby`.
- **Commercial note:** on non-commercial plans, one quiet line (not a coloured box): "Personal vehicles only. Tow trucks, trucks with 8 or 9 ft beds, sprinter and cargo vans, and other commercial or oversized vehicles need the commercial plan." Hidden on commercial plans (today's rule).
- **Summary (white card):** one row per car (License Plate when typed, otherwise "Car N"; "Primary" or "{35}% off"; that car's price for the period), the offer row when it applies ("First-membership offer, {10}% off car 1", as a negative), then the total for the first period in 900 and under it "then ${renewal} a {month|year} until you cancel". When the offer doesn't apply there is one total: "${total} a {month|year} until you cancel".
- **Agreement:** today's checkbox (required before checkout), reworded to the real numbers: with the offer, "I authorize The Launch Pad to charge ${first} for the first {month|year}, then ${renewal} every {month|year} until I cancel."; without it, "I authorize The Launch Pad to charge ${total} every {month|year} until I cancel." Both continue: "I agree to the Terms of Service, including the disclaimer of warranties, limitation of liability, and arbitration agreement." with "Terms of Service" opening `TermsModal` as today.
- **Weather and closure notice:** the full legal text, unchanged, in a quiet Canvas panel with a Line ring (as in the self-service cart).
- **Action panel:** summary title "${first} first {month|year}" (or "${total} a {month|year}" without the offer), detail "then ${renewal} a {month|year}" (omitted without the offer), flame "Continue to payment". Disabled while the plan loads or checkout is starting ("Opening secure checkout…" with a spinner). Clicking without the agreement ticked or with a missing plate keeps today's behaviour (inline error, `role="alert"`). Guests: today's sign-in hand-off (`onRequireAuth`).

### Numbers (one tested function in `lib/`)
- A pure function computes, from the plan, billing, car count and whether the customer has had a membership: each car's period price (`flockVehiclePrice` for extras), the offer in cents with **`firstPeriodDiscountCents`** (the server's own function, so the screen equals Stripe), the first-period total, the renewal total, the saving per extra car per period, and the period words ("month"/"year", "/mo"/"/yr").
- Offer eligibility for display stays as today: `FIRST_SUBSCRIPTION_PROMO.enabled` and no earlier `user_subscription` row for this user. Guests are shown the offer (they have no history yet); the server decides at checkout.

### After sign-in *(user decided)*
- When the signed-in cart finds `pendingSubscriptionCart`, it restores the plates and car count, **does not restore the agreement tick, and does not start checkout by itself**. The customer sees the prices recalculated for their account (the offer disappears for someone who has had a membership), ticks the agreement, and taps "Continue to payment".
- Today's delayed auto-checkout (`autoCheckout` with `setTimeout(startCheckout, 500)`) is removed: it ran against stale state and only produced "You must authorize recurring charges to continue." The unused `auto` prop is removed too (no page passes it). The guest page stops writing `autoCheckout` and the tick into storage.

### Calls made after the builder check *(Claude's calls)*
- **Price source:** the cart shows `subscription_plans.monthly_price` / `yearly_price`, as today and as the plans page does; checkout charges the Stripe price for the same plan. They must already match for the plans page to be truthful, so the cart introduces no new mismatch. The offer amount uses the server's `firstPeriodDiscountCents` on the primary car's displayed price.
- **Customer with a live membership:** unchanged. The checkout route refuses with a 409 and its message ("You already have a membership…"); the cart shows that message in the inline `role="alert"` error. No up-front notice (that would be a new feature).
- **Commercial rule:** both the commercial note and the per-car pricing use `isCommercialPlan(plan)` (the `is_commercial` column wins, name as fallback). Today this changes nothing on screen: the one commercial plan also has "Commercial" in its name.

### Multi-vehicle sheet
- `MultiVehicleBenefitsDialog` becomes a `BookingSheet` ("Multi-vehicle benefits"), same five points with their icons in 32px Canvas circles, one quiet "Close" (no flame: it is information). *(Claude's call.)*

### Loading
- While the plan loads: placeholders in the shape and tone of the plan card (Dusk at 90%) and the white cards (Line), pulsing only when motion is allowed. A missing or unknown plan id: an inline Night error card "We couldn't find that plan." with a quiet "Back to plans".

## Constraints

- Tokens from `app/globals.css` only; reuse `components/booking/ui/` (`StepLayout`, `BookingSheet`, `focus.ts`) and `LicensePlate`.
- `lib/**/*.test.ts` is the only place Vitest runs; the numbers function lives in `lib/` with tests.
- CRLF line endings; edit existing files with the Edit tool.
- Local env points at live Supabase and Stripe: verify with read-only GETs only; never start a real checkout locally.

## Left to the builder

- Component boundaries inside the cart (plan card, cars card, summary).
- Exact icons.
- Where the numbers function lives (`lib/subscriptions/` or `lib/pricing/`) and its name.
- How the guest page's `AuthPromptModal` sits in the new frame (it keeps its look).
