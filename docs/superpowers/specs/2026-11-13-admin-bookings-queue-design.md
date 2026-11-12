# Admin Bookings: calendar + day queue (design)

Date: 2026-11-13. Page: `/admin/booking` (`app/admin/booking/booking-view.tsx`).

## Why

Attendants use the admin Bookings page on a tablet or PC at the bay. Today the
page opens with three stat cards, a date picker, then very large booking cards
(labelled rows like "Customer Name:", progress bars, the full booking UUID),
then the all-bookings table. Finding "who is booked today, and who is next"
means scrolling up and down. The goal: **open the page and see today's cars
immediately, plus the month at a glance**, without losing any information the
current page shows.

The user supplied a reference screenshot (a "Queue" page from another app:
month calendar on the left, a "Today" panel on the right with one card per
booking and a big action button, search, a Calendar/Board switch and "Show
cancelled"). They picked this layout (option A) over a today-only list.

## Goals

- The page opens on **today**, visible without scrolling on a tablet in
  landscape (about 768px of page beside the 256px admin sidebar) and on a PC.
- A **month calendar** shows every day's bookings at a glance; tapping a day
  shows that day in the side panel.
- Each booking card is **scannable**: time, status, car, plate, service, and
  one big **Start** / **Complete** button.
- **Same data or better** than the current cards; nothing currently shown is
  lost (see "Data" below).
- **Private details hidden** from the card face (phone, email, full booking ID,
  payment and price breakdown) and shown only when a card is tapped.

## Non-goals

- No change to booking statuses, the booking flow, emails sent, or the
  database schema. No migration.
- No "Board" (kanban) view. The reference had one; we replace that slot with a
  **List** tab (see below).
- No redesign of the New booking or Edit booking modals (reused as they are).
- Not moving the admin console onto the brand tokens (DESIGN.md: admin is still
  on the neutral shadcn theme with blue-900 accents; keep it consistent with
  the rest of admin, e.g. the Campaigns page).

## Anti-goals (would be a failure even if it works)

- Phone numbers, emails or full booking IDs visible on the calendar or on card
  faces.
- The attendant has to scroll the whole page to reach today's cards, or the
  big action button is small / easy to mis-tap.
- Losing the office's all-bookings table, filters, paging or export.
- Completing a booking no longer sends the tip and invoice emails.

## Layout (decided by the user, option A)

Header row:
- Title "Bookings" and a count line for the **selected day**, e.g.
  "4 waiting · 1 in progress · 3 done" (cancelled not counted).
- **Calendar | List** tab switch, **Show cancelled** toggle (off by default),
  **+ New booking**, and the existing Enable/Disable notifications control.

Second row: search (name, phone, plate, booking #, service; see Search) and
status chips **All / Waiting / In progress / Done** that filter the side panel.

**Calendar tab** (default):
- **Left: month calendar**, Monday-first, with prev / next month and **Today**
  buttons, and a legend. Each day cell lists up to 3 entries as
  "time + first name", each with a small coloured status dot (not a coloured
  side stripe), then "+N more". Today is highlighted; the selected day is
  outlined. Tapping a day selects it.
- **Right: day panel** for the selected day (defaults to today, Houston date):
  heading "Today · Fri, Nov 13" (or the weekday/date when not today) and the
  number of bookings, then booking cards in time order. The panel scrolls on
  its own; the page itself should not need to scroll on tablet landscape / PC.
- The **next waiting car** (earliest pending booking on today) is outlined.
- **Fitting a tablet (user decision).** From 1024px screen width the admin
  sidebar is always shown and takes 256px, so a landscape tablet leaves the
  page about 768px. Calendar and day panel stay **side by side**; when the
  calendar column is too narrow for names, each day cell switches to a
  **compact** form: coloured status dots plus a count (e.g. "●●● 5"). With room
  (PC), cells show "time + first name" as in the reference. Decide by the
  calendar's own width (container query or measured width), not the screen
  width. Today's cards must stay visible without page scroll in both cases.
- Phones / tablet portrait (screen below 1024px, sidebar hidden behind its
  menu): stack with the **day panel first**, calendar below.

**List tab**: the current "Booking Management" block moved here unchanged in
behaviour: search, status filter, date-range filter, the `BookingsTable`,
pagination and Export.

The three stat cards (total bookings, today's count, total revenue) are
removed from this page; the count line covers today.

## Status words

Database `status` → label shown:
- `pending` → **Waiting** (amber dot) → button **Start** (sets `confirmed`).
- `confirmed` or `in_progress` → **In progress** (blue dot) → button
  **Complete** (sets `completed`).
- `completed` → **Done** (green dot), plus how long it took
  (completed_at − confirmed_at), as today.
- `cancelled` → **Cancelled**, only shown when "Show cancelled" is on.

Start / Complete keep the current `updateBookingStatus` behaviour exactly:
attendant name stamped, `confirmed_at` / `completed_at` set, and on Complete the
tip email and invoice are sent.

## Data

**On the card face:**
- time and duration ("10:00 AM · 30 min")
- status label (+ "took 18 min" when Done)
- customer **first name + last initial** ("James C.")
- **plate** (plate styling), car year, make, model, colour, body type
- service package name and add-on names
- tags: **Member** (customer has an active `user_subscription`, as the current
  table badge does), payment method (card / cash / subscription), **New**,
  and a note icon when `notes` or `special_instructions` exist
- the Start / Complete button

**In the details drawer (tap a card):**
- full customer name, **phone** (tap-to-call `tel:` link), **email**
- full booking ID
- price breakdown: service price, each add-on price, total
- payment method
- `notes` and `special_instructions` (the latter is stored today but never shown;
  this is an improvement)
- attendant name, started time (`confirmed_at`), finished time (`completed_at`)
- actions: **Edit** (pending only, as today; opens `EditBookingModal`),
  **Cancel booking**, **Delete** (both with a confirm step)

**Calendar cells** show only time and first name. Never phone or email.

## Search

**User decision: results list.** While the search box has text, the right
panel becomes **"Search results"**: every matching booking at **any date**,
upcoming first (today and later ascending), then past bookings (most recent
first), capped (e.g. 50, with "refine your search" when more). Each result is
the normal card plus its **date**; tapping opens the same drawer and Start /
Complete work as usual. Clearing the search returns to the selected day. The
calendar is unchanged while searching.

The search runs in the database (like the List tab, reusing
`bookingSearchOr` / `vehicleSearchOr`) and matches customer name, email,
service, vehicle plate / make / model, full booking ID, **plus customer
phone**. **Short reference** (my call): customers are given an 8-character
"Ref" (first 8 characters of the booking ID, in emails and their dashboard).
The card face shows it as "Ref XXXXXXXX", and an 8-character hex search term
also matches bookings already loaded in the browser (the visible month and
the selected day) by that prefix. Matching short refs across all time would
need a database function and is out of scope (no migrations).

## Data loading (constraints, existing code)

- Day panel: today's query (`appointment_date = selected`) with the existing
  `BOOKING_SELECT` (vehicle + add-ons) stays.
- Calendar: one query for the visible month's bookings with a light select
  (id, date, time, status, customer_name). Months hold on the order of a few
  hundred bookings; one query per month change is fine.
- Member tags: the existing `user_subscription` lookup for the user IDs shown.
- Realtime: keep `useBookingRealtime` and the new-booking notification so new
  or changed bookings appear in the calendar and day panel without reload.
- Dates use Houston time (`houstonToday()` in `lib/admin/bookingQuery.ts`).
- Pure logic (status mapping, name shortening, month grid, "next waiting car",
  counts, duration text) goes in `lib/admin/` with Vitest tests: Vitest only
  runs `lib/**/*.test.ts`.

## My calls (not discussed with the user; builder may revisit)

- **"New" tag** means created in the last 10 minutes (`created_at`). The current
  code's `isNewBooking` compares the *appointment* time to now, which doesn't
  match the word "New".
- The "In shop / Home" filter in the reference is dropped; we have no such
  split.
- Touch targets at least 44px tall; the main button full card width.
- Delete keeps working as today (hard delete) but moves into the drawer behind a
  confirm, and stays **super_admin only**, matching today's rule in
  `components/user/bookings-table.tsx`. Cancel booking is available to all
  admins, as Start / Complete are.
- The card face shows the short "Ref XXXXXXXX" (customers quote it); the full
  ID stays in the drawer.
- Realtime gaps in `useBookingRealtime` (a DELETE refetches a row that no
  longer exists so it is never removed; a booking moved onto the selected day
  is not added) are fixed as part of this work, and the calendar's month data
  updates from the same events.

## Left to the builder

- Component split and file names; whether the drawer is a shadcn `Sheet` or
  `Dialog`.
- Exact spacing and type within the admin console's existing style.
- How "+N more" in a calendar cell behaves beyond selecting that day.
