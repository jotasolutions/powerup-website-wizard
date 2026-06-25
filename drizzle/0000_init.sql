DO $$ BEGIN
  CREATE TYPE "public"."alta_status" AS ENUM('pending_payment', 'paid');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."alta_fee_concept" AS ENUM('gestion', 'dominio');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "altas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "restaurant_name" text NOT NULL,
  "restaurant_address" text,
  "gmb_place_id" text,
  "has_existing_website" boolean DEFAULT false NOT NULL,
  "existing_website_url" text,
  "wants_custom_domain" boolean DEFAULT false NOT NULL,
  "domain" text,
  "domain_is_custom" boolean DEFAULT false NOT NULL,
  "onetime_fee_concept" "alta_fee_concept",
  "onetime_fee_amount" numeric(10, 2),
  "contact_name" text NOT NULL,
  "whatsapp" text NOT NULL,
  "status" "alta_status" DEFAULT 'pending_payment' NOT NULL,
  "stripe_session_id" text
);
