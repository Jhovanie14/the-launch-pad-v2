# Product Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revive `/products` as a real store: DB-backed catalog managed from the admin console, cart checkout via Stripe with pickup or delivery, an admin fulfillment queue, and customer order tracking.

**Architecture:** Four new tables (`products`, `product_orders`, `product_order_items`, `store_settings`) + RLS + a `product-images` bucket. Order rows are created `pending` before Stripe Checkout; the existing webhook flips them to `paid`, decrements stock, and emails. Testable logic lives in `lib/products/**` (Vitest only includes `lib/**/*.test.ts`); routes and pages are thin glue following existing patterns.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (auth/DB/RLS/storage), Stripe Checkout + webhook, Resend emails, shadcn/ui, sonner toasts, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-12-product-store-design.md`. One correction discovered during planning: the webhook discriminates one-off payments on `metadata.payment_type` (taken values: `"new_booking"`, `"walkin_booking"`), NOT `metadata.type` as the spec sketched. This plan uses `payment_type: "product_order"`.

## Global Constraints

- Migrations are applied **manually via Supabase Dashboard → SQL Editor** (no local CLI; `supabase db push` is blocked — see `docs/superpowers/plans/2026-06-11-phase-1-security.md:1411`). Commit the migration file in the same commit.
- Prices are **numeric dollars** (`price: number`), converted to cents only at Stripe boundaries with `Math.round(x * 100)`.
- All RLS policies name roles explicitly (`to authenticated`, `to anon, authenticated`) and are preceded by `drop policy if exists` (idempotent, matching `20260611010000_rls_tighten.sql`).
- Admin browser pages mutate tables directly with the anon-key client — RLS is the security boundary. Order writes are server-side only (service role).
- Toasts are **sonner** (`import { toast } from "sonner"`). Admin/user layouts already mount `<Toaster />`.
- Emails follow the `lib/email/subscription-emails.ts` "Style B" (raw HTML + `emailWrapper`, `escapeHtml` for user data, **log errors, never throw**). From-address: `The Launch Pad Wash <noreply@thelaunchpadwash.com>`.
- Success/cancel URLs use `process.env.NEXT_PUBLIC_SITE_URL`.
- Vitest: `npm test` (`vitest run`); config only includes `lib/**/*.test.ts`, `environment: "node"`. Supabase is mocked with hand-rolled fake objects passed as arguments (see `lib/pricing/computeBookingAmount.test.ts:12-39`) — never `vi.mock()` of client modules.
- Store terminology in UI copy: "Pickup" / "Delivery"; store address `10410 S Main St, Houston, TX 77025`.
- Commit messages: conventional prefixes (`feat(db):`, `feat(products):`, …). **No Co-Authored-By trailer.**
- Windows dev machine; commands run in PowerShell or Git Bash — plain `git`/`npm` commands work in both.
- Do not touch the seasonal branding (snow effect, xmas logo) or the `filteredNavigation` hide-list in the admin sidebar.

## File Structure

**Create:**
- `supabase/migrations/20260812000000_product_store.sql` — tables, RLS, bucket, seed row
- `lib/products/cart.ts` + `cart.test.ts` — pure cart math (add/remove/clamp/totals/parse)
- `lib/products/checkout.ts` + `checkout.test.ts` — server-side pricing/validation + pending-order insert
- `lib/products/orderStatus.ts` + `orderStatus.test.ts` — status machine + next-action helper
- `lib/products/processProductOrder.ts` + `processProductOrder.test.ts` — webhook order completion/expiry
- `lib/email/product-order-emails.ts` + `product-order-emails.test.ts` — 4 senders + tested pure HTML helper
- `app/api/products/checkout/route.ts` — auth-guarded checkout session creation
- `app/api/admin/product-orders/update-status/route.ts` — admin status transitions + emails
- `app/api/admin/product-orders/refund/route.ts` — Stripe refund + email
- `context/product-cart-context.tsx` — thin provider over `lib/products/cart`
- `app/admin/products/page.tsx` + `products-view.tsx` — catalog CRUD + delivery-fee card
- `app/admin/orders/page.tsx` + `orders-view.tsx` — fulfillment queue
- `app/(user)/products/cart/page.tsx` — cart + fulfillment choice + checkout
- `app/(user)/products/success/page.tsx` + `clear-cart.tsx` — post-payment confirmation
- `app/(dashboard)/dashboard/orders/page.tsx` — customer order history

**Modify:**
- `types/database.types.ts` — hand-add 4 table types (precedent: commit `5b27dd8`)
- `types/db.ts` — row aliases
- `app/(user)/products/page.tsx` — remove `notFound()` + hardcoded array; fetch DB; add-to-cart
- `app/(user)/layout.tsx` — mount `ProductCartProvider`
- `components/user/navbar.tsx` — restore Products link (desktop + mobile) + cart indicator
- `components/user/authNavbar.tsx` — add Orders link (desktop `navLinks` + mobile JSX)
- `components/admin/sidebar.tsx` — add Products + Orders nav items
- `app/api/webhook/route.ts` — `product_order` branch + `checkout.session.expired` case
- `lib/email/subscription-emails.ts` — export `emailWrapper`, `BASE_STYLES`, `FROM`, `SITE_URL`
- `PRODUCT.md` — store confirmed

---

### Task 1: Database migration + types

**Files:**
- Create: `supabase/migrations/20260812000000_product_store.sql`
- Modify: `types/database.types.ts` (insert after the `processed_stripe_events` table block, before `profiles`)
- Modify: `types/db.ts`

**Interfaces:**
- Produces: tables `products`, `product_orders`, `product_order_items`, `store_settings`; storage bucket `product-images`; types `ProductRow`, `ProductOrderRow`, `ProductOrderItemRow`, `StoreSettingsRow` from `@/types/db`.

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/20260812000000_product_store.sql`:

```sql
-- Product store: catalog, orders, order items, store settings.
-- Problem: /products has been a hard-coded mock since launch and was disabled
-- entirely in e892c12 (notFound() at the top of the component). The business
-- now sells products for real: customers pay online via Stripe Checkout and
-- choose pickup at the store or local delivery. These tables back the revived
-- page, the admin catalog + fulfillment console, and the checkout/webhook flow.

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
  delivery_address jsonb,
  phone text,
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  stripe_session_id text,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.product_orders.status is
  'pending -> paid -> ready_for_pickup|out_for_delivery -> completed. Side states: cancelled (checkout session expired), refunded (staff action).';
comment on column public.product_orders.delivery_address is
  'Stripe Checkout shipping details (name + address object); null for pickup orders.';

create index product_orders_user_id_idx on public.product_orders (user_id);
create index product_orders_status_idx on public.product_orders (status);
create unique index product_orders_stripe_session_idx
  on public.product_orders (stripe_session_id) where stripe_session_id is not null;

create table public.product_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.product_orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  name text not null,
  unit_price numeric(10,2) not null,
  quantity integer not null check (quantity > 0)
);

comment on table public.product_order_items is
  'name and unit_price are snapshots taken at purchase time so later product edits/deletes never corrupt order history.';

create index product_order_items_order_id_idx on public.product_order_items (order_id);

-- Single-row site config for the store (flat delivery fee, admin-editable).
create table public.store_settings (
  id integer primary key default 1 check (id = 1),
  delivery_fee numeric(10,2) not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.store_settings (id) values (1);

-- ============================================================
-- RLS
-- ============================================================

alter table public.products enable row level security;
alter table public.product_orders enable row level security;
alter table public.product_order_items enable row level security;
alter table public.store_settings enable row level security;

-- products: anyone (signed-out included) browses active products; admins
-- manage the catalog from the browser client, so writes are policy-gated.
drop policy if exists "Anyone can read active products" on public.products;
create policy "Anyone can read active products" on public.products
  for select to anon, authenticated
  using (is_active = true);

drop policy if exists "Admins can read all products" on public.products;
create policy "Admins can read all products" on public.products
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products" on public.products
  for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products" on public.products
  for update to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products" on public.products
  for delete to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- store_settings: the cart shows the delivery fee before login, so reads are
-- public. Only admins may change it. No insert/delete policies: the single
-- row is seeded above and only the service role could add more.
drop policy if exists "Anyone can read store settings" on public.store_settings;
create policy "Anyone can read store settings" on public.store_settings
  for select to anon, authenticated
  using (true);

drop policy if exists "Admins can update store settings" on public.store_settings;
create policy "Admins can update store settings" on public.store_settings
  for update to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- product_orders: customers read their own; admins read all (the queue page
-- uses the browser client). ALL writes happen server-side (checkout route,
-- webhook, admin API routes) with the service-role key, which bypasses RLS —
-- so there are deliberately no insert/update/delete policies.
drop policy if exists "Users can read their own product orders" on public.product_orders;
create policy "Users can read their own product orders" on public.product_orders
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Admins can read all product orders" on public.product_orders;
create policy "Admins can read all product orders" on public.product_orders
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- product_order_items: readable when the parent order is readable.
drop policy if exists "Users can read their own order items" on public.product_order_items;
create policy "Users can read their own order items" on public.product_order_items
  for select to authenticated
  using (
    exists (
      select 1 from public.product_orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists "Admins can read all order items" on public.product_order_items;
create policy "Admins can read all order items" on public.product_order_items
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ============================================================
-- Storage: product-images bucket (public read, admin-only write)
-- ============================================================
-- No bucket has ever been created via migration in this repo (all were made
-- in the Dashboard), but bucket + policies are plain SQL and run fine in the
-- SQL Editor. If the storage.objects policies fail with an ownership error,
-- create the same three policies via Dashboard -> Storage -> Policies instead.

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins can update product images" on storage.objects;
create policy "Admins can update product images" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
```

- [ ] **Step 2: Apply via Supabase Dashboard → SQL Editor**

Paste the whole file into the SQL Editor and run it. If only the three `storage.objects` policies fail (ownership error), re-run everything above the storage section, then add those three policies through Dashboard → Storage → `product-images` → Policies (same conditions: admin-only insert/update/delete).

- [ ] **Step 3: Verify in SQL Editor**

```sql
select count(*) from public.products;                          -- 0 rows, no error
select delivery_fee from public.store_settings;                -- one row, 0.00
select polname from pg_policies where tablename = 'products';  -- 5 policies
select id, public from storage.buckets where id = 'product-images';  -- 1 row, public = true
```

- [ ] **Step 4: Hand-add the table types to `types/database.types.ts`**

Precedent: commit `5b27dd8` hand-edited this file surgically. Find the `processed_stripe_events: {` table block (~line 458), and insert the following **after its closing brace** (immediately before `profiles: {`). Keys are alphabetical within each block, matching generator output:

```ts
      product_order_items: {
        Row: {
          id: string
          name: string
          order_id: string
          product_id: string | null
          quantity: number
          unit_price: number
        }
        Insert: {
          id?: string
          name: string
          order_id: string
          product_id?: string | null
          quantity: number
          unit_price: number
        }
        Update: {
          id?: string
          name?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          unit_price?: number
        }
        Relationships: []
      }
      product_orders: {
        Row: {
          created_at: string
          delivery_address: Json | null
          delivery_fee: number
          fulfillment_method: string
          id: string
          phone: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_address?: Json | null
          delivery_fee?: number
          fulfillment_method: string
          id?: string
          phone?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal: number
          total: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_address?: Json | null
          delivery_fee?: number
          fulfillment_method?: string
          id?: string
          phone?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          sale_price: number | null
          stock: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price: number
          sale_price?: number | null
          stock?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          sale_price?: number | null
          stock?: number
          updated_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          delivery_fee: number
          id: number
          updated_at: string
        }
        Insert: {
          delivery_fee?: number
          id?: number
          updated_at?: string
        }
        Update: {
          delivery_fee?: number
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
```

- [ ] **Step 5: Add row aliases to `types/db.ts`**

Append after the existing `*Row` exports, following the file's convention:

```ts
export type ProductRow = Tables["products"]["Row"];
export type ProductOrderRow = Tables["product_orders"]["Row"];
export type ProductOrderItemRow = Tables["product_order_items"]["Row"];
export type StoreSettingsRow = Tables["store_settings"]["Row"];
```

- [ ] **Step 6: Sanity-check types compile**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: no NEW errors mentioning `types/database.types.ts` or `types/db.ts` (the build ignores TS errors, but don't introduce any here).

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260812000000_product_store.sql types/database.types.ts types/db.ts
git commit -m "feat(db): add product store tables, RLS, and product-images bucket"
```

---

### Task 2: Cart logic (`lib/products/cart.ts`)

Pure functions only — the React context (Task 9) is a thin wrapper. This keeps cart math inside Vitest's `lib/**` include.

**Files:**
- Create: `lib/products/cart.ts`
- Test: `lib/products/cart.test.ts`

**Interfaces:**
- Produces: `CartItem { productId: string; quantity: number }`, `PRODUCT_CART_STORAGE_KEY = "productCart"`, `addItem(items, productId, quantity?, maxStock?)`, `removeItem(items, productId)`, `setQuantity(items, productId, quantity, maxStock?)`, `itemCount(items)`, `readCart(raw: string | null): CartItem[]`, `unitPrice(p: {price: number; sale_price: number | null}): number`, `round2(n: number): number`, `cartTotals(items, products, deliveryFee, method): { subtotal: number; deliveryFee: number; total: number }`. All functions return new arrays (no mutation).

- [ ] **Step 1: Write the failing tests**

Create `lib/products/cart.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  addItem,
  cartTotals,
  itemCount,
  readCart,
  removeItem,
  setQuantity,
  unitPrice,
} from "./cart";

const shampoo = { id: "p1", price: 24.99, sale_price: 14.99 };
const wax = { id: "p2", price: 39.99, sale_price: null };

describe("addItem", () => {
  it("adds a new item with the given quantity", () => {
    expect(addItem([], "p1", 2)).toEqual([{ productId: "p1", quantity: 2 }]);
  });

  it("merges quantity into an existing line", () => {
    const items = addItem([{ productId: "p1", quantity: 1 }], "p1", 2);
    expect(items).toEqual([{ productId: "p1", quantity: 3 }]);
  });

  it("clamps to maxStock when provided", () => {
    const items = addItem([{ productId: "p1", quantity: 4 }], "p1", 3, 5);
    expect(items).toEqual([{ productId: "p1", quantity: 5 }]);
  });

  it("does not mutate the input array", () => {
    const input = [{ productId: "p1", quantity: 1 }];
    addItem(input, "p1", 1);
    expect(input).toEqual([{ productId: "p1", quantity: 1 }]);
  });
});

describe("removeItem / setQuantity", () => {
  it("removes a line", () => {
    expect(removeItem([{ productId: "p1", quantity: 1 }], "p1")).toEqual([]);
  });

  it("setQuantity replaces the quantity", () => {
    expect(setQuantity([{ productId: "p1", quantity: 1 }], "p1", 4)).toEqual([
      { productId: "p1", quantity: 4 },
    ]);
  });

  it("setQuantity to 0 or less removes the line", () => {
    expect(setQuantity([{ productId: "p1", quantity: 2 }], "p1", 0)).toEqual([]);
  });

  it("setQuantity clamps to maxStock", () => {
    expect(setQuantity([{ productId: "p1", quantity: 1 }], "p1", 99, 3)).toEqual(
      [{ productId: "p1", quantity: 3 }],
    );
  });
});

describe("itemCount / readCart", () => {
  it("sums quantities", () => {
    expect(
      itemCount([
        { productId: "p1", quantity: 2 },
        { productId: "p2", quantity: 3 },
      ]),
    ).toBe(5);
  });

  it("readCart parses a valid payload", () => {
    expect(readCart(JSON.stringify([{ productId: "p1", quantity: 2 }]))).toEqual(
      [{ productId: "p1", quantity: 2 }],
    );
  });

  it("readCart returns [] for null, garbage, or malformed entries", () => {
    expect(readCart(null)).toEqual([]);
    expect(readCart("not json {")).toEqual([]);
    expect(readCart(JSON.stringify({ nope: true }))).toEqual([]);
    expect(
      readCart(JSON.stringify([{ productId: "p1", quantity: "two" }])),
    ).toEqual([]);
    expect(readCart(JSON.stringify([{ productId: "p1", quantity: 0 }]))).toEqual(
      [],
    );
  });
});

describe("pricing", () => {
  it("unitPrice prefers sale_price when set", () => {
    expect(unitPrice(shampoo)).toBe(14.99);
    expect(unitPrice(wax)).toBe(39.99);
  });

  it("cartTotals sums lines and adds the fee only for delivery", () => {
    const items = [
      { productId: "p1", quantity: 2 }, // 2 x 14.99 = 29.98
      { productId: "p2", quantity: 1 }, // 39.99
    ];
    const products = [shampoo, wax];

    const pickup = cartTotals(items, products, 7.5, "pickup");
    expect(pickup).toEqual({ subtotal: 69.97, deliveryFee: 0, total: 69.97 });

    const delivery = cartTotals(items, products, 7.5, "delivery");
    expect(delivery).toEqual({ subtotal: 69.97, deliveryFee: 7.5, total: 77.47 });
  });

  it("cartTotals skips items whose product is missing", () => {
    const totals = cartTotals(
      [{ productId: "ghost", quantity: 3 }],
      [shampoo],
      5,
      "pickup",
    );
    expect(totals).toEqual({ subtotal: 0, deliveryFee: 0, total: 0 });
  });

  it("rounds to cents", () => {
    // 3 x 19.99 = 59.97 exactly; float drift must not leak through
    const totals = cartTotals(
      [{ productId: "p3", quantity: 3 }],
      [{ id: "p3", price: 19.99, sale_price: null }],
      0,
      "pickup",
    );
    expect(totals.subtotal).toBe(59.97);
    expect(totals.total).toBe(59.97);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/products/cart.test.ts`
Expected: FAIL — cannot resolve `./cart`.

- [ ] **Step 3: Implement `lib/products/cart.ts`**

```ts
// Pure cart math for the product store. The React provider
// (context/product-cart-context.tsx) and the checkout API both build on these
// so the logic stays inside Vitest's lib/** include.

export interface CartItem {
  productId: string;
  quantity: number;
}

export const PRODUCT_CART_STORAGE_KEY = "productCart";

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function unitPrice(p: { price: number; sale_price: number | null }): number {
  return p.sale_price ?? p.price;
}

function clamp(quantity: number, maxStock?: number): number {
  return maxStock === undefined ? quantity : Math.min(quantity, maxStock);
}

export function addItem(
  items: CartItem[],
  productId: string,
  quantity = 1,
  maxStock?: number,
): CartItem[] {
  const existing = items.find((i) => i.productId === productId);
  if (!existing) {
    return [...items, { productId, quantity: clamp(quantity, maxStock) }];
  }
  return items.map((i) =>
    i.productId === productId
      ? { ...i, quantity: clamp(i.quantity + quantity, maxStock) }
      : i,
  );
}

export function removeItem(items: CartItem[], productId: string): CartItem[] {
  return items.filter((i) => i.productId !== productId);
}

export function setQuantity(
  items: CartItem[],
  productId: string,
  quantity: number,
  maxStock?: number,
): CartItem[] {
  if (quantity <= 0) return removeItem(items, productId);
  return items.map((i) =>
    i.productId === productId ? { ...i, quantity: clamp(quantity, maxStock) } : i,
  );
}

export function itemCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

/** Safe parse of the localStorage payload: anything malformed becomes []. */
export function readCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.every(
      (i) =>
        i &&
        typeof i.productId === "string" &&
        typeof i.quantity === "number" &&
        Number.isInteger(i.quantity) &&
        i.quantity > 0,
    );
    if (!valid) return [];
    return parsed.map((i) => ({ productId: i.productId, quantity: i.quantity }));
  } catch {
    return [];
  }
}

export function cartTotals(
  items: CartItem[],
  products: Array<{ id: string; price: number; sale_price: number | null }>,
  deliveryFee: number,
  method: "pickup" | "delivery",
): { subtotal: number; deliveryFee: number; total: number } {
  const subtotal = round2(
    items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return sum;
      return sum + unitPrice(product) * item.quantity;
    }, 0),
  );
  const fee = method === "delivery" ? round2(deliveryFee) : 0;
  return { subtotal, deliveryFee: fee, total: round2(subtotal + fee) };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/products/cart.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add lib/products/cart.ts lib/products/cart.test.ts
git commit -m "feat(products): add pure cart math with tests"
```

---

### Task 3: Server-side order pricing + pending-order creation (`lib/products/checkout.ts`)

**Files:**
- Create: `lib/products/checkout.ts`
- Test: `lib/products/checkout.test.ts`

**Interfaces:**
- Consumes: `CartItem`, `unitPrice`, `round2` from `./cart`; `ApiError` from `@/lib/http/apiError`.
- Produces:
  - `FulfillmentMethod = "pickup" | "delivery"`
  - `PricedOrderItem { product_id: string; name: string; unit_price: number; quantity: number }`
  - `PricedOrder { items: PricedOrderItem[]; subtotal: number; deliveryFee: number; total: number }`
  - `priceOrder(db, items: CartItem[], fulfillmentMethod: string): Promise<PricedOrder>` — throws `ApiError(400)` on empty cart, bad method, bad quantity, unknown/inactive product, or insufficient stock (message names the product and remaining stock).
  - `createPendingOrder(db, args: { userId: string; fulfillmentMethod: FulfillmentMethod; priced: PricedOrder }): Promise<{ orderId: string }>` — inserts the order row (status `pending`) + item snapshots; deletes the order row if item insert fails, then rethrows.
- `db` is a Supabase client passed as an argument (service-role in production, fake in tests), the `computeBookingAmount` pattern.

- [ ] **Step 1: Write the failing tests**

Create `lib/products/checkout.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createPendingOrder, priceOrder } from "./checkout";

const PRODUCTS = [
  { id: "p1", name: "Tire Shine Pro", price: 29.99, sale_price: 19.99, stock: 10, is_active: true },
  { id: "p2", name: "Ceramic Wax", price: 39.99, sale_price: null, stock: 2, is_active: true },
  { id: "p3", name: "Old Formula", price: 9.99, sale_price: null, stock: 5, is_active: false },
];

/** Minimal fake Supabase resolving reads from fixtures (computeBookingAmount pattern). */
function fakeDb(opts: {
  products?: typeof PRODUCTS;
  deliveryFee?: number | null; // null = no settings row
  orderId?: string;
  itemInsertError?: boolean;
}) {
  const calls: { orderInserts: any[]; itemInserts: any[]; orderDeletes: string[] } = {
    orderInserts: [],
    itemInserts: [],
    orderDeletes: [],
  };
  const db = {
    from(table: string) {
      if (table === "products") {
        return {
          select: () => ({
            in: async (_col: string, ids: string[]) => ({
              data: (opts.products ?? PRODUCTS).filter((p) => ids.includes(p.id)),
              error: null,
            }),
          }),
        };
      }
      if (table === "store_settings") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: opts.deliveryFee == null ? null : { delivery_fee: opts.deliveryFee },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "product_orders") {
        return {
          insert: (row: any) => {
            calls.orderInserts.push(row);
            return {
              select: () => ({
                single: async () => ({
                  data: { id: opts.orderId ?? "order-1" },
                  error: null,
                }),
              }),
            };
          },
          delete: () => ({
            eq: async (_col: string, id: string) => {
              calls.orderDeletes.push(id);
              return { error: null };
            },
          }),
        };
      }
      if (table === "product_order_items") {
        return {
          insert: async (rows: any[]) => {
            calls.itemInserts.push(rows);
            return {
              error: opts.itemInsertError ? { message: "boom" } : null,
            };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as any;
  return { db, calls };
}

describe("priceOrder validation", () => {
  it("rejects an empty cart", async () => {
    const { db } = fakeDb({});
    await expect(priceOrder(db, [], "pickup")).rejects.toMatchObject({ status: 400 });
  });

  it("rejects an unknown fulfillment method", async () => {
    const { db } = fakeDb({});
    await expect(
      priceOrder(db, [{ productId: "p1", quantity: 1 }], "teleport"),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects non-integer or non-positive quantities", async () => {
    const { db } = fakeDb({});
    await expect(
      priceOrder(db, [{ productId: "p1", quantity: 1.5 }], "pickup"),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      priceOrder(db, [{ productId: "p1", quantity: 0 }], "pickup"),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects unknown and inactive products", async () => {
    const { db } = fakeDb({});
    await expect(
      priceOrder(db, [{ productId: "ghost", quantity: 1 }], "pickup"),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      priceOrder(db, [{ productId: "p3", quantity: 1 }], "pickup"),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects quantities above stock, naming the product", async () => {
    const { db } = fakeDb({});
    await expect(
      priceOrder(db, [{ productId: "p2", quantity: 3 }], "pickup"),
    ).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("Ceramic Wax"),
    });
  });
});

describe("priceOrder totals", () => {
  it("uses sale price when set and full price otherwise", async () => {
    const { db } = fakeDb({ deliveryFee: 7.5 });
    const priced = await priceOrder(
      db,
      [
        { productId: "p1", quantity: 2 }, // 2 x 19.99
        { productId: "p2", quantity: 1 }, // 39.99
      ],
      "pickup",
    );
    expect(priced.subtotal).toBe(79.97);
    expect(priced.deliveryFee).toBe(0);
    expect(priced.total).toBe(79.97);
    expect(priced.items).toEqual([
      { product_id: "p1", name: "Tire Shine Pro", unit_price: 19.99, quantity: 2 },
      { product_id: "p2", name: "Ceramic Wax", unit_price: 39.99, quantity: 1 },
    ]);
  });

  it("adds the delivery fee from store_settings for delivery orders", async () => {
    const { db } = fakeDb({ deliveryFee: 7.5 });
    const priced = await priceOrder(db, [{ productId: "p2", quantity: 1 }], "delivery");
    expect(priced.deliveryFee).toBe(7.5);
    expect(priced.total).toBe(47.49);
  });

  it("treats a missing settings row as free delivery", async () => {
    const { db } = fakeDb({ deliveryFee: null });
    const priced = await priceOrder(db, [{ productId: "p2", quantity: 1 }], "delivery");
    expect(priced.deliveryFee).toBe(0);
    expect(priced.total).toBe(39.99);
  });
});

describe("createPendingOrder", () => {
  const priced = {
    items: [{ product_id: "p1", name: "Tire Shine Pro", unit_price: 19.99, quantity: 2 }],
    subtotal: 39.98,
    deliveryFee: 7.5,
    total: 47.48,
  };

  it("inserts the order row and item snapshots", async () => {
    const { db, calls } = fakeDb({ orderId: "order-9", deliveryFee: 7.5 });
    const result = await createPendingOrder(db, {
      userId: "user-1",
      fulfillmentMethod: "delivery",
      priced,
    });
    expect(result).toEqual({ orderId: "order-9" });
    expect(calls.orderInserts[0]).toMatchObject({
      user_id: "user-1",
      status: "pending",
      fulfillment_method: "delivery",
      subtotal: 39.98,
      delivery_fee: 7.5,
      total: 47.48,
    });
    expect(calls.itemInserts[0]).toEqual([
      {
        order_id: "order-9",
        product_id: "p1",
        name: "Tire Shine Pro",
        unit_price: 19.99,
        quantity: 2,
      },
    ]);
  });

  it("deletes the order row and rethrows when item insert fails", async () => {
    const { db, calls } = fakeDb({ orderId: "order-9", itemInsertError: true });
    await expect(
      createPendingOrder(db, { userId: "user-1", fulfillmentMethod: "pickup", priced }),
    ).rejects.toBeTruthy();
    expect(calls.orderDeletes).toEqual(["order-9"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/products/checkout.test.ts`
Expected: FAIL — cannot resolve `./checkout`.

- [ ] **Step 3: Implement `lib/products/checkout.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/http/apiError";
import { round2, unitPrice, type CartItem } from "./cart";

export type FulfillmentMethod = "pickup" | "delivery";

export interface PricedOrderItem {
  product_id: string;
  name: string;
  unit_price: number;
  quantity: number;
}

export interface PricedOrder {
  items: PricedOrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

/**
 * Re-price the cart entirely from the database — client prices are never
 * trusted. Throws ApiError(400) with a customer-readable message on any
 * problem so the cart page can surface it directly.
 */
export async function priceOrder(
  db: SupabaseClient,
  items: CartItem[],
  fulfillmentMethod: string,
): Promise<PricedOrder> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError("Your cart is empty", 400);
  }
  if (fulfillmentMethod !== "pickup" && fulfillmentMethod !== "delivery") {
    throw new ApiError("Choose pickup or delivery", 400);
  }
  for (const item of items) {
    if (
      !item ||
      typeof item.productId !== "string" ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1
    ) {
      throw new ApiError("Invalid cart item", 400);
    }
  }

  const ids = items.map((i) => i.productId);
  const { data: products, error } = await db
    .from("products")
    .select("id, name, price, sale_price, stock, is_active")
    .in("id", ids);
  if (error) throw new ApiError("Could not load products", 500);

  const priced: PricedOrderItem[] = items.map((item) => {
    const product = products?.find((p) => p.id === item.productId);
    if (!product || !product.is_active) {
      throw new ApiError("A product in your cart is no longer available", 400);
    }
    if (item.quantity > product.stock) {
      throw new ApiError(
        `Not enough stock for ${product.name} — only ${product.stock} left`,
        400,
      );
    }
    return {
      product_id: product.id,
      name: product.name,
      unit_price: unitPrice(product),
      quantity: item.quantity,
    };
  });

  const subtotal = round2(
    priced.reduce((sum, i) => sum + i.unit_price * i.quantity, 0),
  );

  let deliveryFee = 0;
  if (fulfillmentMethod === "delivery") {
    const { data: settings } = await db
      .from("store_settings")
      .select("delivery_fee")
      .eq("id", 1)
      .maybeSingle();
    deliveryFee = round2(settings?.delivery_fee ?? 0);
  }

  return { items: priced, subtotal, deliveryFee, total: round2(subtotal + deliveryFee) };
}

/** Insert the pending order + item snapshots. Cleans up the order row if the
 * item insert fails so no headless orders linger. */
export async function createPendingOrder(
  db: SupabaseClient,
  args: { userId: string; fulfillmentMethod: FulfillmentMethod; priced: PricedOrder },
): Promise<{ orderId: string }> {
  const { data: order, error: orderError } = await db
    .from("product_orders")
    .insert({
      user_id: args.userId,
      status: "pending",
      fulfillment_method: args.fulfillmentMethod,
      subtotal: args.priced.subtotal,
      delivery_fee: args.priced.deliveryFee,
      total: args.priced.total,
    })
    .select()
    .single();
  if (orderError || !order) {
    throw new ApiError("Could not create the order", 500);
  }

  const { error: itemsError } = await db.from("product_order_items").insert(
    args.priced.items.map((i) => ({
      order_id: order.id,
      product_id: i.product_id,
      name: i.name,
      unit_price: i.unit_price,
      quantity: i.quantity,
    })),
  );
  if (itemsError) {
    await db.from("product_orders").delete().eq("id", order.id);
    throw new ApiError("Could not create the order", 500);
  }

  return { orderId: order.id };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/products/checkout.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add lib/products/checkout.ts lib/products/checkout.test.ts
git commit -m "feat(products): server-side order pricing and pending-order creation"
```

---

### Task 4: Order status machine (`lib/products/orderStatus.ts`)

**Files:**
- Create: `lib/products/orderStatus.ts`
- Test: `lib/products/orderStatus.test.ts`

**Interfaces:**
- Produces:
  - `PRODUCT_ORDER_STATUSES` (const array) and `ProductOrderStatus` union type
  - `canTransition(from: string, to: string, method: "pickup" | "delivery"): boolean`
  - `nextActionFor(order: { status: string; fulfillment_method: string }): { to: ProductOrderStatus; label: string } | null` — the single advance button the admin queue shows
  - `orderStatusLabel(status: string): string` — display text ("Ready for pickup", …)
- Used by: admin update-status route (Task 12) to validate, admin queue (Task 13) and dashboard orders (Task 11) for buttons/badges.

- [ ] **Step 1: Write the failing tests**

Create `lib/products/orderStatus.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { canTransition, nextActionFor, orderStatusLabel } from "./orderStatus";

describe("canTransition", () => {
  it("follows the pickup path", () => {
    expect(canTransition("pending", "paid", "pickup")).toBe(true);
    expect(canTransition("paid", "ready_for_pickup", "pickup")).toBe(true);
    expect(canTransition("ready_for_pickup", "completed", "pickup")).toBe(true);
  });

  it("follows the delivery path", () => {
    expect(canTransition("paid", "out_for_delivery", "delivery")).toBe(true);
    expect(canTransition("out_for_delivery", "completed", "delivery")).toBe(true);
  });

  it("blocks the wrong fulfillment branch", () => {
    expect(canTransition("paid", "out_for_delivery", "pickup")).toBe(false);
    expect(canTransition("paid", "ready_for_pickup", "delivery")).toBe(false);
  });

  it("allows refund from paid and both in-progress states", () => {
    expect(canTransition("paid", "refunded", "pickup")).toBe(true);
    expect(canTransition("ready_for_pickup", "refunded", "pickup")).toBe(true);
    expect(canTransition("out_for_delivery", "refunded", "delivery")).toBe(true);
  });

  it("blocks transitions out of terminal states and skips", () => {
    expect(canTransition("completed", "refunded", "pickup")).toBe(false);
    expect(canTransition("cancelled", "paid", "pickup")).toBe(false);
    expect(canTransition("refunded", "completed", "delivery")).toBe(false);
    expect(canTransition("pending", "completed", "pickup")).toBe(false);
    expect(canTransition("paid", "completed", "pickup")).toBe(false);
  });
});

describe("nextActionFor", () => {
  it("offers the fulfillment-specific step from paid", () => {
    expect(nextActionFor({ status: "paid", fulfillment_method: "pickup" })).toEqual({
      to: "ready_for_pickup",
      label: "Mark ready for pickup",
    });
    expect(nextActionFor({ status: "paid", fulfillment_method: "delivery" })).toEqual({
      to: "out_for_delivery",
      label: "Mark out for delivery",
    });
  });

  it("offers completion from in-progress states", () => {
    expect(
      nextActionFor({ status: "ready_for_pickup", fulfillment_method: "pickup" }),
    ).toEqual({ to: "completed", label: "Mark completed" });
    expect(
      nextActionFor({ status: "out_for_delivery", fulfillment_method: "delivery" }),
    ).toEqual({ to: "completed", label: "Mark completed" });
  });

  it("returns null for pending and terminal states", () => {
    expect(nextActionFor({ status: "pending", fulfillment_method: "pickup" })).toBeNull();
    expect(nextActionFor({ status: "completed", fulfillment_method: "pickup" })).toBeNull();
    expect(nextActionFor({ status: "refunded", fulfillment_method: "delivery" })).toBeNull();
    expect(nextActionFor({ status: "cancelled", fulfillment_method: "pickup" })).toBeNull();
  });
});

describe("orderStatusLabel", () => {
  it("maps statuses to display text", () => {
    expect(orderStatusLabel("ready_for_pickup")).toBe("Ready for pickup");
    expect(orderStatusLabel("out_for_delivery")).toBe("Out for delivery");
    expect(orderStatusLabel("paid")).toBe("Paid");
    expect(orderStatusLabel("weird")).toBe("weird");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/products/orderStatus.test.ts`
Expected: FAIL — cannot resolve `./orderStatus`.

- [ ] **Step 3: Implement `lib/products/orderStatus.ts`**

```ts
// Product-order status machine.
// pending -> paid -> ready_for_pickup | out_for_delivery -> completed
// Side states: cancelled (checkout expired), refunded (staff action).

export const PRODUCT_ORDER_STATUSES = [
  "pending",
  "paid",
  "ready_for_pickup",
  "out_for_delivery",
  "completed",
  "cancelled",
  "refunded",
] as const;

export type ProductOrderStatus = (typeof PRODUCT_ORDER_STATUSES)[number];

const LABELS: Record<ProductOrderStatus, string> = {
  pending: "Pending payment",
  paid: "Paid",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export function orderStatusLabel(status: string): string {
  return LABELS[status as ProductOrderStatus] ?? status;
}

export function canTransition(
  from: string,
  to: string,
  method: "pickup" | "delivery",
): boolean {
  switch (from) {
    case "pending":
      return to === "paid" || to === "cancelled";
    case "paid":
      if (to === "refunded") return true;
      if (to === "ready_for_pickup") return method === "pickup";
      if (to === "out_for_delivery") return method === "delivery";
      return false;
    case "ready_for_pickup":
    case "out_for_delivery":
      return to === "completed" || to === "refunded";
    default:
      return false; // completed, cancelled, refunded are terminal
  }
}

export function nextActionFor(order: {
  status: string;
  fulfillment_method: string;
}): { to: ProductOrderStatus; label: string } | null {
  if (order.status === "paid") {
    return order.fulfillment_method === "delivery"
      ? { to: "out_for_delivery", label: "Mark out for delivery" }
      : { to: "ready_for_pickup", label: "Mark ready for pickup" };
  }
  if (order.status === "ready_for_pickup" || order.status === "out_for_delivery") {
    return { to: "completed", label: "Mark completed" };
  }
  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/products/orderStatus.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/products/orderStatus.ts lib/products/orderStatus.test.ts
git commit -m "feat(products): order status machine with transition guards"
```

---

### Task 5: Product-order emails (`lib/email/product-order-emails.ts`)

Follow "Style B" (`lib/email/subscription-emails.ts`): raw HTML through the shared `emailWrapper`, `escapeHtml` on all user data, **log-don't-throw** sends. First export the shared helpers from `subscription-emails.ts` instead of duplicating them.

**Files:**
- Modify: `lib/email/subscription-emails.ts` (add `export` keywords only)
- Create: `lib/email/product-order-emails.ts`
- Test: `lib/email/product-order-emails.test.ts`

**Interfaces:**
- Consumes: `emailWrapper(headerBg, headerContent, bodyContent)`, `FROM`, `SITE_URL` from `./subscription-emails`; `escapeHtml` from `./escapeHtml`.
- Produces:
  - `orderItemsRowsHtml(items: Array<{ name: string; quantity: number; unit_price: number }>): string` — pure, tested
  - `sendProductOrderConfirmationEmail({ to, name, orderId, items, subtotal, deliveryFee, total, fulfillmentMethod })`
  - `sendProductOrderReadyForPickupEmail({ to, name, orderId })`
  - `sendProductOrderOutForDeliveryEmail({ to, name, orderId })`
  - `sendProductOrderRefundedEmail({ to, name, orderId, total })`
  - `STORE_ADDRESS = "10410 S Main St, Houston, TX 77025"`
- All senders resolve void and never throw (errors are `console.error`-logged), so webhook/admin routes can't be failed by Resend.

- [ ] **Step 1: Export the shared helpers from `subscription-emails.ts`**

In `lib/email/subscription-emails.ts`, add `export` to the existing declarations (no other changes):
- `const FROM = ...` (line ~16) → `export const FROM = ...`
- `const SITE_URL = ...` (line ~17) → `export const SITE_URL = ...`
- `function emailWrapper(...)` (line ~39) → `export function emailWrapper(...)`

Run: `npm test` — expected: still green (nothing imports these yet).

- [ ] **Step 2: Write the failing test for the pure helper**

Create `lib/email/product-order-emails.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { orderItemsRowsHtml } from "./product-order-emails";

describe("orderItemsRowsHtml", () => {
  it("renders one row per item with quantity and line total", () => {
    const html = orderItemsRowsHtml([
      { name: "Tire Shine Pro", quantity: 2, unit_price: 19.99 },
      { name: "Ceramic Wax", quantity: 1, unit_price: 39.99 },
    ]);
    expect(html).toContain("Tire Shine Pro");
    expect(html).toContain("&times;2"); // quantity marker (HTML entity for email clients)
    expect(html).toContain("$39.98"); // 2 x 19.99
    expect(html).toContain("$39.99");
  });

  it("escapes HTML in product names", () => {
    const html = orderItemsRowsHtml([
      { name: `<img src=x onerror=alert(1)>`, quantity: 1, unit_price: 5 },
    ]);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run lib/email/product-order-emails.test.ts`
Expected: FAIL — cannot resolve `./product-order-emails`.

- [ ] **Step 4: Implement `lib/email/product-order-emails.ts`**

```ts
import { Resend } from "resend";
import { escapeHtml } from "./escapeHtml";
import { emailWrapper, FROM, SITE_URL } from "./subscription-emails";

const resend = new Resend(process.env.RESEND_API_KEY);

export const STORE_ADDRESS = "10410 S Main St, Houston, TX 77025";

interface OrderEmailItem {
  name: string;
  quantity: number;
  unit_price: number;
}

/** Table rows for the itemized order summary. Pure so it can be unit tested. */
export function orderItemsRowsHtml(items: OrderEmailItem[]): string {
  return items
    .map(
      (i) => `
        <tr>
          <td style="padding:6px 0;">${escapeHtml(i.name)} <span style="color:#6b7280;">&times;${i.quantity}</span></td>
          <td style="padding:6px 0; text-align:right;">$${(i.unit_price * i.quantity).toFixed(2)}</td>
        </tr>`,
    )
    .join("");
}

function orderSummaryCard(args: {
  items: OrderEmailItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}): string {
  const feeRow =
    args.deliveryFee > 0
      ? `<tr><td style="padding:6px 0; color:#6b7280;">Delivery fee</td><td style="padding:6px 0; text-align:right;">$${args.deliveryFee.toFixed(2)}</td></tr>`
      : "";
  return `
    <div class="card">
      <table role="presentation" width="100%" style="border-collapse:collapse;">
        ${orderItemsRowsHtml(args.items)}
        <tr><td colspan="2" style="border-top:1px solid #e5e7eb; padding:0;"></td></tr>
        <tr><td style="padding:6px 0; color:#6b7280;">Subtotal</td><td style="padding:6px 0; text-align:right;">$${args.subtotal.toFixed(2)}</td></tr>
        ${feeRow}
        <tr><td style="padding:6px 0; font-weight:bold;">Total</td><td style="padding:6px 0; text-align:right; font-weight:bold;">$${args.total.toFixed(2)}</td></tr>
      </table>
    </div>`;
}

async function send(to: string, subject: string, html: string, label: string) {
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) console.error(`[email] ${label} send error:`, error);
  else console.log(`[email] ${label} email sent to:`, to);
}

export async function sendProductOrderConfirmationEmail(args: {
  to: string;
  name: string;
  orderId: string;
  items: OrderEmailItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  fulfillmentMethod: "pickup" | "delivery";
}) {
  const isDelivery = args.fulfillmentMethod === "delivery";
  const header = `<h1 style="margin:0; font-size:24px;">Order confirmed 🎉</h1>`;
  const nextStep = isDelivery
    ? `<p>We're getting your order ready. You'll get another email when it's <strong>out for delivery</strong>.</p>`
    : `<p>We're getting your order ready. You'll get another email when it's <strong>ready for pickup</strong> at:</p>
       <p style="font-weight:bold;">${STORE_ADDRESS}</p>`;
  const body = `
    <p>Hi ${escapeHtml(args.name)},</p>
    <p>Thanks for your purchase! Here's what you ordered:</p>
    ${orderSummaryCard(args)}
    ${nextStep}
    <p><a class="btn" style="background:#1e3a8a; color:#ffffff;" href="${SITE_URL}/dashboard/orders">View your orders</a></p>
    <p style="color:#6b7280; font-size:13px;">Order ID: ${escapeHtml(args.orderId)}</p>`;
  await send(
    args.to,
    "✅ Your Launch Pad order is confirmed",
    emailWrapper("linear-gradient(135deg,#16a34a 0%,#15803d 100%)", header, body),
    "product order confirmation",
  );
}

export async function sendProductOrderReadyForPickupEmail(args: {
  to: string;
  name: string;
  orderId: string;
}) {
  const header = `<h1 style="margin:0; font-size:24px;">Ready for pickup 📦</h1>`;
  const body = `
    <p>Hi ${escapeHtml(args.name)},</p>
    <p>Your order is ready! Come grab it whenever suits you at:</p>
    <p style="font-weight:bold;">${STORE_ADDRESS}</p>
    <p style="color:#6b7280; font-size:13px;">Order ID: ${escapeHtml(args.orderId)}</p>`;
  await send(
    args.to,
    "📦 Your Launch Pad order is ready for pickup",
    emailWrapper("linear-gradient(135deg,#1e3a8a 0%,#1e40af 100%)", header, body),
    "ready for pickup",
  );
}

export async function sendProductOrderOutForDeliveryEmail(args: {
  to: string;
  name: string;
  orderId: string;
}) {
  const header = `<h1 style="margin:0; font-size:24px;">Out for delivery 🚚</h1>`;
  const body = `
    <p>Hi ${escapeHtml(args.name)},</p>
    <p>Your order is on its way to the address you gave at checkout.</p>
    <p style="color:#6b7280; font-size:13px;">Order ID: ${escapeHtml(args.orderId)}</p>`;
  await send(
    args.to,
    "🚚 Your Launch Pad order is out for delivery",
    emailWrapper("linear-gradient(135deg,#1e3a8a 0%,#1e40af 100%)", header, body),
    "out for delivery",
  );
}

export async function sendProductOrderRefundedEmail(args: {
  to: string;
  name: string;
  orderId: string;
  total: number;
}) {
  const header = `<h1 style="margin:0; font-size:24px;">Order refunded</h1>`;
  const body = `
    <p>Hi ${escapeHtml(args.name)},</p>
    <p>We've refunded <strong>$${args.total.toFixed(2)}</strong> for your order. Depending on your bank it can take 5&ndash;10 business days to appear.</p>
    <p>If you have any questions, just reply to this email or call us at (832) 219-8320.</p>
    <p style="color:#6b7280; font-size:13px;">Order ID: ${escapeHtml(args.orderId)}</p>`;
  await send(
    args.to,
    "Your Launch Pad order has been refunded",
    emailWrapper("linear-gradient(135deg,#6b7280 0%,#4b5563 100%)", header, body),
    "order refunded",
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run lib/email/product-order-emails.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/email/subscription-emails.ts lib/email/product-order-emails.ts lib/email/product-order-emails.test.ts
git commit -m "feat(email): product order confirmation, pickup, delivery, refund emails"
```

---

### Task 6: Checkout API route (`app/api/products/checkout/route.ts`)

Thin glue over Task 3 — all pricing/validation logic is already tested there, so this task's verification is lint + a wiring review; end-to-end proof comes in Task 14.

**Files:**
- Create: `app/api/products/checkout/route.ts`

**Interfaces:**
- Consumes: `priceOrder`, `createPendingOrder` from `@/lib/products/checkout`; `requireUser` from `@/lib/auth/guards`; `apiError` from `@/lib/http/apiError`; `stripe` from `@/lib/stripe/stripe`; `createClient` from `@/utils/supabase/server`; `createAdminClient` from `@/utils/supabase/admin`.
- Produces: `POST /api/products/checkout` accepting `{ items: {productId, quantity}[], fulfillment_method: "pickup" | "delivery" }`, returning `{ url: string }` (Stripe Checkout URL) or `{ error }` with 4xx/5xx. Session metadata: `{ payment_type: "product_order", order_id }`.

- [ ] **Step 1: Implement the route**

Create `app/api/products/checkout/route.ts`:

```ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireUser } from "@/lib/auth/guards";
import { apiError, ApiError } from "@/lib/http/apiError";
import { createPendingOrder, priceOrder } from "@/lib/products/checkout";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const user = await requireUser(supabase);

    const body = await req.json();
    const items = body?.items;
    const fulfillmentMethod = body?.fulfillment_method;

    // Service-role client: order inserts are server-side only (RLS has no
    // insert policies on product_orders by design).
    const admin = createAdminClient();

    const priced = await priceOrder(admin, items, fulfillmentMethod);
    const { orderId } = await createPendingOrder(admin, {
      userId: user.id,
      fulfillmentMethod,
      priced,
    });

    const line_items = priced.items.map((i) => ({
      price_data: {
        currency: "usd",
        product_data: { name: i.name },
        unit_amount: Math.round(i.unit_price * 100),
      },
      quantity: i.quantity,
    }));
    if (priced.deliveryFee > 0) {
      line_items.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Delivery fee" },
          unit_amount: Math.round(priced.deliveryFee * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,
      customer_email: user.email ?? undefined,
      // Staff call/text about pickup readiness and delivery runs.
      phone_number_collection: { enabled: true },
      // Stripe collects the delivery address so we build no address form.
      ...(fulfillmentMethod === "delivery"
        ? { shipping_address_collection: { allowed_countries: ["US"] as const } }
        : {}),
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/products/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/products/cart`,
      metadata: {
        payment_type: "product_order",
        order_id: orderId,
      },
    });

    if (!session.url) throw new ApiError("Stripe did not return a checkout URL", 500);

    await admin
      .from("product_orders")
      .update({ stripe_session_id: session.id })
      .eq("id", orderId);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return apiError(err);
  }
}
```

- [ ] **Step 2: Lint and type-check**

Run: `npm run lint` and `npx tsc --noEmit 2>&1 | grep -i "products/checkout"`
Expected: no errors for this file.

- [ ] **Step 3: Wiring review checklist**

Confirm by reading the file you just wrote:
- `payment_type: "product_order"` does not collide with `"new_booking"` / `"walkin_booking"` ✓
- Prices come only from `priceOrder` (DB), never from the request body ✓
- `shipping_address_collection` is present only for delivery ✓
- `cancel_url` returns to `/products/cart` so the cart (localStorage) is intact ✓

- [ ] **Step 4: Commit**

```bash
git add app/api/products/checkout/route.ts
git commit -m "feat(products): checkout API route creating pending orders and Stripe sessions"
```

---

### Task 7: Webhook processing (`lib/products/processProductOrder.ts` + wiring)

**Files:**
- Create: `lib/products/processProductOrder.ts`
- Test: `lib/products/processProductOrder.test.ts`
- Modify: `app/api/webhook/route.ts` (three edits: imports, `handleCheckoutSessionCompleted` branch, switch case + local helper)

**Interfaces:**
- Consumes: session fields only (structurally typed so tests need no Stripe import): `metadata.order_id`, `payment_intent`, `customer_details.phone`, `collected_information.shipping_details` / legacy `shipping_details`.
- Produces:
  - `processProductOrderCompleted(db, session): Promise<{ order: ProductOrderRow; items: ProductOrderItemRow[] } | null>` — flips `pending → paid`, stores payment intent/phone/address, decrements stock floored at 0. Returns `null` (and does nothing) if the order is missing or not `pending` (duplicate delivery guard on top of the event-id guard).
  - `processProductOrderExpired(db, session): Promise<void>` — marks the order `cancelled` only if still `pending`.
- The webhook route sends the confirmation email using the returned `{order, items}` (email stays out of the lib so tests don't touch Resend).

- [ ] **Step 1: Write the failing tests**

Create `lib/products/processProductOrder.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  processProductOrderCompleted,
  processProductOrderExpired,
} from "./processProductOrder";

const ORDER = {
  id: "order-1",
  user_id: "user-1",
  status: "pending",
  fulfillment_method: "delivery",
  subtotal: 39.98,
  delivery_fee: 7.5,
  total: 47.48,
};

const ITEMS = [
  { id: "i1", order_id: "order-1", product_id: "p1", name: "Tire Shine Pro", unit_price: 19.99, quantity: 2 },
  { id: "i2", order_id: "order-1", product_id: null, name: "Deleted product", unit_price: 5, quantity: 1 },
];

function fakeDb(opts: {
  order?: any;
  items?: any[];
  stocks?: Record<string, number>;
}) {
  const state = {
    orderUpdates: [] as any[],
    stockUpdates: {} as Record<string, number>,
    expiredUpdateFilters: [] as any[],
  };
  const db = {
    from(table: string) {
      if (table === "product_orders") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: opts.order ?? null, error: null }),
            }),
          }),
          update: (values: any) => {
            const filters: Record<string, unknown> = {};
            const chain = {
              eq(col: string, val: unknown) {
                filters[col] = val;
                return chain;
              },
              then(resolve: (v: { error: null }) => void) {
                state.orderUpdates.push({ values, filters });
                state.expiredUpdateFilters.push(filters);
                resolve({ error: null });
              },
            };
            return chain;
          },
        };
      }
      if (table === "product_order_items") {
        return {
          select: () => ({
            eq: async () => ({ data: opts.items ?? [], error: null }),
          }),
        };
      }
      if (table === "products") {
        return {
          select: () => ({
            eq: (_c: string, id: string) => ({
              maybeSingle: async () => ({
                data:
                  opts.stocks && id in opts.stocks
                    ? { stock: opts.stocks[id] }
                    : null,
                error: null,
              }),
            }),
          }),
          update: (values: { stock: number }) => ({
            eq: async (_c: string, id: string) => {
              state.stockUpdates[id] = values.stock;
              return { error: null };
            },
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as any;
  return { db, state };
}

const SESSION = {
  metadata: { payment_type: "product_order", order_id: "order-1" },
  payment_intent: "pi_123",
  customer_details: { phone: "+18325551234" },
  collected_information: {
    shipping_details: {
      name: "Jho F",
      address: { line1: "1 Main St", city: "Houston", state: "TX", postal_code: "77025", country: "US" },
    },
  },
};

describe("processProductOrderCompleted", () => {
  it("marks the order paid with intent, phone, and address, and decrements stock", async () => {
    const { db, state } = fakeDb({ order: ORDER, items: ITEMS, stocks: { p1: 10 } });
    const result = await processProductOrderCompleted(db, SESSION as any);

    expect(result?.order.status).toBe("paid");
    expect(result?.items).toHaveLength(2);
    expect(state.orderUpdates[0].values).toMatchObject({
      status: "paid",
      stripe_payment_intent_id: "pi_123",
      phone: "+18325551234",
    });
    expect(state.orderUpdates[0].values.delivery_address).toMatchObject({
      name: "Jho F",
    });
    // p1: 10 - 2 = 8; the null-product item is skipped without error
    expect(state.stockUpdates).toEqual({ p1: 8 });
  });

  it("floors stock at zero", async () => {
    const { db, state } = fakeDb({ order: ORDER, items: ITEMS, stocks: { p1: 1 } });
    await processProductOrderCompleted(db, SESSION as any);
    expect(state.stockUpdates).toEqual({ p1: 0 });
  });

  it("reads legacy session.shipping_details when collected_information is absent", async () => {
    const { db, state } = fakeDb({ order: ORDER, items: [], stocks: {} });
    const legacy = {
      ...SESSION,
      collected_information: undefined,
      shipping_details: { name: "Legacy", address: { line1: "2 Oak" } },
    };
    await processProductOrderCompleted(db, legacy as any);
    expect(state.orderUpdates[0].values.delivery_address).toMatchObject({ name: "Legacy" });
  });

  it("returns null and touches nothing when order is missing or already paid", async () => {
    const missing = fakeDb({ order: null });
    expect(await processProductOrderCompleted(missing.db, SESSION as any)).toBeNull();
    expect(missing.state.orderUpdates).toHaveLength(0);

    const paid = fakeDb({ order: { ...ORDER, status: "paid" }, stocks: { p1: 10 } });
    expect(await processProductOrderCompleted(paid.db, SESSION as any)).toBeNull();
    expect(paid.state.orderUpdates).toHaveLength(0);
    expect(paid.state.stockUpdates).toEqual({});
  });

  it("returns null when metadata has no order_id", async () => {
    const { db, state } = fakeDb({ order: ORDER });
    expect(await processProductOrderCompleted(db, { metadata: {} } as any)).toBeNull();
    expect(state.orderUpdates).toHaveLength(0);
  });
});

describe("processProductOrderExpired", () => {
  it("cancels the order filtered to pending status", async () => {
    const { db, state } = fakeDb({ order: ORDER });
    await processProductOrderExpired(db, SESSION as any);
    expect(state.orderUpdates).toHaveLength(1);
    expect(state.orderUpdates[0].values).toMatchObject({ status: "cancelled" });
    expect(state.orderUpdates[0].filters).toMatchObject({
      id: "order-1",
      status: "pending",
    });
  });

  it("does nothing without an order_id", async () => {
    const { db, state } = fakeDb({});
    await processProductOrderExpired(db, { metadata: {} } as any);
    expect(state.orderUpdates).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/products/processProductOrder.test.ts`
Expected: FAIL — cannot resolve `./processProductOrder`.

- [ ] **Step 3: Implement `lib/products/processProductOrder.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductOrderItemRow, ProductOrderRow } from "@/types/db";

/**
 * Structural view of the Stripe Checkout Session fields we read. The basil
 * API versions (2025-03+) moved shipping_details under collected_information;
 * older webhook endpoint configs still deliver the legacy top-level field, so
 * we read both.
 */
export interface ProductOrderSession {
  metadata?: Record<string, string> | null;
  payment_intent?: string | { id: string } | null;
  customer_details?: { phone?: string | null } | null;
  collected_information?: { shipping_details?: unknown } | null;
  shipping_details?: unknown;
}

export async function processProductOrderCompleted(
  db: SupabaseClient,
  session: ProductOrderSession,
): Promise<{ order: ProductOrderRow; items: ProductOrderItemRow[] } | null> {
  const orderId = session.metadata?.order_id;
  if (!orderId) return null;

  const { data: order } = await db
    .from("product_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) {
    console.error("[product-order] completed event for unknown order:", orderId);
    return null;
  }
  // Duplicate-delivery guard on top of the processed_stripe_events claim.
  if (order.status !== "pending") return null;

  const shipping =
    session.collected_information?.shipping_details ??
    session.shipping_details ??
    null;
  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  const updates = {
    status: "paid",
    stripe_payment_intent_id: paymentIntent,
    phone: session.customer_details?.phone ?? null,
    delivery_address: shipping,
    updated_at: new Date().toISOString(),
  };
  await db.from("product_orders").update(updates).eq("id", orderId);

  const { data: items } = await db
    .from("product_order_items")
    .select("*")
    .eq("order_id", orderId);

  // Decrement stock, floored at zero. Read-then-write is acceptable here:
  // the event-id claim means one webhook delivery processes this order, and
  // the rare last-unit race across two different orders is resolved by staff
  // refunding from the queue (see design spec).
  for (const item of items ?? []) {
    if (!item.product_id) continue;
    const { data: product } = await db
      .from("products")
      .select("stock")
      .eq("id", item.product_id)
      .maybeSingle();
    if (!product) continue;
    await db
      .from("products")
      .update({ stock: Math.max(0, product.stock - item.quantity) })
      .eq("id", item.product_id);
  }

  return { order: { ...order, ...updates } as ProductOrderRow, items: items ?? [] };
}

export async function processProductOrderExpired(
  db: SupabaseClient,
  session: ProductOrderSession,
): Promise<void> {
  const orderId = session.metadata?.order_id;
  if (!orderId) return;
  await db
    .from("product_orders")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "pending");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/products/processProductOrder.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire into `app/api/webhook/route.ts`**

Three edits:

**(a)** Add imports at the top (after the existing email imports):

```ts
import {
  processProductOrderCompleted,
  processProductOrderExpired,
} from "@/lib/products/processProductOrder";
import { sendProductOrderConfirmationEmail } from "@/lib/email/product-order-emails";
```

**(b)** In `handleCheckoutSessionCompleted` (~line 109), add the product-order branch FIRST, before the `walkin_booking` check (any `mode: "payment"` session without a recognized discriminator falls through to `processBooking`, so the early return matters):

```ts
async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;

  if (session.metadata?.payment_type === "product_order") {
    await processProductOrder(session);
    return;
  }

  if (session.metadata?.payment_type === "walkin_booking") {
```

**(c)** Add the `checkout.session.expired` case to the switch (~line 70, after the `checkout.session.completed` case) and the local helper function alongside the other `process*` functions:

```ts
        case "checkout.session.expired":
          await processProductOrderExpired(
            supabase,
            event.data.object as Stripe.Checkout.Session
          );
          break;
```

```ts
// Product store: flip pending -> paid, decrement stock, email the customer.
// Errors are swallowed like the sibling handlers so a failed side effect
// doesn't release the idempotency claim and re-run money logic.
async function processProductOrder(session: Stripe.Checkout.Session) {
  try {
    const result = await processProductOrderCompleted(supabase, session);
    if (!result) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", result.order.user_id)
      .maybeSingle();
    if (!profile?.email) return;

    await sendProductOrderConfirmationEmail({
      to: profile.email,
      name: profile.full_name ?? "there",
      orderId: result.order.id,
      items: result.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
      subtotal: result.order.subtotal,
      deliveryFee: result.order.delivery_fee,
      total: result.order.total,
      fulfillmentMethod: result.order.fulfillment_method as "pickup" | "delivery",
    });
    console.log("Product order confirmation email sent");
  } catch (error) {
    console.error("Error processing product order:", error);
  }
}
```

- [ ] **Step 6: Subscribe the Stripe endpoint to the expired event (manual, one-time)**

In Stripe Dashboard → Developers → Webhooks → the site's endpoint → add `checkout.session.expired` to the subscribed events (it already has `checkout.session.completed`). Without this, abandoned orders stay `pending` forever (harmless but untidy).

- [ ] **Step 7: Run the full suite + lint**

Run: `npm test` then `npm run lint`
Expected: all green; no new lint errors in `app/api/webhook/route.ts`.

- [ ] **Step 8: Commit**

```bash
git add lib/products/processProductOrder.ts lib/products/processProductOrder.test.ts app/api/webhook/route.ts
git commit -m "feat(webhook): handle product order completion and expiry"
```

---

### Task 8: Admin products page (`/admin/products`) + sidebar links

Follows the add-ons pattern (server shell + `"use client"` view, browser supabase client, sonner toasts, inline create/edit Dialogs) but fixes that pattern's known bugs: check `error` before toasting success, and refetch after insert. Image upload follows `subscription-view.tsx` but targets the `product-images` bucket. Middleware already protects `/admin/**`; RLS protects the data.

**Files:**
- Create: `app/admin/products/page.tsx`
- Create: `app/admin/products/products-view.tsx`
- Modify: `components/admin/sidebar.tsx` (navigation array, lines ~35-50, plus icon imports)

**Interfaces:**
- Consumes: tables `products`, `store_settings`; bucket `product-images`; `ProductRow` from `@/types/db`.
- Produces: admin CRUD UI; the delivery-fee card; sidebar entries `Products → /admin/products`, `Orders → /admin/orders` (the Orders page arrives in Task 13 — the link 404s harmlessly until then, or add both links in Task 13 if executing strictly sequentially; keeping both edits here means one sidebar commit).

- [ ] **Step 1: Add the sidebar entries**

In `components/admin/sidebar.tsx`:
- Extend the lucide import (lines ~8-24) with `ShoppingBasket` and `Package`.
- In the `navigation` array (lines ~35-50), insert after the `Add-ons` entry:

```tsx
  { name: "Products", href: "/admin/products", icon: ShoppingBasket },
  { name: "Orders", href: "/admin/orders", icon: Package },
```

Do NOT add these names to the `filteredNavigation` hide-list (lines ~85-95) — Products and Orders stay visible to every admin user type.

- [ ] **Step 2: Create the server shell**

Create `app/admin/products/page.tsx` (mirror of `app/admin/addons/page.tsx`, minus its dead code):

```tsx
import ProductsView from "./products-view";

export default function Products() {
  return (
    <div className="flex-1 overflow-y-auto mt-16 lg:mt-0 p-6">
      <ProductsView />
    </div>
  );
}
```

- [ ] **Step 3: Create the client view**

Create `app/admin/products/products-view.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { ProductRow } from "@/types/db";

const EMPTY_FORM = {
  name: "",
  description: "",
  category: "",
  price: "",
  sale_price: "",
  image_url: "",
  stock: "0",
  is_active: true,
};

export default function ProductsView() {
  const supabase = createClient();

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductRow | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deliveryFee, setDeliveryFee] = useState("");
  const [savingFee, setSavingFee] = useState(false);

  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      toast.error("Failed to load products");
    }
    setProducts(data ?? []);
    setLoading(false);
  }, [supabase]);

  const fetchDeliveryFee = useCallback(async () => {
    const { data } = await supabase
      .from("store_settings")
      .select("delivery_fee")
      .eq("id", 1)
      .maybeSingle();
    if (data) setDeliveryFee(String(data.delivery_fee));
  }, [supabase]);

  useEffect(() => {
    fetchProducts();
    fetchDeliveryFee();
  }, [fetchProducts, fetchDeliveryFee]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true);
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are allowed.");
        return;
      }
      const fileExt = file.name.split(".").pop();
      const filePath = `products/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);
      if (data?.publicUrl) {
        setForm((prev) => ({ ...prev, image_url: data.publicUrl }));
      }
    } catch (error) {
      console.error("Error uploading product image:", error);
      toast.error("Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  /** Shared validation + payload for create and update. */
  const buildPayload = () => {
    const price = Number(form.price);
    const stock = Number(form.stock);
    const salePrice = form.sale_price.trim() === "" ? null : Number(form.sale_price);
    if (!form.name.trim() || !form.category.trim()) {
      toast.error("Name and category are required");
      return null;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Price must be a positive number");
      return null;
    }
    if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0)) {
      toast.error("Sale price must be a positive number");
      return null;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      toast.error("Stock must be a whole number");
      return null;
    }
    return {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category.trim(),
      price,
      sale_price: salePrice,
      image_url: form.image_url || null,
      stock,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildPayload();
    if (!payload) return;
    const { error } = await supabase.from("products").insert([payload]);
    if (error) {
      console.error(error);
      toast.error("Failed to create product");
      return;
    }
    toast.success("Product created");
    setCreateOpen(false);
    setForm(EMPTY_FORM);
    fetchProducts();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProduct) return;
    const payload = buildPayload();
    if (!payload) return;
    const { error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", editProduct.id);
    if (error) {
      console.error(error);
      toast.error("Failed to update product");
      return;
    }
    toast.success("Product updated");
    setEditProduct(null);
    setForm(EMPTY_FORM);
    fetchProducts();
  };

  const toggleActive = async (product: ProductRow, next: boolean) => {
    const { error } = await supabase
      .from("products")
      .update({ is_active: next, updated_at: new Date().toISOString() })
      .eq("id", product.id);
    if (error) {
      toast.error("Failed to update product");
      return;
    }
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, is_active: next } : p)),
    );
  };

  const handleDelete = async (product: ProductRow) => {
    if (
      !window.confirm(
        `Delete "${product.name}" permanently? Deactivating is usually enough — order history keeps its own copy of the name and price either way.`,
      )
    ) {
      return;
    }
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) {
      console.error(error);
      toast.error("Failed to delete product");
      return;
    }
    toast.success("Product deleted");
    fetchProducts();
  };

  const handleSaveFee = async () => {
    const fee = Number(deliveryFee);
    if (!Number.isFinite(fee) || fee < 0) {
      toast.error("Delivery fee must be a positive number");
      return;
    }
    setSavingFee(true);
    const { error } = await supabase
      .from("store_settings")
      .update({ delivery_fee: fee, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setSavingFee(false);
    if (error) {
      toast.error("Failed to save delivery fee");
      return;
    }
    toast.success("Delivery fee saved");
  };

  const openEdit = (product: ProductRow) => {
    setForm({
      name: product.name,
      description: product.description ?? "",
      category: product.category,
      price: String(product.price),
      sale_price: product.sale_price === null ? "" : String(product.sale_price),
      image_url: product.image_url ?? "",
      stock: String(product.stock),
      is_active: product.is_active,
    });
    setEditProduct(product);
  };

  const formFields = (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={form.name} onChange={handleChange} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Input
          id="category"
          value={form.category}
          onChange={handleChange}
          placeholder="Exterior Care"
          required
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="price">Price ($)</Label>
        <Input id="price" type="number" step="0.01" min="0" value={form.price} onChange={handleChange} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sale_price">Sale price ($, optional)</Label>
        <Input id="sale_price" type="number" step="0.01" min="0" value={form.sale_price} onChange={handleChange} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="stock">Stock</Label>
        <Input id="stock" type="number" step="1" min="0" value={form.stock} onChange={handleChange} required />
      </div>
      <div className="flex items-center gap-2 pt-6">
        <Switch
          id="is_active"
          checked={form.is_active}
          onCheckedChange={(checked) =>
            setForm((prev) => ({ ...prev, is_active: checked }))
          }
        />
        <Label htmlFor="is_active">Active (visible in the store)</Label>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="image">Image</Label>
        <Input
          id="image"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
          }}
        />
        {uploading && (
          <p className="text-sm text-muted-foreground">Uploading…</p>
        )}
        {form.image_url && (
          <Image
            src={form.image_url}
            alt="Product preview"
            width={120}
            height={80}
            className="rounded-md object-cover"
          />
        )}
      </div>
    </>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-900 hover:bg-blue-800">
              <Plus className="mr-2 h-4 w-4" /> Add product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>New product</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
              {formFields}
              <DialogFooter className="md:col-span-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={uploading}>
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Delivery fee setting */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivery fee</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="delivery_fee">Flat fee for delivery orders ($)</Label>
            <Input
              id="delivery_fee"
              type="number"
              step="0.01"
              min="0"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
              className="w-40"
            />
          </div>
          <Button onClick={handleSaveFee} disabled={savingFee}>
            {savingFee ? "Saving…" : "Save"}
          </Button>
        </CardContent>
      </Card>

      {/* Product list */}
      {products.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No products yet. Add your first one.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              {product.image_url && (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  width={450}
                  height={200}
                  className="h-40 w-full object-cover"
                />
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-blue-800">{product.category}</p>
                    <CardTitle className="text-base">{product.name}</CardTitle>
                  </div>
                  <Badge variant={product.is_active ? "default" : "secondary"}>
                    {product.is_active ? "Active" : "Hidden"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  {product.sale_price !== null ? (
                    <>
                      <span className="font-bold">${product.sale_price.toFixed(2)}</span>
                      <span className="text-muted-foreground line-through">
                        ${product.price.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="font-bold">${product.price.toFixed(2)}</span>
                  )}
                  <span
                    className={
                      product.stock === 0
                        ? "ml-auto font-medium text-red-600"
                        : "ml-auto text-muted-foreground"
                    }
                  >
                    {product.stock === 0 ? "Out of stock" : `${product.stock} in stock`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={product.is_active}
                      onCheckedChange={(checked) => toggleActive(product, checked)}
                    />
                    <span className="text-xs text-muted-foreground">Visible</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => openEdit(product)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(product)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit dialog (controlled, no trigger) */}
      <Dialog
        open={editProduct !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditProduct(null);
            setForm(EMPTY_FORM);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="grid gap-4 md:grid-cols-2">
            {formFields}
            <DialogFooter className="md:col-span-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={uploading}>
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

Note: if `components/ui/textarea.tsx` does not exist, add it with `npx shadcn@latest add textarea` (check first — `ls components/ui/`).

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, sign in as an admin, open `/admin/products`:
1. Create a product with an image (e.g. "Tire Shine Pro", category "Exterior Care", price 29.99, sale 19.99, stock 10). Expect: success toast, card appears, image renders (bucket URL is allowed by `next.config.ts` remotePatterns).
2. Edit it (change stock), toggle visibility off/on, save the delivery fee (e.g. 7.50).
3. Verify in SQL Editor: `select name, price, sale_price, stock, is_active from products;` and `select delivery_fee from store_settings;`
4. Create 2-3 more products across categories — these seed the customer-facing work in Tasks 9-10.

- [ ] **Step 5: Commit**

```bash
git add app/admin/products/ components/admin/sidebar.tsx
git commit -m "feat(admin): products catalog CRUD with image upload and delivery fee setting"
```

---

### Task 9: Cart context, revived `/products` page, navbar links

**Files:**
- Create: `context/product-cart-context.tsx`
- Modify: `app/(user)/layout.tsx` (wrap with provider)
- Modify: `app/(user)/products/page.tsx` (full rewrite — remove `notFound()`, hardcoded array, ratings; fetch DB; add to cart)
- Modify: `components/user/navbar.tsx` (desktop Products link at lines ~183-188, currently commented out with stale classes; mobile menu entry; cart indicator)

**Interfaces:**
- Consumes: `lib/products/cart` pure functions; table `products` (anon-readable, active only); `ProductRow` from `@/types/db`.
- Produces: `ProductCartProvider` + `useProductCart(): { items: CartItem[]; count: number; add(productId, quantity?, maxStock?): void; remove(productId): void; setQty(productId, quantity, maxStock?): void; clear(): void }`. Cart persists to localStorage key `"productCart"`; hydrates in an effect so SSR/first client render match (empty), then updates.

- [ ] **Step 1: Create `context/product-cart-context.tsx`**

Follows `context/bookingContext.tsx` (throwing hook) with localStorage persistence:

```tsx
"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  PRODUCT_CART_STORAGE_KEY,
  addItem,
  itemCount,
  readCart,
  removeItem,
  setQuantity,
  type CartItem,
} from "@/lib/products/cart";

interface ProductCartContextType {
  items: CartItem[];
  count: number;
  add: (productId: string, quantity?: number, maxStock?: number) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, quantity: number, maxStock?: number) => void;
  clear: () => void;
}

const ProductCartContext = createContext<ProductCartContextType | undefined>(
  undefined,
);

export default function ProductCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate after mount so the first client render matches SSR (empty cart).
  useEffect(() => {
    setItems(readCart(localStorage.getItem(PRODUCT_CART_STORAGE_KEY)));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(PRODUCT_CART_STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const add = useCallback(
    (productId: string, quantity = 1, maxStock?: number) =>
      setItems((prev) => addItem(prev, productId, quantity, maxStock)),
    [],
  );
  const remove = useCallback(
    (productId: string) => setItems((prev) => removeItem(prev, productId)),
    [],
  );
  const setQty = useCallback(
    (productId: string, quantity: number, maxStock?: number) =>
      setItems((prev) => setQuantity(prev, productId, quantity, maxStock)),
    [],
  );
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, count: itemCount(items), add, remove, setQty, clear }),
    [items, add, remove, setQty, clear],
  );

  return (
    <ProductCartContext.Provider value={value}>
      {children}
    </ProductCartContext.Provider>
  );
}

export function useProductCart() {
  const context = useContext(ProductCartContext);
  if (context === undefined) {
    throw new Error("useProductCart must be used within a ProductCartProvider");
  }
  return context;
}
```

- [ ] **Step 2: Mount the provider in `app/(user)/layout.tsx`**

The provider must wrap BOTH the navbar (cart indicator) and the pages. Add the import and wrap the existing JSX:

```tsx
import ProductCartProvider from "@/context/product-cart-context";
```

Wrap whatever the layout currently returns so `<UserNavbar />` and `{children}` are inside `<ProductCartProvider>…</ProductCartProvider>` (keep everything else — footer, modals — exactly where it is).

- [ ] **Step 3: Rewrite `app/(user)/products/page.tsx`**

Replace the entire file. What's kept from the old UI: search, category filter, sort, price-range slider, grid/list toggle, filter popover with active count. What's removed: `notFound()`, the hardcoded array, star ratings + rating filter (no real review data — PRODUCT.md forbids fabricating any), the unused `color`/`tag` fields. What's new: DB fetch, sale badge from `sale_price`, out-of-stock state, add-to-cart.

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { useProductCart } from "@/context/product-cart-context";
import { unitPrice } from "@/lib/products/cart";
import type { ProductRow } from "@/types/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Filter,
  Grid3x3,
  List,
  Loader2,
  SearchIcon,
  ShoppingBasket,
} from "lucide-react";

function AddToCartButton({ product }: { product: ProductRow }) {
  const { add } = useProductCart();
  if (product.stock === 0) {
    return (
      <Button className="w-full" disabled>
        Out of stock
      </Button>
    );
  }
  return (
    <Button
      className="w-full bg-blue-800 hover:bg-blue-900"
      onClick={() => {
        add(product.id, 1, product.stock);
        toast.success(`${product.name} added to cart`);
      }}
    >
      <ShoppingBasket className="mr-2 h-4 w-4" />
      Add to cart
    </Button>
  );
}

function PriceTag({ product }: { product: ProductRow }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-2xl font-bold text-blue-900">
        ${unitPrice(product).toFixed(2)}
      </span>
      {product.sale_price !== null && (
        <span className="text-sm text-muted-foreground line-through">
          ${product.price.toFixed(2)}
        </span>
      )}
    </div>
  );
}

export default function Products() {
  const supabase = createClient();

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  const [sliderMax, setSliderMax] = useState(100);
  const [sortBy, setSortBy] = useState<string>("latest");
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    async function fetchProducts() {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) {
        console.error(error);
        toast.error("Failed to load products");
      }
      const rows = data ?? [];
      setProducts(rows);
      const max = Math.max(100, ...rows.map((p) => Math.ceil(unitPrice(p))));
      setSliderMax(max);
      setPriceRange([0, max]);
      setLoading(false);
    }
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const categories = useMemo(
    () => ["all", ...new Set(products.map((p) => p.category))],
    [products],
  );

  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        const matchesCategory =
          selectedCategory === "all" || product.category === selectedCategory;
        const matchesSearch = product.name
          .toLowerCase()
          .includes(debouncedSearchQuery.toLowerCase());
        const actualPrice = unitPrice(product);
        const matchesPrice =
          actualPrice >= priceRange[0] && actualPrice <= priceRange[1];
        return matchesCategory && matchesSearch && matchesPrice;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "price-low":
            return unitPrice(a) - unitPrice(b);
          case "price-high":
            return unitPrice(b) - unitPrice(a);
          case "latest":
          default:
            return (
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
        }
      });
  }, [products, selectedCategory, debouncedSearchQuery, priceRange, sortBy]);

  const activeFiltersCount =
    (selectedCategory !== "all" ? 1 : 0) +
    (priceRange[0] > 0 || priceRange[1] < sliderMax ? 1 : 0) +
    (sortBy !== "latest" ? 1 : 0);

  const clearAllFilters = () => {
    setSelectedCategory("all");
    setPriceRange([0, sliderMax]);
    setSortBy("latest");
    setSearchQuery("");
  };

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-blue-900" />
      </main>
    );
  }

  return (
    <main className="container mx-auto flex-1 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="py-20">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <div className="space-y-3 text-center">
              <h1 className="my-4 text-5xl font-bold text-blue-900">
                Premium Car Care Products
              </h1>
              <p className="text-lg">
                Professional-grade automotive detailing products for enthusiasts
                who demand the best. Order online for pickup at the store or
                local delivery.
              </p>
            </div>
          </div>

          <div className="mb-6 sm:mb-8">
            <div className="mb-4 flex flex-col space-y-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:space-x-3 sm:space-y-0">
              <div className="relative w-full">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="search-products"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center justify-end space-x-2">
                <div className="flex items-center space-x-2 rounded-md border bg-white p-1">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3x3 />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <List />
                  </Button>
                </div>
                <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="relative py-5">
                      <Filter className="mr-2 h-4 w-4" />
                      Filters
                      {activeFiltersCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="ml-2 flex h-5 w-5 items-center justify-center p-0"
                        >
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 space-y-4" align="end">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Filters</h3>
                      {activeFiltersCount > 0 && (
                        <Button
                          variant="outline"
                          onClick={clearAllFilters}
                          className="h-8 text-xs"
                        >
                          Clear All
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Category</Label>
                      <Select
                        value={selectedCategory}
                        onValueChange={setSelectedCategory}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem
                              key={category}
                              value={category}
                              className="capitalize"
                            >
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Sort By</Label>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="latest">Latest</SelectItem>
                          <SelectItem value="price-low">
                            Price: Low to High
                          </SelectItem>
                          <SelectItem value="price-high">
                            Price: High to Low
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">
                        Price Range: ${priceRange[0]} - ${priceRange[1]}
                      </Label>
                      <Slider
                        max={sliderMax}
                        step={5}
                        value={priceRange}
                        onValueChange={(value) =>
                          setPriceRange(value as [number, number])
                        }
                        className="w-full"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="mb-4 text-sm text-muted-foreground">
              Showing {filteredProducts.length} of {products.length} products
              {searchQuery && (
                <span className="ml-2">for &quot;{searchQuery}&quot;</span>
              )}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                {products.length === 0
                  ? "No products available right now — check back soon."
                  : "No products match your filters."}
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="rounded-xl p-0 transition-transform duration-200 hover:scale-103"
                  >
                    <div className="relative overflow-hidden rounded-t-lg">
                      {product.sale_price !== null && (
                        <Badge className="absolute left-2 top-2 z-10 bg-green-500 px-2 py-1 text-xs text-white">
                          Sale
                        </Badge>
                      )}
                      {product.image_url ? (
                        <Image
                          height={292}
                          width={450}
                          src={product.image_url}
                          alt={product.name}
                          className="h-48 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-48 w-full items-center justify-center bg-muted text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>
                    <CardHeader className="flex-1">
                      <CardTitle className="text-sm text-blue-800">
                        {product.category}
                      </CardTitle>
                      <CardDescription className="text-lg text-accent-foreground">
                        {product.name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-2">
                      {product.description && (
                        <span className="block text-muted-foreground">
                          {product.description.slice(0, 50)}
                          {product.description.length > 50 ? "…" : ""}
                        </span>
                      )}
                      <PriceTag product={product} />
                    </CardContent>
                    <CardFooter className="p-3">
                      <AddToCartButton product={product} />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="flex flex-row overflow-hidden rounded-xl p-0 transition-transform duration-200 hover:scale-103"
                  >
                    <div className="relative self-center overflow-hidden rounded-lg">
                      {product.sale_price !== null && (
                        <Badge className="absolute left-2 top-2 z-10 bg-green-500 px-2 py-1 text-xs text-white">
                          Sale
                        </Badge>
                      )}
                      {product.image_url ? (
                        <Image
                          height={292}
                          width={450}
                          src={product.image_url}
                          alt={product.name}
                          className="hidden h-auto w-72 rounded-lg object-cover p-1 sm:block"
                        />
                      ) : (
                        <div className="hidden h-40 w-72 items-center justify-center text-muted-foreground sm:flex">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-3">
                      <CardHeader className="flex flex-col items-start space-y-1 p-0 pb-3">
                        <div className="flex w-full items-center justify-between">
                          <div>
                            <CardTitle className="text-sm text-blue-800">
                              {product.category}
                            </CardTitle>
                            <CardDescription className="text-lg text-accent-foreground">
                              {product.name}
                            </CardDescription>
                          </div>
                          <PriceTag product={product} />
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 space-y-3 p-0">
                        {product.description && (
                          <span className="block text-muted-foreground">
                            {product.description.slice(0, 100)}
                            {product.description.length > 100 ? "…" : ""}
                          </span>
                        )}
                      </CardContent>
                      <CardFooter className="mt-5 p-0">
                        <div className="w-56">
                          <AddToCartButton product={product} />
                        </div>
                      </CardFooter>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Navbar — restore Products link + cart indicator**

In `components/user/navbar.tsx`:

**(a) Desktop link** — replace the commented-out block at lines ~183-188 with a live link using the SAME classes as its siblings (the commented version has stale styling):

```tsx
              <Link
                href="/products"
                className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-lg font-medium text-accent-foreground hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
              >
                Products
              </Link>
```

(Copy the exact className from the adjacent `/pricing` link at lines ~189-194 — match it verbatim, the snippet above is the expected shape.)

**(b) Cart indicator** — add near the Login button (~line 217). First add imports:

```tsx
import { ShoppingBasket } from "lucide-react";
import { useProductCart } from "@/context/product-cart-context";
```

Inside the component body: `const { count } = useProductCart();`

Then immediately before the Login `<Link href="/login">` block:

```tsx
            {count > 0 && (
              <Link href="/products/cart" aria-label={`Cart, ${count} items`}>
                <Button size="sm" variant="ghost" className="relative">
                  <ShoppingBasket className="h-5 w-5" />
                  <Badge className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-900 px-1 text-xs text-white">
                    {count}
                  </Badge>
                </Button>
              </Link>
            )}
```

(Import `Badge` from `@/components/ui/badge` if the file doesn't already.) Hydration is safe: the provider starts empty on SSR and first client render, then the effect fills it.

**(c) Mobile menu** — in the Sheet menu (lines ~268-378), add after the Services entry (~line 312), matching the structure of its siblings (each is a `Link` with an icon + label inside `SheetClose`; copy the exact wrapper JSX of the Services entry and swap content):

```tsx
              {/* Products */}
              <Link
                href="/products"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-lg font-medium hover:bg-accent"
              >
                <ShoppingBasket className="h-5 w-5" />
                <span>Products</span>
              </Link>
```

- [ ] **Step 5: Manual verification**

Run: `npm run dev`:
1. Signed out, open `/products` — the page renders products created in Task 8; no 404.
2. Search, category filter, price slider, sort, grid/list all work; no rating stars anywhere.
3. "Add to cart" toasts and the navbar basket badge appears with the count; adding the same product twice merges quantity; a product with stock 0 shows a disabled "Out of stock" button.
4. Refresh the page — the badge count persists (localStorage).
5. Desktop and mobile navbars both show Products.

- [ ] **Step 6: Lint + full test suite**

Run: `npm run lint` and `npm test`
Expected: green.

- [ ] **Step 7: Commit**

```bash
git add context/product-cart-context.tsx "app/(user)/layout.tsx" "app/(user)/products/page.tsx" components/user/navbar.tsx
git commit -m "feat(products): revive /products from the database with cart and navbar links"
```

---

### Task 10: Cart page (`/products/cart`) + success page (`/products/success`)

**Files:**
- Create: `app/(user)/products/cart/page.tsx`
- Create: `app/(user)/products/success/page.tsx`
- Create: `app/(user)/products/success/clear-cart.tsx`

**Interfaces:**
- Consumes: `useProductCart`, `cartTotals`, `unitPrice` from Tasks 2/9; `useAuth` from `@/context/auth-context`; `AuthPromptModal` (default export) from `@/components/user/authPromptModal` with props `{ open, onClose, next?: string }`; `POST /api/products/checkout` returning `{ url }` or `{ error }`; tables `products`, `store_settings` (both anon-readable); `stripe` + `createAdminClient` for the server-side success page.
- Produces: checkout entry point; `/products/success?session_id=...` confirmation.

- [ ] **Step 1: Create `app/(user)/products/cart/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { useProductCart } from "@/context/product-cart-context";
import { cartTotals, unitPrice } from "@/lib/products/cart";
import AuthPromptModal from "@/components/user/authPromptModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Minus, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import type { ProductRow } from "@/types/db";

const STORE_ADDRESS = "10410 S Main St, Houston, TX 77025";

export default function ProductCartPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const { items, remove, setQty } = useProductCart();

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [method, setMethod] = useState<"pickup" | "delivery">("pickup");
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  // (Re)load the products in the cart + the delivery fee. Also called after a
  // checkout error so stale stock/prices refresh.
  const loadData = async () => {
    const ids = items.map((i) => i.productId);
    const [productsRes, settingsRes] = await Promise.all([
      ids.length
        ? supabase.from("products").select("*").in("id", ids)
        : Promise.resolve({ data: [] as ProductRow[], error: null }),
      supabase.from("store_settings").select("delivery_fee").eq("id", 1).maybeSingle(),
    ]);
    setProducts(productsRes.data ?? []);
    setDeliveryFee(settingsRes.data?.delivery_fee ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const totals = cartTotals(items, products, deliveryFee, method);

  const handleCheckout = async () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setCheckingOut(true);
    try {
      const res = await fetch("/api/products/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, fulfillment_method: method }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Checkout failed");
        loadData(); // stock or availability may have changed
        return;
      }
      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      toast.error("Checkout failed — please try again");
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-blue-900" />
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="container mx-auto flex-1 px-4 py-24 text-center">
        <ShoppingBasket className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-bold">Your cart is empty</h1>
        <p className="mb-6 text-muted-foreground">
          Browse our car care products and add something you like.
        </p>
        <Link href="/products">
          <Button className="bg-blue-900 hover:bg-blue-800">Shop products</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="container mx-auto flex-1 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6 py-10">
        <h1 className="text-3xl font-bold text-blue-900">Your cart</h1>

        {/* Line items */}
        <Card>
          <CardContent className="divide-y p-0">
            {items.map((item) => {
              const product = products.find((p) => p.id === item.productId);
              if (!product) {
                return (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between p-4"
                  >
                    <span className="text-muted-foreground">
                      This product is no longer available.
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(item.productId)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                );
              }
              return (
                <div key={item.productId} className="flex items-center gap-4 p-4">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      width={80}
                      height={60}
                      className="rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-15 w-20 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ${unitPrice(product).toFixed(2)} each
                      {item.quantity >= product.stock && (
                        <span className="ml-2 text-amber-600">
                          Only {product.stock} in stock
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label="Decrease quantity"
                      onClick={() =>
                        setQty(item.productId, item.quantity - 1, product.stock)
                      }
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label="Increase quantity"
                      disabled={item.quantity >= product.stock}
                      onClick={() =>
                        setQty(item.productId, item.quantity + 1, product.stock)
                      }
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="w-20 text-right font-medium">
                    ${(unitPrice(product) * item.quantity).toFixed(2)}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${product.name}`}
                    onClick={() => remove(item.productId)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Fulfillment choice */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How do you want to get it?</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={method}
              onValueChange={(v) => setMethod(v as "pickup" | "delivery")}
              className="space-y-3"
            >
              <label
                htmlFor="pickup"
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 has-data-[state=checked]:border-blue-900"
              >
                <RadioGroupItem value="pickup" id="pickup" className="mt-1" />
                <div>
                  <p className="font-medium">Pickup at the store — Free</p>
                  <p className="text-sm text-muted-foreground">
                    {STORE_ADDRESS}. We&apos;ll email you when your order is
                    ready.
                  </p>
                </div>
              </label>
              <label
                htmlFor="delivery"
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 has-data-[state=checked]:border-blue-900"
              >
                <RadioGroupItem value="delivery" id="delivery" className="mt-1" />
                <div>
                  <p className="font-medium">
                    Delivery —{" "}
                    {deliveryFee > 0 ? `$${deliveryFee.toFixed(2)}` : "Free"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    We deliver locally around Houston. You&apos;ll enter your
                    address at checkout.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Totals + checkout */}
        <Card>
          <CardContent className="space-y-2 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${totals.subtotal.toFixed(2)}</span>
            </div>
            {method === "delivery" && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery fee</span>
                <span>${totals.deliveryFee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>Total</span>
              <span>${totals.total.toFixed(2)}</span>
            </div>
            <Button
              className="mt-4 w-full bg-blue-900 py-6 text-lg hover:bg-blue-800"
              onClick={handleCheckout}
              disabled={checkingOut}
            >
              {checkingOut ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {user ? "Checkout" : "Sign in to checkout"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Secure payment by Stripe.
            </p>
          </CardContent>
        </Card>
      </div>

      <AuthPromptModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        next="/products/cart"
      />
    </main>
  );
}
```

Note: if `components/ui/radio-group.tsx` does not exist (`ls components/ui/`), add it with `npx shadcn@latest add radio-group`.

- [ ] **Step 2: Create the clear-cart helper `app/(user)/products/success/clear-cart.tsx`**

A tiny client component the server success page mounts; clears the context (which also rewrites localStorage via the provider's persistence effect):

```tsx
"use client";

import { useEffect } from "react";
import { useProductCart } from "@/context/product-cart-context";

export default function ClearCart() {
  const { clear } = useProductCart();
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}
```

- [ ] **Step 3: Create `app/(user)/products/success/page.tsx`**

Server component following the self-service success pattern (retrieve session, poll briefly for the webhook, graceful fallback). Uses the admin client — the order lookup must not depend on the browser session cookie race:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle, Package, Truck } from "lucide-react";
import { stripe } from "@/lib/stripe/stripe";
import { createAdminClient } from "@/utils/supabase/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { orderStatusLabel } from "@/lib/products/orderStatus";
import ClearCart from "./clear-cart";

interface ProductSuccessPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function ProductSuccessPage({
  searchParams,
}: ProductSuccessPageProps) {
  const { session_id } = await searchParams;
  if (!session_id) return redirect("/products");

  const session = await stripe.checkout.sessions.retrieve(session_id);
  if (session.status === "open") return redirect("/products/cart");
  if (session.metadata?.payment_type !== "product_order") return redirect("/products");

  const orderId = session.metadata.order_id;
  const supabase = createAdminClient();

  // Give the webhook a few seconds to flip pending -> paid.
  let order: {
    id: string;
    status: string;
    fulfillment_method: string;
    subtotal: number;
    delivery_fee: number;
    total: number;
  } | null = null;
  const timeout = Date.now() + 10000;
  while (Date.now() < timeout) {
    const { data } = await supabase
      .from("product_orders")
      .select("id, status, fulfillment_method, subtotal, delivery_fee, total")
      .eq("id", orderId)
      .maybeSingle();
    if (data && data.status !== "pending") {
      order = data;
      break;
    }
    if (data && !order) order = data; // keep the pending row as fallback
    await new Promise((res) => setTimeout(res, 1000));
  }

  const { data: items } = await supabase
    .from("product_order_items")
    .select("id, name, unit_price, quantity")
    .eq("order_id", orderId);

  const isDelivery = order?.fulfillment_method === "delivery";

  return (
    <main className="container mx-auto flex-1 px-4 py-16">
      <ClearCart />
      <div className="mx-auto max-w-xl space-y-6 text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-green-600" />
        <h1 className="text-3xl font-bold">Thanks for your order!</h1>
        <p className="text-muted-foreground">
          {order && order.status === "pending"
            ? "Your payment is being confirmed — you'll get an email receipt shortly."
            : "Payment confirmed. A confirmation email is on its way."}
        </p>

        <Card className="text-left">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {isDelivery ? (
                <>
                  <Truck className="h-5 w-5" /> Delivery
                </>
              ) : (
                <>
                  <Package className="h-5 w-5" /> Pickup at 10410 S Main St,
                  Houston, TX 77025
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(items ?? []).map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  {item.name} <span className="text-muted-foreground">×{item.quantity}</span>
                </span>
                <span>${(item.unit_price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            {order && (
              <>
                {order.delivery_fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery fee</span>
                    <span>${order.delivery_fee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 font-bold">
                  <span>Total</span>
                  <span>${order.total.toFixed(2)}</span>
                </div>
                <p className="pt-2 text-xs text-muted-foreground">
                  Status: {orderStatusLabel(order.status)} · Order ID: {order.id}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-center gap-3">
          <Link href="/dashboard/orders">
            <Button className="bg-blue-900 hover:bg-blue-800">View my orders</Button>
          </Link>
          <Link href="/products">
            <Button variant="outline">Keep shopping</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Manual verification (Stripe test mode)**

Run: `npm run dev` (and forward webhooks if testing locally: `stripe listen --forward-to localhost:3000/api/webhook` — set the printed signing secret as `STRIPE_WEBHOOK_SECRET` for the dev session):
1. Signed out: add items, open `/products/cart`, click "Sign in to checkout" — the auth modal appears; sign in; you land back on `/products/cart` with the cart intact.
2. Pickup order: choose Pickup, checkout, pay with `4242 4242 4242 4242` — Stripe shows phone collection but NO address form. Land on `/products/success`; totals correct; cart badge cleared.
3. Delivery order: choose Delivery — the fee line appears in the cart and as a "Delivery fee" line item in Stripe; Stripe collects a shipping address.
4. Verify in SQL Editor: orders are `paid`, `stripe_payment_intent_id` set, delivery order has `delivery_address` JSON and `phone`; product stock decremented.
5. Confirmation email arrives (check the Resend dashboard if not delivered locally).
6. Quantity stepper cannot exceed stock; removing all items shows the empty-cart state.

- [ ] **Step 5: Lint + tests**

Run: `npm run lint` and `npm test`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add "app/(user)/products/cart/" "app/(user)/products/success/"
git commit -m "feat(products): cart page with pickup/delivery choice and checkout success page"
```

---

### Task 11: Customer dashboard Orders page + nav link

**Files:**
- Create: `app/(dashboard)/dashboard/orders/page.tsx`
- Modify: `components/user/authNavbar.tsx` — add to the `navLinks` array (lines ~28-33) AND the hardcoded mobile menu JSX (lines ~243-279; note the mobile menu does not map over `navLinks`)

**Interfaces:**
- Consumes: tables `product_orders` + `product_order_items` (RLS: own rows); `useAuth`; `orderStatusLabel` from `@/lib/products/orderStatus`. PostgREST embed `product_order_items (*)` works via the items→orders FK.
- Produces: `/dashboard/orders`.

- [ ] **Step 1: Add the nav link**

In `components/user/authNavbar.tsx`, extend `navLinks`:

```tsx
const navLinks = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Bookings", href: "/dashboard/bookings" },
  { name: "Orders", href: "/dashboard/orders" },
  { name: "Self Service Logs", href: "/dashboard/self-service-log" },
  { name: "Subscription", href: "/dashboard/pricing" },
];
```

Then add a matching entry to the hardcoded mobile menu (lines ~243-279) — copy the exact JSX wrapper of the existing "Bookings" mobile entry, changing href to `/dashboard/orders` and the label to `Orders`.

- [ ] **Step 2: Create `app/(dashboard)/dashboard/orders/page.tsx`**

Follows the `self-service-log` pattern (client component, browser client, `useAuth`):

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Package, Truck } from "lucide-react";
import { orderStatusLabel } from "@/lib/products/orderStatus";
import type { ProductOrderItemRow, ProductOrderRow } from "@/types/db";

type OrderWithItems = ProductOrderRow & { product_order_items: ProductOrderItemRow[] };

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-blue-100 text-blue-800",
  ready_for_pickup: "bg-green-100 text-green-800",
  out_for_delivery: "bg-amber-100 text-amber-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-gray-100 text-gray-500",
  refunded: "bg-red-100 text-red-800",
  pending: "bg-gray-100 text-gray-500",
};

export default function OrdersPage() {
  const supabase = createClient();
  const { user, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("product_orders")
        .select("*, product_order_items (*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error(error);
        toast.error("Failed to load your orders");
      }
      setOrders((data as OrderWithItems[]) ?? []);
      setLoading(false);
    }
    if (!authLoading) fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-900" />
      </div>
    );
  }

  // Hide never-paid checkouts; they're noise to the customer.
  const visible = orders.filter(
    (o) => o.status !== "pending" && o.status !== "cancelled",
  );

  if (visible.length === 0) {
    return (
      <div className="py-24 text-center">
        <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-bold">No orders yet</h1>
        <p className="mb-6 text-muted-foreground">
          Products you buy will show up here with their status.
        </p>
        <Link href="/products">
          <Button className="bg-blue-900 hover:bg-blue-800">Shop products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Your orders</h1>
      {visible.map((order) => (
        <Card key={order.id}>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                {order.fulfillment_method === "delivery" ? (
                  <Truck className="h-4 w-4" />
                ) : (
                  <Package className="h-4 w-4" />
                )}
                {order.fulfillment_method === "delivery" ? "Delivery" : "Pickup"}
                <span className="font-normal text-muted-foreground">
                  · {new Date(order.created_at).toLocaleDateString()}
                </span>
              </CardTitle>
              <Badge className={STATUS_STYLES[order.status] ?? ""}>
                {orderStatusLabel(order.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {order.product_order_items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  {item.name}{" "}
                  <span className="text-muted-foreground">×{item.quantity}</span>
                </span>
                <span>${(item.unit_price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery fee</span>
                <span>${order.delivery_fee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-sm font-bold">
              <span>Total</span>
              <span>${order.total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Manual verification**

With the orders from Task 10's test purchases: `/dashboard/orders` lists them newest-first with correct status badges, items, and totals; the desktop nav and mobile menu both show Orders; a second account sees none of them (RLS).

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/dashboard/orders/" components/user/authNavbar.tsx
git commit -m "feat(dashboard): customer order history page"
```

---

### Task 12: Admin order APIs — status transition + refund

**Files:**
- Create: `app/api/admin/product-orders/update-status/route.ts`
- Create: `app/api/admin/product-orders/refund/route.ts`

**Interfaces:**
- Consumes: `requireAdmin(supabase, admin)` from `@/lib/auth/guards`; `apiError`, `ApiError`; `canTransition` from `@/lib/products/orderStatus`; the three status emails from `@/lib/email/product-order-emails`; `stripe`.
- Produces:
  - `POST /api/admin/product-orders/update-status` body `{ order_id: string, to_status: "ready_for_pickup" | "out_for_delivery" | "completed" }` → `{ ok: true }`. Validates with `canTransition`; sends the matching email (none for `completed`). `refunded` is NOT accepted here — refunds go through the refund route so money and status can't diverge.
  - `POST /api/admin/product-orders/refund` body `{ order_id: string }` → `{ ok: true }`. Creates the Stripe refund, sets status `refunded`, emails the customer.

- [ ] **Step 1: Create `app/api/admin/product-orders/update-status/route.ts`**

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError, ApiError } from "@/lib/http/apiError";
import { canTransition } from "@/lib/products/orderStatus";
import {
  sendProductOrderOutForDeliveryEmail,
  sendProductOrderReadyForPickupEmail,
} from "@/lib/email/product-order-emails";

const ALLOWED_TARGETS = ["ready_for_pickup", "out_for_delivery", "completed"];

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    await requireAdmin(supabase, admin);

    const { order_id, to_status } = await req.json();
    if (!order_id || !ALLOWED_TARGETS.includes(to_status)) {
      throw new ApiError("Invalid status update", 400);
    }

    const { data: order } = await admin
      .from("product_orders")
      .select("*")
      .eq("id", order_id)
      .maybeSingle();
    if (!order) throw new ApiError("Order not found", 404);

    if (
      !canTransition(
        order.status,
        to_status,
        order.fulfillment_method as "pickup" | "delivery",
      )
    ) {
      throw new ApiError(
        `Cannot move a ${order.status} ${order.fulfillment_method} order to ${to_status}`,
        400,
      );
    }

    const { error } = await admin
      .from("product_orders")
      .update({ status: to_status, updated_at: new Date().toISOString() })
      .eq("id", order_id)
      .eq("status", order.status); // guard against concurrent staff clicks
    if (error) throw new ApiError("Failed to update the order", 500);

    // Notify the customer (senders log-don't-throw).
    if (to_status === "ready_for_pickup" || to_status === "out_for_delivery") {
      const { data: profile } = await admin
        .from("profiles")
        .select("email, full_name")
        .eq("id", order.user_id)
        .maybeSingle();
      if (profile?.email) {
        const args = {
          to: profile.email,
          name: profile.full_name ?? "there",
          orderId: order.id,
        };
        if (to_status === "ready_for_pickup") {
          await sendProductOrderReadyForPickupEmail(args);
        } else {
          await sendProductOrderOutForDeliveryEmail(args);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
```

- [ ] **Step 2: Create `app/api/admin/product-orders/refund/route.ts`**

First refund code in the codebase — `stripe.refunds.create` against the stored payment intent:

```ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError, ApiError } from "@/lib/http/apiError";
import { canTransition } from "@/lib/products/orderStatus";
import { sendProductOrderRefundedEmail } from "@/lib/email/product-order-emails";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    await requireAdmin(supabase, admin);

    const { order_id } = await req.json();
    if (!order_id) throw new ApiError("Missing order_id", 400);

    const { data: order } = await admin
      .from("product_orders")
      .select("*")
      .eq("id", order_id)
      .maybeSingle();
    if (!order) throw new ApiError("Order not found", 404);
    if (
      !canTransition(
        order.status,
        "refunded",
        order.fulfillment_method as "pickup" | "delivery",
      )
    ) {
      throw new ApiError(`A ${order.status} order cannot be refunded`, 400);
    }
    if (!order.stripe_payment_intent_id) {
      throw new ApiError("Order has no payment to refund", 400);
    }

    // Refund the money FIRST; only mark refunded if Stripe succeeded.
    await stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id });

    const { error } = await admin
      .from("product_orders")
      .update({ status: "refunded", updated_at: new Date().toISOString() })
      .eq("id", order_id);
    if (error) {
      // Money moved but status didn't — surface loudly for manual fix.
      console.error(
        "[refund] Stripe refund succeeded but status update failed for order:",
        order_id,
        error,
      );
      throw new ApiError(
        "Refund issued but the order status could not be updated — refresh and check",
        500,
      );
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("email, full_name")
      .eq("id", order.user_id)
      .maybeSingle();
    if (profile?.email) {
      await sendProductOrderRefundedEmail({
        to: profile.email,
        name: profile.full_name ?? "there",
        orderId: order.id,
        total: order.total,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
```

- [ ] **Step 3: Lint + tests**

Run: `npm run lint` and `npm test`
Expected: green (transition logic is already covered by `orderStatus.test.ts`).

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/product-orders/
git commit -m "feat(admin): product order status transition and refund APIs"
```

---

### Task 13: Admin orders queue (`/admin/orders`)

**Files:**
- Create: `app/admin/orders/page.tsx`
- Create: `app/admin/orders/orders-view.tsx`

**Interfaces:**
- Consumes: tables `product_orders` + `product_order_items` (admin RLS read) and `profiles` (admin read policy exists); `nextActionFor`, `orderStatusLabel` from `@/lib/products/orderStatus`; `POST /api/admin/product-orders/update-status` and `.../refund` from Task 12. Note: `product_orders.user_id` references `auth.users`, NOT `profiles`, so PostgREST cannot embed profiles — fetch profiles separately with `.in("id", userIds)`.
- Produces: the fulfillment queue.

- [ ] **Step 1: Create the server shell `app/admin/orders/page.tsx`**

```tsx
import OrdersView from "./orders-view";

export default function Orders() {
  return (
    <div className="flex-1 overflow-y-auto mt-16 lg:mt-0 p-6">
      <OrdersView />
    </div>
  );
}
```

- [ ] **Step 2: Create `app/admin/orders/orders-view.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Package, Truck } from "lucide-react";
import { nextActionFor, orderStatusLabel } from "@/lib/products/orderStatus";
import type { ProductOrderItemRow, ProductOrderRow } from "@/types/db";

type OrderWithItems = ProductOrderRow & { product_order_items: ProductOrderItemRow[] };
type CustomerInfo = { email: string | null; full_name: string | null };

const NEEDS_ACTION = ["paid", "ready_for_pickup", "out_for_delivery"];

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-blue-100 text-blue-800",
  ready_for_pickup: "bg-green-100 text-green-800",
  out_for_delivery: "bg-amber-100 text-amber-800",
  completed: "bg-gray-100 text-gray-800",
  refunded: "bg-red-100 text-red-800",
};

/** delivery_address is the Stripe shipping_details JSON. */
function formatAddress(raw: unknown): string | null {
  const details = raw as {
    name?: string;
    address?: {
      line1?: string;
      line2?: string | null;
      city?: string;
      state?: string;
      postal_code?: string;
    };
  } | null;
  if (!details?.address) return null;
  const a = details.address;
  const parts = [
    details.name,
    a.line1,
    a.line2,
    [a.city, a.state, a.postal_code].filter(Boolean).join(" "),
  ].filter(Boolean);
  return parts.join(", ");
}

export default function OrdersView() {
  const supabase = createClient();

  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [customers, setCustomers] = useState<Record<string, CustomerInfo>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("needs_action");
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<OrderWithItems | null>(null);

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("product_orders")
      .select("*, product_order_items (*)")
      .neq("status", "pending")
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      toast.error("Failed to load orders");
      setLoading(false);
      return;
    }
    const rows = (data as OrderWithItems[]) ?? [];
    setOrders(rows);

    const userIds = [...new Set(rows.map((o) => o.user_id))];
    if (userIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);
      const map: Record<string, CustomerInfo> = {};
      for (const p of profiles ?? []) {
        map[p.id] = { email: p.email, full_name: p.full_name };
      }
      setCustomers(map);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const callApi = async (path: string, body: object, orderId: string) => {
    setBusyOrderId(orderId);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Action failed");
        return;
      }
      toast.success("Order updated");
      fetchOrders();
    } catch (error) {
      console.error(error);
      toast.error("Action failed");
    } finally {
      setBusyOrderId(null);
    }
  };

  const filtered = orders.filter((o) =>
    statusFilter === "needs_action"
      ? NEEDS_ACTION.includes(o.status)
      : statusFilter === "all"
        ? true
        : o.status === statusFilter,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Product orders</h1>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="needs_action">Needs action</SelectItem>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="ready_for_pickup">Ready for pickup</SelectItem>
            <SelectItem value="out_for_delivery">Out for delivery</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          {statusFilter === "needs_action"
            ? "No orders need action right now."
            : "No orders match this filter."}
        </p>
      ) : (
        filtered.map((order) => {
          const customer = customers[order.user_id];
          const action = nextActionFor(order);
          const address = formatAddress(order.delivery_address);
          const busy = busyOrderId === order.id;
          const canRefund = NEEDS_ACTION.includes(order.status);
          return (
            <Card key={order.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {order.fulfillment_method === "delivery" ? (
                      <Truck className="h-4 w-4" />
                    ) : (
                      <Package className="h-4 w-4" />
                    )}
                    {order.fulfillment_method === "delivery"
                      ? "Delivery"
                      : "Pickup"}
                    <span className="font-normal text-muted-foreground">
                      · {new Date(order.created_at).toLocaleString()}
                    </span>
                  </CardTitle>
                  <Badge className={STATUS_STYLES[order.status] ?? ""}>
                    {orderStatusLabel(order.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <p className="font-medium">
                    {customer?.full_name ?? "Unknown customer"}
                  </p>
                  <p className="text-muted-foreground">
                    {customer?.email ?? "no email"}
                    {order.phone ? ` · ${order.phone}` : ""}
                  </p>
                  {order.fulfillment_method === "delivery" && (
                    <p className="mt-1 font-medium text-amber-700">
                      {address ?? "No address on file"}
                    </p>
                  )}
                </div>

                <div className="space-y-1 rounded-md bg-muted/40 p-3">
                  {order.product_order_items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {item.name}{" "}
                        <span className="text-muted-foreground">
                          ×{item.quantity}
                        </span>
                      </span>
                      <span>${(item.unit_price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  {order.delivery_fee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Delivery fee</span>
                      <span>${order.delivery_fee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1 text-sm font-bold">
                    <span>Total</span>
                    <span>${order.total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {action && (
                    <Button
                      className="bg-blue-900 hover:bg-blue-800"
                      disabled={busy}
                      onClick={() =>
                        callApi(
                          "/api/admin/product-orders/update-status",
                          { order_id: order.id, to_status: action.to },
                          order.id,
                        )
                      }
                    >
                      {busy ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {action.label}
                    </Button>
                  )}
                  {canRefund && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => setRefundTarget(order)}
                    >
                      Refund
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      <AlertDialog
        open={refundTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRefundTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refund this order?</AlertDialogTitle>
            <AlertDialogDescription>
              This refunds ${refundTarget?.total.toFixed(2)} to the customer
              through Stripe and marks the order refunded. Stock is not
              restocked automatically — adjust it on the Products page if the
              items come back to the shelf.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (refundTarget) {
                  callApi(
                    "/api/admin/product-orders/refund",
                    { order_id: refundTarget.id },
                    refundTarget.id,
                  );
                }
                setRefundTarget(null);
              }}
            >
              Refund order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

Note: if `components/ui/alert-dialog.tsx` is missing (`ls components/ui/`), add it with `npx shadcn@latest add alert-dialog` (it exists — `components/remove-vehicle-dialog.tsx` uses it — but verify).

- [ ] **Step 3: Manual verification**

As admin on `/admin/orders`, using Task 10's test orders:
1. Default "Needs action" filter shows the paid orders; pickup order offers "Mark ready for pickup", delivery order offers "Mark out for delivery" and shows the address.
2. Advance the pickup order: ready → email arrives → "Mark completed" → drops out of Needs action.
3. Refund the delivery order: confirm dialog → Stripe dashboard shows the refund → status badge "Refunded" → refund email arrives.
4. Status filter and empty states behave.

- [ ] **Step 4: Commit**

```bash
git add app/admin/orders/
git commit -m "feat(admin): product order fulfillment queue with status actions and refunds"
```

---

### Task 14: PRODUCT.md update + end-to-end verification

**Files:**
- Modify: `PRODUCT.md` (lines 49-57 capabilities, lines 77-78 open/undecided, line 98 evidence)

- [ ] **Step 1: Update PRODUCT.md**

Three edits:

**(a)** In **Customer capabilities** (after the "Self-service check-in and usage logging." bullet, ~line 51), add:

```markdown
- Product store: browse car-care products, cart checkout via Stripe, choose pickup at the store or local delivery (flat fee), track order status in the dashboard.
```

**(b)** In **Admin capabilities** (~line 55), extend the first bullet's list — change:

```markdown
- Bookings (including walk-in), users, subscriptions, services, add-ons, promo codes, QR codes, broadcast email, blog posts, contact triage, settings.
```

to:

```markdown
- Bookings (including walk-in), users, subscriptions, services, add-ons, products catalog, product-order fulfillment (pickup/delivery, refunds, delivery-fee setting), promo codes, QR codes, broadcast email, blog posts, contact triage, settings.
```

**(c)** In **Open / undecided** (~lines 77-78), REMOVE the bullet:

```markdown
- Whether the `/products` retail storefront is a real merchandise line is **not confirmed**. Treat it as unverified: leave existing code alone, but do not add navigation, promotion, or proof that presents it as a live store until it is confirmed.
```

(If it was the only bullet, replace the section body with `Nothing currently.`)

**(d)** In **Evidence on Hand → Unverified** (~line 98), remove the line:

```markdown
- The `/products` storefront (see Capabilities).
```

- [ ] **Step 2: Full-loop E2E verification checklist (Stripe test mode)**

Run through the whole story once, in order, and note any failure before claiming done:

1. Admin creates a product with image + stock 2, sets delivery fee $7.50.
2. Signed-out visitor browses `/products`, adds 2 units, sees the navbar badge.
3. Checkout prompts sign-in; after signing in the cart is intact; picks **Delivery**; Stripe collects address + phone; pays with `4242 4242 4242 4242`.
4. Success page shows the order; cart badge cleared; confirmation email received; stock now 0; product shows "Out of stock" on `/products`.
5. `/dashboard/orders` shows the order as Paid.
6. Admin queue: order shows address + phone → "Mark out for delivery" (email) → "Mark completed".
7. Second purchase attempt of the same product blocks at add-to-cart/checkout (out of stock).
8. A **Pickup** order: no address form at Stripe; queue shows "Mark ready for pickup" (email); refund it → Stripe refund visible, refund email, badge Refunded.
9. `npm test` and `npm run lint` green; `npm run build` completes.

- [ ] **Step 3: Commit**

```bash
git add PRODUCT.md
git commit -m "docs: confirm the product store as a live capability in PRODUCT.md"
```

---

## Deferred (explicitly out of scope — from the spec)

Guest checkout; product reviews/ratings; delivery zones/radius/free-over-$X; multi-image galleries; product variants/SKUs; restock-on-refund automation. Do not build these.








