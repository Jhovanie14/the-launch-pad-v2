-- Shipping online orders with Shippo (USPS).
-- Spec: docs/superpowers/specs/2026-11-25-shippo-shipping-design.md
--
-- 1. Products get a shipping weight (oz, packed in its pouch).
-- 2. Store settings get the pouch sizes and states we don't ship to.
-- 3. Orders get the shipping fields: service, Shippo ids, tracking, problems.
-- 4. A place_product_order overload that stores a shipping order atomically.
--    The original 6-argument function stays for pickup.

alter table public.products
  add column if not exists weight_oz numeric;

alter table public.products
  drop constraint if exists products_weight_oz_positive;
alter table public.products
  add constraint products_weight_oz_positive check (weight_oz is null or weight_oz > 0);

comment on column public.products.weight_oz is
  'Shipping weight in ounces, packed in its pouch. Null means the product cannot be shipped yet.';

alter table public.store_settings
  add column if not exists shipping_pouches jsonb,
  add column if not exists shipping_excluded_states text[] not null default '{}';

comment on column public.store_settings.shipping_pouches is
  'Pouches staff pack into: [{ name, length_in, width_in, height_in, max_weight_oz }]. Null means the default 13x10x1 in, 160 oz.';
comment on column public.store_settings.shipping_excluded_states is
  'US state codes we do not ship to (for example AK, HI).';

alter table public.product_orders
  add column if not exists shipping_service text,
  add column if not exists shipping_rate_id text,
  add column if not exists shippo_order_id text unique,
  add column if not exists tracking_number text,
  add column if not exists tracking_url text,
  add column if not exists carrier text,
  add column if not exists label_url text,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists shipping_problem text,
  add column if not exists shippo_push_error text;

create index if not exists product_orders_tracking_number_idx
  on public.product_orders (tracking_number)
  where tracking_number is not null;

-- Insert an order (pickup or shipping), its item snapshots, and take the
-- stock, all or nothing. Shipping orders are card only.
create or replace function public.place_product_order(
  p_user_id uuid,
  p_payment_method text,
  p_items jsonb,
  p_subtotal numeric,
  p_total numeric,
  p_phone text,
  p_fulfillment_method text,
  p_delivery_fee numeric,
  p_delivery_address jsonb,
  p_shipping_service text,
  p_shipping_rate_id text
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
  if p_fulfillment_method not in ('pickup','delivery') then
    raise exception 'invalid_fulfillment';
  end if;
  if p_fulfillment_method = 'delivery' and p_payment_method <> 'card' then
    raise exception 'delivery_needs_card';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_order';
  end if;

  insert into public.product_orders (
    user_id, status, fulfillment_method, payment_method, payment_status,
    fulfilment_status, phone, subtotal, delivery_fee, total, stock_taken,
    delivery_address, shipping_service, shipping_rate_id
  ) values (
    p_user_id, 'pending', p_fulfillment_method, p_payment_method, 'unpaid',
    'placed', p_phone, p_subtotal, coalesce(p_delivery_fee, 0), p_total, true,
    p_delivery_address, p_shipping_service, p_shipping_rate_id
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

revoke all on function public.place_product_order(uuid, text, jsonb, numeric, numeric, text, text, numeric, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.place_product_order(uuid, text, jsonb, numeric, numeric, text, text, numeric, jsonb, text, text) to service_role;

notify pgrst, 'reload schema';
