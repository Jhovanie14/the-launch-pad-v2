# Product store: revive /products with pickup/delivery purchasing — Design

Date: 2026-08-12
Status: Approved for planning

## Problem

The `/products` page has been disabled since April (`e892c12`, a `notFound()` call at the top of the component). Even before that, it was a mock: a hard-coded array of four sample products with disabled "Available at the store" buttons — no database table, no purchasing, no admin management.

The business now wants the store live for real. QA's requirement: a customer buys products online and chooses **pickup at the store or delivery to them**. The admin side must manage the catalog dynamically (products stored in the database, editable from the admin console) and act on incoming orders.

Decisions made during brainstorming:

- Admin gets both **products CRUD and an orders queue** (staff need a place to act on purchases).
- Payment is **always online** via Stripe Checkout — no pay-at-store or reserve-only states.
- Delivery costs a **flat admin-configurable fee**; pickup is free.
- Inventory is a **numeric stock count** per product, decremented on successful payment.
- Purchasing **requires sign-in**; browsing is public. Guest checkout can come later.
- The page uses a **cart** (multiple items, one checkout, one delivery fee, one order to fulfill).

## Current state (for reference)

- `app/(user)/products/page.tsx` — client component, hard-coded `products` array, `notFound()` disable, full search/filter/sort/grid/list UI already built.
- No `products`, orders, or settings tables exist in the database.
- Checkout patterns to reuse: `app/api/create-booking-checkout/route.ts` and `create-walkin-checkout` build Stripe sessions with inline `price_data` (`unit_amount: Math.round(price * 100)`); no Stripe catalog sync needed.
- `app/api/webhook/route.ts` handles Stripe events with idempotency via the `processed_stripe_events` table.
- Admin CRUD patterns: `app/admin/services`, `app/admin/addons`, `app/admin/promo` — table + create/edit dialogs.
- Storage upload pattern: avatars bucket in `app/(dashboard)/dashboard/settings/setting.tsx` (`storage.from(...).upload` + `getPublicUrl`).
- Emails: Resend + `@react-email/render`, templates under `components/emails/` and `lib/email/`.
- Existing tables store prices as numeric dollars (`price: number`), not cents. New tables match.
- RLS uses an `is_admin()` helper (see `20260611010000_rls_tighten.sql`).
- `PRODUCT.md` currently marks the products storefront as unverified; this project confirms it.

## Scope

In scope:
- New tables: `products`, `product_orders`, `product_order_items`, `store_settings` + RLS + `product-images` storage bucket.
- Admin products CRUD page with image upload and a delivery-fee setting.
- Admin orders queue with status transitions and refund.
- Revived public `/products` page reading from the database, with cart and `/products/cart` checkout page (pickup vs delivery).
- `POST /api/products/checkout` route + webhook extension (`checkout.session.completed`, `checkout.session.expired`).
- Customer dashboard Orders page and `/products/success` page.
- Four transactional emails: order confirmation, ready for pickup, out for delivery, refund notice.
- Products link restored to the site navbar; Products + Orders links added to the admin sidebar.
- `PRODUCT.md` update confirming the store.

Out of scope:
- Guest checkout.
- Product reviews/ratings (no real review data exists; PRODUCT.md forbids fabricating any — the old mock's star UI and rating filter are removed, not rebuilt).
- Zone- or distance-based delivery pricing, delivery radius enforcement, free-over-$X thresholds.
- Multi-image galleries, product variants/SKUs, per-product sale scheduling.
- Restock-on-refund automation (staff adjust stock manually if needed).

## 1. Data model

New Supabase migration:

```sql
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null,
  price numeric(10,2) not null check (price >= 0),
  sale_price numeric(10,2) check (sale_price >= 0),
  image_url text,
  stock integer not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  status text not null default 'pending'
    check (status in ('pending','paid','ready_for_pickup','out_for_delivery','completed','cancelled','refunded')),
  fulfillment_method text not null check (fulfillment_method in ('pickup','delivery')),
  delivery_address jsonb,        -- Stripe shipping_details, delivery orders only
  phone text,                    -- collected by Stripe Checkout
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  stripe_session_id text,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.product_orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  name text not null,            -- snapshot at purchase time
  unit_price numeric(10,2) not null,  -- snapshot: sale_price if set, else price
  quantity integer not null check (quantity > 0)
);

create table public.store_settings (
  id integer primary key default 1 check (id = 1),  -- single row
  delivery_fee numeric(10,2) not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.store_settings (id) values (1);
```

Item rows snapshot `name` and `unit_price` so later product edits or deletions never corrupt order history. `product_id` is `on delete set null` for the same reason.

Statuses: `pending` (order created, Stripe session open) → `paid` (webhook) → `ready_for_pickup` **or** `out_for_delivery` (staff, per fulfillment method) → `completed`. Terminal side-states: `cancelled` (session expired/abandoned) and `refunded` (staff action).

### RLS

- `products`: `select` for everyone where `is_active = true`; admins (`is_admin()`) full read/write.
- `product_orders` / `product_order_items`: `select` own rows (`user_id = auth.uid()`, items via join); admins `select`/`update` all. No client `insert`/`delete` — writes happen in API routes and the webhook using the existing server client patterns.
- `store_settings`: `select` for everyone (the cart shows the delivery fee before checkout); admin-only writes.

### Storage

`product-images` bucket: public read, admin-only write. Upload from the admin dialog follows the avatars pattern; the resulting public URL is stored in `products.image_url`.

## 2. Customer flow

**Browse — `app/(user)/products/page.tsx`.** Remove `notFound()` and the hard-coded array; fetch active products from Supabase. Keep the existing UI: search, category filter (built from the distinct categories present), price-range slider (bounds from data), sort, grid/list toggle. Remove the rating filter and star display. `stock = 0` renders the card with a disabled "Out of stock" state (visible, not hidden). Restore the Products link in the site navbar.

**Cart.** A `ProductCartContext` (modeled on the existing self-service cart) persisted to localStorage: `{product_id, quantity}[]`. Cards get "Add to cart"; the navbar area shows a cart indicator with item count linking to `/products/cart`.

**`/products/cart`.** Line items with quantity steppers and remove buttons, then the fulfillment choice as a radio:
- **Pickup** — free; copy shows the store address (10410 S Main St) and "we'll email you when your order is ready."
- **Delivery** — shows the flat fee from `store_settings` as its own line.
Subtotal, delivery fee, and total are displayed. "Checkout" requires sign-in (existing login-redirect pattern; return to the cart afterwards).

**`POST /api/products/checkout`.** Auth-guarded. Body: `{ items: {product_id, quantity}[], fulfillment_method }`. The route:
1. Re-fetches each product server-side; rejects inactive/missing products and quantities exceeding stock (client prices are never trusted).
2. Computes unit prices (`sale_price ?? price`), subtotal, delivery fee (from `store_settings`, delivery only), total.
3. Inserts the `pending` order and its item snapshots.
4. Creates the Stripe Checkout session: one `price_data` line item per product plus a delivery-fee line when applicable; `metadata: { type: 'product_order', order_id }`; `phone_number_collection` enabled; `shipping_address_collection` (US) enabled for delivery orders — Stripe collects the address so we build no address form; success URL `/products/success`, cancel URL back to the cart.

**Webhook — extend `app/api/webhook/route.ts`.** Behind the existing idempotency guard:
- `checkout.session.completed` with `metadata.type === 'product_order'`: set order `paid`; store `stripe_payment_intent_id`, phone, and `shipping_details` (delivery); decrement each item's stock (floored at zero); send the confirmation email; clear nothing client-side (the success page clears the cart).
- `checkout.session.expired`: mark that order `cancelled` if still `pending`.

Stock decrements only on payment, so abandoned carts never consume inventory. The rare race (two buyers, last unit) is accepted: stock floors at zero and staff resolve via refund from the orders queue.

**Order tracking.** New `app/(dashboard)/dashboard/orders/page.tsx`: the customer's orders, newest first — status badge, items, totals, fulfillment method (and address for delivery). `app/(user)/products/success/page.tsx` confirms payment, clears the cart, and links to the dashboard orders page.

## 3. Admin flow

**`app/admin/products/page.tsx`.** Table of all products (thumbnail, name, category, price / sale price, stock, active toggle) with create/edit dialogs, following the services/add-ons admin pattern. Image upload to `product-images`. Deactivation is the primary "remove" action; hard delete remains available (snapshots protect order history). A settings card on this page edits `store_settings.delivery_fee`.

**`app/admin/orders/page.tsx`.** The fulfillment queue, filterable by status (default: needs action — `paid`, `ready_for_pickup`, `out_for_delivery`). Each order shows customer name/email/phone, items with quantities, totals, and fulfillment details — pickup orders show a "Mark ready for pickup" action; delivery orders show the delivery address and "Mark out for delivery"; both then offer "Mark completed." A refund action (with confirmation dialog) refunds the payment intent via Stripe and sets `refunded`. Status transitions and refunds go through admin API routes (existing admin-auth pattern), which also send the corresponding emails.

Both pages join the admin sidebar navigation.

## 4. Emails

Four templates (Resend + react-email, matching existing template structure):
1. **Order confirmation** — sent by the webhook on `paid`; itemized, with pickup instructions (address, hours) or delivery expectations per the order's method.
2. **Ready for pickup** — on `ready_for_pickup`.
3. **Out for delivery** — on `out_for_delivery`.
4. **Refund notice** — on `refunded`.

`completed` sends no email (the pickup/delivery notification already told the customer what matters).

## 5. Error handling

- Checkout route returns specific errors (`insufficient stock for X`, `product no longer available`); the cart page surfaces them per item and lets the customer adjust.
- Webhook handlers are idempotent (existing `processed_stripe_events` guard) and tolerate replays.
- `store_settings` missing row or zero fee → delivery is simply free; no crash.
- The products page renders a sensible empty state when no active products exist.

## 6. Testing

Vitest units:
- Checkout route: rejects unauthenticated requests; rejects over-stock and inactive products; uses server-side prices (ignores client tampering); includes the delivery fee only for delivery; creates order + item snapshots correctly.
- Webhook: `paid` transition with stock decrement; idempotent on replay; `expired` cancels only `pending` orders; stock floors at zero.
- Cart context: add/remove/quantity/persistence logic.

Manual E2E in Stripe test mode: pickup purchase, delivery purchase (address collected by Stripe), refund from the queue, status emails.

## 7. PRODUCT.md update

The "products storefront is unverified" caveats (Capabilities and Evidence sections) are replaced: the store is a confirmed retail line. Customer capabilities gain "browse and purchase car-care products with pickup or local delivery"; admin capabilities gain "products catalog and product-order fulfillment (pickup/delivery), delivery-fee setting." The old disabled-page note is dropped.
