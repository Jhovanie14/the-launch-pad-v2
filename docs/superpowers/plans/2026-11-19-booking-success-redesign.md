# Booking Success Pages Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Both "you're booked" pages show one shared receipt in the 24/7 Bay look, with the true total paid, the time and the plate.

**Architecture:**
- A pure `buildReceipt` function (tested) produces everything shown.
- One server loader handles today's two paths: a Stripe session, and a booking id.
- One `BookingReceipt` component renders it and is used by both pages.
- The guest page moves into the `(booking-flow)` frame. `BookingTicket` takes plain names, so the confirm step and the receipts share it.

**Tech Stack:** Next.js 16 server components, Stripe (read-only `checkout.sessions.retrieve`), Supabase admin client (as today), Tailwind tokens, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-19-booking-success-redesign-design.md`

## Global Constraints

- URLs stay `/success` and `/dashboard/bookings/success`. No change to the webhook, `waitForPaidBooking`, checkout or emails.
- The total is never the subtotal. Card: `session.amount_total / 100`. Cash or membership: `bookings.total_price`.
- One flame button per page. Tokens only, no raw palette classes. 44px targets. Visible focus.
- The copy is exact, as in the spec:
  - titles: "Payment received, you're booked" (card) and "You're booked";
  - lead: "We've emailed your confirmation. See you at 10410 S Main St.";
  - buttons: "Create a free account" (guest), "See your bookings" (signed in), "Get directions";
  - help line: (832) 219-8320 and info@thelaunchpadwash.com.
- CRLF: use the Edit tool on existing files, and run the node CRLF one-liner after `Write`. Only read-only GETs, against `localhost:3000`. No Co-Authored-By trailer.

## Review Focus

1. **Card receipt with a discount.** "Total paid" equals Stripe's `amount_total`, and the discount row makes the lines add up. Pinned in Task 1.
2. **Card payment whose booking isn't saved yet** (the webhook is late). The receipt still shows the date, time, service, extras and total from the session. The reference reads "Payment pi_…". Pinned in Task 1 (`bookingId: null`) and handled by the Task 2 loader.
3. **A member's free wash, with or without extras.** The service reads "Free" with no discount row, extras are paid, and the total matches. Pinned in Task 1.
4. **A missing time, plate or duration** on old bookings. Those lines are left out, never shown as "undefined" or "NaN". Pinned in Task 1.
5. **The guest page in the booking frame.** The navy header has no step bars, the page is noindexed, and the URL is still `/success`. Probed in Task 3.

---

### Task 1: `buildReceipt`

**Files:**
- Create: `lib/booking/bookingReceipt.ts`
- Test: `lib/booking/bookingReceipt.test.ts`

**Interfaces:**
- Produces:

```ts
export interface Receipt {
  kind: "card" | "cash" | "membership";
  title: "Payment received, you're booked" | "You're booked";
  day: string | null;        // "Sat, Nov 21" (calendar date read in UTC)
  time: string | null;       // "10:30 AM"
  durationMin: number | null;
  serviceName: string;
  serviceFree: boolean;      // membership covered the service
  servicePrice: number;      // list price
  extras: { name: string; price: number }[];
  discount: { label: string; amount: number } | null;
  total: number;             // what was charged
  plate: string | null;
  vehicle: string | null;    // "2020 Honda Civic"
  reference: string;         // "Booking {id}" or "Payment {pi}"
  paidWith: string;          // "Paid by card" | "Pay cash at your visit" | "Free with your membership"
}
export function buildReceipt(input: {
  paymentMethod: "card" | "cash" | "subscription" | null;
  serviceName: string | null; servicePrice: number; extras: { name: string; price: number }[];
  totalPaid: number; date: string | null; time: string | null; durationMin: number | null;
  plate: string | null; vehicle: string | null;
  bookingId: string | null; paymentIntentId: string | null;
  saleActive: boolean; saleDiscount: number;
}): Receipt
```

- **`kind`:** `"subscription"` gives `"membership"`, `"cash"` gives `"cash"`, anything else gives `"card"`.
- **`serviceFree`:** true when `kind === "membership"`.
- **List total:** `servicePrice` (0 when `serviceFree`) plus the extras.
- **`discount`:** set when list total − `totalPaid` ≥ 0.01. The label is "Holiday sale (5% off)" when the sale is active and `round2(listTotal * (1 - d))` equals `totalPaid`; otherwise it is "Discount".

- [ ] **Step 1: Write the failing tests.**
  - `"card, holiday sale → Total paid 52.25 with a 5% sale row"`: Classic Complete 45 plus Tire shine 10, `totalPaid` 52.25. Gives `discount { label: "Holiday sale (5% off)", amount: 2.75 }`, `total 52.25`, the card title and `paidWith "Paid by card"`.
  - `"cash with a promo → 'Discount' row"`: 45, `totalPaid` 38.48. Gives `label "Discount"`, `amount 6.52`.
  - `"member's free wash → Free, no discount row, total 0"`: subscription, 45, no extras, total 0. Gives `serviceFree true`, `discount null`, `paidWith "Free with your membership"` and the "You're booked" title.
  - `"member's free wash with extras → extras paid, total matches"`: subscription, 45, extras `[10]`, total 10. Gives `discount null` and `total 10`.
  - `"no booking yet → reference 'Payment pi_123'"`, and with a booking id → `"Booking b-1"`.
  - `"missing time, plate, duration → null, never NaN"`: `time null`, `durationMin null` and `plate null` all stay null. `day` is `"Sat, Nov 21"` for `"2026-11-21"`.
  - `"time formats 9:30 → '9:30 AM' and 17:30 → '5:30 PM'"`
- [ ] **Step 2: Run, expect FAIL** with `npx vitest run lib/booking/bookingReceipt.test.ts`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `feat(booking): receipt model with the true total paid`

---

### Task 2: Receipt loader

**Files:**
- Create: `lib/booking/bookingReceiptData.ts`

**Interfaces:**
- Consumes: `buildReceipt` and `Receipt` (Task 1); `stripe` (`lib/stripe/stripe`); `createAdminClient`; `waitForPaidBooking`; `HOLIDAY_SALE_ACTIVE` and `HOLIDAY_SALE_DISCOUNT`.
- Produces: `loadBookingReceipt(params: { session_id?: string; booking_id?: string }): Promise<Receipt>`. It runs on the server only. It throws `"No session_id or booking_id provided"` or `"Booking not found"` exactly as today.
  - **`session_id`:**
    - Retrieve the session (with `expand: ["payment_intent"]`) and wait with `waitForPaidBooking`.
    - If the booking exists, read it: `service_package_name`, `service_package_price`, `appointment_date`, `appointment_time`, `total_duration`, `vehicle_id`, its add-ons, and the vehicle's plate, year, make and model.
    - Otherwise, use the session metadata: `spn`, `spp`, `aids` (add-on names and prices), `ad`, `at`, `td`, and `vid` (vehicle).
    - `totalPaid = amount_total / 100`. The method is card. Throw when there's no booking and `payment_status !== "paid"`, as today.
  - **`booking_id`:** read the same booking columns plus `payment_method` and `total_price`. Then `totalPaid = total_price`.

- [ ] **Step 1: Implement.** First read the current pages' two paths, so the queries match today's.
- [ ] **Step 2: Run** `npx tsc --noEmit -p .`. Expect no output.
- [ ] **Step 3: Commit** `feat(booking): one receipt loader for both success pages`

---

### Task 3: Receipt view and both pages

**Files:**
- Modify: `components/booking/BookingTicket.tsx`. Props become `{ date, time, serviceName, extras: string[], duration, plate, vehicle }`, where `date` and `time` stay raw (`"YYYY-MM-DD"`, `"H:MM"`).
- Modify: `components/booking/ConfirmationStep.tsx`, to pass `serviceName={service?.name ?? null}`, `extras={addOns.map(a => a.name)}` and `vehicle` (year, make and model from `vehicleInfo`).
- Create: `components/booking/BookingReceipt.tsx`
- Move: `app/(user)/(booking)/success/page.tsx` → `app/(booking-flow)/success/page.tsx`, rewritten. It exports `metadata = { title: "You're booked", robots: { index: false, follow: false } }`. Delete `app/(user)/(booking)/layout.tsx` and the folder if nothing else is in it.
- Modify: `app/(dashboard)/dashboard/bookings/success/page.tsx`, rewritten to use the loader and the component.

**Interfaces:**
- Consumes: `loadBookingReceipt` (Task 2) and `Receipt` (Task 1).
- Produces: `BookingReceipt({ receipt, action }: { receipt: Receipt; action: { href: string; label: string } })`. This is a server component with the layout from the spec's "View" section. The ticket comes from `BookingTicket`. `Receipt` holds formatted `day` and `time`, so give `BookingTicket` a `display` prop for preformatted values, or let `BookingReceipt` render the ticket from the receipt's fields. That choice is left to the implementer.

- [ ] **Step 1: Build.**
  - **Guest:** `action = { href: "/signup", label: "Create a free account" }`. Signed in: `{ href: "/dashboard/bookings", label: "See your bookings" }`.
  - **Directions URL:** `https://www.google.com/maps/dir/?api=1&destination=10410+S+Main+St,+Houston,+TX+77025`, opened in a new tab with `rel="noreferrer"`.
- [ ] **Step 2: Static checks.** Run `npx tsc --noEmit -p .`, `npx eslint components/booking "app/(booking-flow)" "app/(dashboard)/dashboard/bookings/success"`, and the palette grep over the touched files. Expect clean output.
- [ ] **Step 3: Probe** (read-only).
  - Find a recent cash or membership booking id with a read-only service-role GET on `bookings` (`select=id&order=created_at.desc&limit=3`).
  - GET `/success?booking_id=<id>` returns 200 and contains "You're booked", "Receipt", "Get directions" and "Create a free account". It has no step progress ("Booking steps") and no "Book Online" (marketing navbar).
  - Signed out, GET `/dashboard/bookings/success?booking_id=<id>` redirects as before.
  - GET `/confirmation?service=<id>&license_plate=TEST123&date=2026-11-20&time=9:30` still renders its ticket with TEST123.
- [ ] **Step 4: Commit** `feat(booking): success pages in the 24/7 Bay look with the true total`

---

### Task 4: DESIGN.md, checks, PR

- [ ] **Step 1:** In `DESIGN.md`, under Booking Ticket, note that the success pages reuse the ticket with a white receipt. In Divergences, remove "the booking success pages are not yet".
- [ ] **Step 2: Full checks.** Run `npx vitest run`, `npx tsc --noEmit -p .` and `npx eslint lib app components`. Expect all tests to pass and no new warnings.
- [ ] **Step 3: Commit** `docs(design): booking success pages`, then push and open the PR to `main` after the whole-branch review. List the preview checks:
  - a guest card booking with the sale;
  - a cash booking;
  - a member's free wash;
  - phone width.
