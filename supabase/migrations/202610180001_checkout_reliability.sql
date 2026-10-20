-- Compatible additive upgrade: retains app-metadata roles, subscriptions and order tracking.
BEGIN;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS checkout_key uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS request_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS orders_checkout_request_idx ON public.orders(user_id,checkout_key) WHERE checkout_key IS NOT NULL;
CREATE OR REPLACE FUNCTION public.place_whatsapp_order_v2(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_customer_address text,
  p_items jsonb,
  p_request_id uuid,
  p_promo text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
  v_fingerprint text;
  v_existing_hash text;
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

  IF p_request_id IS NULL THEN RAISE EXCEPTION 'Checkout request is required'; END IF;
  IF coalesce(p_promo, '') NOT IN ('', 'SAVE10') THEN RAISE EXCEPTION 'Invalid promotion code'; END IF;
  v_fingerprint := md5(jsonb_build_array(p_customer_name,p_customer_email,p_customer_phone,p_customer_address,p_items,p_promo)::text);
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text || p_request_id::text, 0));
  SELECT id, request_hash, total INTO v_order_id, v_existing_hash, v_total
  FROM public.orders WHERE user_id=v_user_id AND checkout_key=p_request_id;
  IF FOUND THEN
    IF v_existing_hash IS DISTINCT FROM v_fingerprint THEN RAISE EXCEPTION 'Checkout request changed'; END IF;
    SELECT jsonb_agg(jsonb_build_object('id',id,'vendorId',vendor_id,'items',items,'total',subtotal,'status',status) ORDER BY vendor_id)
      INTO v_vendor_orders FROM public.vendor_orders WHERE order_id=v_order_id;
    RETURN jsonb_build_object('orderId',v_order_id,'total',v_total,'vendorOrders',v_vendor_orders);
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_items) item
    JOIN public.products p ON p.id=item->>'id'
    WHERE (item ? 'price' AND (item->>'price')::numeric IS DISTINCT FROM p.price)
      OR (coalesce(array_length(p.sizes,1),0)>0 AND NOT coalesce(item->>'selectedSize'=ANY(p.sizes),false))
      OR (coalesce(array_length(p.sizes,1),0)=0 AND nullif(item->>'selectedSize','') IS NOT NULL AND item->>'selectedSize' IS DISTINCT FROM p.size)
  ) THEN RAISE EXCEPTION 'A product price or selected size changed. Review your cart.'; END IF;

  WITH requested AS (
    SELECT item ->> 'id' AS product_id, nullif(item->>'selectedSize','') AS selected_size,
           sum((item ->> 'qty')::integer)::integer AS qty
    FROM jsonb_array_elements(p_items) AS item
    GROUP BY item ->> 'id', nullif(item->>'selectedSize','')
  ),
  canonical AS (
    SELECT p.id,
           p.vendor,
           p.name,
           p.price,
           p.image,
           coalesce(r.selected_size,p.size) AS size,
           r.qty
    FROM requested r
    JOIN public.products p ON p.id = r.product_id
    WHERE p.in_stock = true
      AND EXISTS (SELECT 1 FROM public.vendor_subscriptions vs WHERE vs.vendor_id=p.vendor AND vs.status IN ('trial','active') AND vs.access_ends_at>now())
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
             'selectedSize', size,
             'qty', qty
           )
           ORDER BY vendor, name
         ),
         coalesce(sum(price * qty), 0),
         count(*)
  INTO v_items, v_total, v_product_count
  FROM canonical;

  SELECT count(DISTINCT (item ->> 'id', nullif(item->>'selectedSize','')))
  INTO v_requested_count
  FROM jsonb_array_elements(p_items) AS item;

  IF v_items IS NULL OR v_product_count <> v_requested_count THEN
    RAISE EXCEPTION 'One or more products are unavailable. Refresh your cart and try again.';
  END IF;

  IF p_promo='SAVE10' THEN v_total := v_total-round(v_total*0.10); END IF;

  v_order_id := 'ZS-' || to_char(now(), 'YYMMDD') || '-' ||
    upper(replace(gen_random_uuid()::text, '-', ''));

  INSERT INTO public.orders (
    id, user_id, customer_name, customer_email, customer_phone,
    customer_address, items, total, status, checkout_key, request_hash
  )
  VALUES (
    v_order_id, v_user_id, btrim(p_customer_name),
    nullif(btrim(coalesce(p_customer_email, '')), ''),
    btrim(p_customer_phone), btrim(p_customer_address),
    v_items, v_total, 'pending', p_request_id, v_fingerprint
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
    sum((item ->> 'price')::numeric * (item ->> 'qty')::integer) - CASE WHEN p_promo='SAVE10' THEN
      round(sum(sum((item->>'price')::numeric*(item->>'qty')::integer)) over (ORDER BY item->>'vendor')*0.10)
      - round((sum(sum((item->>'price')::numeric*(item->>'qty')::integer)) over (ORDER BY item->>'vendor')-sum((item->>'price')::numeric*(item->>'qty')::integer))*0.10)
      ELSE 0 END,
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

REVOKE ALL ON FUNCTION public.place_whatsapp_order_v2(text, text, text, text, jsonb, uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_whatsapp_order_v2(text, text, text, text, jsonb, uuid, text)
  TO authenticated;



-- Keep the previous frontend endpoint working during the rollout.
CREATE OR REPLACE FUNCTION public.place_whatsapp_order(
  p_customer_name text, p_customer_email text, p_customer_phone text,
  p_customer_address text, p_items jsonb
) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
  SELECT public.place_whatsapp_order_v2(
    p_customer_name,p_customer_email,p_customer_phone,p_customer_address,
    (SELECT jsonb_agg(item || jsonb_build_object('selectedSize',coalesce(item->>'selectedSize',p.sizes[1],p.size)))
     FROM jsonb_array_elements(p_items) item LEFT JOIN public.products p ON p.id=item->>'id'),
    gen_random_uuid(),'');
$$;
REVOKE ALL ON FUNCTION public.place_whatsapp_order(text,text,text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.place_whatsapp_order(text,text,text,text,jsonb) TO authenticated;

-- Orders can only be created through the validated, atomic checkout endpoint.
REVOKE INSERT ON public.orders, public.vendor_orders FROM authenticated;
COMMIT;
