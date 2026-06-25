-- Funciones RPC para el wizard público sin exponer service_role en el cliente.
-- SECURITY DEFINER permite insertar/actualizar altas usando la clave anon/publishable.

CREATE OR REPLACE FUNCTION public.create_alta(
  p_restaurant_name text,
  p_restaurant_address text,
  p_gmb_place_id text,
  p_has_existing_website boolean,
  p_existing_website_url text,
  p_wants_custom_domain boolean,
  p_domain text,
  p_domain_is_custom boolean,
  p_onetime_fee_concept public.alta_fee_concept,
  p_onetime_fee_amount numeric,
  p_contact_name text,
  p_whatsapp text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.altas (
    restaurant_name,
    restaurant_address,
    gmb_place_id,
    has_existing_website,
    existing_website_url,
    wants_custom_domain,
    domain,
    domain_is_custom,
    onetime_fee_concept,
    onetime_fee_amount,
    contact_name,
    whatsapp,
    status
  ) VALUES (
    p_restaurant_name,
    p_restaurant_address,
    p_gmb_place_id,
    p_has_existing_website,
    p_existing_website_url,
    p_wants_custom_domain,
    p_domain,
    p_domain_is_custom,
    p_onetime_fee_concept,
    p_onetime_fee_amount,
    p_contact_name,
    p_whatsapp,
    'pending_payment'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_alta_paid(
  p_alta_id uuid,
  p_stripe_session_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.altas
  SET
    status = 'paid',
    stripe_session_id = p_stripe_session_id
  WHERE id = p_alta_id
    AND status = 'pending_payment';
END;
$$;

REVOKE ALL ON FUNCTION public.create_alta(
  text, text, text, boolean, text, boolean, text, boolean,
  public.alta_fee_concept, numeric, text, text
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.mark_alta_paid(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_alta(
  text, text, text, boolean, text, boolean, text, boolean,
  public.alta_fee_concept, numeric, text, text
) TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.mark_alta_paid(uuid, text)
  TO anon, authenticated, service_role;
