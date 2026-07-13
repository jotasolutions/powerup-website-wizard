ALTER TABLE "altas" ADD COLUMN IF NOT EXISTS "checkout_email_sent_at" timestamptz;
ALTER TABLE "altas" ADD COLUMN IF NOT EXISTS "delivery_email_sent_at" timestamptz;
