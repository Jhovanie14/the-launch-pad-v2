-- Store orders: pickup and pay-at-store.
-- Spec: docs/superpowers/specs/2026-11-24-store-pickup-pay-at-store-design.md
--
-- Splits product_orders.status into payment and fulfilment, adds the hold and
-- hand-over columns, the pickup settings, and service-role functions that take
-- and return stock atomically. `status` stays (unused by new code) until a
-- later cleanup migration; a trigger keeps the new columns right while the old
-- code is still deployed.
--
-- Apply this, then merge the PR.

-- ── product_orders: new columns ─────────────────────────────────────────────
alter table public.product_orders
  add column if not exists payment_method text not null default 'card'
    check (payment_method in ('card','at_store')),
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','paid','refunded')),
  add column if not exists fulfilment_status text not null default 'placed'
    check (fulfilment_status in ('placed','ready','completed','released','cancelled','out_for_delivery')),
  add column if not exists paid_via text
    check (paid_via in ('stripe','cash','card_reader','counter_qr')),
  add column if not exists paid_at timestamptz,
  add column if not exists ready_at timestamptz,
  add column if not exists hold_until timestamptz,
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by uuid references auth.users (id),
  add column if not exists released_at timestamptz,
  add column if not exists stock_taken boolean not null default false,
  add column if not exists stock_released_at timestamptz,
  add column if not exists ref text generated always as (upper(left(id::text, 8))) stored;

comment on column public.product_orders.status is
  'deprecated: use payment_status/fulfilment_status. Dropped in a later cleanup migration.';
comment on column public.product_orders.stock_taken is
  'True once this order''s quantities have left products.stock.';
comment on column public.product_orders.hold_until is
  'Unpaid pay-at-store orders only: end of the Houston day the hold lasts through.';

create index if not exists product_orders_ref_idx on public.product_orders (ref);
create index if not exists product_orders_flow_idx
  on public.product_orders (fulfilment_status, payment_status);
create index if not exists product_orders_holds_idx on public.product_orders (hold_until)
  where payment_method = 'at_store' and payment_status = 'unpaid' and fulfilment_status = 'ready';

-- backfill (every existing order was paid by card through Stripe)
update public.product_orders set
  payment_method = 'card',
  fulfilment_status = case status
    when 'pending' then 'placed'
    when 'paid' then 'placed'
    when 'ready_for_pickup' then 'ready'
    when 'out_for_delivery' then 'out_for_delivery'
    when 'completed' then 'completed'
    when 'cancelled' then 'cancelled'
    when 'refunded' then 'cancelled'
  end,
  payment_status = case status
    when 'pending' then 'unpaid'
    when 'cancelled' then 'unpaid'
    when 'refunded' then 'refunded'
    else 'paid'
  end,
  paid_via = case when status in ('paid','ready_for_pickup','out_for_delivery','completed','refunded') then 'stripe' end,
  paid_at = case when status in ('paid','ready_for_pickup','out_for_delivery','completed','refunded') then created_at end,
  ready_at = case when status = 'ready_for_pickup' then updated_at end,
  completed_at = case when status = 'completed' then updated_at end,
  stock_taken = status in ('paid','ready_for_pickup','out_for_delivery','completed','refunded');

-- ── store_settings ──────────────────────────────────────────────────────────
alter table public.store_settings
  add column if not exists pickup_hours text,
  add column if not exists hold_days integer not null default 3
    check (hold_days between 1 and 14);

-- ── Deploy-window trigger ───────────────────────────────────────────────────
-- Until the new code ships, the old webhook and admin route write only
-- `status`. Mirror those writes onto the new columns. New code never writes
-- `status`, so after the merge this never fires.
create or replace function public.product_orders_sync_legacy_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;
  case new.status
    when 'paid' then
      new.payment_status := 'paid';
      new.paid_via := coalesce(new.paid_via, 'stripe');
      new.paid_at := coalesce(new.paid_at, now());
      new.stock_taken := true; -- the old webhook decrements stock itself
    when 'ready_for_pickup' then
      new.fulfilment_status := 'ready';
      new.ready_at := coalesce(new.ready_at, now());
    when 'out_for_delivery' then
      new.fulfilment_status := 'out_for_delivery';
    when 'completed' then
      new.fulfilment_status := 'completed';
      new.completed_at := coalesce(new.completed_at, now());
    when 'cancelled' then
      new.fulfilment_status := 'cancelled';
    when 'refunded' then
      new.payment_status := 'refunded';
      new.fulfilment_status := 'cancelled';
    else
      null;
  end case;
  return new;
end;
$$;

drop trigger if exists product_orders_sync_legacy_status on public.product_orders;
create trigger product_orders_sync_legacy_status
  before update of status on public.product_orders
  for each row execute function public.product_orders_sync_legacy_status();

-- ── Functions (service role only) ───────────────────────────────────────────

-- Insert an order, its item snapshots, and take the stock, all or nothing.
-- p_items: [{ "product_id", "name", "unit_price", "quantity" }]
create or replace function public.place_product_order(
  p_user_id uuid,
  p_payment_method text,
  p_items jsonb,
  p_subtotal numeric,
  p_total numeric,
  p_phone text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order uuid;
  v_item jsonb;
  v_qty integer;
  v_rows integer;
begin
  if p_payment_method not in ('card','at_store') then
    raise exception 'invalid_payment_method';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_order';
  end if;

  insert into public.product_orders (
    user_id, status, fulfillment_method, payment_method, payment_status,
    fulfilment_status, phone, subtotal, delivery_fee, total, stock_taken
  ) values (
    p_user_id, 'pending', 'pickup', p_payment_method, 'unpaid',
    'placed', p_phone, p_subtotal, 0, p_total, true
  )
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    insert into public.product_order_items (order_id, product_id, name, unit_price, quantity)
    values (v_order, (v_item->>'product_id')::uuid, v_item->>'name', (v_item->>'unit_price')::numeric, v_qty);

    update public.products
       set stock = stock - v_qty, updated_at = now()
     where id = (v_item->>'product_id')::uuid
       and stock >= v_qty;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      raise exception 'insufficient_stock:%', v_item->>'name';
    end if;
  end loop;

  return v_order;
end;
$$;

-- Legacy only: a pending order created before the deploy and paid after it.
-- Floored at zero like the old webhook; staff refund an oversell.
create or replace function public.take_product_order_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.product_orders set stock_taken = true
   where id = p_order_id and stock_taken = false;
  if not found then
    return;
  end if;

  update public.products p
     set stock = greatest(0, p.stock - i.qty), updated_at = now()
    from (
      select product_id, sum(quantity)::integer as qty
        from public.product_order_items
       where order_id = p_order_id and product_id is not null
       group by product_id
    ) i
   where p.id = i.product_id;
end;
$$;

-- Put an order's stock back once (released, cancelled, refunded before pickup).
create or replace function public.release_product_order_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.product_orders set stock_released_at = now()
   where id = p_order_id and stock_taken and stock_released_at is null;
  if not found then
    return;
  end if;

  update public.products p
     set stock = p.stock + i.qty, updated_at = now()
    from (
      select product_id, sum(quantity)::integer as qty
        from public.product_order_items
       where order_id = p_order_id and product_id is not null
       group by product_id
    ) i
   where p.id = i.product_id;
end;
$$;

revoke all on function public.place_product_order(uuid, text, jsonb, numeric, numeric, text) from public, anon, authenticated;
grant execute on function public.place_product_order(uuid, text, jsonb, numeric, numeric, text) to service_role;
revoke all on function public.take_product_order_stock(uuid) from public, anon, authenticated;
grant execute on function public.take_product_order_stock(uuid) to service_role;
revoke all on function public.release_product_order_stock(uuid) from public, anon, authenticated;
grant execute on function public.release_product_order_stock(uuid) to service_role;

-- ── Realtime (the admin sidebar's Store orders count) ──────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'product_orders'
  ) then
    alter publication supabase_realtime add table public.product_orders;
  end if;
end;
$$;
