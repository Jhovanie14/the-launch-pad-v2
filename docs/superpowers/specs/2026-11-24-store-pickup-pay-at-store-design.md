# Store orders: pickup and pay-at-store (design)

Date: 2026-11-24. Status: the user approved the flow ("all good") and the mockup ("looks right, go ahead").

This is **PR A** of project 2: everything after "Add to cart". **PR B**, the 24/7 Bay restyle of the product list and product page, follows separately. Project 3 covers admin Products and inventory.

## Intent and why

Customers can buy car-care products online today, but only by card through Stripe, and the pickup handoff is poorly designed. The 2026-11-24 critique scored the flow 17/40:
- pickup hours appear nowhere;
- staff can't see the reference the customer brings;
- there is no new-order alert;
- "Mark completed" is one click and terminal;
- the data model can't express an unpaid order.

The owner wants customers to choose **pay online by card** or **pay at the store when they collect**. Staff take the money at the counter with a mix of **cash, card reader and the Counter Payment QR**, and they record which one was used. This work also lays the order-state foundation that Shippo shipping will extend later.

## Goals

- **Payment choice at the cart:** "Pay now by card" or "Pay at the store".
- **An order model where payment and fulfilment are separate,** so "ready but unpaid" exists.
- **Stock held as soon as an order is placed,** atomically, so the last unit can't sell twice.
- **Unpaid orders held for `hold_days`** (default 3) from when they are marked ready, with a reminder the day before and automatic release afterwards.
- **A counter screen for staff:** search by reference, name, phone or email; one clear action per order; payment method recorded on hand-over.
- **A pickup pass for customers:** a big reference, the status, the amount due, the hold date, the pickup hours and the address.
- **Emails for every customer-facing change.**
- **A "Store orders" count in the admin sidebar.**
- **One editable pickup-hours setting.** It is never invented.

## Non-goals

- Restyling the product list or product page (PR B). Admin Products and inventory (project 3).
- Delivery: it stays paused (`OFFERED_FULFILLMENT_METHODS = ["pickup"]`). Shipping comes later with Shippo.
- Integrating the Counter QR or card reader with orders. Staff record the method by hand.
- Staff email alerts. The sidebar count replaces them, because of the 100/day Resend cap.

## Anti-goals

- An order that is paid twice, or stock that is double-counted or never returned.
- A customer told a pickup time that isn't true. Hours come only from the setting; if it's empty, no hours are shown.
- A regular customer able to see another customer's order. The current success page loads order items for any valid `session_id` through the service-role client; that ends here.

## Decisions (approved in conversation)

1. **Two choices at the cart.** The total is the same for both.
2. **Sign-in is still required** for both choices.
3. **One open unpaid reservation per customer.** A second "Pay at the store" order is refused with a message that names the existing reference.
4. **The hold starts when staff mark the order ready**, not when it's placed. A reminder goes the day before the hold ends; then the order is released automatically, its stock returns and the customer is emailed. **Card orders never expire.**
5. **Staff record payment as one of:** cash, card reader or counter QR. Taking payment and handing over is one confirmed action.
6. **A refund on an order paid at the store** is recorded only. Staff hand back the money. Card refunds go through Stripe as today.
7. **Pickup hours and hold days are settings** on `store_settings`.
8. **New-order alert:** the sidebar count only. No staff email.

## Approaches considered (data)

1. **Picked: new payment and fulfilment columns on `product_orders`, backfilled from `status`. `status` stays in place, unused, and is dropped in a later cleanup migration.**
   - The orders keep one table and their history.
   - The deploy window is covered by a temporary trigger and a `stock_taken` marker (see Data).
2. **Rejected: keep `status` and add more values** (`reserved`, `ready_unpaid`…). Every new combination of payment and fulfilment multiplies the states. Shipping would make it worse.
3. **Rejected: a separate `product_order_payments` table.** It's more flexible for split payments, which nobody needs. It adds joins everywhere.

## Data (migration written by the builder, applied by the user)

**File:** `supabase/migrations/20261124000000_product_order_flow.sql`. Claude never applies migrations.

**`product_orders`: new columns**
- `payment_method text not null default 'card' check (in ('card','at_store'))`
- `payment_status text not null default 'unpaid' check (in ('unpaid','paid','refunded'))`
- `fulfilment_status text not null default 'placed'`, checked against:
  - `placed`, `ready`, `completed`, `released`, `cancelled`;
  - and `out_for_delivery`, for legacy delivery rows only.
- `paid_via text check (in ('stripe','cash','card_reader','counter_qr'))`, plus `paid_at timestamptz`
- `ready_at`, `hold_until`, `reminder_sent_at`, `completed_at`, `released_at`, all `timestamptz`
- `completed_by uuid references auth.users`
- `stock_taken boolean not null default false`: true once this order's quantities have left `products.stock`
- `stock_released_at timestamptz`: makes releasing stock idempotent
- `ref text generated always as (upper(left(id::text, 8))) stored`, plus an index on `ref`
- Indexes:
  - `(fulfilment_status, payment_status)`;
  - a partial index for the hold job: `where payment_method='at_store' and payment_status='unpaid' and fulfilment_status='ready'`.

**Backfill from `status`:**

| status | fulfilment_status | payment_status | paid_via |
|---|---|---|---|
| pending | placed | unpaid | |
| paid | placed | paid | stripe |
| ready_for_pickup | ready | paid | stripe |
| out_for_delivery | out_for_delivery | paid | stripe |
| completed | completed | paid | stripe |
| cancelled | cancelled | unpaid | |
| refunded | cancelled | refunded | stripe |

- Every existing order was paid by card, so `payment_method` = 'card' for all of them.
- For `ready_for_pickup` rows, `ready_at` = `updated_at`.
- `stock_taken` is true for every row whose old webhook decremented stock (paid, ready_for_pickup, out_for_delivery, completed, refunded), and false for pending and cancelled. Legacy pending orders hold no stock.
- `phone` is unchanged.
- The `status` column comment is changed to "deprecated: use payment_status/fulfilment_status".

**`store_settings`: new columns**
- `pickup_hours text` (null means not set)
- `hold_days integer not null default 3 check (between 1 and 14)`

**Functions** (`security definer`, `set search_path = public`, execute revoked from **`public`**, `anon` and `authenticated`, granted to `service_role`; this follows `20261103000000_customer_blocks.sql:116`):
- `place_product_order(p_user_id uuid, p_payment_method text, p_items jsonb, p_subtotal numeric, p_total numeric, p_phone text) returns uuid`.
  - In one transaction it:
    1. inserts the order with `fulfillment_method='pickup'`, `phone = p_phone` and `stock_taken = true`;
    2. inserts the item snapshots;
    3. for each item, runs `update products set stock = stock - qty where id = … and stock >= qty`.
  - If no row updates, it raises `insufficient_stock:<name>`, and everything rolls back.
  - `p_items` is `[{product_id, name, unit_price, quantity}]`.
- `take_product_order_stock(p_order_id uuid) returns void`, for legacy orders only: a pending order created before the deploy that is paid after it.
  - Only `where stock_taken = false`, it decrements each product **floored at 0**. This is the old behaviour; the payment has already happened, and staff refund an oversell.
  - It then sets `stock_taken = true`.
- `release_product_order_stock(p_order_id uuid) returns void`.
  - Only `where stock_taken and stock_released_at is null`, it adds the quantities back, then sets `stock_released_at = now()`.
  - Items whose product has been deleted are skipped.

**Deploy-window trigger:** `product_orders_sync_legacy_status`, `BEFORE UPDATE OF status`.
- It maps a new `status` value onto the new columns, using the backfill table plus `paid_via='stripe'`, `paid_at=now()` and `stock_taken=true` on `paid`.
- Between applying the migration and merging, the old code writes only `status`; the trigger keeps the new columns correct.
- After the merge nothing writes `status`, so it never fires. The later cleanup migration drops it with the column.

**Realtime:** `alter publication supabase_realtime add table public.product_orders` (guarded if it is already a member), for the sidebar count.

**RLS:** unchanged. Customers read their own orders, and admins read all. Every write goes through the service role on the server.

**Types:** `types/database.types.ts` is updated by hand to match, because it can't be regenerated until the migration is applied. The PR says so.

**Deploy order:** apply the migration, then merge.
- The trigger and `stock_taken` keep orders correct in between: legacy pending orders that complete take their stock in the new webhook, and ones that expire release nothing.
- New orders created by the old code in that window get the column defaults (`placed`/`unpaid`/`card`, `stock_taken=false`), which is correct.

## Order flow (pure module)

`lib/products/orderFlow.ts` replaces `lib/products/orderStatus.ts`. All callers move to it, and `orderStatus.ts` and its test are deleted.

**Types:**
- `PaymentMethod`
- `PaymentStatus`
- `FulfilmentStatus`
- `PaidVia`
- `StaffAction = "mark_ready" | "hand_over" | "take_payment" | "release"`. Staff have no action on a card order still waiting for payment; Stripe's 30-minute expiry cancels it.
- `FlowOrder`, which has these fields:
  - `payment_method`
  - `payment_status`
  - `fulfilment_status`
  - `fulfillment_method`
  - `hold_until`
  - `total`

**Rules:**

| Action | Allowed when | Result |
|---|---|---|
| `mark_ready` | placed, and (paid, or at_store unpaid) | ready; `ready_at=now`; `hold_until` = the hold end (below) for an unpaid at_store order, otherwise null |
| `hand_over` | (placed or ready) and paid | completed; `completed_at`, `completed_by` |
| `take_payment(paid_via ∈ cash \| card_reader \| counter_qr)` | (placed or ready), at_store and unpaid | paid + completed in one update; `paid_at`, `paid_via`, `completed_*` |
| `release` | (placed or ready), at_store and unpaid | released; `released_at`; then stock is released |
| *(webhook)* card paid | card, placed and unpaid | paid; `paid_via='stripe'`, `paid_at`; if `!stock_taken`, take stock (legacy) |
| *(webhook)* card paid, but the order isn't placed/unpaid | anything else | log it; set `payment_status='paid'`, `paid_via='stripe'`; leave `fulfilment_status` alone. A cancelled order that is now paid shows in the Closed tab tagged "Paid after cancelling: refund". Not expected, since staff can't cancel a card order, but never silent. |
| *(webhook)* checkout expired | card, placed and unpaid | cancelled; stock released (a no-op when `stock_taken` is false) |

**Hand-over from placed** (a customer who walks in before the order was marked ready): `hand_over` and `take_payment` skip the Ready email, and the customer receives only the Collected receipt. My call: it matches what happens at the counter.

**Hold end, in Houston time (`BUSINESS_TIME_ZONE = "America/Chicago"`):**
- The hold ends at 23:59:59 local on (the date it was marked ready) + `hold_days` days. Example: marked ready on Monday with 3 days → held **through Thursday**. The email says "We'll hold it until Thu, Nov 27", which is true all day Thursday.
- The reminder goes on the Houston day **before** the hold date: `needsReminder` = today (Houston) is the hold date − 1, and no reminder has been sent. The daily 9 AM run sends it on Wednesday.
- `isOverdueHold` = now > `hold_until`. The Friday 9 AM run releases it.
| refund | paid, and not already refunded | `payment_status='refunded'`. If not completed, `fulfilment_status='cancelled'` and stock is released. If completed, the stock stays out. |

**Functions:**
- `applyStaffAction(order, action, { now, holdDays, staffId, paidVia? })` returns `{ patch }` or throws a customer-safe `ApiError(400)` naming why.
- `staffActionsFor(order)`: the buttons to show.
- `customerStatus(order)` returns `{ label, tone }`, with these labels:
  - "Waiting for payment": card, placed, unpaid
  - "Reserved": at_store, placed, unpaid
  - "Paid": card, placed, paid
  - "Ready to collect"
  - "Picked up"
  - "Released"
  - "Cancelled"
  - "Refunded"
- `staffQueue(order)` decides the admin tab:
  - **To pack:** placed and (paid or at_store). Card orders still waiting for payment are hidden.
  - **Ready**
  - **Unpaid:** at_store and unpaid, placed or ready.
  - **Completed**
  - **Closed:** released, cancelled or refunded.
- `holdUntil(readyAt, holdDays)`, `isOverdueHold(order, now)` and `needsReminder(order, now)`, as in "Hold end" above.
- **Legacy delivery orders** (`out_for_delivery`, or paid delivery orders still `placed`) appear in Ready or To pack respectively, and `hand_over` completes them. `customerStatus` labels `out_for_delivery` "Out for delivery".

Every DB update uses an optimistic guard (`.eq` on the current `fulfilment_status` and `payment_status`). A lost race returns 409 "This order just changed, refresh to see it."

## Server

**`POST /api/products/checkout`** takes `{ items, fulfillment_method: "pickup", payment_method: "card" | "at_store" }`.
1. Re-price with `priceOrder`.
2. For `at_store`, refuse if the user already has an open unpaid at_store order (409): "You already have a reservation waiting (ref 1A2B3C4D). Collect or cancel it before reserving more."
3. Call `place_product_order` through RPC, with `p_phone` taken from `profiles.phone` (null if not set). Map `insufficient_stock:<name>` to 400 "Not enough stock for <name>".
4. Then:
   - **card:** create the Stripe session as today, with `expires_at` = now + **31 minutes** (Stripe's minimum is 30 minutes, so this leaves margin) so held stock returns quickly. If session creation fails, release the stock and mark the order cancelled before returning the error. Return `{ url }`.
   - The Stripe webhook fills in the phone collected at Stripe checkout, overwriting the profile phone.
   - **at_store:** send the "reserved" email and return `{ url: "/products/success?order=<id>" }`.

**Webhook** (`processProductOrder*` in `lib/products/processProductOrder.ts`):
- **Completed:** move to paid using the flow rules. The read-and-decrement stock loop is removed, because stock was already held. Send the confirmation email.
- **Expired:** cancel and release the stock.
- Both stay idempotent: they act only from `placed/unpaid`.

**`POST /api/admin/product-orders/action`** takes `{ order_id, action, paid_via? }`.
- It runs `requireAdmin`, applies `applyStaffAction`, writes with the guard, then runs side effects:
  - **release:** the RPC that returns stock;
  - **mark_ready:** the ready email;
  - **hand_over** and **take_payment:** the collected email;
  - **release:** the released email.
- Email senders log and never throw.
- It replaces `update-status/route.ts`, which is deleted.

**`POST /api/admin/product-orders/refund`:** the existing route adapts to the new columns.
- If `payment_method='card'`, refund through Stripe as today.
- If the order was paid at the store, record it only.
- Then apply the refund rule above, including releasing stock when the order wasn't completed, and send the existing refunded email. The copy says "refunded to your card" or "refunded at the store".

**`GET /api/cron/product-holds`**, daily at `0 15 * * *` (about 9–10 AM Houston). It uses Bearer `CRON_SECRET`, like the marketing crons, and is added to `vercel.json`.
1. Send a reminder for orders where `needsReminder` holds, then set `reminder_sent_at`.
2. Release orders where `isOverdueHold` holds: the guarded update, the stock RPC, then the released email.

It returns counts. Every step is safe to run twice.

**`POST /api/products/orders/cancel`** (customer, approved by the user) takes `{ order_id }`.
- `requireUser`, then the order must belong to that user (read with the service role, then compare `user_id`), be `at_store`, `unpaid`, and `placed` or `ready`.
- It applies the same transition as `release`, with a guarded update, then the stock RPC and the released email (wording: "You cancelled reservation …").
- Otherwise 400 "This order can't be cancelled here: contact us."
- The Pickup Pass and the dashboard order card show a quiet "Cancel reservation" button for those orders, which opens an AlertDialog: "Cancel reservation 1A2B3C4D? The items go back on the shelf."
- The 409 limit message stays: "You already have a reservation waiting (ref …). Collect or cancel it before reserving more."

**Store settings:** a **new** route, `POST /api/admin/store-settings/pickup`, takes `{ pickup_hours, hold_days }` and runs `requireAdmin`. It updates only those two columns. The existing `POST /api/admin/store-settings` saves the storefront hero through `sanitizeHeroSettings`, which nulls every missing hero field, so the new settings must never go through it. `pickup_hours` is trimmed and at most 120 characters; an empty value saves null. `hold_days` is an integer from 1 to 14. `lib/products/storeSettings.ts` reads them for the server, with fallbacks `null` and `3`.

## Emails

All in `lib/email/product-order-emails.ts`, on the existing layout, plain and with no emoji. Each shows the short ref large, the items table, the address, and the pickup hours when they are set.

| Email | When | Key copy |
|---|---|---|
| Reserved (new) | at_store order placed | "Reserved: pay $X at the counter when you collect. We'll email you when it's ready." |
| Confirmation (updated) | card paid | "Paid. We'll email you when it's ready." |
| Ready (updated) | mark_ready | "Ready to collect. Show reference ABCD1234." For unpaid at_store, adds "$X to pay at the counter (cash, card or QR). We'll hold it until <weekday, Mon D>." |
| Reminder (new) | the day before the hold ends | "Your order is held until tomorrow, <date>." |
| Released (new) | release, by staff or cron | "We've released your reservation. Nothing was charged." |
| Collected (new) | hand_over or take_payment | A receipt: items, total, "Paid by card / cash / card reader / QR", the date |
| Refunded (updated) | refund | the card or store wording |

Dates are formatted in Houston time with `Intl.DateTimeFormat` and `timeZone: BUSINESS_TIME_ZONE` ("America/Chicago", from `lib/dashboard/home.ts`). `date-fns-tz` isn't installed, and none is added.

## Customer screens

- **Leaving the black-and-gold world:**
  - `.storefront` moves from `app/(user)/products/layout.tsx` to the catalog pages only (`products/page.tsx`, `[slug]/page.tsx`) until PR B;
  - the cart and success pages render on the 24/7 Bay tokens (Canvas, white surfaces, Night).
- **Cart** (`app/(user)/products/cart/page.tsx`), as in the mockup:
  - **Item rows:** they stack on phones, with a 64px image, the name and the price. Below them, a 44px quantity stepper and a "Remove" text button.
  - **Pickup card:** the address, plus the hours if set, and "We email you when it's ready."
  - **"How do you want to pay?":** a radio group of two cards.
    - "Pay now by card": "Secure checkout with Stripe. Nothing to pay at pickup."
    - "Pay at the store": "Cash, card or QR when you collect. We hold it {hold_days} days after it's ready."
    - The selected card has a 2px Brand Blue ring, and the radios are real inputs.
  - **Subtotal and total.**
  - **A sticky Night bar** with the item count, the total, and the one Flame button. It reads "Pay $X now" for card or "Reserve for pickup" for the store.
  - **Signed out:** the button reads "Sign in to check out", with "We'll email you when your order is ready to collect" under it.
  - **Errors:** stock and reservation errors show inline above the bar (`role="alert"`) as well as in the toast.
- **Success** (`/products/success`):
  - **Who can see it:** it accepts `?session_id=` (card) or `?order=` (at_store), requires sign-in, and loads the order with the **user** client, so RLS limits it to the owner. Otherwise it redirects to `/dashboard/orders`.
  - **Card order still unpaid:** a client component shows "Confirming your payment…" (`aria-live`) and refreshes the server data every 2s, for up to 20s. After that it says "Payment is taking longer than usual. We'll email you when it's confirmed."
  - **Then:** the Pickup Pass.
- **Pickup Pass** (`components/products/PickupPass.tsx`), shared by the success page, the dashboard orders page and the dashboard home Now card:
  - A Night card with the pass lift, the chip (the label from `customerStatus`; Flame when ready) and the ref in 900 weight.
  - "Show this reference at the counter".
  - A due box for unpaid at_store: "$X to pay at the counter: cash, card or QR", plus "Held until <date>" when ready.
  - The items, the hours row when set, the address, and a quiet "Get directions" (Google Maps).
  - The page's one Flame control is "Track my orders" on the success page.
- **Dashboard orders** (`app/(dashboard)/dashboard/orders/page.tsx`):
  - Open orders render as Pickup Passes. Past orders render as the existing white cards, with the ref made prominent.
  - The progress list becomes Placed → Ready → Picked up.
  - The stale "or local delivery" copy is removed.
- **Every reader of `status` moves to the new columns:**
  - `lib/dashboard/home.ts`: the Now card's ready item uses `fulfilment_status === "ready"` (line 193); the `order_on_the_way` item uses `fulfilment_status === "out_for_delivery"` (line 195); the completed filter uses `fulfilment_status === "completed"` (line 239).
  - `hooks/useDashboardHome.ts:47-49` and `app/(dashboard)/dashboard/orders/page.tsx:122-124` select and filter on `status` and hide `pending` and `cancelled`. They change to: hide `fulfilment_status = 'cancelled'`, and hide card orders still `placed`/`unpaid` (an abandoned Stripe checkout). New orders keep `status='pending'` forever, so leaving these filters would hide every new order.
  - A source test asserts that no file under `app/`, `lib/`, `hooks/` or `components/` reads `product_orders` `status` (a grep for `.eq("status"` and `"ready_for_pickup"` near `product_orders`), so a missed reader fails the suite.
- **GA4:** the success page's `purchase` event (`success/track-purchase.tsx`) fires only for a paid card order. A reservation sends no purchase event, because no money has changed hands and it may be released. My call.

## Staff counter screen

`app/admin/orders/orders-view.tsx` is rebuilt as in the mockup, on the light tokens (Canvas page, white surfaces, Night primary buttons, Brand Blue focus).
- **Search** (44px), matching:
  - a ref prefix (case-insensitive);
  - phone digits;
  - the customer's name or email (resolve matching profile ids first).
- **Tabs, with counts:** To pack · Ready · Unpaid · Completed · Closed. The default is To pack, or Ready if To pack is empty.
- **Order card:**
  - the ref in 900 weight, about 1.75rem;
  - the name and phone (a `tel:` link) and the email;
  - status tags: "Pay at store · $X due", "Paid by card", "Ready · held until <date>", "Hold ends today" (warn tone);
  - the items;
  - the placed date in Houston time.
- **Actions** come from `staffActionsFor`:
  - **To pack:** "Mark ready".
  - **Ready, paid:** "Hand over" opens an inline confirm showing the ref and items, then "Confirm handed over".
  - **Ready, unpaid at_store:** "Take payment & hand over" opens an inline panel: "How did they pay $X?" with Cash / Card reader / Counter QR (a radio group, 48px), then "Confirm paid & handed over".
  - **Unpaid:** a secondary "Release" button opens an AlertDialog: "Release reservation 1A2B3C4D? The items go back on the shelf and the customer is emailed."
  - **Paid:** "Refund…" stays as today, with copy for card or store.
- **Settings panel** (collapsible, at the bottom): "Pickup hours" text field (a placeholder example, not a default) and "Hold unpaid orders for [3] days".
- **Sidebar badge:**
  - a new `"orders"` badge key on "Store orders" in `lib/navigation/admin.ts`;
  - its count is "To pack" plus "Ready & unpaid with the hold ending within 24h";
  - it is kept live through realtime on `product_orders`, with the same pattern as Messages.

## Testing

- **Pure:** `orderFlow.test.ts` covers every row of the rules table, every forbidden transition, `customerStatus` labels, `staffQueue`, the hold and reminder maths around midnight in Houston, and `hold_days` 1 and 14.
- **The fake db** (`lib/marketing/testing/fakeDb.ts`) is read-only today, with no insert, update or `.rpc`. It is extended (or a small store-specific fake is added beside the tests) to record updates and RPC calls with programmable results.
- **Checkout route logic,** extracted to `lib/products/placeOrder.ts` and tested with that fake:
  - at_store second reservation → 409;
  - `insufficient_stock` mapping;
  - a card order sets `expires_at`;
  - an at_store order never calls Stripe.
- **Customer cancel:** someone else's order → 400; a card order → 400; a completed order → 400; an unpaid at_store order that is placed or ready → released, stock RPC called once, email sent.
- **Cron logic** in `lib/products/holds.ts`, tested with the fake db: reminder once; release once; already released is a no-op.
- **Emails:** each builder's subject and key lines; no hours line when `pickup_hours` is null.
- **Source tests:**
  - the migration contains the columns, both functions, the revoke/grant and the backfill mapping;
  - `vercel.json` has the cron;
  - the success page uses the user client, not `createAdminClient`;
  - the cart page has no `.storefront` wrapper and uses tokens only.
- **Nav:** `admin.test.ts` is updated for the `orders` badge.

## Left to the builder

- The exact class strings, within DESIGN.md and the mockup.
- The internal shape of the fake-db tests.
- How the search query is composed, within the matching rules above.
- The PL/pgSQL details, within the function contracts above.
