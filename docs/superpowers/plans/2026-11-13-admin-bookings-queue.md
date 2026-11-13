# Admin Bookings Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/admin/booking` so attendants open it and see today's cars at once (month calendar + day panel with big Start / Complete buttons), with private details behind a tap and the old all-bookings table moved to a List tab.

**Architecture:** Pure logic (status words, names, refs, times, month grid, list updates, search ordering) lives in `lib/admin/bookingQueue.ts` with Vitest tests. `app/admin/booking/booking-view.tsx` becomes a thin orchestrator that loads data (selected day, visible month, search results) and wires realtime; presentational pieces are split into a calendar, a card, a details drawer and the List tab. No schema change.

**Tech Stack:** Next.js 16 App Router (client component), React, Supabase JS, Tailwind CSS 4 (container queries via `@container` / `@2xl:`), shadcn/ui (`Sheet`, `Tabs`, `AlertDialog`, `Switch`, `Button`, `Badge`), Vitest, lucide-react.

**Spec:** `docs/superpowers/specs/2026-11-13-admin-bookings-queue-design.md`

## Global Constraints

- No migration, no schema change, no change to booking statuses or to the emails sent.
- Start sets `confirmed`; Complete sets `completed` and still calls `/api/send-tip-email` and `/api/send-invoice` exactly as `updateBookingStatus` does today (move that function, don't rewrite it).
- Status words: `pending` → "Waiting"; `confirmed` / `in_progress` → "In progress"; `completed` → "Done"; `cancelled` → "Cancelled".
- Calendar cells and card faces never show phone, email or the full booking ID. Card face shows `Ref XXXXXXXX` (first 8 characters of the ID, uppercased).
- Delete is shown only when `userProfile?.user_type === "super_admin"`; Cancel is shown to every admin.
- Status dots, not coloured side stripes, mark status in the calendar (design-hook rule).
- Admin console style: neutral shadcn theme, blue-900 accents, like `app/admin/campaigns/page.tsx`. Not the customer brand tokens.
- Touch targets at least 44px tall; the card's main button spans the card width.
- Dates are Houston dates (`houstonToday()` in `lib/admin/bookingQuery.ts`).
- Many files are CRLF (`booking-view.tsx`, `useBookingRealtime.ts`, `bookingQuery.ts`, its test). Keep each file's line endings; check with `file <path>`. Never `sed -i` them in Git Bash.
- `.env.local` points at the **live** Supabase project. During local checks, **never press Start, Complete, Cancel, Delete or New booking**; Complete sends real emails.
- Work on branch `feat/bookings-queue`. Commits have **no** Co-Authored-By trailer. The user pushes and merges.
- Vitest only runs `lib/**/*.test.ts`.

## Review Focus

- A booking with `vehicle` null or `customer_name` null/blank renders a card ("Guest", "No vehicle on file") instead of crashing. Pinned by `shortName` / `firstName` tests in Task 1; Task 5 renders the fallbacks.
- Legacy `appointment_time` values in 12-hour text ("10:10 PM", seen in the old `isNewBooking`) display and sort correctly next to "14:30:00". Pinned by `formatTime12` / `timeMinutes` tests in Task 1 and the `applyBookingChange` ordering test in Task 2.
- Names with stray spaces ("Devon Bankett ") shorten to "Devon B.". Pinned in Task 1.
- An attendant types `#1a2b3c4d` (with "#", lower case) from a customer email and finds the booking. Pinned by `isShortRefTerm` / `matchesShortRef` tests in Task 1 and the `bookingSearchOr` ids test in Task 3.
- A booking deleted elsewhere disappears, and one rescheduled onto the selected day appears, without reload. Pinned by `applyBookingChange` tests in Task 2; wired in Tasks 4 and 8.

---

### Task 1: Queue labels and identity helpers

**Files:**
- Create: `lib/admin/bookingQueue.ts`
- Test: `lib/admin/bookingQueue.test.ts`

**Interfaces:**
- Consumes: `Booking` from `@/types`.
- Produces:
  - `type QueueStatus = "waiting" | "in_progress" | "done" | "cancelled"`
  - `queueStatus(status: Booking["status"]): QueueStatus`
  - `QUEUE_STATUS_LABEL: Record<QueueStatus, string>`
  - `shortName(full: string | null | undefined): string`
  - `firstName(full: string | null | undefined): string`
  - `shortRef(id: string): string`
  - `isShortRefTerm(term: string): boolean`
  - `matchesShortRef(id: string, term: string): boolean`
  - `timeMinutes(time: string | null | undefined): number`
  - `formatTime12(time: string | null | undefined): string`
  - `tookLabel(confirmedAt: string | null, completedAt: string | null): string | null`
  - `isNewBooking(createdAt: string | null | undefined, now: Date): boolean`
  - `dayCounts(rows: Pick<Booking, "status">[]): { waiting: number; inProgress: number; done: number }`
  - `nextWaitingId(rows: Pick<Booking, "id" | "status" | "appointment_time">[]): string | null`

- [ ] **Step 1: Create the branch**

Run: `git switch -c feat/bookings-queue`
Expected: `Switched to a new branch 'feat/bookings-queue'`

- [ ] **Step 2: Write the failing tests** in `lib/admin/bookingQueue.test.ts`

```ts
import { describe, expect, it } from "vitest";
import {
  QUEUE_STATUS_LABEL, dayCounts, firstName, formatTime12, isNewBooking, isShortRefTerm,
  matchesShortRef, nextWaitingId, queueStatus, shortName, shortRef, timeMinutes, tookLabel,
} from "./bookingQueue";

describe("queueStatus", () => {
  it("maps database statuses to the attendant's words", () => {
    expect(queueStatus("pending")).toBe("waiting");
    expect(queueStatus("confirmed")).toBe("in_progress");
    expect(queueStatus("in_progress")).toBe("in_progress");
    expect(queueStatus("completed")).toBe("done");
    expect(queueStatus("cancelled")).toBe("cancelled");
    expect(QUEUE_STATUS_LABEL).toEqual({ waiting: "Waiting", in_progress: "In progress", done: "Done", cancelled: "Cancelled" });
  });
});

describe("names", () => {
  it("shortens to first name and last initial", () => {
    expect(shortName("James Carter")).toBe("James C.");
    expect(shortName("Devon Bankett ")).toBe("Devon B.");
    expect(shortName("  Maria  de la Cruz ")).toBe("Maria C.");
    expect(shortName("Madonna")).toBe("Madonna");
    expect(shortName(null)).toBe("Guest");
    expect(shortName("   ")).toBe("Guest");
  });
  it("first name for calendar cells", () => {
    expect(firstName("James Carter")).toBe("James");
    expect(firstName(undefined)).toBe("Guest");
  });
});

describe("short reference", () => {
  const id = "1a2b3c4d-1111-2222-3333-444455556666";
  it("is the first 8 characters, upper case", () => {
    expect(shortRef(id)).toBe("1A2B3C4D");
  });
  it("recognises a typed reference, with or without #", () => {
    expect(isShortRefTerm("#1a2b3c4d")).toBe(true);
    expect(isShortRefTerm("1A2B3C4D")).toBe(true);
    expect(isShortRefTerm("1a2b3c4")).toBe(false);
    expect(isShortRefTerm("James Ca")).toBe(false);
  });
  it("matches a booking id by its reference", () => {
    expect(matchesShortRef(id, "#1A2B3C4D")).toBe(true);
    expect(matchesShortRef(id, "ffffffff")).toBe(false);
  });
});

describe("times", () => {
  it("reads 24-hour and legacy 12-hour values", () => {
    expect(timeMinutes("14:30:00")).toBe(870);
    expect(timeMinutes("09:05")).toBe(545);
    expect(timeMinutes("10:10 PM")).toBe(1330);
    expect(timeMinutes("12:15 AM")).toBe(15);
    expect(timeMinutes("garbage")).toBe(Number.MAX_SAFE_INTEGER);
    expect(timeMinutes(null)).toBe(Number.MAX_SAFE_INTEGER);
  });
  it("formats as 12-hour", () => {
    expect(formatTime12("14:30:00")).toBe("2:30 PM");
    expect(formatTime12("00:15")).toBe("12:15 AM");
    expect(formatTime12("10:10 PM")).toBe("10:10 PM");
    expect(formatTime12(null)).toBe("—");
  });
  it("says how long a finished wash took", () => {
    expect(tookLabel("2026-11-13T15:00:00Z", "2026-11-13T15:00:45Z")).toBe("45 sec");
    expect(tookLabel("2026-11-13T15:00:00Z", "2026-11-13T15:18:00Z")).toBe("18 min");
    expect(tookLabel("2026-11-13T15:00:00Z", "2026-11-13T17:05:00Z")).toBe("2 hr");
    expect(tookLabel(null, "2026-11-13T15:18:00Z")).toBeNull();
    expect(tookLabel("2026-11-13T15:18:00Z", "2026-11-13T15:00:00Z")).toBeNull();
  });
  it("calls a booking new for 10 minutes after it was made", () => {
    const now = new Date("2026-11-13T15:10:00Z");
    expect(isNewBooking("2026-11-13T15:01:00Z", now)).toBe(true);
    expect(isNewBooking("2026-11-13T14:59:00Z", now)).toBe(false);
    expect(isNewBooking(null, now)).toBe(false);
  });
});

describe("day summary", () => {
  const rows = [
    { id: "a", status: "pending" as const, appointment_time: "10:30:00" },
    { id: "b", status: "pending" as const, appointment_time: "09:00:00" },
    { id: "c", status: "confirmed" as const, appointment_time: "08:30:00" },
    { id: "d", status: "completed" as const, appointment_time: "08:00:00" },
    { id: "e", status: "cancelled" as const, appointment_time: "07:00:00" },
  ];
  it("counts waiting, in progress and done, never cancelled", () => {
    expect(dayCounts(rows)).toEqual({ waiting: 2, inProgress: 1, done: 1 });
  });
  it("finds the earliest waiting car", () => {
    expect(nextWaitingId(rows)).toBe("b");
    expect(nextWaitingId([rows[3]])).toBeNull();
  });
});
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `npx vitest run lib/admin/bookingQueue.test.ts`
Expected: FAIL, cannot resolve `./bookingQueue`.

- [ ] **Step 4: Implement the Interfaces in `lib/admin/bookingQueue.ts`**

`tookLabel` keeps the thresholds of today's `getBookingCompletionTime` in `booking-view.tsx` (seconds under 60 s, minutes under 60 min, else hours, `toFixed(0)`). `shortName` uses the first and the last whitespace-separated word. `timeMinutes` accepts `H:MM`, `HH:MM`, `HH:MM:SS` and the same with ` AM` / ` PM`.

- [ ] **Step 5: Run the tests to see them pass**

Run: `npx vitest run lib/admin/bookingQueue.test.ts`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add lib/admin/bookingQueue.ts lib/admin/bookingQueue.test.ts
git commit -m "feat(admin): booking queue labels, names, refs and times"
```

---

### Task 2: Month grid, list updates and search order

**Files:**
- Modify: `lib/admin/bookingQueue.ts`
- Test: `lib/admin/bookingQueue.test.ts`

**Interfaces:**
- Consumes: `timeMinutes` (Task 1), `addDays` from `./bookingQuery`.
- Produces:
  - `type CalendarEntry = Pick<Booking, "id" | "appointment_date" | "appointment_time" | "status" | "customer_name">`
  - `CALENDAR_SELECT = "id, appointment_date, appointment_time, status, customer_name"`
  - `monthOf(date: string): string` ("2026-11-13" → "2026-11")
  - `shiftMonth(month: string, delta: number): string`
  - `monthGrid(month: string): string[][]` (Monday-first weeks of "YYYY-MM-DD")
  - `monthBounds(month: string): { gte: string; lte: string }` (first and last grid cell)
  - `type Dated = { id: string; appointment_date: string; appointment_time: string }`
  - `compareSlots(a: Dated, b: Dated): number` (date, then `timeMinutes`)
  - `applyBookingChange<T extends Dated>(list: T[], id: string, row: T | null, keep: (row: T) => boolean): T[]`
  - `sortSearchResults<T extends Dated>(rows: T[], today: string): T[]`

- [ ] **Step 1: Add the failing tests**

```ts
describe("month grid", () => {
  it("covers November 2026 in Monday-first weeks", () => {
    const g = monthGrid("2026-11");
    expect(g).toHaveLength(6);
    expect(g[0][0]).toBe("2026-10-26");
    expect(g[0][6]).toBe("2026-11-01");
    expect(g[5][6]).toBe("2026-12-06");
    expect(monthBounds("2026-11")).toEqual({ gte: "2026-10-26", lte: "2026-12-06" });
  });
  it("uses exactly 4 weeks when the month fits", () => {
    expect(monthGrid("2027-02")).toHaveLength(4);
    expect(monthGrid("2027-02")[0][0]).toBe("2027-02-01");
  });
  it("moves between months and years", () => {
    expect(monthOf("2026-11-13")).toBe("2026-11");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
});

describe("applyBookingChange", () => {
  const row = (id: string, date: string, time: string) => ({ id, appointment_date: date, appointment_time: time });
  const onDay = (r: { appointment_date: string }) => r.appointment_date === "2026-11-13";
  const list = [row("a", "2026-11-13", "09:00:00"), row("b", "2026-11-13", "11:00:00")];
  it("removes a deleted booking", () => {
    expect(applyBookingChange(list, "a", null, onDay).map((r) => r.id)).toEqual(["b"]);
  });
  it("adds a booking moved onto the day, in time order", () => {
    const moved = row("c", "2026-11-13", "10:10 AM");
    expect(applyBookingChange(list, "c", moved, onDay).map((r) => r.id)).toEqual(["a", "c", "b"]);
  });
  it("drops a booking moved off the day", () => {
    expect(applyBookingChange(list, "b", row("b", "2026-11-14", "11:00:00"), onDay).map((r) => r.id)).toEqual(["a"]);
  });
});

describe("sortSearchResults", () => {
  it("puts today and upcoming first (soonest first), then past (latest first)", () => {
    const rows = [
      { id: "past-old", appointment_date: "2026-10-01", appointment_time: "09:00:00" },
      { id: "next-week", appointment_date: "2026-11-20", appointment_time: "09:00:00" },
      { id: "past-recent", appointment_date: "2026-11-12", appointment_time: "09:00:00" },
      { id: "today-late", appointment_date: "2026-11-13", appointment_time: "15:00:00" },
      { id: "today-early", appointment_date: "2026-11-13", appointment_time: "08:00:00" },
    ];
    expect(sortSearchResults(rows, "2026-11-13").map((r) => r.id)).toEqual([
      "today-early", "today-late", "next-week", "past-recent", "past-old",
    ]);
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run lib/admin/bookingQueue.test.ts`
Expected: FAIL, missing exports.

- [ ] **Step 3: Implement the Interfaces** (date arithmetic on "YYYY-MM-DD" in UTC, as `addDays` does; `applyBookingChange` removes `id`, inserts `row` when non-null and `keep(row)`, then sorts with `compareSlots`).

- [ ] **Step 4: Run to see them pass**

Run: `npx vitest run lib/admin/bookingQueue.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add lib/admin/bookingQueue.ts lib/admin/bookingQueue.test.ts
git commit -m "feat(admin): month grid, live list updates and search order for the queue"
```

---

### Task 3: Search by phone and by short reference

**Files:**
- Modify: `lib/admin/bookingQuery.ts` (`bookingSearchOr`)
- Test: `lib/admin/bookingQuery.test.ts`

**Interfaces:**
- Produces: `bookingSearchOr(rawTerm: string, vehicleIds: string[], bookingIds?: string[]): string | null`. Adds `customer_phone.ilike.%term%` after the service clause, and `id.in.(…)` when `bookingIds` is non-empty. The List tab benefits too.

- [ ] **Step 1: Update the existing expectation and add tests**

```ts
it("matches name, email, service and phone, plus matching vehicles", () => {
  expect(bookingSearchOr("ab 12", ["v1", "v2"])).toBe(
    "customer_name.ilike.%ab 12%,customer_email.ilike.%ab 12%,service_package_name.ilike.%ab 12%,customer_phone.ilike.%ab 12%,vehicle_id.in.(v1,v2)",
  );
});
it("includes bookings found by short reference", () => {
  expect(bookingSearchOr("1a2b3c4d", [], ["id-1", "id-2"])).toContain("id.in.(id-1,id-2)");
  expect(bookingSearchOr("x", [], [])).not.toContain("id.in.");
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run lib/admin/bookingQuery.test.ts`
Expected: FAIL on the phone clause and `id.in`.

- [ ] **Step 3: Implement** (keep the file CRLF).

- [ ] **Step 4: Run to see them pass**

Run: `npx vitest run lib/admin/bookingQuery.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add lib/admin/bookingQuery.ts lib/admin/bookingQuery.test.ts
git commit -m "feat(admin): booking search matches phone and short reference"
```

---

### Task 4: Realtime removes deleted bookings and reports every change

**Files:**
- Modify: `hooks/useBookingRealtime.ts`

**Interfaces:**
- Produces:
  - `type BookingRealtimeChange = { table: "bookings" | "vehicles" | "booking_add_ons"; type: "INSERT" | "UPDATE" | "DELETE"; id: string; booking: Booking | null }` (exported from the hook file)
  - `useBookingRealtime(setBookings: Dispatch<SetStateAction<Booking[]>> | null, onNewBooking?: (b: Booking) => void, onChange?: (c: BookingRealtimeChange) => void)`
- The customer page call `useBookingRealtime(setBookings)` keeps working unchanged.

- [ ] **Step 1: Implement**
  - For `table === "bookings"` and `eventType === "DELETE"`: do not refetch. Remove `payload.old.id` with `setBookings?.(…)` and call `onChange?.({ table, type: "DELETE", id, booking: null })`, then return.
  - Otherwise refetch as today; call `setBookings?.(…)` as today; then `onChange?.({ table, type: payload.eventType, id, booking: fullBooking })`.
  - `onNewBooking` keeps firing for new bookings when `setBookings` is given (today's behaviour). Callers without `setBookings` detect new bookings from `onChange` (`table === "bookings" && type === "INSERT"`).
  - Callers must pass a stable `onChange` (`useCallback`), since it is an effect dependency.

- [ ] **Step 2: Verify types and the customer page still compile**

Run: `npx tsc --noEmit -p .`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add hooks/useBookingRealtime.ts
git commit -m "fix(bookings): realtime removes deleted bookings and reports each change"
```

---

### Task 5: Booking card and details drawer

**Files:**
- Create: `app/admin/booking/booking-card.tsx`
- Create: `app/admin/booking/booking-drawer.tsx`

**Interfaces:**
- Consumes: Task 1 helpers; `Booking` from `@/types`; shadcn `Sheet`, `AlertDialog`, `Button`, `Badge`.
- Produces:
  - `BookingCard(props: { booking: Booking; isMember: boolean; isNext: boolean; now: Date; showDate?: boolean; busy: boolean; onAdvance: (b: Booking, next: "confirmed" | "completed") => void; onOpen: (b: Booking) => void })`
  - `BookingDrawer(props: { booking: Booking | null; isMember: boolean; canDelete: boolean; busy: boolean; onOpenChange: (open: boolean) => void; onEdit: (b: Booking) => void; onCancelBooking: (b: Booking) => void; onDelete: (b: Booking) => void })`

- [ ] **Step 1: Build `BookingCard`**
  - Face: `formatTime12(time) · {total_duration} min`; when `showDate`, the weekday and date first (e.g. "Fri, Nov 13"). Status badge from `QUEUE_STATUS_LABEL[queueStatus(status)]` with a status dot; when done, "took {tookLabel}".
  - `shortName(customer_name)`, `Ref {shortRef(id)}`, the plate in a mono uppercase chip, then `year make model · colors · body_type`; when `vehicle` is null, "No vehicle on file".
  - Service name and add-on names joined with " + ".
  - Tags: "Member" when `isMember`; payment method (card / cash / subscription); "New" when `isNewBooking(created_at, now)`; a note icon (lucide `StickyNote`, with `aria-label="Has notes"`) when `notes` or `special_instructions` is non-empty.
  - Button: Waiting → "Start" (calls `onAdvance(b, "confirmed")`); In progress → "Complete" (`"completed"`, green); none for Done or Cancelled. Full width, `min-h-12`, disabled while `busy`; its click must not also open the drawer.
  - `isNext` outlines the card (`ring-2 ring-blue-900`). Cancelled cards are muted.
  - The whole card is a button-like region (`role="button"`, `tabIndex={0}`, Enter/Space) that calls `onOpen`.
- [ ] **Step 2: Build `BookingDrawer`** (`Sheet side="right"`, scrollable)
  - Full name, phone as `tel:` link, email as `mailto:`, full booking ID, payment method.
  - Price lines: service (`service_package_price`), each add-on (`name`, `price`), total (`total_price`), all `$` with 2 decimals.
  - `notes` and `special_instructions` (each only when present).
  - Attendant name, started (`confirmed_at`) and finished (`completed_at`) as local date-time, "—" when missing; "took …" when done.
  - Actions: Edit only when status is `pending`; Cancel booking unless already cancelled or completed; Delete only when `canDelete`. Cancel and Delete each go through an `AlertDialog` ("Cancel this booking?" / "Delete this booking? This can't be undone."), and the drawer stays open on "Keep it".
- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit -p .` then `npx eslint app/admin/booking`
Expected: no tsc output; eslint shows no errors in the new files.

- [ ] **Step 4: Commit**

```bash
git add app/admin/booking/booking-card.tsx app/admin/booking/booking-drawer.tsx
git commit -m "feat(admin): booking card and details drawer for the queue"
```

---

### Task 6: Month calendar

**Files:**
- Create: `app/admin/booking/queue-calendar.tsx`

**Interfaces:**
- Consumes: `monthGrid`, `shiftMonth`, `CalendarEntry`, `compareSlots`, `queueStatus`, `firstName`, `formatTime12` (Tasks 1–2).
- Produces: `QueueCalendar(props: { month: string; today: string; selected: string; entries: CalendarEntry[]; onSelect: (date: string) => void; onMonthChange: (month: string) => void })`. The caller passes entries already filtered for "Show cancelled".

- [ ] **Step 1: Build it**
  - Header: prev / next month buttons (`aria-label`s), month name ("November 2026"), and a "Today" button that calls `onMonthChange(monthOf(today))` and `onSelect(today)`. Legend: Waiting, In progress, Done dots.
  - Grid: Mon–Sun headings; days outside the month dimmed; today's number in a filled circle; the selected day outlined. Each cell is a `<button>` that calls `onSelect(date)`, with an `aria-label` like "Fri, Nov 13, 8 bookings".
  - Wrap the grid in `@container`. Wide (`@2xl` and up): up to 3 entries "9:30 AM Maria" each with a status dot, sorted by `compareSlots`, then "+N more". Narrow: status dots (max 5) and the count, e.g. "●●● 5". No coloured side stripes.
- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p .` then `npx eslint app/admin/booking`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add app/admin/booking/queue-calendar.tsx
git commit -m "feat(admin): month calendar with compact cells for the queue"
```

---

### Task 7: List tab (the old table, moved)

**Files:**
- Create: `app/admin/booking/bookings-list-tab.tsx`

**Interfaces:**
- Consumes: today's code in `booking-view.tsx`: `loadPage`, the user_subscription lookup, filters, `BookingsTable`, `Pagination`, `ExportModal`, `handleDownload`.
- Produces: `BookingsListTab(props: { userProfile: UserProfile | null; refreshKey: number; onUpdateStatus: (id: string, status: Booking["status"]) => Promise<void>; onDeleteBooking: (id: string) => Promise<void> })`. Reloads the current page when `refreshKey` changes.

- [ ] **Step 1: Move the block** (search, status filter, date-range filter, table, pagination, Export with its modal) with behaviour unchanged. The search placeholder becomes "Search name, phone, plate, booking #".
- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p .`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add app/admin/booking/bookings-list-tab.tsx
git commit -m "refactor(admin): bookings table, filters and export as a List tab"
```

---

### Task 8: The page: header, tabs, calendar + day panel, search results

**Files:**
- Modify (rewrite): `app/admin/booking/booking-view.tsx` (keep CRLF)

**Interfaces:**
- Consumes: everything above; `NewBookingModal`, `EditBookingModal`, `BookingNotification`, `usePushNotifications`, `useAuth`.
- Produces: default export `BookingsView` (same name, same page wiring).

- [ ] **Step 1: State and data**
  - State: `tab: "calendar" | "list"`, `today` (`houstonToday()`, recomputed every 60 s), `selected` (starts at today), `month` (`monthOf(selected)`), `showCancelled` (false), `chip: "all" | QueueStatus` (no "cancelled" chip), `search` / `debouncedSearch` (300 ms), `dayBookings: Booking[]`, `monthEntries: CalendarEntry[]`, `results: Booking[] | null` (null when no search), `memberIds: Set<string>`, `drawerId: string | null`, `editing: Booking | null`, `busyId: string | null`, `listRefresh: number`.
  - `loadDay`: `BOOKING_SELECT` for `appointment_date = selected`, ordered by time; state sorted with `compareSlots`.
  - `loadMonth`: `CALENDAR_SELECT` between `monthBounds(month)`.
  - `runSearch`: vehicle ids via `vehicleSearchOr`; short-ref ids from `monthEntries` and `dayBookings` via `matchesShortRef` when `isShortRefTerm`; `bookingSearchOr(term, vehicleIds, refIds)`; order `appointment_date desc`, `limit(51)`; show 50 sorted with `sortSearchResults(rows, today)`, and "Showing the first 50, refine your search" when 51 come back.
  - Member tags: `user_subscription` `status = active` for the user IDs in the day and in the results.
  - Clicking a day while searching clears the search.
- [ ] **Step 2: Realtime**
  - `useBookingRealtime(null, undefined, onChange)` with a stable `onChange` that:
    - applies `applyBookingChange` to `dayBookings` (keep: same date as `selected`), to `monthEntries` (keep: inside `monthBounds(month)`) and to `results` when non-null (keep: already in results), then re-sorts results with `sortSearchResults`
    - bumps `listRefresh`
    - for `table === "bookings" && type === "INSERT"`, shows `BookingNotification` for 2 minutes, as today
  - Keep the notification permission request and the Enable / Disable notifications button.
- [ ] **Step 3: Actions**
  - Move `updateBookingStatus` and `deleteBooking` unchanged, except they set `busyId` and update lists through `applyBookingChange` instead of `setBothLists`.
  - Start / Complete from cards; Cancel / Delete / Edit from the drawer (`canDelete = userProfile?.user_type === "super_admin"`). After Edit success, reload day, month and search.
- [ ] **Step 4: Layout**
  - Header: "Bookings", the count line `"{waiting} waiting · {inProgress} in progress · {done} done"` from `dayCounts(dayBookings)` (with "today" appended when `selected === today`), `Tabs` Calendar | List, a "Show cancelled" `Switch`, "+ New booking", and the notifications button.
  - Row 2 (Calendar tab): search input (`aria-label="Search bookings"`, placeholder "Search name, phone, plate, booking #", a clear button) and chips All / Waiting / In progress / Done.
  - Body: `grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]`. Below `lg`, the day panel comes first (`order-first`). The day panel scrolls on its own (start with `lg:max-h-[calc(100dvh-13rem)] overflow-y-auto`, tuned so today's cards and the calendar are visible without page scroll at 1024×768 and 1440×900).
  - Day panel heading: "Today · Fri, Nov 13" or "Wed, Nov 18", plus "{n} bookings". It lists `dayBookings` filtered by `showCancelled` and `chip`, as `BookingCard`s with `isNext` = (`selected === today` and `id === nextWaitingId(dayBookings)`). Empty state: "No bookings on this day."
  - While searching, the panel heading is "Search results", with cards showing `showDate`. Empty state: "No bookings match "{term}"."
  - List tab renders `BookingsListTab`.
  - Remove the stat cards, the old day cards, the progress bars and `isNewBooking` / `getProgress` / `getStatusColor` from this file.
- [ ] **Step 5: Verify statically**

Run: `npx vitest run` then `npx tsc --noEmit -p .` then `npx eslint app/admin/booking lib/admin hooks/useBookingRealtime.ts`
Expected: all tests pass (682 before this work, plus the new ones); no tsc output; no new eslint errors.

- [ ] **Step 6: Commit**

```bash
git add app/admin/booking/booking-view.tsx
git commit -m "feat(admin): bookings page opens on today with a month calendar and day queue"
```

---

### Task 9: Check it in the browser (read-only)

**Files:** none (fixes found go back into the owning task's files).

- [ ] **Step 1:** Start `npm run dev` (background) and have the user sign in as admin on `http://localhost:3000/admin/booking` (live data, so **no Start / Complete / Cancel / Delete / New booking clicks**).
- [ ] **Step 2:** At 1440×900 and 1024×768 (window resize or DevTools device toolbar), confirm:
  - today's panel and the calendar are visible without page scroll
  - calendar cells show names at 1440 and dots + counts at 1024
  - tapping a day switches the panel
  - "Show cancelled" toggles cancelled bookings
  - chips filter the panel
  - search by a known plate and by an 8-character Ref from a booking shows "Search results" with dates
  - a card opens the drawer with phone, email, full ID, prices, notes, attendant and times
  - Delete appears only for super_admin
  - the List tab still pages, filters and exports
  - the browser console has no errors
- [ ] **Step 3:** Stop the dev server (`taskkill /PID <pid> /F /T`; `TaskStop` alone does not kill Next).
- [ ] **Step 4:** Open the PR from `feat/bookings-queue` with a summary and the checks above. The body ends with "🤖 Generated with [Claude Code](https://claude.com/claude-code)". Do not merge.
