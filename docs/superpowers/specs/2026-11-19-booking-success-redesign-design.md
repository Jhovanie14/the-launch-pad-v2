# Booking success pages redesign (short design)

Date: 2026-11-19. Status: approved by the user (mockup shown and deleted after approval).

## Intent

Finish the booking journey in the 24/7 Bay look. Today the guest page (`app/(user)/(booking)/success/page.tsx`) is old style and **shows the pre-discount subtotal as "Total"**; the signed-in page (`app/(dashboard)/dashboard/bookings/success/page.tsx`) is half restyled. Both duplicate ~170 lines of data loading, and neither shows the appointment time or the plate. A card receipt shows Stripe's payment id as the "Booking Number".

## Goals / non-goals / anti-goals

- **Goals:** one shared, tested receipt model and one shared receipt view for both pages; the true total paid; time and plate shown; the guest page in the booking frame.
- **Non-goals:** the webhook, `waitForPaidBooking`, checkout, the confirmation email. URLs stay `/success` and `/dashboard/bookings/success`.
- **Anti-goals:** a total that differs from what was charged; a second flame button; raw palette classes.

## Approaches

1. **Shared loader + shared receipt (picked).** One server-side loader turns a Stripe session or a booking id into a receipt; a pure function computes lines, discount and total; both pages render one component.
2. Restyle each page separately: keeps the duplicated logic that caused the total bug. Rejected.

## Decisions

- **Data.** `lib/booking/bookingReceipt.ts`:
  - a pure `buildReceipt(...)` (tested): service line, add-on lines (only when paid for, today's rule), a discount line when the total paid is below the list total ("Discount", or "Holiday sale (5% off)" when the sale explains it exactly), the total paid, the payment label ("Card", "Cash", "Membership"), the appointment date and time (calendar date in UTC, time as "10:30 AM"), duration, plate, vehicle description, and the reference.
  - a server loader (no tests: it calls Stripe and Supabase) with today's two paths: `session_id` (Stripe session + `waitForPaidBooking`; when the booking isn't saved yet, fall back to the session's metadata `ad`, `at`, `td`, `aids`, `vid` and `amount_total`) and `booking_id`. Its errors stay as today (throw when nothing is found).
- **Total.** Card: Stripe's `amount_total`. Cash or membership: the booking's `total_price`. Never the subtotal.
- **Reference.** The booking id when the booking exists; otherwise "Payment {payment intent id}" (still findable by staff).
- **View.** `components/booking/BookingReceipt.tsx`, used by both pages:
  - check mark in a Night circle with a Flame tick; title "Payment received, you're booked" (card) or "You're booked"; lead "We've emailed your confirmation. See you at 10410 S Main St."
  - the navy ticket (reuse `BookingTicket` from the confirm step) with date, time, service, extras, duration and plate;
  - a white "Receipt" card: lines, discount, "Total paid" (or "Total" at $0), then "Paid by card · Booking reference …" (or "Free with your {plan} membership");
  - one flame button (guest: "Create a free account" → `/signup`; signed in: "See your bookings" → `/dashboard/bookings`), a ring "Get directions" (Google Maps to 10410 S Main St, new tab) with a MapPin icon, and the call/email help line.
- **Guest frame.** Move the guest page to `app/(booking-flow)/success/` (URL unchanged): the navy booking header without step bars, `noindex`. The old `(user)/(booking)` folder (layout only) is removed if nothing else uses it.

## Left to the builder

Exact component split; how the plan name is found for the membership line (the booking's subscription, or "membership" when unknown).
