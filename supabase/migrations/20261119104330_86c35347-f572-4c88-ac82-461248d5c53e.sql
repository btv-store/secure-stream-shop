CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PRODUCTS
CREATE TABLE public.products (
  id text PRIMARY KEY,
  name text NOT NULL,
  tag text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price > 0),
  features text[] NOT NULL DEFAULT '{}',
  featured boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active products are public" ON public.products FOR SELECT TO anon, authenticated USING (active = true);
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.products (id, name, tag, price, features, featured, sort_order) VALUES
('lite', 'BTV Stick Lite', 'LITE', 199.90, ARRAY['Full HD 1080p','Wi‑Fi 2.4GHz','Controle remoto'], false, 1),
('4k', 'BTV Stick 4K', '4K', 299.90, ARRAY['Ultra HD 4K HDR','Wi‑Fi dual band','Controle por voz'], true, 2),
('max', 'BTV Stick 4K Max', 'MAX', 399.90, ARRAY['4K HDR10+','Wi‑Fi 6','Bluetooth 5.0 + voz'], false, 3);

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text CHECK (char_length(full_name) <= 120),
  phone text CHECK (char_length(phone) <= 20),
  cep text CHECK (char_length(cep) <= 9),
  street text CHECK (char_length(street) <= 160),
  number text CHECK (char_length(number) <= 20),
  complement text CHECK (char_length(complement) <= 80),
  neighborhood text CHECK (char_length(neighborhood) <= 80),
  city text CHECK (char_length(city) <= 80),
  state text CHECK (char_length(state) <= 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, left(coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), 120))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ORDERS
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  cep text NOT NULL,
  street text NOT NULL,
  number text NOT NULL,
  complement text,
  neighborhood text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  items jsonb NOT NULL,
  subtotal numeric(10,2) NOT NULL,
  shipping numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','shipped','delivered','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_user_id_idx ON public.orders(user_id);
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Secure order creation: prices come from the products table, never from the browser.
CREATE OR REPLACE FUNCTION public.place_order(
  _customer jsonb,
  _address jsonb,
  _items jsonb
) RETURNS TABLE (order_id uuid, order_code text, order_total numeric, order_items jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item jsonb;
  v_qty int;
  v_prod public.products%ROWTYPE;
  v_lines jsonb := '[]'::jsonb;
  v_subtotal numeric(10,2) := 0;
  v_name text := btrim(coalesce(_customer->>'name',''));
  v_email text := lower(btrim(coalesce(_customer->>'email','')));
  v_phone text := regexp_replace(coalesce(_customer->>'phone',''), '\D', '', 'g');
  v_cep text := regexp_replace(coalesce(_address->>'cep',''), '\D', '', 'g');
  v_street text := btrim(coalesce(_address->>'street',''));
  v_number text := btrim(coalesce(_address->>'number',''));
  v_complement text := nullif(btrim(coalesce(_address->>'complement','')), '');
  v_neighborhood text := btrim(coalesce(_address->>'neighborhood',''));
  v_city text := btrim(coalesce(_address->>'city',''));
  v_state text := upper(btrim(coalesce(_address->>'state','')));
  v_id uuid; v_code text;
BEGIN
  IF char_length(v_name) < 3 OR char_length(v_name) > 120 THEN RAISE EXCEPTION 'invalid_name'; END IF;
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR char_length(v_email) > 254 THEN RAISE EXCEPTION 'invalid_email'; END IF;
  IF char_length(v_phone) < 10 OR char_length(v_phone) > 13 THEN RAISE EXCEPTION 'invalid_phone'; END IF;
  IF char_length(v_cep) <> 8 THEN RAISE EXCEPTION 'invalid_cep'; END IF;
  IF char_length(v_street) < 2 OR char_length(v_street) > 160 THEN RAISE EXCEPTION 'invalid_street'; END IF;
  IF char_length(v_number) < 1 OR char_length(v_number) > 20 THEN RAISE EXCEPTION 'invalid_number'; END IF;
  IF char_length(coalesce(v_complement,'')) > 80 THEN RAISE EXCEPTION 'invalid_complement'; END IF;
  IF char_length(v_neighborhood) < 2 OR char_length(v_neighborhood) > 80 THEN RAISE EXCEPTION 'invalid_neighborhood'; END IF;
  IF char_length(v_city) < 2 OR char_length(v_city) > 80 THEN RAISE EXCEPTION 'invalid_city'; END IF;
  IF v_state !~ '^[A-Z]{2}$' THEN RAISE EXCEPTION 'invalid_state'; END IF;
  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 OR jsonb_array_length(_items) > 10 THEN
    RAISE EXCEPTION 'invalid_items';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (v_item->>'quantity')::int;
    IF v_qty IS NULL OR v_qty < 1 OR v_qty > 10 THEN RAISE EXCEPTION 'invalid_quantity'; END IF;
    SELECT * INTO v_prod FROM public.products WHERE id = v_item->>'productId' AND active = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'invalid_product'; END IF;
    v_lines := v_lines || jsonb_build_object('productId', v_prod.id, 'name', v_prod.name, 'unitPrice', v_prod.price, 'quantity', v_qty, 'lineTotal', v_prod.price * v_qty);
    v_subtotal := v_subtotal + v_prod.price * v_qty;
  END LOOP;

  INSERT INTO public.orders (user_id, customer_name, customer_email, customer_phone, cep, street, number, complement, neighborhood, city, state, items, subtotal, shipping, total)
  VALUES (auth.uid(), v_name, v_email, v_phone, v_cep, v_street, v_number, v_complement, v_neighborhood, v_city, v_state, v_lines, v_subtotal, 0, v_subtotal)
  RETURNING id, code INTO v_id, v_code;

  RETURN QUERY SELECT v_id, v_code, v_subtotal, v_lines;
END; $$;
REVOKE EXECUTE ON FUNCTION public.place_order(jsonb, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb, jsonb, jsonb) TO anon, authenticated, service_role;