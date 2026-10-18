-- Apply to the existing project after taking a backup. No catalog/order rows are deleted.
begin;
create table if not exists public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','vendor')),
  vendor_id text unique references public.vendors(id) on delete cascade,
  name text not null,
  check ((role='admin' and vendor_id is null) or (role='vendor' and vendor_id is not null))
);
alter table public.orders add column if not exists vendor_id text references public.vendors(id) on delete set null;
alter table public.orders add column if not exists checkout_key uuid;
alter table public.orders add column if not exists request_hash text;
create unique index if not exists orders_checkout_vendor on public.orders(checkout_key,vendor_id);

create or replace function public.is_store_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.staff_members where user_id=auth.uid() and role='admin');
$$;
create or replace function public.owns_store(store_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.staff_members where user_id=auth.uid() and vendor_id=store_id);
$$;
revoke all on function public.is_store_admin(), public.owns_store(text) from public;
grant execute on function public.is_store_admin(), public.owns_store(text) to authenticated;

-- Remove pre-existing policies on these application tables so permissive policies cannot survive.
do $$ declare p record; begin
  for p in select schemaname,tablename,policyname from pg_policies where schemaname='public'
    and tablename in ('vendors','products','orders','shoppers','admin_credentials','vendor_credentials','staff_members')
  loop execute format('drop policy %I on %I.%I',p.policyname,p.schemaname,p.tablename); end loop;
end $$;
alter table public.vendors enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.staff_members enable row level security;
revoke all on public.vendors,public.products,public.orders,public.staff_members from anon,authenticated;
grant select on public.vendors,public.products to anon,authenticated;
grant insert,update,delete on public.vendors,public.products to authenticated;
grant select on public.orders,public.staff_members to authenticated;
grant all on public.staff_members to service_role;
create policy catalog_read on public.vendors for select to anon,authenticated using(true);
create policy product_read on public.products for select to anon,authenticated using(true);
create policy vendor_admin_insert on public.vendors for insert to authenticated with check(public.is_store_admin());
create policy vendor_admin_delete on public.vendors for delete to authenticated using(public.is_store_admin());
create policy vendor_update on public.vendors for update to authenticated using(public.is_store_admin() or public.owns_store(id)) with check(public.is_store_admin() or public.owns_store(id));
create policy product_insert on public.products for insert to authenticated with check(public.is_store_admin() or public.owns_store(vendor));
create policy product_update on public.products for update to authenticated using(public.is_store_admin() or public.owns_store(vendor)) with check(public.is_store_admin() or public.owns_store(vendor));
create policy product_delete on public.products for delete to authenticated using(public.is_store_admin() or public.owns_store(vendor));
create policy staff_read on public.staff_members for select to authenticated using(user_id=auth.uid() or public.is_store_admin());
create policy order_admin_read on public.orders for select to authenticated using(public.is_store_admin());

-- Quarantine legacy password tables; existing data remains available only to the project owner.
do $$ declare t text; begin
  foreach t in array array['admin_credentials','vendor_credentials','shoppers'] loop
    if to_regclass('public.'||t) is not null then
      execute format('alter table public.%I enable row level security',t);
      execute format('revoke all on public.%I from anon,authenticated',t);
    end if;
  end loop;
end $$;

-- One transaction saves every vendor order, with server prices and retry protection.
create or replace function public.place_marketplace_order(request_id uuid, customer jsonb, cart jsonb, promo text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  entry jsonb; product public.products%rowtype; quantity integer; variant text;
  lines jsonb := '[]'; group_row record; result jsonb; fingerprint text;
  subtotal numeric := 0; discount numeric := 0; remaining_discount numeric; group_discount numeric; groups_left integer;
begin
  if request_id is null or customer is null or cart is null or promo is null or jsonb_typeof(customer) <> 'object' or jsonb_typeof(cart) <> 'array'
    or jsonb_array_length(cart) not between 1 and 100 or length(customer::text)>5000 then
    raise exception 'Invalid order request';
  end if;
  if coalesce(length(trim(customer->>'name')),0) not between 2 and 200
    or coalesce(length(trim(customer->>'address')),0) not between 5 and 1000
    or coalesce(customer->>'phone','') !~ '^\+?[0-9 ()-]{7,25}$' then
    raise exception 'Please provide a valid name, phone number and delivery address';
  end if;
  if promo not in ('','SAVE10') then raise exception 'Invalid promotion'; end if;
  fingerprint := md5(customer::text || cart::text || promo);
  perform pg_advisory_xact_lock(hashtextextended(request_id::text,0));
  if exists(select 1 from public.orders where checkout_key=request_id) then
    if exists(select 1 from public.orders where checkout_key=request_id and request_hash<>fingerprint) then
      raise exception 'Order request changed. Please start a new checkout';
    end if;
  else
    for entry in select value from jsonb_array_elements(cart) loop
      if coalesce(entry->>'qty','') !~ '^[0-9]{1,2}$' then raise exception 'Invalid quantity'; end if;
      quantity := (entry->>'qty')::integer;
      if quantity not between 1 and 99 then raise exception 'Invalid quantity'; end if;
      select * into product from public.products where id=entry->>'id' for share;
      if not found or product.vendor is null or product.in_stock is not true or product.price<=0 then raise exception 'A product is unavailable. Please review your cart'; end if;
      variant := nullif(entry->>'selectedSize','');
      if coalesce(array_length(product.sizes,1),0)>0 and (variant is null or not variant=any(product.sizes)) then raise exception 'Please select a valid product size'; end if;
      if (entry->>'price')::numeric is distinct from product.price then raise exception 'A price has changed. Refresh your cart before ordering'; end if;
      lines := lines || jsonb_build_array(jsonb_build_object('id',product.id,'vendor',product.vendor,'name',product.name,'price',product.price,'qty',quantity,'selectedSize',variant));
      subtotal := subtotal + product.price*quantity;
    end loop;
    discount := case when promo='SAVE10' then round(subtotal*0.1) else 0 end;
    remaining_discount := discount;
    select count(distinct value->>'vendor') into groups_left from jsonb_array_elements(lines);
    for group_row in select value->>'vendor' as vendor,jsonb_agg(value) as items,sum((value->>'price')::numeric*(value->>'qty')::integer) as amount
      from jsonb_array_elements(lines) group by value->>'vendor' order by value->>'vendor'
    loop
      group_discount := case when groups_left=1 then remaining_discount else round(discount*group_row.amount/subtotal,2) end;
      insert into public.orders(id,vendor_id,checkout_key,request_hash,customer_name,customer_email,customer_phone,customer_address,items,total,status)
      values('ZS-'||gen_random_uuid()::text,group_row.vendor,request_id,fingerprint,trim(customer->>'name'),customer->>'email',customer->>'phone',customer->>'address',group_row.items,group_row.amount-group_discount,'pending');
      remaining_discount := remaining_discount-group_discount; groups_left := groups_left-1;
    end loop;
  end if;
  select jsonb_agg(jsonb_build_object('id',o.id,'vendor',o.vendor_id,'name',v.name,'whatsapp',v.whatsapp,'items',o.items,'total',o.total) order by o.vendor_id)
    into result from public.orders o join public.vendors v on v.id=o.vendor_id where checkout_key=request_id;
  return result;
end $$;
revoke all on function public.place_marketplace_order(uuid,jsonb,jsonb,text) from public;
grant execute on function public.place_marketplace_order(uuid,jsonb,jsonb,text) to anon,authenticated;
commit;
