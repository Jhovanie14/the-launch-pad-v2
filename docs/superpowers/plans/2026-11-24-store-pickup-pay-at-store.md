# Store Pickup and Pay-at-Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Customers choose "pay now by card" or "pay at the store", stock is held as soon as an order is placed, unpaid reservations are held and released on a Houston-date schedule, and staff run pickup from a counter screen. Every step is emailed, and the pickup pass replaces the old receipt.

**Architecture:**
- One migration splits payment from fulfilment, adds atomic stock functions and keeps the deploy window safe.
- A pure `orderFlow` module owns every transition.
- Thin routes call extracted `lib/products/*` logic, which is tested with local fakes.
- The customer screens (cart, success, orders) and the admin counter screen render on the 24/7 Bay tokens.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (RPC, realtime), Stripe Checkout, Resend, Tailwind v4 tokens, Vitest (`lib/**/*.test.ts`, no DOM).

**Spec:** `docs/superpowers/specs/2026-11-24-store-pickup-pay-at-store-design.md`. It is binding for copy, rules, columns and function contracts. Every task reads the spec section it names.

## Global Constraints

- **Migrations:** Claude writes the migration and **never applies it**. The PR tells the user to apply it, then merge.
- **The live environment is real** (Supabase and Stripe): run no scripts against it. The tests use fakes only.
- **Hard rules:** no emoji anywhere; tokens only; one Flame control per screen; 44px targets; `FOCUS_ON_NIGHT` on Night and `FOCUS_ON_LIGHT` on white; no coloured side stripes.
- **Copy** is exact as in the spec. Pickup hours come only from `store_settings.pickup_hours`; when it is null, no hours line renders.
- **Houston dates** use `BUSINESS_TIME_ZONE` ("America/Chicago") with `Intl.DateTimeFormat`. No new dependencies.
- **Short ref** = `id.slice(0, 8).toUpperCase()`, the same as the emails and the generated `ref` column.
- **Housekeeping:** CRLF files. No Co-Authored-By trailer. `HANDOFF.md` and `.impeccable/critique/` stay untracked.

## Review Focus

1. **Double submit or two tabs** reserving at the same time: the one-reservation rule is checked before the RPC, so two near-simultaneous at_store checkouts could both pass. Pinned in Task 5 by a test that the second call sees the first order. The rest is accepted, because the volume is tiny; note it in the PR.
2. **A Stripe session that fails to create** after the RPC held stock: the stock must come back and the order must be cancelled. Pinned in Task 5.
3. **The cron running twice in a day,** or overlapping a staff Release: there must be no double stock return and no second email. Pinned in Task 9 (the release is guarded, and the RPC is a no-op when `stock_released_at` is set).
4. **Hold dates across midnight and DST** in Houston: an order marked ready at 11:30 PM local still counts from that local date. Pinned in Task 2.
5. **A customer cancelling while staff take payment:** whichever loses the guarded update gets 409 or 400, with no stock moved twice. Pinned in Task 7 and Task 8 (the guard `.eq` is asserted).

---

### Task 1: Migration and types

**Files:**
- Create: `supabase/migrations/20261124000000_product_order_flow.sql`
- Create: `lib/products/orderFlowMigration.test.ts`
- Modify: `types/database.types.ts` (the `product_orders` and `store_settings` Row, Insert and Update types; the `Functions` entries for the three RPCs)

**Interfaces:** Produces the columns and functions exactly as in the spec's "Data" section.

- [ ] **Step 1: Failing source tests,** reading the SQL as text:
  - `"adds the payment and fulfilment columns"`: each of `payment_method`, `payment_status`, `fulfilment_status`, `paid_via`, `paid_at`, `ready_at`, `hold_until`, `reminder_sent_at`, `completed_at`, `completed_by`, `released_at`, `stock_taken` and `stock_released_at`, plus `ref text generated always as (upper(left(id::text, 8))) stored`.
  - `"store settings gain pickup hours and hold days"`: `pickup_hours text`, and `hold_days integer not null default 3` with `between 1 and 14`.
  - `"backfill maps every legacy status"`: the SQL mentions each of the 7 old statuses inside the backfill `update`.
  - `"functions are service-role only"`: for each of `place_product_order`, `take_product_order_stock` and `release_product_order_stock`, `security definer`, a `revoke … from public, anon, authenticated` and a `grant execute … to service_role`.
  - `"stock is taken atomically"`: the `place_product_order` body contains `stock >= ` and `raise exception 'insufficient_stock:%'`.
  - `"legacy status trigger exists"`: `product_orders_sync_legacy_status` and `before update of status`.
  - `"product orders join realtime"`: `supabase_realtime` and `product_orders`.
- [ ] **Step 2: Run** `npx vitest run lib/products/orderFlowMigration.test.ts`. Expected: FAIL, because the file is missing.
- [ ] **Step 3: Write the migration** to the spec. Make it idempotent where cheap (`add column if not exists`, `create or replace function`, `drop trigger if exists`). Then hand-edit `types/database.types.ts`.
- [ ] **Step 4: Run** the test, then `npx tsc --noEmit -p .`. Expected: PASS and clean.
- [ ] **Step 5: Commit:** `feat(store): order flow migration (not applied)`

### Task 2: `orderFlow` pure module

**Files:**
- Create: `lib/products/orderFlow.ts`
- Create: `lib/products/orderFlow.test.ts`

**Interfaces:** Produces, as in the spec's "Order flow":
```ts
export type PaymentMethod = "card" | "at_store";
export type PaymentStatus = "unpaid" | "paid" | "refunded";
export type FulfilmentStatus = "placed" | "ready" | "completed" | "released" | "cancelled" | "out_for_delivery";
export type PaidVia = "stripe" | "cash" | "card_reader" | "counter_qr";
export type StaffAction = "mark_ready" | "hand_over" | "take_payment" | "release";
export interface FlowOrder { payment_method: PaymentMethod; payment_status: PaymentStatus; fulfilment_status: FulfilmentStatus; fulfillment_method: "pickup" | "delivery"; hold_until: string | null; reminder_sent_at?: string | null; total: number }
export type OrderPatch = Partial<Record<string, string | boolean | null>>;
export function holdUntil(readyAt: Date, holdDays: number): string;           // ISO for 23:59:59.999 Houston on (Houston date of readyAt) + holdDays
export function applyStaffAction(o: FlowOrder, a: StaffAction, ctx: { now: Date; holdDays: number; staffId: string; paidVia?: PaidVia }): OrderPatch; // throws ApiError(400)
export function staffActionsFor(o: FlowOrder): StaffAction[];
export function customerCanCancel(o: FlowOrder): boolean;
export function customerStatus(o: FlowOrder): { label: string; tone: "neutral" | "ready" | "done" | "closed" };
export type StaffQueue = "to_pack" | "ready" | "unpaid" | "completed" | "closed" | "hidden";
export function staffQueue(o: FlowOrder): StaffQueue;  // primary tab; "unpaid" also lists at_store unpaid via isUnpaidReservation
export function isUnpaidReservation(o: FlowOrder): boolean;
export function needsReminder(o: FlowOrder, now: Date): boolean;
export function isOverdueHold(o: FlowOrder, now: Date): boolean;
export function houstonDateLabel(iso: string): string; // "Thu, Nov 27"
export const PAID_VIA_LABEL: Record<PaidVia, string>;  // Card (online) · Cash · Card reader · Counter QR
```

- [ ] **Step 1: Failing tests.**
  - **Allowed transitions:** one `it` per row of the spec's rules table, asserting the patch fields, for example `mark_ready` on an at_store unpaid order sets `hold_until` and `ready_at`.
  - **Forbidden transitions:**
    - `hand_over` on an unpaid order;
    - `take_payment` on a card order;
    - `take_payment` without `paidVia`;
    - `release` on a paid order;
    - any action on a completed order.
  - **Hold maths:** `holdUntil` for a Monday-2026-11-23 10:00 local ready time with 3 days → `2026-11-27T05:59:59.999Z` (CST is UTC−6). Also:
    - 23:30 local on Nov 23 still counts from Nov 23;
    - hold_days 1 and 14;
    - across the Mar 8, 2026 DST change.
  - **Reminder and expiry:**
    - `needsReminder` is true at 9 AM Houston on the hold date − 1, false on the hold date, and false when `reminder_sent_at` is set;
    - `isOverdueHold` is false on the hold date at 23:00 local and true the next morning.
  - **Labels:** `customerStatus` returns every label in the spec.
  - **Queues:** `staffQueue` places a card placed/unpaid order in `hidden`, and covers every other combination.
  - **Self-cancel:** `customerCanCancel` is true only for at_store, unpaid, placed or ready.
- [ ] **Step 2: Run** `npx vitest run lib/products/orderFlow.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** For the Houston-date arithmetic, read the local Y/M/D through `Intl.DateTimeFormat("en-US",{timeZone,…}).formatToParts`, add the days on a UTC date, then find the UTC instant of 23:59:59.999 local by correcting for that day's offset. Put this in a helper `endOfHoustonDay(y, m, d)`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit:** `feat(store): order flow rules`

### Task 3: Store settings

**Files:**
- Create: `lib/products/storeSettings.ts`
- Create: `lib/products/storeSettings.test.ts`
- Create: `app/api/admin/store-settings/pickup/route.ts`

**Interfaces:** Produces:
- `export interface PickupSettings { pickupHours: string | null; holdDays: number }`
- `export function sanitizePickupSettings(body: unknown): PickupSettings`, which trims hours, caps them at 120 characters, treats an empty value as null, and requires `hold_days` to be an integer from 1 to 14. Anything else throws `ApiError(400)`.
- `export async function getPickupSettings(db): Promise<PickupSettings>`, with fallbacks `{ null, 3 }`.

The route (`POST`) runs `requireAdmin` and then `update store_settings set pickup_hours, hold_days where id = 1`.

- [ ] **Step 1: Failing tests:**
  - sanitize: trims; empty → null; 121 characters → 400; `hold_days` 0, 15, 2.5 and "3" → 400; a valid body passes;
  - `getPickupSettings` falls back when the row or the columns are missing;
  - source test: the route file doesn't import `sanitizeHeroSettings`.
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Implement.** **Step 4: Run, expect PASS.** **Step 5: Commit:** `feat(store): pickup hours and hold settings`

### Task 4: Emails

**Files:**
- Modify: `lib/email/product-order-emails.ts`
- Modify: `lib/email/product-order-emails.test.ts`

**Interfaces:**
- Every builder takes `{ to, name, orderId, items, total, pickupHours: string | null, … }`. The fields beyond those are as in the spec's email table.
- New builders and senders:
  - `buildProductOrderReservedEmail` / `sendProductOrderReservedEmail`;
  - `buildProductOrderHoldReminderEmail` / `send…`, with `holdDate`;
  - `buildProductOrderReleasedEmail` / `send…`, with `byCustomer: boolean`;
  - `buildProductOrderCollectedEmail` / `send…`, with `paidVia`.
- Updated builders:
  - Confirmation gains `pickupHours`.
  - Ready gains `{ amountDue: number | null, holdDate: string | null, pickupHours }`.
  - Refunded gains `where: "card" | "store"`.
- Senders log and never throw, as today.

- [ ] **Step 1: Failing tests:**
  - add the new builders to the existing `describe.each` (the escaping, no-emoji, one-button and short-ref checks);
  - per builder, the key copy lines from the spec;
  - `"no hours line when pickup hours are not set"`;
  - Ready for an unpaid at_store order shows "$X to pay at the counter" and "until Thu, Nov 27";
  - Collected shows the `PAID_VIA_LABEL`.
- [ ] **Step 2: Run** `npx vitest run lib/email/product-order-emails.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement**, reusing `orderItemsRowsHtml`, `details` and the layout helpers.
- [ ] **Step 4: Run, expect PASS.** **Step 5: Commit:** `feat(store): reservation, reminder, release and receipt emails`

### Task 5: Placing orders (checkout)

**Files:**
- Create: `lib/products/placeOrder.ts`
- Create: `lib/products/placeOrder.test.ts`
- Modify: `app/api/products/checkout/route.ts`
- Modify: `lib/products/checkout.ts` (remove `createPendingOrder`; keep `priceOrder`)
- Modify: `lib/products/checkout.test.ts` (drop the `createPendingOrder` cases)

**Interfaces:** Produces:
```ts
export async function placeOrder(deps: {
  db: SupabaseClient; stripe: Pick<Stripe, "checkout">; siteUrl: string; now: Date;
  sendReserved: (args) => Promise<void>;
}, input: { userId: string; email: string | null; name: string | null; phone: string | null;
  items: CartItem[]; fulfillmentMethod: string; paymentMethod: string }): Promise<{ url: string }>
```
- Payment method validation: `"card" | "at_store"`, otherwise 400 "Choose how to pay".
- The route only collects auth, profile (`email, full_name, phone`) and body, then calls `placeOrder`.

- [ ] **Step 1: Failing tests,** using a local fake db with `from().select/eq/in/maybeSingle/update` and `rpc` that records calls:
  - an at_store order with an existing open reservation → 409 with that order's ref in the message, and `rpc` never called;
  - an at_store order → `rpc("place_product_order")` with `p_payment_method: "at_store"` and `p_phone`; the reserved email is sent; the url is `/products/success?order=<id>`; Stripe is never called;
  - a card order → the Stripe session has `expires_at` ≥ now + 31 minutes and metadata `{ payment_type: "product_order", order_id }`; `stripe_session_id` is saved;
  - the RPC raises `insufficient_stock:Wheel brush` → 400 "Not enough stock for Wheel brush";
  - Stripe throws → `rpc("release_product_order_stock")` is called, the order is set to cancelled, and the error is rethrown;
  - an invalid payment method → 400.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement**, and slim the route.
- [ ] **Step 4: Run** `npx vitest run lib/products`. Expected: PASS.
- [ ] **Step 5: Commit:** `feat(store): pay-at-store reservations and held stock at checkout`

### Task 6: Webhook

**Files:**
- Modify: `lib/products/processProductOrder.ts`, `lib/products/processProductOrder.test.ts`
- Modify: `app/api/webhook/route.ts` (the `processProductOrder` block: pass `pickupHours` to the confirmation email)

**Interfaces:**
- `processProductOrderCompleted(db, session)` returns `{ order, items } | null`, as today, but follows the spec's webhook rows:
  - placed/unpaid card → paid, `paid_via`, `paid_at`, phone from Stripe, and if `!stock_taken` → `rpc("take_product_order_stock")`;
  - any other state → log and record the payment only, and return null so no email is sent.
- `processProductOrderExpired(db, session)` → for a placed/unpaid card order: cancelled + `rpc("release_product_order_stock")`.

- [ ] **Step 1: Rewrite the tests:**
  - a normal paid order: no stock loop, no `take_product_order_stock` (stock already taken);
  - a legacy order with `stock_taken: false` → `take_product_order_stock` called once;
  - an already-paid order → null and no updates;
  - a payment arriving after cancellation → records payment, returns null;
  - expired → cancelled + release; expired on a paid order → no-op.
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Implement.** **Step 4: Run, expect PASS.** **Step 5: Commit:** `feat(store): webhook uses held stock and the new order states`

### Task 7: Staff actions and refunds

**Files:**
- Create: `lib/products/staffActions.ts`, `lib/products/staffActions.test.ts`
- Create: `app/api/admin/product-orders/action/route.ts`
- Delete: `app/api/admin/product-orders/update-status/route.ts`
- Modify: `app/api/admin/product-orders/refund/route.ts` (logic moves into `lib/products/refundOrder.ts`, with tests in the same test file or `refundOrder.test.ts`)

**Interfaces:** Produces:
- `export async function runStaffAction(deps: { db; now; staffId; holdDays; pickupHours; emails }, input: { orderId; action: StaffAction; paidVia?: PaidVia }): Promise<void>`
- `export async function refundOrder(deps: { db; stripe; emails }, orderId: string): Promise<void>`

The updates are guarded with `.eq("fulfilment_status", current).eq("payment_status", current)`; zero rows → `ApiError(409, "This order just changed. Refresh to see it.")`.

- [ ] **Step 1: Failing tests:**
  - `mark_ready` → guarded update with `hold_until` for at_store unpaid, then the Ready email with `amountDue` and `holdDate`;
  - `take_payment` with cash → paid + completed, then the Collected email with "Cash";
  - `release` → update, then `release_product_order_stock`, then the Released email;
  - a lost race → 409, with no RPC and no email;
  - `hand_over` on unpaid → 400.
  - Refunds:
    - card → `stripe.refunds.create` with the payment intent;
    - at_store paid → no Stripe call, `where: "store"`;
    - a refund before completion → release RPC;
    - a refund after completion → no RPC.
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Implement**; the routes do `requireAdmin` and call these. **Step 4: Run, expect PASS.** **Step 5: Commit:** `feat(store): counter actions and refunds on the new order states`

### Task 8: Customer cancel

**Files:**
- Create: `lib/products/cancelReservation.ts`, `lib/products/cancelReservation.test.ts`
- Create: `app/api/products/orders/cancel/route.ts`

**Interfaces:** `export async function cancelReservation(deps: { db; now; emails; pickupHours }, input: { userId: string; orderId: string }): Promise<void>`, following the spec's customer-cancel section.

- [ ] **Step 1: Failing tests,** the spec's "Customer cancel" cases plus the guarded update.
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Implement**, with `requireUser` in the route. **Step 4: Run, expect PASS.** **Step 5: Commit:** `feat(store): customers can cancel a reservation`

### Task 9: Hold reminders and releases (cron)

**Files:**
- Create: `lib/products/holds.ts`, `lib/products/holds.test.ts`
- Create: `app/api/cron/product-holds/route.ts`
- Modify: `vercel.json` (add `{ "path": "/api/cron/product-holds", "schedule": "0 15 * * *" }`)

**Interfaces:** `export async function runHoldJob(deps: { db; now; emails; pickupHours }): Promise<{ reminded: number; released: number }>`. It selects unpaid at_store `ready` orders, then:
- for each order where `needsReminder`: send the reminder and set `reminder_sent_at`, guarded by `is null`;
- for each where `isOverdueHold`: run the guarded release, then the RPC, then the email.

The route checks `Bearer CRON_SECRET`, the same as `app/api/cron/marketing-sync/route.ts`.

- [ ] **Step 1: Failing tests:**
  - a reminder is sent once, and a second run sends nothing;
  - an overdue order is released once, and a second run sends nothing;
  - an order not yet due is left alone;
  - an at_store order that is already paid is ignored;
  - source test: `vercel.json` contains the cron, and the route checks `CRON_SECRET`.
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Implement.** **Step 4: Run, expect PASS.** **Step 5: Commit:** `feat(store): daily hold reminders and releases`

### Task 10: Readers move off `status`

**Files:**
- Modify: `lib/dashboard/home.ts` (lines ~193, 195, 239) and its test
- Modify: `hooks/useDashboardHome.ts:47-49`
- Modify: `app/(dashboard)/dashboard/orders/page.tsx:122-124` (the query filter only; the redesign is Task 13)
- Delete: `lib/products/orderStatus.ts`, `lib/products/orderStatus.test.ts`
- Create: `lib/products/statusReaders.test.ts`

- [ ] **Step 1: Failing source test** `"nothing reads product_orders.status"`:
  - scan `app/`, `lib/`, `hooks/` and `components/` (`.ts` and `.tsx`, excluding tests and migrations) for `ready_for_pickup`, `orderStatusLabel`, `nextActionFor`, `canTransition` and `lib/products/orderStatus`. Expect none.
  - the `home.ts` tests use `fulfilment_status` fixtures.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Update the readers** as in the spec's "Every reader of `status`". The query filters become `.neq("fulfilment_status","cancelled")`, plus a client-side drop of card placed/unpaid orders.
- [ ] **Step 4: Run** `npx vitest run` and `npx tsc --noEmit -p .`. Expected: all green.
- [ ] **Step 5: Commit:** `refactor(store): every reader uses the new order states`

### Task 11: Pickup Pass and success page

**Files:**
- Create: `components/products/PickupPass.tsx`, `components/products/CancelReservationButton.tsx`
- Create: `app/(user)/products/success/ConfirmingPayment.tsx` (client)
- Modify: `app/(user)/products/success/page.tsx`, `track-purchase.tsx`
- Create: `lib/products/successSource.test.ts`

**Interfaces:**
- `PickupPass({ order: { id, total, payment_method, payment_status, fulfilment_status, hold_until, items }, pickupHours, action?: ReactNode })`
- `CancelReservationButton({ orderId, orderRef })` opens an AlertDialog and POSTs to `/api/products/orders/cancel`, then runs `router.refresh()`.

- [ ] **Step 1: Failing source tests:**
  - the success page doesn't import `createAdminClient`;
  - it handles both `session_id` and `order` params;
  - `PickupPass` contains "Show this reference at the counter" and `customerStatus(`, renders hours only when `pickupHours`, and has the `aria-live` "Confirming your payment" in ConfirmingPayment;
  - `track-purchase` is rendered only when `payment_status === "paid"`;
  - tokens only: no `/(blue|gray|green|amber|red|slate)-\d/`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Build** to the spec and the mockup (pass lift shadow, Flame chip when ready, ref in 900 weight, the due box, the quiet Get directions; "Track my orders" is the one Flame control on the page).
- [ ] **Step 4: Run tests and tsc.** **Step 5: Commit:** `feat(store): pickup pass and a private, honest confirmation page`

### Task 12: Cart

**Files:**
- Modify: `app/(user)/products/cart/page.tsx`
- Modify: `app/(user)/products/layout.tsx` (remove the `.storefront` wrapper)
- Modify: `app/(user)/products/page.tsx` and `app/(user)/products/[slug]/page.tsx` (wrap in `.storefront` plus the Anton variable, until PR B)
- Create: `lib/products/cartSource.test.ts`

The pickup settings come from a small server wrapper or fetch, so the page can show the hours and `hold_days`. My call, within the spec.

- [ ] **Step 1: Failing source tests:**
  - the layout has no `storefront`, and the catalog pages do;
  - the cart contains "How do you want to pay?", "Pay now by card", "Pay at the store", "Reserve for pickup", `payment_method` in the POST body, a `role="alert"` inline error, and `type="radio"`;
  - the stepper buttons are `size-11`;
  - tokens only.
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Build** to the spec and mockup (stacked rows, Pickup card, radio cards, the sticky Night bar with one Flame button and the signed-out copy). **Step 4: Run tests and tsc.** **Step 5: Commit:** `feat(store): cart with pay-at-store and the 24/7 Bay look`

### Task 13: Dashboard orders page

**Files:** Modify `app/(dashboard)/dashboard/orders/page.tsx`.
- Open orders (`fulfilment_status` placed or ready, not hidden) render as `PickupPass`, with `CancelReservationButton` when `customerCanCancel`.
- Past orders keep the white cards, with the ref as the card title.
- The progress list becomes Placed → Ready → Picked up.
- The "or local delivery" copy is removed.

- [ ] **Step 1: Failing source test** (add to `successSource.test.ts` or a new `ordersPageSource.test.ts`): imports `PickupPass` and `CancelReservationButton`; has no "local delivery"; has "Picked up".
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Build.** **Step 4: Run tests and tsc.** **Step 5: Commit:** `feat(store): orders page shows pickup passes`

### Task 14: Admin counter screen and sidebar count

**Files:**
- Modify: `app/admin/orders/orders-view.tsx` (rebuild), `app/admin/orders/page.tsx`
- Create: `lib/admin/orderSearch.ts`, `lib/admin/orderSearch.test.ts`
- Modify: `lib/navigation/admin.ts` (`AdminBadge` gains `"orders"`; "Store orders" gets `badge: "orders"`), `lib/navigation/admin.test.ts`, `components/admin/sidebar.tsx` (the second realtime count)
- Create: `lib/admin/ordersViewSource.test.ts`

**Interfaces:**
- `export function matchesOrderSearch(order: { ref: string; phone: string | null }, profile: { full_name: string | null; email: string | null } | null, q: string): boolean`. It matches a ref prefix (case-insensitive), phone digits (non-digits stripped, at least 3 digits) and a name or email substring.
- `export function needsActionCount(orders: FlowOrder[], now: Date): number` lives in `orderFlow.ts`; add its test there. It counts to-pack orders plus unpaid ready orders whose `hold_until` is within 24h.

- [ ] **Step 1: Failing tests:**
  - `matchesOrderSearch` cases;
  - `needsActionCount`;
  - nav: "Store orders" has `badge: "orders"`;
  - source: orders-view imports `staffActionsFor`, `staffQueue` and `matchesOrderSearch`; contains the tab names "To pack", "Ready", "Unpaid", "Completed" and "Closed", "How did they pay", "Cash", "Card reader", "Counter QR", "Release reservation", "Pickup hours" and "Hold unpaid orders for"; posts to `/api/admin/product-orders/action` and `/api/admin/store-settings/pickup`; tokens only; and no `"Out for delivery"` filter option.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Build** to the spec and mockup. Dates use `houstonDateLabel` or `BUSINESS_TIME_ZONE`. The Release confirm is an `AlertDialog`. The sidebar keeps a second realtime subscription on `product_orders` and computes `needsActionCount` from a light select of the open orders.
- [ ] **Step 4: Run** `npx vitest run`, tsc and eslint on the changed dirs. Expected: green, with no new eslint errors.
- [ ] **Step 5: Commit:** `feat(admin): counter screen for store orders`

### Task 15: Docs

**Files:** Modify `DESIGN.md` and `PRODUCT.md`.
- **DESIGN.md:** add "Pickup Pass", "Cart", "Store orders counter" entries. Update the product-store divergence: only the catalog is still `.storefront`.
- **PRODUCT.md:**
  - "Product store" capability: pickup by card or pay at the store; delivery paused.
  - Admin capabilities: the counter flow.

- [ ] **Step 1: Edit.** **Step 2: Run** `npx vitest run` and expect green. **Step 3: Commit:** `docs: store pickup and pay-at-store`
