DROP FUNCTION public.place_order(jsonb, jsonb, jsonb);

CREATE OR REPLACE FUNCTION public.place_order(
  _user_id uuid,
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
  VALUES (_user_id, v_name, v_email, v_phone, v_cep, v_street, v_number, v_complement, v_neighborhood, v_city, v_state, v_lines, v_subtotal, 0, v_subtotal)
  RETURNING id, code INTO v_id, v_code;

  RETURN QUERY SELECT v_id, v_code, v_subtotal, v_lines;
END; $$;
REVOKE EXECUTE ON FUNCTION public.place_order(uuid, jsonb, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_order(uuid, jsonb, jsonb, jsonb) TO service_role;