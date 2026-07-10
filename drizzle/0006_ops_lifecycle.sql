ALTER TABLE "altas" ADD COLUMN IF NOT EXISTS "checkout_started_at" timestamp with time zone;
ALTER TABLE "altas" ADD COLUMN IF NOT EXISTS "customer_email" text;
ALTER TABLE "altas" ADD COLUMN IF NOT EXISTS "ops_status" text;
ALTER TABLE "altas" ADD COLUMN IF NOT EXISTS "domain_registered_at" timestamp with time zone;
ALTER TABLE "altas" ADD COLUMN IF NOT EXISTS "delivered_at" timestamp with time zone;
ALTER TABLE "altas" ADD COLUMN IF NOT EXISTS "ops_notes" text;
