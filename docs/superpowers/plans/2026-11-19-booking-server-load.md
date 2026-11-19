# Booking Steps Load on the Server: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** All six booking step pages render with their data already loaded on the server, so the steps no longer fetch after hydration, and a member is never briefly offered payment for a free wash.

**Architecture:** Each step's `page.tsx` becomes an async server component. It reads `searchParams` and calls `getBookingStepData`, which loads everything in parallel through `loadBookingStep`. That function is pure and testable, and receives its database and lookups as arguments. A client `BookingStepShell` passes the result into the existing step components. `useBookingAuthContext` and `useBookingFlow` start from that data and fall back to their current browser fetching only when the server could not load something.

**Tech Stack:** Next.js 16 App Router (no `cacheComponents`), Supabase (`@supabase/ssr` server client, service-role admin client), React 19 client hooks, Vitest (runs `lib/**/*.test.ts` only).

**Spec:** `docs/superpowers/specs/2026-11-19-booking-server-load-design.md`

## Global Constraints

- No change to pricing, promo codes, payment or submit (`createBooking`, `/api/checkout_sessions`, `checkPromoCode` untouched).
- No change to how the steps look, apart from the loading screen.
- No change to `context/auth-context.tsx`.
- Catalog is read fresh on every request. No `"use cache"`, no `unstable_cache`, and `next.config.ts` is not touched.
- Guests get only the public catalog. Membership and car details come only for the signed-in user (car details keep the `getVehicleDisplay` rules: own or membership car gets details, otherwise just the plate).
- Testable logic lives in `lib/` (Vitest runs `lib/**/*.test.ts` only).
- Edit existing files with the Edit tool. These files are CRLF. New files get CRLF too: after `Write`, run `node -e "const f=process.argv[1],fs=require('fs');fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace(/\r?\n/g,'\r\n'))" <file>`.
- No Co-Authored-By trailer on commits.

## Review Focus

1. **The membership lookup fails on the server.** `subscription` must come back `undefined`, never `null`. The browser then loads it as today, and the button waits ("Loading your booking..."). It must not treat the customer as a non-member. Pinned in Task 3.
2. **The service or add-on lookup errors on the server.** `selectionKey` comes back `null`, so the browser refetches instead of trusting an empty result. Pinned in Task 3.
3. **A guest opens confirmation with a plate.** No membership lookup is made. The car shows only the plate. Pinned in Task 3 (and Task 2 for the car).
4. **The URL changes on the client to a selection the server did not load.** The hook must fetch, not show the old service. Pinned by the `bookingSelectionKey` tests in Task 1. The hook rule is in Task 4.
5. **Unknown add-on ids, or an unknown service id, in the URL.** Only add-ons that exist come back, and the service is `null`, as today. Pinned in Task 3.

---

### Task 1: URL helpers

**Files:**
- Modify: `lib/booking/bookingParams.ts`
- Test: `lib/booking/bookingParams.test.ts`

**Interfaces:**
- Produces:
  - `export type BookingStep = "service" | "datetime" | "confirmation"` (moved here; `hooks/useBookingFlow.ts` re-exports it with `export type { BookingStep } from "@/lib/booking/bookingParams"`).
  - `searchParamsFromRecord(record: Record<string, string | string[] | undefined>): URLSearchParams`
  - `bookingSelectionKey(sel: BookingSelection): string`

- [ ] **Step 1: Write the failing tests** in `lib/booking/bookingParams.test.ts`:

```ts
describe("searchParamsFromRecord", () => {
  it("keeps strings, takes the first of repeated values, drops undefined", () => {
    const sp = searchParamsFromRecord({ service: "s1", addons: ["a1,a2", "x"], date: undefined });
    expect(sp.get("service")).toBe("s1");
    expect(sp.get("addons")).toBe("a1,a2");
    expect(sp.has("date")).toBe(false);
  });
});

describe("bookingSelectionKey", () => {
  const base = { licensePlate: "ABC123", vehicleId: "", serviceId: "s1", addOnIds: ["a1", "a2"], date: "2026-11-20", time: "9:30" };
  it("ignores date and time", () => {
    expect(bookingSelectionKey(base)).toBe(bookingSelectionKey({ ...base, date: null, time: "10:00" }));
  });
  it("changes with the service, add-ons, plate or vehicle id", () => {
    const k = bookingSelectionKey(base);
    expect(bookingSelectionKey({ ...base, serviceId: "s2" })).not.toBe(k);
    expect(bookingSelectionKey({ ...base, addOnIds: ["a1"] })).not.toBe(k);
    expect(bookingSelectionKey({ ...base, licensePlate: "XYZ" })).not.toBe(k);
    expect(bookingSelectionKey({ ...base, vehicleId: "v1" })).not.toBe(k);
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run lib/booking/bookingParams.test.ts`
Expected: FAIL, `searchParamsFromRecord is not a function` / not exported.

- [ ] **Step 3: Implement both helpers and move `BookingStep`.** The key is `buildBookingSearch({ ...sel, date: null, time: null })`. Add the re-export of `BookingStep` in `hooks/useBookingFlow.ts` in place of its local type.

- [ ] **Step 4: Run the tests and see them pass**

Run: `npx vitest run lib/booking/bookingParams.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/booking/bookingParams.ts lib/booking/bookingParams.test.ts hooks/useBookingFlow.ts
git commit -m "feat(booking): URL helpers for server-loaded steps"
```

---

### Task 2: Car details as a lib function

**Files:**
- Create: `lib/booking/vehicleDisplay.ts`
- Test: `lib/booking/vehicleDisplay.test.ts`
- Modify: `app/actions/vehicle.ts`

**Interfaces:**
- Produces:
  - `export interface VehicleDisplay` (moved from `app/actions/vehicle.ts`, which keeps `export type { VehicleDisplay } from "@/lib/booking/vehicleDisplay"` so existing imports still work).
  - `describeVehicle(admin: SupabaseClient, userId: string | null, args: { licensePlate?: string | null; vehicleId?: string | null }): Promise<VehicleDisplay | null>`. This is the body of today's `getVehicleDisplay` after its `getUser()` call. `getVehicleDisplay` becomes: get the user, then `return describeVehicle(createAdminClient(), user?.id ?? null, args)`.

- [ ] **Step 1: Write the failing tests** in `lib/booking/vehicleDisplay.test.ts`. Use a local fake in the style of `lib/booking/customerVehicle.test.ts` (`select`/`eq`/`limit`/`maybeSingle` returning fixed rows per table):

```ts
it("a guest gets only the plate they typed", async () => {
  expect(await describeVehicle(db, null, { licensePlate: "abc 123" })).toEqual({
    year: null, make: null, model: null, body_type: null, colors: null, license_plate: "ABC123",
  }); // use normalizePlate("abc 123") for the expected plate if it differs
});
it("the owner gets the car's details", async () => {
  // vehicles row { id: "v1", user_id: "u1", year: 2020, make: "Honda", model: "Civic", body_type: "Sedan", colors: ["Blue"], license_plate: "ABC123" }
  expect((await describeVehicle(db, "u1", { licensePlate: "ABC123" }))?.make).toBe("Honda");
});
it("someone else's car gives just the plate", async () => {
  expect((await describeVehicle(db, "u2", { licensePlate: "ABC123" }))?.make).toBeNull();
});
it("nothing to describe gives null", async () => {
  expect(await describeVehicle(db, "u1", {})).toBeNull();
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run lib/booking/vehicleDisplay.test.ts`
Expected: FAIL, cannot find module `./vehicleDisplay`.

- [ ] **Step 3: Move the logic** into `describeVehicle` and make `getVehicleDisplay` delegate to it (`app/actions/vehicle.ts` stays `"use server"`).

- [ ] **Step 4: Run the tests and see them pass**

Run: `npx vitest run lib/booking/vehicleDisplay.test.ts lib/booking/customerVehicle.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/booking/vehicleDisplay.ts lib/booking/vehicleDisplay.test.ts app/actions/vehicle.ts
git commit -m "refactor(booking): car details as a lib function"
```

---

### Task 3: `loadBookingStep`, the server-side loader

**Files:**
- Create: `lib/booking/loadBookingStep.ts`
- Test: `lib/booking/loadBookingStep.test.ts`
- Modify: `lib/marketing/testing/fakeDb.ts` (add `limit(n)` and `maybeSingle()` to the chain; `maybeSingle` resolves `{ data: rows()[0] ?? null, error: null }`)

**Interfaces:**
- Consumes: `BookingStep`, `BookingSelection`, `bookingSelectionKey` (Task 1); `VehicleDisplay` (Task 2).
- Produces:

```ts
export interface BookingUser { id: string; email: string | null; fullName: string | null }

export interface BookingInitialData {
  /** bookingSelectionKey of what was loaded; null = the server could not load the selection, the browser loads it. */
  selectionKey: string | null;
  user: BookingUser | null;
  /** undefined = the server could not load it; the browser loads it as before. */
  subscription: Subscription | null | undefined;
  /** Service step only, otherwise null. */
  catalog: { services: ServicePackageRow[]; addOns: AddOnRow[] } | null;
  service: ServicePackageRow | null;
  addOns: AddOnRow[];
  /** Confirmation step only, otherwise null. */
  vehicleInfo: VehicleDisplay | null;
}

export async function loadBookingStep(args: {
  step: BookingStep;
  selection: BookingSelection;
  db: SupabaseClient; // the request's own client: RLS applies
  user: BookingUser | null;
  getSubscription: (userId: string) => Promise<Subscription | null>;
  getVehicle: (userId: string | null, sel: { licensePlate: string; vehicleId: string }) => Promise<VehicleDisplay | null>;
}): Promise<BookingInitialData>
```

Queries are the same ones `useBookingFlow` runs today. Catalog: `service_packages` and `add_ons` with `is_active = true`, ordered by `created_at`. Selection: `service_packages` by `id` (`maybeSingle`), and `add_ons` with `in("id", addOnIds)`. Everything runs in one `Promise.all`. `getSubscription` is called only with a user. `getVehicle` is called only on `"confirmation"` when there is a plate or a vehicle id. A catalog query error gives `catalog: null`.

- [ ] **Step 1: Write the failing tests** in `lib/booking/loadBookingStep.test.ts`, using the shared `fakeDb`:

```ts
// tables: service_packages [{ id: "s1", is_active: true, created_at: "2" , name: "Wash" }, { id: "s0", is_active: true, created_at: "1" }, { id: "sx", is_active: false, created_at: "3" }]
//         add_ons [{ id: "a1", is_active: true, created_at: "1" }, { id: "a2", is_active: true, created_at: "2" }]
it("service step: active catalog in created order, plus the chosen service and add-ons", ...)
  // catalog.services ids ["s0","s1"]; service.id "s1"; addOns ids ["a1"]; vehicleInfo null; getVehicle not called
it("datetime step: no catalog and no car lookup", ...)
  // catalog null; getVehicle not called; service resolved
it("confirmation step: car details for the signed-in user", ...)
  // getVehicle called with ("u1", { licensePlate: "ABC123", vehicleId: "" }); vehicleInfo is its result
it("guest: no membership lookup", ...)
  // user null → getSubscription not called; subscription null; getVehicle called with (null, ...)
it("membership lookup fails → subscription undefined, not null", ...)
  // getSubscription rejects → subscription === undefined
it("unknown add-on ids are dropped and an unknown service is null", ...)
  // selection addOnIds ["a1","nope"], serviceId "nope" → addOns ids ["a1"], service null, selectionKey === bookingSelectionKey(selection)
it("a failing service query gives selectionKey null", ...)
  // db whose service_packages chain resolves { data: null, error: { message: "x" } } → selectionKey null
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run lib/booking/loadBookingStep.test.ts`
Expected: FAIL, cannot find module `./loadBookingStep`.

- [ ] **Step 3: Add `limit`/`maybeSingle` to `fakeDb`, then implement `loadBookingStep`.**

- [ ] **Step 4: Run the tests and see them pass, then the whole suite**

Run: `npx vitest run`
Expected: all pass (938 before this branch plus the new tests).

- [ ] **Step 5: Commit**

```bash
git add lib/booking/loadBookingStep.ts lib/booking/loadBookingStep.test.ts lib/marketing/testing/fakeDb.ts
git commit -m "feat(booking): load a booking step's data in one server pass"
```

---

### Task 4: Hooks start from the server's data

**Files:**
- Modify: `hooks/useSubscription.ts`, `hooks/useBookingAuthContext.ts`, `hooks/useBookingFlow.ts`

**Interfaces:**
- Consumes: `BookingInitialData` (Task 3), `bookingSelectionKey` (Task 1), `VehicleDisplay` (Task 2).
- Produces:
  - `useSubscription({ includeOverdue?, skip? }: { includeOverdue?: boolean; skip?: boolean } = {})`. With `skip`, no fetch, and it returns `{ subscription: null, loading: false, ... }`.
  - `useBookingAuthContext(variant: BookingVariant, initial?: BookingInitialData): BookingAuthContext` (the return type is unchanged).
  - `useBookingFlow(ctx: BookingAuthContext, step: BookingStep, initial?: BookingInitialData)` (the return shape is unchanged).

Rules:

- [ ] **Step 1: `useSubscription` flash fix and `skip`.** Track which user id the subscription was loaded for. `loading` is reported as true while `user?.id` is set and differs from that id. This closes the one-render gap where `ready` was true with no membership. Existing callers are unchanged.

- [ ] **Step 2: `useBookingAuthContext`.** When `initial?.subscription !== undefined`, the server knows the answer:
  - call `useSubscription({ skip: true })`;
  - take `isAuthenticated`, `userId`, `userEmail` and `userFullName` from `initial.user`, and `subscription` from `initial.subscription`;
  - `ready` is `true`.

  Otherwise behave exactly as today (browser auth plus `useSubscription()`).
  - If the customer signs out in another tab, the server's values stay for that page. That is acceptable: `createBooking` and the checkout route re-check the session on submit.

- [ ] **Step 3: `useBookingFlow`.** `const fromServer = initial && initial.selectionKey !== null && initial.selectionKey === bookingSelectionKey(selection)`.
  - **Initial state:** take `services`, `allAddOns` (from `initial.catalog`), `service`, `addOns` and `vehicleInfo` from `initial`. Set `loading` to `!fromServer` (on the service step, also require `initial.catalog`).
  - **Catalog effect:** skip the fetch when `initial?.catalog` is set (copy it into state instead, so a new server render replaces it).
  - **Selection effect and vehicle effect:** when `fromServer`, set state from `initial` and `setLoading(false)` without fetching. Otherwise fetch exactly as today.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no output (callers still compile; `initial` is optional everywhere).

- [ ] **Step 5: Commit**

```bash
git add hooks/useSubscription.ts hooks/useBookingAuthContext.ts hooks/useBookingFlow.ts
git commit -m "feat(booking): booking hooks start from server data; no member payment flash"
```

---

### Task 5: Server pages, the shell and the loading screens

**Files:**
- Create: `lib/booking/bookingStepRequest.ts`, `components/booking/BookingStepShell.tsx`
- Create: `loading.tsx` in each of `app/(user)/(booking)/{service,datetime,confirmation}/` and `app/(dashboard)/dashboard/booking/{service,datetime,confirmation}/`. Each file is just `export { default } from "@/components/loading";`.
- Modify: the six `page.tsx` files listed above; `components/booking/{ServiceStep,DateTimeStep,ConfirmationStep}.tsx` (add an `initial?: BookingInitialData` prop and pass it to `useBookingFlow`).

**Interfaces:**
- Consumes: `loadBookingStep`, `BookingInitialData` (Task 3); `describeVehicle` (Task 2); `searchParamsFromRecord`, `parseBookingSelection`, `BookingStep` (Task 1); `getActiveSubscription(client, userId)` from `lib/services/subscriptionService.ts`.
- Produces:
  - `getBookingStepData(step: BookingStep, searchParams: Record<string, string | string[] | undefined>): Promise<BookingInitialData>` in `lib/booking/bookingStepRequest.ts`. It starts with `import "server-only"`. It uses `createClient()` from `@/utils/supabase/server`, then `auth.getUser()`. The user is `{ id, email, fullName: user_metadata.full_name ?? null }`. `getSubscription` is `(id) => getActiveSubscription(db, id)` and `getVehicle` is `(id, sel) => describeVehicle(createAdminClient(), id, sel)`. It then calls `loadBookingStep`.
  - `BookingStepShell({ variant, step, initial }: { variant: BookingVariant; step: BookingStep; initial: BookingInitialData })`, a `"use client"` component. It calls `useBookingAuthContext(variant, initial)` and renders the matching step with `ctx` and `initial`.
  - Each `page.tsx`: no `"use client"`. It is
    `export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> })`
    returning `<BookingStepShell variant="guest" | "dashboard" step="…" initial={await getBookingStepData(step, await searchParams)} />`.

- [ ] **Step 1: Write `getBookingStepData`, `BookingStepShell`, the six pages, the six `loading.tsx` files, and the `initial` prop on the three step components.** Check first whether `server-only` is installed (`npm ls server-only`). If it is not, leave that import out rather than adding a dependency.

- [ ] **Step 2: Static checks**

Run: `npx vitest run && npx tsc --noEmit -p . && npx eslint lib app components hooks`
Expected: all tests pass; tsc prints nothing; eslint has 0 errors and no new warnings in the files this branch touched (55 before the branch).

- [ ] **Step 3: Server-render check on the dev server (port 3001, read-only GETs).**
  - Find a real active service id and name with `npx tsx --env-file=.env.local` and a read-only select of `service_packages` (`id, name`, `is_active = true`, limit 1).
  - Start `npm run dev -- -p 3001` in the background.
  - Run `curl -s http://localhost:3001/service`: the HTML contains that service's name. It was not in the HTML before this branch.
  - Run `curl -s "http://localhost:3001/confirmation?service=<id>&license_plate=TEST123&date=2026-11-20&time=9:30"`: the HTML contains the service name and `TEST123`.
  - Run `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/dashboard/booking/service` signed out: a redirect status (307 or 302), as before.
  - Stop the dev server (`netstat -ano | grep ':3001 '`, then `taskkill //PID <pid> //F //T`).

- [ ] **Step 4: Commit**

```bash
git add lib/booking/bookingStepRequest.ts components/booking "app/(user)/(booking)" "app/(dashboard)/dashboard/booking"
git commit -m "perf(booking): booking steps render with their data from the server"
```

- [ ] **Step 5: Push and open the PR** (push command from `HANDOFF.md` section 6; the body ends with the Claude Code line). Ask the user to check on the Vercel preview:
  - **As a member:** the confirmation step shows "Confirm Booking" at once, with no "Loading your booking..." and no "Proceed to Payment" flash.
  - **As a customer:** the service step opens with the services already shown, and booking a cash wash works end to end.
  - **As a guest:** the steps open with content, and card checkout reaches Stripe.
