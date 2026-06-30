ALTER TABLE "altas" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" text;
ALTER TABLE "altas" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;
