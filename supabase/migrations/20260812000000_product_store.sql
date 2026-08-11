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
-- webhook, admin API routes) with the service-role key, which bypasses RLS --
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
