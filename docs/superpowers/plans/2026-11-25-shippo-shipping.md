# Shippo Shipping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** customers choose "Ship to me (USPS)" in the cart, get a live USPS Ground Advantage price, and pay by card. The paid order is pushed to Shippo, staff buy the label there, and tracking comes back to move the order to Shipped and then Delivered, with emails.

**Architecture:**
- **`lib/shipping/`** is a small typed `fetch` client for Shippo plus pure helpers: states, pouches and parcel, rate pick.
- **Pricing:**
  - `quoteShipping` is the single pricing function, used by the quote route and re-run by `placeOrder`.
  - A new overload of the `place_product_order` RPC stores delivery orders atomically.
- **Order flow:** `orderFlow.ts` becomes aware of the fulfilment method. Shipping orders use `placed → out_for_delivery → completed`.
- **Status updates come in three ways:**
  - the Shippo webhook (token-checked, re-fetched);
  - polling the Shippo order (cron and the Check Shippo button);
  - manual staff actions.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4 tokens, Supabase, Stripe hosted Checkout, Resend, Vitest (no DOM, so components get source-level tests).

**Spec:** `docs/superpowers/specs/2026-11-25-shippo-shipping-design.md`

## Spike results (2026-11-25, test key)

- **Address validation:** `POST /addresses/` with `validate: true` returns `validation_results: { is_valid, messages[{ code, text }] }`. A made-up street returns `is_valid: false` and "Unable to find a valid city, state or 5-digit zip…".
- **Shipments:** `POST /shipments/` with `async: false` returns `rates[]`. The USPS rates have `servicelevel.token` among `usps_ground_advantage`, `usps_priority` and `usps_priority_express`. Ground Advantage is the cheapest ($8.08, `estimated_days` 4, for 16 oz, 13×10×1, Houston to SF).
- **Orders:** `POST /orders/` with `order_status: "PAID"`, `order_number`, `line_items[{ title, quantity, total_price, currency, weight, weight_unit }]`, `weight`, `weight_unit`, `shipping_cost`, `shipping_cost_currency` and `shipping_method` returns `object_id`.
- **Labels:**
  - A label bought with `order` set returns a transaction with `order` = that id, plus `tracking_number` and `tracking_url_provider`.
  - `GET /orders/{id}` then lists `transactions[{ object_id, tracking_number }]`. The nested entries carry no status, so fetch `GET /transactions/{id}` for `status`, `tracking_url_provider` and `label_url`.
  - The test order's `order_status` stayed `PAID`, so don't rely on it.
- **Webhooks:** none registered yet. The user registers ours in Shippo after deploy.
- **Tracking tests:** `GET /tracks/shippo/SHIPPO_DELIVERED` returns `tracking_status.status = "DELIVERED"`. Test tracking numbers can simulate statuses.
- **Headers:** `Authorization: ShippoToken <key>`, and `Shippo-API-Version: 2018-02-08`.

## Global Constraints

- **Files are CRLF.** Write through the Edit tool, or normalise `\r\n` to `\n`, edit, then write back as CRLF.
- **Never print or commit keys.** `SHIPPO_API_KEY` and `SHIPPO_WEBHOOK_SECRET` are read only from `process.env`, and tests never call the real Shippo.
- **Migrations:** the user runs them, and the PR merges only after the new columns are confirmed live.
- **Pickup stays exactly as it is:** pay-at-store, the counter actions on pickup orders, and every existing pickup test.
- **Exact copy:**
  - "Ship to me · USPS"
  - "Pick up at the carwash · Free"
  - "Price based on your address and the weight."
  - "Get shipping price"
  - "We couldn't confirm this address"
  - "Use suggested address"
  - "Only for pickup orders."
  - "Shipping (USPS Ground Advantage)"
  - "Shipping price changed to $Y. Check and pay again."
  - "Shipping isn't available for {name} yet. Choose pickup."
  - "This order is too big to ship online. Choose pickup or contact us."
  - "We can't ship to this address yet. Choose pickup or contact us."
  - "Open in Shippo to buy label"
  - "Not in Shippo yet"
  - "Send to Shippo"
  - "Check Shippo"
  - "Mark shipped"
  - "Mark delivered"
  - "Void the label in Shippo too."
- **Default pouch:** `{ name: "Standard pouch", length_in: 13, width_in: 10, height_in: 1, max_weight_oz: 160 }`.
- **Service label:** "USPS Ground Advantage". The fallback is the cheapest USPS rate's `servicelevel.name`, prefixed "USPS ".
- **Tokens only** (no raw palette classes). Targets are 44px on phones.
- **Commits:** no Co-Authored-By trailer.

## Review Focus

1. **Stale price:** the cart quote says $8.08 and the server re-quote gives $8.40. The checkout must return 409 with the new price, never charge the other amount. Tested in Task 4.
2. **Webhook replay or forgery:** a POST with the right token but a transaction id belonging to another account or another order, or a repeated event. Nothing changes unless the re-fetched transaction's `order` equals a stored `shippo_order_id` and the order is still in the expected state. Tested in Task 6.
3. **The Stripe webhook after a delivery payment** must keep our `delivery_address`, since Stripe's is empty, and must not fail when the Shippo push fails. Tested in Task 5.
4. **Mixed cart:** one product has `weight_oz` null. The quote refuses with that product's name, and the cart shows the message instead of a price. Tested in Tasks 2 and 9.
5. **A shipping order clicked through pickup actions** (`mark_ready`, `hand_over`, `take_payment`) is refused on the server, even if the UI showed a stale button. Tested in Task 3.

---

### Task 1: Migration and types

**Files:**
- Create: `supabase/migrations/20261125010000_shipping.sql`, `lib/shipping/shippingMigration.test.ts`
- Modify: `types/database.types.ts` (products, product_orders and store_settings Row/Insert/Update; add `pickup_note` too, which is the deferred minor from #42)

**Interfaces:**
- Produces these columns:
  - `products.weight_oz numeric null check (weight_oz > 0)`;
  - `store_settings.shipping_pouches jsonb null` and `store_settings.shipping_excluded_states text[] not null default '{}'`;
  - `product_orders.shipping_service text`, `shipping_rate_id text`, `shippo_order_id text unique`, `tracking_number text`, `tracking_url text`, `carrier text`, `label_url text`, `shipped_at timestamptz`, `delivered_at timestamptz`, `shipping_problem text`, `shippo_push_error text`.
- Produces an RPC overload: `place_product_order(p_user_id uuid, p_payment_method text, p_items jsonb, p_subtotal numeric, p_total numeric, p_phone text, p_fulfillment_method text, p_delivery_fee numeric, p_delivery_address jsonb, p_shipping_service text, p_shipping_rate_id text) returns uuid`.
  - It inserts with the given `fulfillment_method` and fee, and takes the stock like the 6-argument version.
  - It raises `invalid_fulfillment` unless the method is in ('pickup','delivery').
  - It raises `delivery_needs_card` for delivery with `at_store`.
  - It has the same `revoke ... from public, anon, authenticated` as the original.

- [ ] **Step 1: Write the failing test.** The lowercased SQL contains:
  - each `add column if not exists <col>` above;
  - `unique` on `shippo_order_id`;
  - `create or replace function public.place_product_order(` with `p_fulfillment_method text`;
  - `'delivery_needs_card'`;
  - `revoke all on function public.place_product_order(uuid, text, jsonb, numeric, numeric, text, text, numeric, jsonb, text, text) from public, anon, authenticated`;
  - `notify pgrst, 'reload schema'`.
- [ ] **Step 2:** Run `npx vitest run lib/shipping/shippingMigration.test.ts`. Expected: FAIL (no file).
- [ ] **Step 3:** Write the migration. Copy the body of the existing 6-argument function (`20261124000000_product_order_flow.sql:124-175`) and add the new parameters. Hand-edit `database.types.ts` for every new column and the overload.
- [ ] **Step 4:** Run the test plus `npx tsc --noEmit`. Expected: PASS, clean.
- [ ] **Step 5:** Commit `feat(shipping): migration for weights, pouches and order shipping fields`.

### Task 2: Shipping core (`lib/shipping`)

**Files:**
- Create:
  - `lib/shipping/shippo.ts`: `shippoFetch` and the typed calls;
  - `lib/shipping/origin.ts`;
  - `lib/shipping/states.ts`;
  - `lib/shipping/parcel.ts`;
  - `lib/shipping/quote.ts`;
  - `lib/shipping/settings.ts`.
- Tests: `parcel.test.ts`, `states.test.ts`, `quote.test.ts`, `settings.test.ts`.

**Interfaces (Produces):**
- **`shippo.ts`:**
  - `type ShippoFetch = (method: "GET" | "POST", path: string, body?: unknown) => Promise<any>`
  - `createShippoClient(apiKey: string): ShippoFetch`. It throws `ShippoError` (with `status` and the parsed body) on non-2xx.
  - `shippoConfigured(): boolean`, which checks `process.env.SHIPPO_API_KEY`.
  - `shippoFromEnv(): ShippoFetch`
- **`origin.ts`:** `SHIP_FROM`, a Shippo address object. For now it's 10410 S Main St, Houston, TX 77025, phone 8322198320, with a `// TODO(owner): confirm 3535 O'Meara Dr, ZIP, suite, label phone` comment.
- **`states.ts`:**
  - `US_STATES: { code: string; name: string }[]`: the 50 states plus DC.
  - `isShippableState(code: string, excluded: string[]): boolean`. It's case-insensitive, false for territories (PR, GU, VI, AS, MP) and military (AA, AE, AP), and false for any excluded state.
- **`parcel.ts`:**
  - `type Pouch = { name: string; length_in: number; width_in: number; height_in: number; max_weight_oz: number }`
  - `DEFAULT_POUCH`
  - `buildParcel(lines: { name: string; weight_oz: number | null; quantity: number }[], pouches: Pouch[]): { ok: true; parcel: ShippoParcel; weightOz: number } | { ok: false; error: string }`
  - The parcel is the smallest-volume pouch with `max_weight_oz ≥ total`, and the weight is rounded up to 0.1 oz.
- **`settings.ts`:**
  - `getShippingSettings(db): Promise<{ pouches: Pouch[]; excludedStates: string[] }>`. It selects `*`, so a missing column falls back to `[DEFAULT_POUCH]` and `[]`.
  - `sanitizeShippingSettings(body): { pouches: Pouch[]; excludedStates: string[] }`. It allows 1–5 pouches. Every dimension and the max must be > 0 and ≤ 999. State codes must be in `US_STATES`.
- **`quote.ts`:**
  - `type ShipAddress = { name; street1; street2?; city; state; zip; phone }`, all strings.
  - `quoteShipping(deps: { shippo: ShippoFetch; db: SupabaseClient }, cart: CartItem[], address: ShipAddress): Promise<ShippingQuote>`
  - `ShippingQuote = { amount: number; service: string; rateId: string; days: number | null; address: ShipAddress }`
  - It throws `ApiError`:
    - 400 with the exact copy for a missing weight, a parcel that's too heavy, or an unshippable state;
    - 400 "We couldn't confirm this address" with `details: { messages: string[]; suggestion: ShipAddress | null }` when Shippo's `is_valid` is false;
    - 503 "Shipping is not available right now" when there are no USPS rates or Shippo errors.
  - `pickUspsRate(rates): rate | null` prefers `usps_ground_advantage`, then the cheapest USPS.
  - **`ApiError` with details:** if `ApiError` has no `details`, add an optional third constructor parameter `details?: unknown`, and have `apiError()` include it in the JSON as `details`. Test it in `lib/http`.

- [ ] **Step 1: Write the failing tests.**
  - **buildParcel:**
    - two items of 8 oz and 16 oz ×2 give a 40 oz parcel in the default pouch;
    - a weight of null gives the error "Shipping isn't available for Utility towels yet. Choose pickup.";
    - 161 oz gives the too-big copy;
    - with two pouches (small, max 32; big, max 160), a 30 oz cart picks small.
  - **isShippableState:** "tx" true, "PR" false, "AE" false, `("HI", ["HI"])` false.
  - **quoteShipping** with a fake `shippo` that records calls and returns the spike's shapes:
    - it returns `{ amount: 8.08, service: "USPS Ground Advantage", rateId, days: 4 }`;
    - an invalid address throws 400 with the messages;
    - with no USPS rates it throws 503;
    - it never calls `/shipments/` when the parcel or state fails first.
  - **settings:** the sanitiser rejects 0 pouches, a negative size and "XX"; `getShippingSettings` with `{}` returns the defaults.
- [ ] **Step 2:** Run `npx vitest run lib/shipping lib/http`. Expected: FAIL.
- [ ] **Step 3:** Implement. The quote loads `products` (id, name, weight_oz) for the cart from `db`, plus `getShippingSettings`.
- [ ] **Step 4:** The same run, plus tsc. Expected: PASS.
- [ ] **Step 5:** Commit `feat(shipping): Shippo client, parcel and USPS quote`.

### Task 3: Order rules for shipping (`orderFlow.ts`)

**Files:**
- Modify: `lib/products/orderFlow.ts`, `lib/products/orderFlow.test.ts`

**Interfaces:**
- `StaffAction` adds `"mark_shipped" | "mark_delivered"`.
- `StaffQueue` adds `"shipped"`.
- `isShippingOrder(o: FlowOrder): boolean` is `fulfillment_method === "delivery"`.
- `applyStaffAction(o, action, ctx & { trackingNumber?: string })`:
  - **Refused on a shipping order** ("This is a shipping order."): `mark_ready`, `hand_over`, `take_payment`.
  - **`mark_shipped`** works only for a paid shipping order in `placed`. It needs a non-empty `trackingNumber` (trimmed, ≤ 64 characters). It returns `{ fulfilment_status: "out_for_delivery", shipped_at: now, tracking_number, carrier: "USPS", tracking_url: uspsTrackingUrl(tn) }`.
  - **`mark_delivered`** works only for `out_for_delivery`. It returns `{ fulfilment_status: "completed", completed_at: now, completed_by, delivered_at: now }`.
- **`uspsTrackingUrl(tn)`** = `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(tn)}`.
- **`staffActionsFor`:**
  - a shipping order in `placed` and paid gets `["mark_shipped"]` (Send to Shippo and Check Shippo are separate UI actions, not `StaffAction`s);
  - in `out_for_delivery` it gets `["mark_delivered"]`;
  - pickup is unchanged.
- **`staffQueue`:** a shipping order in `out_for_delivery` goes to `"shipped"`. A paid shipping order in `placed` stays in `"to_pack"`.
- **`customerStatus`** for shipping:
  - placed and paid: "Packing";
  - `out_for_delivery`: "Shipped";
  - completed: "Delivered".
- **`needsActionCount`:** unchanged logic, since a shipping order in To pack counts.

- [ ] **Step 1:** Write failing tests for every bullet above, including Review Focus 5 (all three pickup actions refused on a delivery order) and `mark_shipped` with a blank tracking number refused.
- [ ] **Step 2:** Run `npx vitest run lib/products/orderFlow.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npx vitest run lib/products` plus tsc. Expected: PASS, and the existing pickup tests are unchanged.
- [ ] **Step 5:** Commit `feat(shipping): order rules for shipping orders`.

### Task 4: Checkout for shipping (price, place, Stripe)

**Files:**
- Modify:
  - `lib/products/checkout.ts`: `OFFERED_FULFILLMENT_METHODS = ["pickup", "delivery"]`; `priceOrder` keeps the fee at 0, because the shipping amount is added by `placeOrder`.
  - `lib/products/placeOrder.ts`
  - `app/api/products/checkout/route.ts`
- Create: `app/api/products/shipping-quote/route.ts`
- Tests: `lib/products/placeOrder.test.ts`, `lib/products/checkout.test.ts`, a route source test.

**Interfaces:**
- **New `PlaceOrderInput` fields:** `address?: ShipAddress` and `expectedShipping?: number`.
- **New `PlaceOrderDeps` field:** `quote?: (cart: CartItem[], address: ShipAddress) => Promise<ShippingQuote>`. It's injected, so tests never call Shippo.
- **The delivery branch:**
  1. Refuse `at_store` with 400 "Only for pickup orders.".
  2. Require `address` and `quote`. Without them, 400 or 503.
  3. Run `q = await deps.quote(items, address)`.
  4. If `expectedShipping` is not equal to `q.amount` to the cent, throw 409 with the exact copy, and `details: { amount: q.amount }`.
  5. Call the RPC overload with `p_fulfillment_method: "delivery"`, `p_delivery_fee: q.amount`, `p_total: subtotal + q.amount` (round2), `p_delivery_address: q.address`, `p_shipping_service: q.service` and `p_shipping_rate_id: q.rateId`.
  6. Add a Stripe line item `{ price_data: { currency: "usd", product_data: { name: "Shipping (USPS Ground Advantage)" }, unit_amount: cents(q.amount) }, quantity: 1 }`.
- **Pickup** keeps calling the 6-argument RPC with its unchanged argument object, so the existing test still passes.
- **The quote route:** `POST { items, address }`.
  - It returns 401 when signed out, the same as checkout.
  - With no key (`shippoConfigured()` false) it returns 503 "Shipping is not available right now".
  - Otherwise it returns `{ amount, service, days, address }`.
  - Errors go through `apiError` with their details.
- **The checkout route:**
  - It passes `address: body.address`, `expectedShipping: body.expected_shipping` and `quote: shippoConfigured() ? (c, a) => quoteShipping({ shippo: shippoFromEnv(), db: admin }, c, a) : undefined`.
  - For pickup it doesn't build the quote dependency: `quote` is undefined unless `fulfillment_method === "delivery"`.

- [ ] **Step 1: Write the failing tests** (placeOrder with a fake quote and a fake Stripe):
  - delivery and card: the RPC is called with the overload arguments, and the Stripe line items end with the shipping line at 808 cents;
  - `expectedShipping` 8.00 against a quote of 8.08 throws 409 "Shipping price changed to $8.08. Check and pay again.", and the RPC is not called;
  - delivery and `at_store` gives 400;
  - pickup is unchanged (the existing tests);
  - the route source contains `shippoConfigured()`.
- [ ] **Step 2:** Run `npx vitest run lib/products`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `npx vitest run` plus tsc. Expected: PASS.
- [ ] **Step 5:** Commit `feat(shipping): server-priced shipping at checkout`.

### Task 5: After payment: keep the address and push to Shippo

**Files:**
- Modify:
  - `lib/products/processProductOrder.ts`
  - `app/api/webhook/route.ts`
  - `app/api/cron/product-holds/route.ts`
- Create:
  - `lib/shipping/pushOrder.ts`
  - `lib/shipping/syncShipped.ts`
  - `app/api/admin/product-orders/shippo/route.ts`
- Tests: `processProductOrder.test.ts`, `pushOrder.test.ts`, `syncShipped.test.ts`

**Interfaces:**
- **`processProductOrderCompleted`:** `delivery_address` is updated only when the order has none and Stripe sent one (Review Focus 3).
- **`pushOrderToShippo(deps: { db; shippo }, orderId): Promise<{ ok: boolean }>`:**
  - It works only for a paid delivery order with `shippo_order_id` null.
  - It creates the Shippo order: `order_number` = ref; `order_status` "PAID"; `to_address` built from `delivery_address` plus the order email from profiles; `from_address` SHIP_FROM; `line_items` from items with their product weights; the total `weight` in oz; `shipping_cost` = `delivery_fee`; `shipping_method` = `shipping_service`; `placed_at` = `paid_at`.
  - It saves `shippo_order_id` and clears `shippo_push_error`, using a guarded update `.is("shippo_order_id", null)`.
  - On a Shippo error it saves `shippo_push_error` (the message, ≤ 300 characters) and returns `{ ok: false }`. It never throws.
- **`syncShippedFromShippo(deps: { db; shippo; sendShipped }, orderId): Promise<"shipped" | "waiting" | "skipped">`:**
  - For a delivery order in `placed` with a `shippo_order_id`, it runs `GET /orders/{id}`, takes the first transaction, and runs `GET /transactions/{tid}`.
  - When the status is `SUCCESS`, it does a guarded update from `placed` to `out_for_delivery` with `tracking_number`, `tracking_url` (`tracking_url_provider`), `carrier` "USPS", `label_url` and `shipped_at`, then `sendShipped`.
  - It returns `"shipped"` only when the update matched.
  - Webhooks reuse it as `applyShippedTransaction(deps, transaction)`.
- **The Stripe webhook:** after the confirmation email, for `fulfillment_method === "delivery"` and `shippoConfigured()`, it awaits `pushOrderToShippo` inside try/catch, logging and never throwing.
- **The cron:** after `runHoldJob`, for up to 20 paid delivery orders in `placed`:
  - with `shippo_order_id` null, it runs `pushOrderToShippo`;
  - with a `shippo_order_id`, it runs `syncShippedFromShippo`.

  It returns the counts in the JSON.
- **The admin route** `POST { order_id, action: "push" | "check" }`: `requireAdmin`, then push or sync. It returns `{ ok, result }`.

- [ ] **Step 1: Write the failing tests:**
  - the completed webhook on a delivery order with an address, and empty Stripe shipping, keeps the address;
  - **push:** it builds the Shippo body (assert `order_number`, `shipping_cost`, `weight`); it stores the id; a Shippo 500 stores the error and returns `ok: false`; it's skipped when already pushed;
  - **sync:**
    - a SUCCESS transaction moves the order to `out_for_delivery` with the tracking fields and calls `sendShipped` once;
    - a second run returns `"skipped"` with no second email;
    - no transactions gives `"waiting"`.
- [ ] **Step 2:** Run `npx vitest run lib/products lib/shipping`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `npx vitest run` plus tsc. Expected: PASS.
- [ ] **Step 5:** Commit `feat(shipping): push paid orders to Shippo and sync labels`.

### Task 6: Shippo webhook route

**Files:**
- Create: `app/api/webhooks/shippo/route.ts`, `lib/shipping/webhook.ts`, `lib/shipping/webhook.test.ts`

**Interfaces:**
- **`handleShippoEvent(deps: { db; shippo; emails: { shipped; delivered } }, event: { event: string; data: any }): Promise<string>`.** It re-fetches before acting:
  - **`transaction_created` and `transaction_updated`:**
    - `GET /transactions/{data.object_id}`;
    - with status SUCCESS, it finds the order by `shippo_order_id = tx.order` and runs `applyShippedTransaction`;
    - with status REFUNDED, or `object_status` "REFUNDED", on an order in `out_for_delivery` whose `tracking_number` equals the transaction's: a guarded update back to `placed`, clearing `tracking_number`, `tracking_url`, `label_url` and `shipped_at`.
  - **`track_updated`:**
    - `GET /tracks/usps/{data.tracking_number}`, finding the order by `tracking_number`;
    - DELIVERED does a guarded update from `out_for_delivery` to `completed` with `delivered_at` and `completed_at`, then `emails.delivered`;
    - RETURNED or FAILURE sets `shipping_problem` = the status details (≤ 200 characters).
  - It returns a short outcome string for logging.
- **The route:**
  - It compares `?token=` against `process.env.SHIPPO_WEBHOOK_SECRET` in constant time (`crypto.timingSafeEqual` on equal-length buffers). A missing secret or a mismatch gives 401.
  - The body is parsed as JSON. On success it always returns 200 `{ ok: true }`. A handler error returns 500 so Shippo retries.

- [ ] **Step 1: Write the failing tests:**
  - a transaction for an unknown order changes nothing;
  - SUCCESS moves the order and sends one email;
  - a repeated event sends no second email;
  - a refunded transaction puts it back to `placed`;
  - DELIVERED completes it and sends the delivered email;
  - RETURNED sets `shipping_problem`;
  - route source: `timingSafeEqual` and `SHIPPO_WEBHOOK_SECRET`.
- [ ] **Step 2–4:** Run `npx vitest run lib/shipping`: FAIL, then implement, then PASS plus tsc.
- [ ] **Step 5:** Commit `feat(shipping): Shippo webhook with re-fetch`.

### Task 7: Emails

**Files:**
- Modify: `lib/email/product-order-emails.ts`, `lib/email/product-order-emails.test.ts`

**Interfaces:**
- **`buildProductOrderShippedEmail(args: StatusArgs & { trackingNumber: string; trackingUrl: string; carrier: string; address: ShipAddress })`:**
  - heading "Your order is on its way";
  - the text "Order {ref} shipped with {carrier}.";
  - details rows Tracking and Ship to;
  - the button "Track package" pointing to `trackingUrl`.
- **`buildProductOrderDeliveredEmail(args: StatusArgs)`:** heading "Your order was delivered", with a link to My orders.
- **Senders:** `sendProductOrderShippedEmail` and `sendProductOrderDeliveredEmail`.
- **The confirmation email** for delivery:
  - Fulfillment is "Ship with USPS";
  - a Ship to row;
  - the next step reads "We'll email you tracking when it ships.";
  - the item table's fee row label changes from "Delivery fee" to "Shipping" when `fulfillmentMethod` is "delivery".
- **The confirmation email's arguments** gain `address?: ShipAddress | null`.

- [ ] **Step 1: Failing tests:**
  - the shipped email escapes the address and has the tracking link;
  - the delivered email has no emoji;
  - the delivery confirmation contains "Ship with USPS", "Shipping" and "We'll email you tracking when it ships.", and has no "Delivery fee".
- [ ] **Step 2–4:** Run `npx vitest run lib/email`: FAIL, then implement, then PASS.
- [ ] **Step 5:** Commit `feat(shipping): shipped and delivered emails`.

### Task 8: Admin: Store orders, Shipping settings, product weight

**Files:**
- Modify:
  - `app/admin/orders/orders-view.tsx`
  - `app/api/admin/product-orders/action/route.ts`, which accepts `tracking_number` and passes `trackingNumber`, and wires the shipped and delivered emails in `runStaffAction`
  - `lib/products/staffActions.ts`, which sends Shipped after `mark_shipped` and Delivered after `mark_delivered`
  - `lib/admin/productForm.ts`, which adds `weight_oz: string`, `formFromProduct`, and payload `weight_oz: number | null` with > 0 validation
  - `components/admin/products/ProductDrawer.tsx`, which adds a new `Section title="Shipping"` with "Shipping weight (oz)" and the hint "Weight packed in its pouch"
- Create:
  - `app/api/admin/store-settings/shipping/route.ts` (`requireAdmin` plus `sanitizeShippingSettings`)
  - a `ShippingSettingsPanel` inside orders-view, below Pickup settings: up to 5 pouch rows, plus the excluded states as a checkbox list for AK and HI and a free text field of codes
- Tests:
  - `lib/admin/ordersViewSource.test.ts`
  - `lib/admin/productForm.test.ts`
  - `lib/products/staffActions.test.ts`
  - a shipping settings route source test

**Interfaces:**
- **Tabs:** To pack, **Shipped**, Ready, Unpaid, Completed, Closed.
  - `forTab("shipped")` is `fulfillment_method = delivery` and `fulfilment_status = out_for_delivery`.
  - `forTab("ready")` becomes `fulfilment_status = ready` only.
- **The card, for a shipping order:**
  - tags "Paid by card" and "Ship · {shipping_service}";
  - "Not in Shippo yet" (warn) when `shippo_order_id` is null;
  - `shipping_problem` as a warn tag;
  - a "Ship to:" line;
  - "Placed … · $total (shipping $fee)".
- **Buttons on that card:**
  - "Open in Shippo to buy label ↗" (link `https://apps.goshippo.com/orders`, `target="_blank"`, `rel="noreferrer"`);
  - "Send to Shippo" when not pushed, and "Check Shippo" when pushed, both posting to the shippo admin route;
  - "Mark shipped", which opens a panel with the tracking number input and posts `mark_shipped`;
  - in Shipped, the tracking link plus "Mark delivered".
- **The refund dialog** for a shipping order whose `tracking_number` is set adds "Void the label in Shippo too."

- [ ] **Step 1: Failing tests:**
  - **Source tests:**
    - the tab copy includes "Shipped";
    - the card copy includes each exact button string;
    - the Shippo link uses `rel="noreferrer"`;
    - no raw palette classes.
  - **productForm:** "8.5" gives 8.5; "" gives null; "0" and "-1" are refused with "Shipping weight must be more than 0".
  - **staffActions:** `mark_shipped` sends the shipped email with the tracking number; `mark_delivered` sends delivered.
- [ ] **Step 2–4:** Run `npx vitest run lib`: FAIL, then implement, then PASS plus tsc.
- [ ] **Step 5:** Commit `feat(shipping): admin shipped tab, Shippo actions, shipping settings and weights`.

### Task 9: Cart, success page, My orders

**Files:**
- Modify:
  - `app/(user)/products/cart/page.tsx`
  - `app/(user)/products/success/page.tsx`
  - `app/(dashboard)/dashboard/orders/page.tsx`
- Create:
  - `components/products/ShippingAddressForm.tsx`
  - `components/products/ShippingPass.tsx`
  - `lib/products/shippingCart.ts`, the pure helpers
- Tests: `lib/products/cartSource.test.ts`, `lib/products/shippingCart.test.ts`, `lib/products/successSource.test.ts`

**Interfaces:**
- **`shippingCart.ts`:**
  - `emptyAddress(phone?: string): ShipAddress`
  - `addressComplete(a: ShipAddress): boolean`, where every field but `street2` is non-empty and the ZIP matches `/^\d{5}(-\d{4})?$/`
  - `quoteKey(items, address): string`. The quote is cleared whenever this key changes.
- **Cart:**
  - **Method choice:** a "How do you want to get it?" fieldset with the two radio cards (pickup first and default). Ship is shown only when a `shippingAvailable` prop or state is true, set from the quote route returning anything but 503 on a probe. Rule: hide Ship if a `GET /api/products/shipping-quote` returns `{ available: false }`, so the route also answers GET with `{ available: shippoConfigured() }`.
  - **Ship chosen:**
    - the `ShippingAddressForm`, with a states select from `US_STATES` minus the excluded states (read through a public `GET` that returns the excluded list too);
    - "Get shipping price";
    - the rate box ("USPS Ground Advantage", "Usually N business days" when days are known, and the amount);
    - for an invalid address, "We couldn't confirm this address", the messages and "Use suggested address";
    - "Pay at the store" disabled with "Only for pickup orders.";
    - the summary rows Subtotal, Shipping and Total;
    - the button "Pay $X by card", disabled until there's a quote.
  - **Checkout body:** `{ items, fulfillment_method: "delivery", payment_method: "card", address, expected_shipping }`. On a 409 it shows the new price from `details.amount` and keeps the customer on the cart.
- **`ShippingPass`:** the ref, items, total including shipping, the ship-to address, and "We'll email tracking when it ships." It uses the PickupPass visual language (Night), with no directions button.
  - The success page and My orders render `ShippingPass` when `fulfillment_method === "delivery"`, otherwise `PickupPass`.
  - My orders shows "Track package" (`tracking_url`) when shipped.

- [ ] **Step 1: Failing tests:**
  - **shippingCart:** `addressComplete` false for ZIP "7702"; `quoteKey` changes with quantity or address.
  - **Cart source:**
    - each exact copy string;
    - `expected_shipping`;
    - a `fieldset` for the method;
    - no raw palette.
  - **Success and orders source:** `ShippingPass` is chosen on `fulfillment_method === "delivery"`.
- [ ] **Step 2–4:** Run `npx vitest run lib`: FAIL, then implement, then PASS. Then run the full `npx vitest run`, tsc and `npx eslint` on the changed files.
- [ ] **Step 5:** Commit `feat(shipping): ship-to-me in the cart and the shipping pass`.

### Task 10: Docs

- [ ] Update DESIGN.md and PRODUCT.md with the shipping flow and the new admin tab (brief, matching the existing sections).
- [ ] Write the HANDOFF entry. It records:
  - the migration to run;
  - the env var `SHIPPO_WEBHOOK_SECRET` for the user to set;
  - the webhook URL to register in Shippo (`https://www.thelaunchpadwash.com/api/webhooks/shippo?token=<secret>`) for `transaction_created`, `transaction_updated` and `track_updated`;
  - that the owner's open answers feed origin.ts, the weights, the pouches and the excluded states.
- [ ] Commit `docs: shipping`.
