# Shipping online orders with Shippo (design)

Date: 2026-11-25. Status: approach and mockup approved by the user ("yes … A1", "looks good"). This is part 2. Part 1 (Zelle and the pickup note) is `2026-11-25-zelle-pickup-note-design.md`.

## Intent and the why

Today the store only offers pickup at the carwash. The owner wants customers anywhere to order and have it shipped.

The owner's answers so far:
- shipping costs **whatever the courier charges**;
- **USPS, the cheapest service**;
- **Armando packs**, in **pouches** rather than boxes;
- returns are decided later.

The Shippo account exists (free Starter plan, 30 labels a month), with USPS, UPS and FedEx through Shippo's own accounts.

Success means:
- a customer in another state can check out with a correct USPS price;
- Armando sees the order, buys and prints the label in Shippo in a few clicks;
- the customer gets a "Shipped" email with tracking and a "Delivered" email, without staff typing anything into our site.

## Goals, non-goals, anti-goals

**Goals:**
- **Checkout:** "Ship to me (USPS)" next to pickup in the cart. The address is checked, and the live USPS Ground Advantage price is shown before paying.
- **Payment:** shipping orders are paid by card through the existing Stripe Checkout. Shipping is its own line on the Stripe page and on our order.
- **Shippo:** a paid shipping order is pushed to Shippo's Orders page. Staff buy the label there.
- **Status from Shippo:** the label purchase and the tracking updates come back from Shippo and move the order to Shipped, then Delivered (Completed), with emails.
- **Weights:** products have a shipping weight the owner can edit in Admin › Products.

**Non-goals:**
- Buying labels from our admin (rejected approach C).
- More than one carrier or speed.
- International shipping.
- Returns or return labels.
- Free-shipping thresholds.
- Local delivery by courier.

**Anti-goals:**
- **A customer charged a shipping price the server didn't compute.** The browser's number is never trusted.
- **A paid order that silently never reaches Shippo.** A failed push must be visible and retryable.
- **A forged webhook moving an order to Shipped or Delivered.**
- **Breaking pickup.** Pickup checkout, pay-at-store and the counter flow behave exactly as today.

## Constraints

- **Stack and order model:** Next.js 16 App Router, Supabase (RLS, service-role writes), Stripe hosted Checkout, Resend emails, Vitest without a DOM. Uses the order model from the pickup project:
  - `payment_method`, `payment_status` and `fulfilment_status`;
  - the fulfilment value `out_for_delivery`, already in the check constraint;
  - `fulfillment_method`, which already allows `'delivery'`;
  - `delivery_address` jsonb and `delivery_fee` numeric, which already exist.
- **Migrations:** the user runs them, and PRs merge only after the columns are confirmed live.
- **Keys and money:**
  - `SHIPPO_API_KEY` is created by the user (a test key first) and lives only in env. We never handle keys and never buy live labels.
  - The live Stripe and Supabase are read-only for us.
- **Waiting on the owner:**
  - the exact ship-from address (3535 O'Meara Dr vs 10410 S Main St, ZIP, suite, label phone);
  - product weights and pouch sizes;
  - whether we ship to Alaska, Hawaii and P.O. boxes;
  - drop-off or USPS pickup;
  - a card on file in Shippo.

  The build doesn't wait for these: they become settings or data, and test mode needs none of them to be final.

## Approaches

1. **A1, picked:**
   - the address is entered on our cart page;
   - our server gets the Shippo rate;
   - Stripe hosted Checkout charges items plus a fixed shipping line;
   - the paid order is pushed to Shippo Orders;
   - the label is bought in the Shippo app;
   - webhooks bring the tracking back.

   It keeps today's checkout and success flow untouched.
2. **A2: Stripe embedded checkout with dynamic shipping rates.** Rejected. It rebuilds the payment step and the success flow that were just redone.
3. **C: everything in our admin, labels bought by our code.** Rejected for now: the most code, and every label purchase would go through us. The owner's flow is Armando printing from Shippo.
4. **Flat or free shipping.** Rejected: the owner wants the courier's price.

## Decisions

### Customer checkout (cart)

**Choosing the method:**
- The cart gets "How do you want to get it?" as two radio cards:
  - **Pick up at the carwash · Free**, showing the address and the pickup hours;
  - **Ship to me · USPS**, with "Price based on your address and the weight."
- The default is pickup.

**Address form** (when Ship is chosen):
- Fields: full name, street, apt/suite (optional), city, state (US states select), ZIP, phone.
- Every field except apt is required. The phone is prefilled from the profile when there is one.
- The country is fixed to the US.
- **Get shipping price** posts the cart and the address to a new route, `POST /api/products/shipping-quote`.

**The quote route:**
1. Validate the address with Shippo (`validate: true`).
2. Build the parcel from the cart (see Parcel).
3. Create a Shippo shipment from the origin to the address.
4. Pick the **cheapest USPS rate**, preferring the Ground Advantage service level when present.
5. Return `{ amount, service: "USPS Ground Advantage", days, address: normalised }`. `days` is the estimated days when Shippo gives them.

**Bad addresses:**
- When Shippo says the address is invalid, the route returns 400 with Shippo's messages in plain words, plus the suggested address when there is one.
- The cart shows "We couldn't confirm this address" with a "Use suggested address" button.

**Staleness:** changing the cart or the address clears the price, so the customer must get a new one.

**Payment and the summary:**
- For shipping, "Pay at the store" is disabled with the hint "Only for pickup orders", and card is forced.
- The summary shows Subtotal, Shipping (USPS Ground Advantage) and Total.
- The pay button reads "Pay $X by card".

### Pricing is the server's

The `/api/products/checkout` request for `fulfillment_method: "delivery"` carries the address, never the price.

`placeOrder` does this:
1. Re-runs the same quote on the server (`quoteShipping(cart, address)`).
2. Stores the result on the order:
   - `delivery_fee` = the shipping amount;
   - `delivery_address` = the normalised address;
   - `shipping_service` and `shipping_rate_id`.
3. Adds a Stripe line item "Shipping (USPS Ground Advantage)".

**If the server quote differs from what the cart showed:**
- The client sends the amount it showed, as `expected_shipping`.
- When it differs, the route returns 409 "Shipping price changed to $Y. Check and pay again.", and the cart shows the new price.
- **My call:** a silent repricing would surprise the customer.

**Other rules:**
- `OFFERED_FULFILLMENT_METHODS` becomes `["pickup", "delivery"]`.
- A delivery order with `payment_method: "at_store"` is refused (400).
- Stripe's `shipping_address_collection` stays off, since we collected the address. The phone keeps being collected.

### Parcel

- **`products.weight_oz`:** a new column, numeric, nullable, > 0. The admin Product drawer gets a "Shipping weight (oz)" field in a new "Shipping" section, with the hint "Weight packed in its pouch".
- **Missing weights:** a cart with any product lacking a weight can't be shipped. The cart shows "Shipping isn't available for <product> yet. Choose pickup", and the quote route refuses.
  - **My call:** better than guessing a weight and undercharging.
- **The pouch:**
  - **Pouches setting:** `store_settings.shipping_pouches` jsonb, a list of `{ name, length_in, width_in, height_in, max_weight_oz }`, edited in Admin › Store orders › Shipping settings (next to Pickup settings). Until the owner sends sizes, the default is one pouch, 10 × 13 × 1 in, max 160 oz.
  - **Packing rule:** total weight = sum of `weight_oz × quantity`. The parcel is the smallest pouch whose `max_weight_oz` ≥ total.
  - **Too heavy:** when no pouch fits, shipping is unavailable ("This order is too big to ship online. Choose pickup or contact us").
  - **My call, pending the owner's answer:** splitting an order into several parcels is out of scope until they say otherwise.

### Origin

- `lib/shipping/origin.ts` holds the ship-from address, phone and email as a constant.
- It's filled once the owner confirms (3535 O'Meara Dr, Houston, TX, ZIP and phone to come). Until then it's a clearly marked placeholder that only works with the test key.
- **My call:** the origin is a code constant, not a setting, because it changes almost never.

### After payment: push to Shippo

**When the push runs:**
- `processProductOrderCompleted` (Stripe webhook) already marks the order paid and takes the stock.
- For a delivery order, it then calls `pushOrderToShippo(order)`, which creates a Shippo **Order**. The order carries:
  - `to_address`;
  - `line_items` (title, quantity, total price, weight);
  - `placed_at`;
  - `order_number` = our ref;
  - `weight` and `weight_unit`;
  - `shipping_cost` and `shipping_method`.
- Our order stores `shippo_order_id`.

**When it fails:**
- A failed push never fails the Stripe webhook, because the payment is real.
- The order keeps `shippo_order_id = null`. The daily cron (`/api/cron/product-holds`, extended) retries pushes for paid delivery orders without one.
- The admin card shows a warning tag "Not in Shippo yet" and a **Send to Shippo** button that retries now.

### Admin (Store orders)

- **To pack:** a paid delivery order shows up here as today.
- **The card:**
  - Tags: "Paid by card" and "Ship · USPS Ground Advantage".
  - A "Ship to:" line with the address.
  - The shipping amount in the placed line.
  - An **Open in Shippo to buy label ↗** link (the Shippo app's Orders page; deep link to the order if the URL format allows).
- **A new tab, "Shipped",** between To pack and Ready. It lists `fulfillment_method = 'delivery'` with `fulfilment_status = 'out_for_delivery'`.
  - The Ready tab keeps only pickup orders (`ready`).
  - `staffQueue` gains `"shipped"`.
- **Shipped card:** carrier, tracking number (linked to the tracking page) and the last tracking status.
- **Manual fallback:** **Mark shipped** opens a small form for the tracking number, for when a webhook never arrives. It sets the same fields the webhook would.
- **Badges:** the sidebar's Store orders badge counts paid delivery orders in To pack, as it does pickup orders.
- **Staff buttons on a shipping order (my call).** `staffActionsFor` becomes method-aware:
  - **To pack:** Open in Shippo, Send to Shippo (only while not pushed), Mark shipped (manual tracking entry) and Refund. Mark ready and Hand over are hidden, so a shipping order can never become `ready`.
  - **Shipped:** Mark delivered and Refund. Mark delivered is the manual close for when USPS never scans DELIVERED. It sets `completed` and `delivered_at`, and sends the Delivered email.
  - **Out of scope for v1:** turning a shipping order into a pickup at the counter. Staff refund it, and the customer reorders as pickup.
  - **Server side:** `applyStaffAction` refuses `mark_ready`, `hand_over` and `take_payment` on a delivery order. It gains `mark_shipped` (tracking number required) and `mark_delivered`.

### Shippo webhooks

- **One route:** `POST /api/webhooks/shippo?token=<SHIPPO_WEBHOOK_SECRET>`.
  - A missing or wrong token returns 401.
  - The URL with the token is registered in Shippo for `transaction_created`, `transaction_updated` and `track_updated`.
- **Shippo doesn't document signed webhooks.** The route treats the body only as a hint and **re-fetches** the transaction or track from the Shippo API with our key before changing anything.
- **`transaction_created` / `transaction_updated`:** when the re-fetched transaction is `SUCCESS` and its `order` matches an order's `shippo_order_id`:
  - set `tracking_number`, `tracking_url`, `carrier`, `label_url` and `shipped_at`, plus `fulfilment_status = 'out_for_delivery'`;
  - use a guarded update from `placed`, so it's idempotent;
  - send the **Shipped** email.
- **Voided labels:** a transaction refunded or voided in Shippo before delivery puts the order back to `placed` and clears the tracking. Staff then see it in To pack again.
- **`track_updated`, status `DELIVERED`:**
  - `fulfilment_status = 'completed'`, plus `delivered_at` and `completed_at`;
  - send the **Delivered** email.
- **`track_updated`, status `RETURNED` or `FAILURE`:** set `shipping_problem` (text) so the admin card shows a warning tag. The order stays Shipped.
- **Idempotency:** every handler is guarded on the current status, so Shippo retries change nothing twice.
- **Fallback when no webhook arrives (my call).**
  - **What's unconfirmed:** Shippo's docs show that a label bought against an order sets the transaction's `order` and moves the Shippo order to SHIPPED. They don't say whether a label bought in the web app fires `transaction_created` to our URL.
  - **Polling:** the daily cron and a **Check Shippo** button on the admin card re-fetch `GET /orders/{shippo_order_id}` for orders that were pushed but not shipped. They apply the same "shipped" update from its `transactions`.
  - **Last resort:** Mark shipped.
  - **First build task:** a spike against the test key that confirms which of these fire. Its result is recorded in the plan.

### Where we ship (my call, pending the owner)

- **v1:** the 50 states and DC, including P.O. boxes, which USPS delivers to.
- **Refused:** US territories and military (APO/FPO) addresses, with "We can't ship to this address yet. Choose pickup or contact us."
- **Turning states off:** `store_settings.shipping_excluded_states text[]` (default empty) lets the owner turn off states, for example AK and HI, in Shipping settings without another migration. The cart's state list leaves them out, and the quote route refuses them.

### Known bugs to fix on the way

- **The address gets wiped:** `processProductOrderCompleted` writes Stripe's `shipping_details` into `delivery_address`. We collect the address ourselves, so Stripe's is empty and would wipe it. Write it only when present, and never over an existing address.
- **The order RPC:** `place_product_order` gains the fulfilment method, fee, address and shipping fields.

### Data (one migration)

- **`products`:** `weight_oz numeric check (weight_oz > 0)`.
- **`store_settings`:** `shipping_pouches jsonb` (null means use the default), and `shipping_excluded_states text[] not null default '{}'`.
- **`product_orders`:**
  - `shipping_service text`, `shipping_rate_id text`, `shippo_order_id text unique`;
  - `tracking_number text`, `tracking_url text`, `carrier text`, `label_url text`;
  - `shipped_at timestamptz`, `delivered_at timestamptz`, `shipping_problem text`.
- **Existing columns reused:** `delivery_address`, `delivery_fee`, `fulfillment_method = 'delivery'` and `fulfilment_status = 'out_for_delivery'`.
- **Customer visibility:** RLS stays as is, so customers still read only their own orders. `label_url` is staff-only information, but it's on the order row customers can read. **My call:** acceptable, since a label for your own parcel isn't sensitive. Never render it in customer UI.

### Customer side

- **Success page:** for a shipping order, it shows a "Shipping pass" in place of the pickup pass: ref, items, total with shipping, ship-to, and "We'll email tracking when it ships."
- **My orders:**
  - placed: "Packing";
  - out_for_delivery: "Shipped" with a "Track package" link;
  - completed: "Delivered".
  - `customerStatus` gains these labels for `fulfillment_method = 'delivery'`.
- **Emails:**
  - **Confirmation:** for shipping, it says "We'll email you tracking when it ships" and lists Ship to.
  - **Shipped:** "Your order is on its way": ref, carrier, tracking number, ship-to and a **Track package** button. It replaces the existing out-for-delivery email for shipping orders.
  - **Delivered:** short, with a link to My orders.
- **Self-cancel:** shipping orders can't be self-cancelled after payment (same as paid pickup orders today).

### Refunds

- **Card refund:** the existing refund flow works for a delivery order (Stripe refund of the full total, shipping included).
- **Label already bought:** the refund dialog adds "Void the label in Shippo too" as a reminder line. Our code doesn't void labels.

### Environment

- `SHIPPO_API_KEY`: the user adds the test key to `.env.local` and Vercel Preview first, then the live key to Production.
- `SHIPPO_WEBHOOK_SECRET`: random, set by the user. We generate nothing secret into chat.
- **Missing key:** with no `SHIPPO_API_KEY`, the Ship option is hidden in the cart and the quote route returns 503. Pickup is unaffected.

## Branching (my call)

- Part 2 stacks on part 1 (`feat/store-zelle-pickup-note`, PR #42), the same way #39–#41 were stacked. It's retargeted to `main` once #42 merges.
- The reason: both touch the cart's pickup card, the pass, the confirmation email and Store settings.

## Left to the builder

- **Shippo access:** calling Shippo with plain `fetch` versus the `shippo` npm SDK. Prefer `fetch` with a small typed client in `lib/shipping/shippo.ts`, unless the SDK is clearly simpler.
- **Deep links:** the exact deep-link URL for a Shippo order, if one exists. Otherwise link to `https://apps.goshippo.com/orders`.
- **Copy:** the exact wording of the "Shipped" and "Delivered" emails, within the existing email layout.
- **States list:** the US states list source (a small constant).
