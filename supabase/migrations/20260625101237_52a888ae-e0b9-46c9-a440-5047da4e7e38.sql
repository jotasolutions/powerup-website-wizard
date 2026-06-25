
CREATE TYPE public.alta_status AS ENUM ('pending_payment', 'paid');
CREATE TYPE public.alta_fee_concept AS ENUM ('gestion', 'dominio');

CREATE TABLE public.altas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  restaurant_name TEXT NOT NULL,
  restaurant_address TEXT,
  gmb_place_id TEXT,
  has_existing_website BOOLEAN NOT NULL DEFAULT false,
  existing_website_url TEXT,
  wants_custom_domain BOOLEAN NOT NULL DEFAULT false,
  domain TEXT,
  domain_is_custom BOOLEAN NOT NULL DEFAULT false,
  onetime_fee_concept public.alta_fee_concept,
  onetime_fee_amount NUMERIC(10,2),
  contact_name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  status public.alta_status NOT NULL DEFAULT 'pending_payment',
  stripe_session_id TEXT
);

GRANT SELECT, INSERT, UPDATE ON public.altas TO anon;
GRANT SELECT, INSERT, UPDATE ON public.altas TO authenticated;
GRANT ALL ON public.altas TO service_role;

ALTER TABLE public.altas ENABLE ROW LEVEL SECURITY;

-- Permitir insertar a cualquiera (el asistente es público, sin auth)
CREATE POLICY "Cualquiera puede crear un alta"
  ON public.altas FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Permitir actualizar el propio registro recién creado (para marcar `paid` al volver de checkout)
CREATE POLICY "Cualquiera puede actualizar un alta por id"
  ON public.altas FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
