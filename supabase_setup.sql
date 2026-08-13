-- ============================================================
-- ZARAH'S STORE â€” SAFE SUPABASE SETUP
-- Passwords belong in Supabase Auth and must never be stored in public tables.
-- The live project uses migration: secure_storefront_rls_and_seed_catalog.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.vendors (
  id text PRIMARY KEY,
  name text NOT NULL,
  tagline text,
  description text,
  rating numeric DEFAULT 5,
  review_count integer DEFAULT 0,
  logo text,
  primary_color text,
  secondary_color text,
  gradient text,
  card_gradient text,
  accent_color text,
  categories text[],
  banner_image text,
  whatsapp text,
  page text
);

CREATE TABLE IF NOT EXISTS public.products (
  id text PRIMARY KEY,
  vendor text NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL CHECK (price >= 0),
  original_price numeric,
  image text,
  in_stock boolean DEFAULT true,
  badge text,
  category text,
  size text,
  material text,
  origin text,
  sizes text[],
  notes jsonb
);

CREATE TABLE IF NOT EXISTS public.orders (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  customer_address text,
  items jsonb NOT NULL CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) > 0),
  total numeric NOT NULL CHECK (total >= 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','paid','shipped','delivered','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_vendor_idx ON public.products(vendor);
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders(created_at DESC);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.vendors, public.products, public.orders FROM anon, authenticated;
GRANT SELECT ON TABLE public.vendors, public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.vendors, public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.orders TO authenticated;

DROP POLICY IF EXISTS "catalog vendors are public" ON public.vendors;
CREATE POLICY "catalog vendors are public"
ON public.vendors FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admins manage vendors" ON public.vendors;
DROP POLICY IF EXISTS "vendors update own profile" ON public.vendors;
DROP POLICY IF EXISTS "staff add vendors" ON public.vendors;
DROP POLICY IF EXISTS "staff update vendors" ON public.vendors;
DROP POLICY IF EXISTS "staff delete vendors" ON public.vendors;

CREATE POLICY "staff add vendors"
ON public.vendors FOR INSERT TO authenticated
WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "staff update vendors"
ON public.vendors FOR UPDATE TO authenticated
USING (
  ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  OR id = ((select auth.jwt()) -> 'app_metadata' ->> 'vendor_id')
)
WITH CHECK (
  ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  OR id = ((select auth.jwt()) -> 'app_metadata' ->> 'vendor_id')
);

CREATE POLICY "staff delete vendors"
ON public.vendors FOR DELETE TO authenticated
USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "catalog products are public" ON public.products;
CREATE POLICY "catalog products are public"
ON public.products FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admins manage products" ON public.products;
DROP POLICY IF EXISTS "vendors add own products" ON public.products;
DROP POLICY IF EXISTS "vendors update own products" ON public.products;
DROP POLICY IF EXISTS "vendors delete own products" ON public.products;
DROP POLICY IF EXISTS "staff add products" ON public.products;
DROP POLICY IF EXISTS "staff update products" ON public.products;
DROP POLICY IF EXISTS "staff delete products" ON public.products;

CREATE POLICY "staff add products"
ON public.products FOR INSERT TO authenticated
WITH CHECK (
  ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  OR vendor = ((select auth.jwt()) -> 'app_metadata' ->> 'vendor_id')
);

CREATE POLICY "staff update products"
ON public.products FOR UPDATE TO authenticated
USING (
  ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  OR vendor = ((select auth.jwt()) -> 'app_metadata' ->> 'vendor_id')
)
WITH CHECK (
  ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  OR vendor = ((select auth.jwt()) -> 'app_metadata' ->> 'vendor_id')
);

CREATE POLICY "staff delete products"
ON public.products FOR DELETE TO authenticated
USING (
  ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  OR vendor = ((select auth.jwt()) -> 'app_metadata' ->> 'vendor_id')
);

DROP POLICY IF EXISTS "customers create own orders" ON public.orders;
CREATE POLICY "customers create own orders"
ON public.orders FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = user_id AND status = 'pending');

DROP POLICY IF EXISTS "customers read own orders" ON public.orders;
DROP POLICY IF EXISTS "admins read all orders" ON public.orders;
DROP POLICY IF EXISTS "authorized users read orders" ON public.orders;
CREATE POLICY "authorized users read orders"
ON public.orders FOR SELECT TO authenticated
USING (
  (select auth.uid()) = user_id
  OR ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

DROP POLICY IF EXISTS "admins update orders" ON public.orders;
CREATE POLICY "admins update orders"
ON public.orders FOR UPDATE TO authenticated
USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

-- Staff authorization:
-- Set app_metadata.role to "admin" or "vendor" from a trusted server/admin tool.
-- Vendor accounts must also have app_metadata.vendor_id matching vendors.id.
-- Never use user_metadata for authorization and never expose the service-role key.



-- Secure vendor access management used by the Admin Control Panel.
-- Vendor passwords are never stored; access is assigned to an exact Google email.
ALTER TABLE private.staff_identity
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE private.staff_identity s
SET user_id = u.id
FROM auth.users u
WHERE lower(u.email) = s.email
  AND s.user_id IS DISTINCT FROM u.id;

CREATE UNIQUE INDEX IF NOT EXISTS staff_identity_user_id_unique_idx
  ON private.staff_identity(user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS staff_identity_vendor_unique_idx
  ON private.staff_identity(vendor_id)
  WHERE role = 'vendor';

CREATE OR REPLACE FUNCTION private.assign_staff_claims()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  staff private.staff_identity%ROWTYPE;
BEGIN
  UPDATE private.staff_identity
  SET user_id = NULL
  WHERE user_id = NEW.id
    AND email <> lower(NEW.email);

  SELECT * INTO staff
  FROM private.staff_identity
  WHERE email = lower(NEW.email);

  IF FOUND THEN
    NEW.raw_app_meta_data := coalesce(NEW.raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', staff.role)
      || CASE
           WHEN staff.vendor_id IS NULL THEN '{}'::jsonb
           ELSE jsonb_build_object('vendor_id', staff.vendor_id)
         END;

    UPDATE private.staff_identity
    SET user_id = NEW.id
    WHERE email = staff.email;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.assign_staff_claims() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.manage_vendor_account(
  p_admin_user_id uuid,
  p_action text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_vendor_id text;
  v_email text;
  v_whatsapp text;
  v_user_id uuid;
  v_result jsonb;
BEGIN
  IF p_admin_user_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM private.staff_identity
    WHERE user_id = p_admin_user_id
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;

  IF p_action = 'list' THEN
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'vendorId', v.id,
          'vendorName', v.name,
          'email', s.email,
          'whatsapp', v.whatsapp,
          'accountCreated', s.user_id IS NOT NULL
        )
        ORDER BY v.name
      ),
      '[]'::jsonb
    )
    INTO v_result
    FROM public.vendors v
    LEFT JOIN private.staff_identity s
      ON s.vendor_id = v.id
     AND s.role = 'vendor';

    RETURN v_result;
  END IF;

  v_vendor_id := lower(btrim(coalesce(p_payload ->> 'id', '')));

  IF v_vendor_id !~ '^[a-z0-9-]{2,50}$' THEN
    RAISE EXCEPTION 'Vendor ID must contain only lowercase letters, numbers, and hyphens';
  END IF;

  IF p_action = 'delete' THEN
    IF v_vendor_id IN ('perfume', 'kitchen', 'variety') THEN
      RAISE EXCEPTION 'Core boutiques cannot be deleted';
    END IF;

    UPDATE auth.users u
    SET raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb)
      - 'role' - 'vendor_id'
    FROM private.staff_identity s
    WHERE s.vendor_id = v_vendor_id
      AND s.role = 'vendor'
      AND s.user_id = u.id;

    DELETE FROM private.staff_identity
    WHERE vendor_id = v_vendor_id
      AND role = 'vendor';

    DELETE FROM public.vendors
    WHERE id = v_vendor_id;

    RETURN jsonb_build_object('success', true, 'vendorId', v_vendor_id);
  END IF;

  IF p_action <> 'upsert' THEN
    RAISE EXCEPTION 'Unsupported vendor-management action';
  END IF;

  v_email := lower(btrim(coalesce(p_payload ->> 'email', '')));
  v_whatsapp := regexp_replace(coalesce(p_payload ->> 'whatsapp', ''), '[^0-9]', '', 'g');

  IF v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Enter a valid vendor Google email';
  END IF;

  IF v_whatsapp !~ '^[0-9]{10,15}$' THEN
    RAISE EXCEPTION 'WhatsApp number must include a valid country code';
  END IF;

  IF nullif(btrim(coalesce(p_payload ->> 'name', '')), '') IS NULL THEN
    RAISE EXCEPTION 'Boutique name is required';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM private.staff_identity
    WHERE email = v_email
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'The store-owner account cannot be reassigned as a vendor';
  END IF;

  UPDATE auth.users u
  SET raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb)
    - 'role' - 'vendor_id'
  FROM private.staff_identity s
  WHERE s.vendor_id = v_vendor_id
    AND s.role = 'vendor'
    AND s.email <> v_email
    AND s.user_id = u.id;

  DELETE FROM private.staff_identity
  WHERE vendor_id = v_vendor_id
    AND role = 'vendor'
    AND email <> v_email;

  INSERT INTO public.vendors (
    id, name, tagline, description, rating, review_count, logo,
    primary_color, secondary_color, gradient, card_gradient,
    accent_color, categories, banner_image, whatsapp, page
  )
  VALUES (
    v_vendor_id,
    btrim(p_payload ->> 'name'),
    nullif(btrim(coalesce(p_payload ->> 'tagline', '')), ''),
    nullif(btrim(coalesce(p_payload ->> 'description', '')), ''),
    coalesce(nullif(p_payload ->> 'rating', '')::numeric, 5),
    coalesce(nullif(p_payload ->> 'reviewCount', '')::integer, 0),
    nullif(btrim(coalesce(p_payload ->> 'logo', '')), ''),
    nullif(btrim(coalesce(p_payload ->> 'primaryColor', '')), ''),
    nullif(btrim(coalesce(p_payload ->> 'secondaryColor', '')), ''),
    nullif(btrim(coalesce(p_payload ->> 'gradient', '')), ''),
    nullif(btrim(coalesce(p_payload ->> 'cardGradient', '')), ''),
    nullif(btrim(coalesce(p_payload ->> 'accentColor', '')), ''),
    coalesce(
      ARRAY(SELECT jsonb_array_elements_text(coalesce(p_payload -> 'categories', '[]'::jsonb))),
      ARRAY[]::text[]
    ),
    nullif(btrim(coalesce(p_payload ->> 'bannerImage', '')), ''),
    v_whatsapp,
    coalesce(
      nullif(btrim(coalesce(p_payload ->> 'page', '')), ''),
      'store.html?vendor=' || v_vendor_id
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    description = EXCLUDED.description,
    rating = EXCLUDED.rating,
    review_count = EXCLUDED.review_count,
    logo = EXCLUDED.logo,
    primary_color = EXCLUDED.primary_color,
    secondary_color = EXCLUDED.secondary_color,
    gradient = EXCLUDED.gradient,
    card_gradient = EXCLUDED.card_gradient,
    accent_color = EXCLUDED.accent_color,
    categories = EXCLUDED.categories,
    banner_image = EXCLUDED.banner_image,
    whatsapp = EXCLUDED.whatsapp,
    page = EXCLUDED.page;

  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = v_email
  LIMIT 1;

  INSERT INTO private.staff_identity(email, role, vendor_id, user_id)
  VALUES (v_email, 'vendor', v_vendor_id, v_user_id)
  ON CONFLICT (email) DO UPDATE SET
    role = 'vendor',
    vendor_id = v_vendor_id,
    user_id = EXCLUDED.user_id;

  IF v_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', 'vendor', 'vendor_id', v_vendor_id)
    WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'vendorId', v_vendor_id,
    'email', v_email,
    'whatsapp', v_whatsapp,
    'accountCreated', v_user_id IS NOT NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.manage_vendor_account(uuid, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_vendor_account(uuid, text, jsonb)
  TO service_role;


-- Boutique-specific WhatsApp order management.
CREATE TABLE IF NOT EXISTS public.vendor_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  vendor_id text NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text NOT NULL,
  customer_address text NOT NULL,
  items jsonb NOT NULL,
  subtotal numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  status_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vendor_orders_order_vendor_unique'
      AND conrelid = 'public.vendor_orders'::regclass
  ) THEN
    ALTER TABLE public.vendor_orders
      ADD CONSTRAINT vendor_orders_order_vendor_unique UNIQUE (order_id, vendor_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vendor_orders_items_array'
      AND conrelid = 'public.vendor_orders'::regclass
  ) THEN
    ALTER TABLE public.vendor_orders
      ADD CONSTRAINT vendor_orders_items_array
      CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vendor_orders_subtotal_nonnegative'
      AND conrelid = 'public.vendor_orders'::regclass
  ) THEN
    ALTER TABLE public.vendor_orders
      ADD CONSTRAINT vendor_orders_subtotal_nonnegative CHECK (subtotal >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vendor_orders_status_allowed'
      AND conrelid = 'public.vendor_orders'::regclass
  ) THEN
    ALTER TABLE public.vendor_orders
      ADD CONSTRAINT vendor_orders_status_allowed
      CHECK (status IN ('pending', 'confirmed', 'paid', 'shipped', 'delivered', 'cancelled'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vendor_orders_status_note_length'
      AND conrelid = 'public.vendor_orders'::regclass
  ) THEN
    ALTER TABLE public.vendor_orders
      ADD CONSTRAINT vendor_orders_status_note_length
      CHECK (status_note IS NULL OR char_length(status_note) <= 500);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS vendor_orders_vendor_created_idx
  ON public.vendor_orders(vendor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS vendor_orders_user_created_idx
  ON public.vendor_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS vendor_orders_status_idx
  ON public.vendor_orders(status);

ALTER TABLE public.vendor_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers create own vendor orders" ON public.vendor_orders;
CREATE POLICY "customers create own vendor orders"
ON public.vendor_orders FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND status = 'pending'
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(items) AS item
    WHERE item ->> 'vendor' IS DISTINCT FROM vendor_id
  )
);

DROP POLICY IF EXISTS "authorized users read vendor orders" ON public.vendor_orders;
CREATE POLICY "authorized users read vendor orders"
ON public.vendor_orders FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  OR (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'vendor'
    AND vendor_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'vendor_id')
  )
);

DROP POLICY IF EXISTS "staff update vendor order fulfillment" ON public.vendor_orders;
CREATE POLICY "staff update vendor order fulfillment"
ON public.vendor_orders FOR UPDATE TO authenticated
USING (
  ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  OR (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'vendor'
    AND vendor_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'vendor_id')
  )
)
WITH CHECK (
  ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  OR (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'vendor'
    AND vendor_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'vendor_id')
  )
);

REVOKE ALL ON public.vendor_orders FROM anon, authenticated;
GRANT SELECT, INSERT ON public.vendor_orders TO authenticated;
GRANT UPDATE (status, status_note) ON public.vendor_orders TO authenticated;
GRANT ALL ON public.vendor_orders TO service_role;

CREATE OR REPLACE FUNCTION private.set_vendor_order_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.set_vendor_order_updated_at()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS set_vendor_order_updated_at ON public.vendor_orders;
CREATE TRIGGER set_vendor_order_updated_at
BEFORE UPDATE ON public.vendor_orders
FOR EACH ROW EXECUTE FUNCTION private.set_vendor_order_updated_at();

CREATE OR REPLACE FUNCTION public.place_whatsapp_order(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_customer_address text,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_order_id text;
  v_items jsonb;
  v_total numeric;
  v_requested_count integer;
  v_product_count integer;
  v_vendor_orders jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sign in before placing an order' USING ERRCODE = '42501';
  END IF;

  IF nullif(btrim(coalesce(p_customer_name, '')), '') IS NULL
     OR nullif(btrim(coalesce(p_customer_phone, '')), '') IS NULL
     OR nullif(btrim(coalesce(p_customer_address, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Customer name, phone, and delivery address are required';
  END IF;

  IF char_length(p_customer_name) > 150
     OR char_length(coalesce(p_customer_email, '')) > 320
     OR char_length(p_customer_phone) > 30
     OR char_length(p_customer_address) > 1000 THEN
    RAISE EXCEPTION 'Customer details are too long';
  END IF;

  IF p_items IS NULL
     OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0
     OR jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Order must contain between 1 and 50 items';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_items) AS item
    WHERE jsonb_typeof(item) <> 'object'
       OR nullif(item ->> 'id', '') IS NULL
       OR coalesce(item ->> 'qty', '') !~ '^[1-9][0-9]?$'
  ) THEN
    RAISE EXCEPTION 'Order contains an invalid product or quantity';
  END IF;

  WITH requested AS (
    SELECT item ->> 'id' AS product_id,
           sum((item ->> 'qty')::integer)::integer AS qty
    FROM jsonb_array_elements(p_items) AS item
    GROUP BY item ->> 'id'
  ),
  canonical AS (
    SELECT p.id,
           p.vendor,
           p.name,
           p.price,
           p.image,
           p.size,
           r.qty
    FROM requested r
    JOIN public.products p ON p.id = r.product_id
    WHERE p.in_stock = true
      AND r.qty BETWEEN 1 AND 99
  )
  SELECT jsonb_agg(
           jsonb_build_object(
             'id', id,
             'vendor', vendor,
             'name', name,
             'price', price,
             'image', image,
             'size', size,
             'qty', qty
           )
           ORDER BY vendor, name
         ),
         coalesce(sum(price * qty), 0),
         count(*)
  INTO v_items, v_total, v_product_count
  FROM canonical;

  SELECT count(DISTINCT item ->> 'id')
  INTO v_requested_count
  FROM jsonb_array_elements(p_items) AS item;

  IF v_items IS NULL OR v_product_count <> v_requested_count THEN
    RAISE EXCEPTION 'One or more products are unavailable. Refresh your cart and try again.';
  END IF;

  v_order_id := 'ZS-' || to_char(now(), 'YYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  INSERT INTO public.orders (
    id, user_id, customer_name, customer_email, customer_phone,
    customer_address, items, total, status
  )
  VALUES (
    v_order_id, v_user_id, btrim(p_customer_name),
    nullif(btrim(coalesce(p_customer_email, '')), ''),
    btrim(p_customer_phone), btrim(p_customer_address),
    v_items, v_total, 'pending'
  );

  WITH unpacked AS (
    SELECT item
    FROM jsonb_array_elements(v_items) AS item
  )
  INSERT INTO public.vendor_orders (
    order_id, vendor_id, user_id, customer_name, customer_email,
    customer_phone, customer_address, items, subtotal, status
  )
  SELECT
    v_order_id,
    item ->> 'vendor',
    v_user_id,
    btrim(p_customer_name),
    nullif(btrim(coalesce(p_customer_email, '')), ''),
    btrim(p_customer_phone),
    btrim(p_customer_address),
    jsonb_agg(item ORDER BY item ->> 'name'),
    sum((item ->> 'price')::numeric * (item ->> 'qty')::integer),
    'pending'
  FROM unpacked
  GROUP BY item ->> 'vendor';

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'vendorId', vendor_id,
      'items', items,
      'total', subtotal,
      'status', status
    )
    ORDER BY vendor_id
  )
  INTO v_vendor_orders
  FROM public.vendor_orders
  WHERE order_id = v_order_id;

  RETURN jsonb_build_object(
    'orderId', v_order_id,
    'total', v_total,
    'vendorOrders', coalesce(v_vendor_orders, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.place_whatsapp_order(text, text, text, text, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_whatsapp_order(text, text, text, text, jsonb)
  TO authenticated;


-- ============================================================
-- PAID HOMEPAGE PROMOTIONS
-- ============================================================

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  promotion_type text not null,
  vendor_id text references public.vendors(id) on update cascade on delete cascade,
  product_id text references public.products(id) on update cascade on delete cascade,
  title text,
  subtitle text,
  image_url text,
  link_url text,
  placement_level smallint not null default 1,
  amount_paid numeric(12,2) not null default 0,
  payment_status text not null default 'pending',
  status text not null default 'draft',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotions_type_check check (promotion_type in ('boutique','product','banner')),
  constraint promotions_dates_check check (ends_at > starts_at),
  constraint promotions_amount_check check (amount_paid >= 0),
  constraint promotions_level_check check (placement_level between 1 and 3),
  constraint promotions_payment_check check (payment_status in ('pending','paid','refunded')),
  constraint promotions_status_check check (status in ('draft','active','paused','cancelled')),
  constraint promotions_title_length check (title is null or char_length(title) <= 100),
  constraint promotions_subtitle_length check (subtitle is null or char_length(subtitle) <= 240),
  constraint promotions_target_check check (
    (promotion_type = 'boutique' and vendor_id is not null and product_id is null)
    or (promotion_type = 'product' and vendor_id is not null and product_id is not null)
    or (promotion_type = 'banner' and product_id is null and title is not null)
  )
);

create index promotions_active_window_idx
  on public.promotions (promotion_type, placement_level desc, starts_at, ends_at)
  where status = 'active' and payment_status = 'paid';
create index promotions_vendor_idx on public.promotions (vendor_id, created_at desc)
  where vendor_id is not null;
create index promotions_product_idx on public.promotions (product_id, created_at desc)
  where product_id is not null;
create index promotions_created_by_idx on public.promotions (created_by)
  where created_by is not null;

alter table public.promotions enable row level security;

create policy "Public can view current paid promotions"
on public.promotions
for select
to anon, authenticated
using (
  (
    status = 'active'
    and payment_status = 'paid'
    and starts_at <= now()
    and ends_at > now()
  )
  or coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
);

create policy "Admins can create promotions"
on public.promotions
for insert
to authenticated
with check (
  coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
  and created_by = (select auth.uid())
);

create policy "Admins can update promotions"
on public.promotions
for update
to authenticated
using (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin')
with check (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin');

create policy "Admins can delete promotions"
on public.promotions
for delete
to authenticated
using (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin');

revoke all on table public.promotions from public, anon, authenticated;
grant select on table public.promotions to anon, authenticated;
grant insert, update, delete on table public.promotions to authenticated;

create or replace function private.set_promotion_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_promotion_updated_at() from public, anon, authenticated;

create trigger promotions_set_updated_at
before update on public.promotions
for each row execute function private.set_promotion_updated_at();



-- ============================================================
-- VENDOR SUBSCRIPTIONS AND MANUAL BANK-TRANSFER RENEWALS
-- ============================================================

create table public.vendor_subscriptions (
  vendor_id text primary key references public.vendors(id) on update cascade on delete cascade,
  plan text not null default 'trial',
  status text not null default 'trial',
  access_started_at timestamptz not null default now(),
  current_period_start timestamptz not null default now(),
  access_ends_at timestamptz not null,
  last_payment_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_subscriptions_plan_check check (plan in ('trial','launch','monthly','annual')),
  constraint vendor_subscriptions_status_check check (status in ('trial','active','suspended','cancelled')),
  constraint vendor_subscriptions_period_check check (access_ends_at > current_period_start)
);

create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  vendor_id text not null references public.vendors(id) on update cascade on delete cascade,
  plan text not null,
  amount numeric(12,2) not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  payment_status text not null default 'paid',
  notes text,
  confirmed_by uuid references auth.users(id) on delete set null default auth.uid(),
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint subscription_payments_plan_check check (plan in ('launch','monthly','annual')),
  constraint subscription_payments_amount_check check (amount > 0),
  constraint subscription_payments_period_check check (period_end > period_start),
  constraint subscription_payments_status_check check (payment_status in ('paid','refunded')),
  constraint subscription_payments_notes_check check (notes is null or char_length(notes) <= 500)
);

create index vendor_subscriptions_access_idx
  on public.vendor_subscriptions (status, access_ends_at);
create index subscription_payments_vendor_idx
  on public.subscription_payments (vendor_id, confirmed_at desc);
create index subscription_payments_confirmed_by_idx
  on public.subscription_payments (confirmed_by)
  where confirmed_by is not null;

alter table public.vendor_subscriptions enable row level security;
alter table public.subscription_payments enable row level security;

create policy "Public sees active vendor access and staff see their records"
on public.vendor_subscriptions
for select
to anon, authenticated
using (
  (status in ('trial','active') and access_ends_at > now())
  or coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
  or vendor_id = coalesce((select auth.jwt()) -> 'app_metadata' ->> 'vendor_id', '')
);

create policy "Admins create vendor subscriptions"
on public.vendor_subscriptions
for insert
to authenticated
with check (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin');

create policy "Admins update vendor subscriptions"
on public.vendor_subscriptions
for update
to authenticated
using (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin')
with check (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin');

create policy "Admins delete vendor subscriptions"
on public.vendor_subscriptions
for delete
to authenticated
using (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin');

create policy "Admins and vendors view subscription payments"
on public.subscription_payments
for select
to authenticated
using (
  coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
  or vendor_id = coalesce((select auth.jwt()) -> 'app_metadata' ->> 'vendor_id', '')
);

create policy "Admins record subscription payments"
on public.subscription_payments
for insert
to authenticated
with check (
  coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
  and confirmed_by = (select auth.uid())
);

create policy "Admins update subscription payments"
on public.subscription_payments
for update
to authenticated
using (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin')
with check (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin');

create policy "Admins delete subscription payments"
on public.subscription_payments
for delete
to authenticated
using (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin');

revoke all on table public.vendor_subscriptions from public, anon, authenticated;
grant select on table public.vendor_subscriptions to anon, authenticated;
grant insert, update, delete on table public.vendor_subscriptions to authenticated;

revoke all on table public.subscription_payments from public, anon, authenticated;
grant select, insert, update, delete on table public.subscription_payments to authenticated;

create or replace function private.set_vendor_subscription_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function private.set_vendor_subscription_updated_at() from public, anon, authenticated;

create trigger vendor_subscriptions_set_updated_at
before update on public.vendor_subscriptions
for each row execute function private.set_vendor_subscription_updated_at();

create or replace function private.start_vendor_subscription_trial()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.vendor_subscriptions (
    vendor_id, plan, status, access_started_at, current_period_start, access_ends_at
  ) values (
    new.id, 'trial', 'trial', now(), now(), now() + interval '30 days'
  ) on conflict (vendor_id) do nothing;
  return new;
end;
$$;
revoke all on function private.start_vendor_subscription_trial() from public, anon, authenticated;

create trigger vendors_start_subscription_trial
after insert on public.vendors
for each row execute function private.start_vendor_subscription_trial();

insert into public.vendor_subscriptions (
  vendor_id, plan, status, access_started_at, current_period_start, access_ends_at
)
select id, 'trial', 'trial', now(), now(), now() + interval '30 days'
from public.vendors
on conflict (vendor_id) do nothing;

create policy "Subscribed boutiques remain visible"
on public.vendors
as restrictive
for select
to anon, authenticated
using (
  coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
  or id = coalesce((select auth.jwt()) -> 'app_metadata' ->> 'vendor_id', '')
  or exists (
    select 1
    from public.vendor_subscriptions subscription
    where subscription.vendor_id = vendors.id
      and subscription.status in ('trial','active')
      and subscription.access_ends_at > now()
  )
);

create policy "Subscribed products remain visible"
on public.products
as restrictive
for select
to anon, authenticated
using (
  coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
  or vendor = coalesce((select auth.jwt()) -> 'app_metadata' ->> 'vendor_id', '')
  or exists (
    select 1
    from public.vendor_subscriptions subscription
    where subscription.vendor_id = products.vendor
      and subscription.status in ('trial','active')
      and subscription.access_ends_at > now()
  )
);

create or replace function public.record_vendor_subscription_payment(
  p_vendor_id text,
  p_plan text,
  p_notes text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_amount numeric(12,2);
  v_duration interval;
  v_existing_end timestamptz;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_payment_id uuid;
  v_launch_count integer;
begin
  if coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'Admin access is required';
  end if;

  if p_plan = 'launch' then
    v_amount := 5000;
    v_duration := interval '30 days';
    select count(*) into v_launch_count
    from public.subscription_payments
    where vendor_id = p_vendor_id
      and plan = 'launch'
      and payment_status = 'paid';
    if v_launch_count >= 3 then
      raise exception 'This boutique has already used all three launch-rate renewals';
    end if;
  elsif p_plan = 'monthly' then
    v_amount := 10000;
    v_duration := interval '30 days';
  elsif p_plan = 'annual' then
    v_amount := 100000;
    v_duration := interval '365 days';
  else
    raise exception 'Invalid subscription plan';
  end if;

  select access_ends_at into v_existing_end
  from public.vendor_subscriptions
  where vendor_id = p_vendor_id
  for update;

  if not found then
    raise exception 'Subscription record not found';
  end if;

  v_period_start := greatest(v_existing_end, now());
  v_period_end := v_period_start + v_duration;

  insert into public.subscription_payments (
    vendor_id, plan, amount, period_start, period_end, payment_status, notes, confirmed_by
  ) values (
    p_vendor_id, p_plan, v_amount, v_period_start, v_period_end, 'paid',
    nullif(trim(p_notes), ''), (select auth.uid())
  )
  returning id into v_payment_id;

  update public.vendor_subscriptions
  set plan = p_plan,
      status = 'active',
      current_period_start = v_period_start,
      access_ends_at = v_period_end,
      last_payment_at = now()
  where vendor_id = p_vendor_id;

  return jsonb_build_object(
    'paymentId', v_payment_id,
    'vendorId', p_vendor_id,
    'plan', p_plan,
    'amount', v_amount,
    'periodStart', v_period_start,
    'periodEnd', v_period_end
  );
end;
$$;

revoke all on function public.record_vendor_subscription_payment(text,text,text) from public, anon;
grant execute on function public.record_vendor_subscription_payment(text,text,text) to authenticated;

create or replace function public.manage_vendor_subscription(
  p_vendor_id text,
  p_action text,
  p_days integer default null
)
returns public.vendor_subscriptions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_result public.vendor_subscriptions;
begin
  if coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'Admin access is required';
  end if;

  if p_action = 'suspend' then
    update public.vendor_subscriptions set status = 'suspended'
    where vendor_id = p_vendor_id returning * into v_result;
  elsif p_action = 'resume' then
    update public.vendor_subscriptions
    set status = case when plan = 'trial' then 'trial' else 'active' end
    where vendor_id = p_vendor_id returning * into v_result;
  elsif p_action = 'grant_days' then
    if p_days is null or p_days < 1 or p_days > 365 then
      raise exception 'Days must be between 1 and 365';
    end if;
    update public.vendor_subscriptions
    set access_ends_at = greatest(access_ends_at, now()) + make_interval(days => p_days),
        status = case
          when status = 'suspended' then 'suspended'
          when plan = 'trial' then 'trial'
          else 'active'
        end
    where vendor_id = p_vendor_id returning * into v_result;
  else
    raise exception 'Invalid subscription action';
  end if;

  if v_result.vendor_id is null then
    raise exception 'Subscription record not found';
  end if;
  return v_result;
end;
$$;

revoke all on function public.manage_vendor_subscription(text,text,integer) from public, anon;
grant execute on function public.manage_vendor_subscription(text,text,integer) to authenticated;

