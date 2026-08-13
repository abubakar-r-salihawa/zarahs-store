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
