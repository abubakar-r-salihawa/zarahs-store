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
CREATE POLICY "admins manage vendors"
ON public.vendors FOR ALL TO authenticated
USING ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
WITH CHECK ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "vendors update own profile" ON public.vendors;
CREATE POLICY "vendors update own profile"
ON public.vendors FOR UPDATE TO authenticated
USING (id = (select auth.jwt() -> 'app_metadata' ->> 'vendor_id'))
WITH CHECK (id = (select auth.jwt() -> 'app_metadata' ->> 'vendor_id'));

DROP POLICY IF EXISTS "catalog products are public" ON public.products;
CREATE POLICY "catalog products are public"
ON public.products FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admins manage products" ON public.products;
CREATE POLICY "admins manage products"
ON public.products FOR ALL TO authenticated
USING ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
WITH CHECK ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "vendors add own products" ON public.products;
CREATE POLICY "vendors add own products"
ON public.products FOR INSERT TO authenticated
WITH CHECK (vendor = (select auth.jwt() -> 'app_metadata' ->> 'vendor_id'));

DROP POLICY IF EXISTS "vendors update own products" ON public.products;
CREATE POLICY "vendors update own products"
ON public.products FOR UPDATE TO authenticated
USING (vendor = (select auth.jwt() -> 'app_metadata' ->> 'vendor_id'))
WITH CHECK (vendor = (select auth.jwt() -> 'app_metadata' ->> 'vendor_id'));

DROP POLICY IF EXISTS "vendors delete own products" ON public.products;
CREATE POLICY "vendors delete own products"
ON public.products FOR DELETE TO authenticated
USING (vendor = (select auth.jwt() -> 'app_metadata' ->> 'vendor_id'));

DROP POLICY IF EXISTS "customers create own orders" ON public.orders;
CREATE POLICY "customers create own orders"
ON public.orders FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = user_id AND status = 'pending');

DROP POLICY IF EXISTS "customers read own orders" ON public.orders;
CREATE POLICY "customers read own orders"
ON public.orders FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "admins read all orders" ON public.orders;
CREATE POLICY "admins read all orders"
ON public.orders FOR SELECT TO authenticated
USING ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "admins update orders" ON public.orders;
CREATE POLICY "admins update orders"
ON public.orders FOR UPDATE TO authenticated
USING ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
WITH CHECK ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Staff authorization:
-- Set app_metadata.role to "admin" or "vendor" from a trusted server/admin tool.
-- Vendor accounts must also have app_metadata.vendor_id matching vendors.id.
-- Never use user_metadata for authorization and never expose the service-role key.

